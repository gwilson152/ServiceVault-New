'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Mail, 
  Settings, 
  Shield, 
  Activity, 
  Plus, 
  Edit,
  Trash2,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface EmailIntegration {
  id: string;
  name: string;
  provider: 'MICROSOFT_GRAPH' | 'GMAIL' | 'IMAP' | 'POP3';
  email: string;
  isActive: boolean;
  status: 'CONNECTED' | 'ERROR' | 'CONFIGURING' | 'DISABLED';
  lastSync: string | null;
  messageCount: number;
  ticketCount: number;
  errorCount: number;
  account: {
    id: string;
    name: string;
  };
  providerConfig: any;
  createdAt: string;
}

interface SecurityStats {
  totalChecked: number;
  threatsBlocked: number;
  spamDetected: number;
  averageRiskScore: number;
  riskDistribution: Record<string, number>;
}

interface RateLimit {
  keyType: string;
  window: string;
  limit: number;
  used: number;
  remaining: number;
  resetTime: string;
}

interface EmailIntegrationManagerProps {
  accountId: string;
  className?: string;
}

export function EmailIntegrationManager({ accountId, className }: EmailIntegrationManagerProps) {
  const [integrations, setIntegrations] = useState<EmailIntegration[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const { canConfigureEmail, canAccessEmail, canAdminEmail } = usePermissions();

  useEffect(() => {
    if (canAccessEmail) {
      loadData();
    }
  }, [accountId, canAccessEmail]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load integrations
      const integrationsResponse = await fetch(`/api/email/integrations?accountId=${accountId}`);
      if (!integrationsResponse.ok) throw new Error('Failed to load integrations');
      const integrationsData = await integrationsResponse.json();
      setIntegrations(integrationsData.integrations || []);

      // Load security stats if admin
      if (canAdminEmail) {
        const securityResponse = await fetch('/api/email/security?since=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        if (securityResponse.ok) {
          const securityData = await securityResponse.json();
          setSecurityStats(securityData.stats);
        }

        // Load rate limits
        const rateLimitResponse = await fetch('/api/email/rate-limit?includeStats=true');
        if (rateLimitResponse.ok) {
          const rateLimitData = await rateLimitResponse.json();
          // Convert rules to rate limit format for display
          const limits = rateLimitData.rules.map((rule: any) => ({
            keyType: rule.keyType,
            window: rule.window,
            limit: rule.limit,
            used: 0, // Would need to fetch actual usage
            remaining: rule.limit,
            resetTime: new Date(Date.now() + 60000).toISOString()
          }));
          setRateLimits(limits);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIntegration = async (integrationId: string, active: boolean) => {
    try {
      const response = await fetch(`/api/email/integrations/${integrationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: active })
      });

      if (!response.ok) throw new Error('Failed to toggle integration');
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle integration');
    }
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    if (!confirm('Are you sure you want to delete this email integration?')) return;

    try {
      const response = await fetch(`/api/email/integrations/${integrationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete integration');
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete integration');
    }
  };

  const handleSyncNow = async (integrationId: string) => {
    try {
      const response = await fetch('/api/email/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_sync_job',
          data: { integrationId },
          priority: 'HIGH'
        })
      });

      if (!response.ok) throw new Error('Failed to start sync');
      
      // Show success message
      setError(null);
      // Could add a toast notification here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sync');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED': return 'bg-green-100 text-green-800';
      case 'ERROR': return 'bg-red-100 text-red-800';
      case 'CONFIGURING': return 'bg-yellow-100 text-yellow-800';
      case 'DISABLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'MICROSOFT_GRAPH': return '🔷';
      case 'GMAIL': return '📧';
      case 'IMAP': return '📬';
      case 'POP3': return '📪';
      default: return '✉️';
    }
  };

  if (!canAccessEmail) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access email integrations.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Integrations</h2>
          <p className="text-gray-600">
            Manage email connections and automated ticket creation
          </p>
        </div>
        {canConfigureEmail && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        )}
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="integrations">
            <Mail className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="security" disabled={!canAdminEmail}>
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="performance" disabled={!canAdminEmail}>
            <Activity className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="settings" disabled={!canConfigureEmail}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Email Integrations</h3>
                <p className="text-gray-600 text-center mb-4">
                  Connect your email accounts to automatically create tickets from incoming emails.
                </p>
                {canConfigureEmail && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Integration
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">{getProviderIcon(integration.provider)}</div>
                        <div>
                          <h3 className="font-semibold">{integration.name}</h3>
                          <p className="text-sm text-gray-600">{integration.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={getStatusColor(integration.status)}>
                              {integration.status}
                            </Badge>
                            <Badge variant="outline">
                              {integration.provider}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-right text-sm text-gray-600">
                          <div>📨 {integration.messageCount} emails</div>
                          <div>🎫 {integration.ticketCount} tickets</div>
                          {integration.lastSync && (
                            <div>🔄 {new Date(integration.lastSync).toLocaleString()}</div>
                          )}
                        </div>
                        
                        {canConfigureEmail && (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncNow(integration.id)}
                              title="Sync now"
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleIntegration(integration.id, !integration.isActive)}
                              title={integration.isActive ? 'Pause' : 'Resume'}
                            >
                              {integration.isActive ? 
                                <Pause className="h-4 w-4" /> : 
                                <Play className="h-4 w-4" />
                              }
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedIntegration(integration.id)}
                              title="Settings"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteIntegration(integration.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {integration.errorCount > 0 && (
                      <Alert className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {integration.errorCount} recent errors. Check logs for details.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          {securityStats && (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-600">Emails Scanned</p>
                        <p className="text-2xl font-bold">{securityStats.totalChecked}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-sm text-gray-600">Threats Blocked</p>
                        <p className="text-2xl font-bold">{securityStats.threatsBlocked}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-600">Spam Detected</p>
                        <p className="text-2xl font-bold">{securityStats.spamDetected}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-gray-600">Avg Risk Score</p>
                        <p className="text-2xl font-bold">{securityStats.averageRiskScore.toFixed(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Level Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(securityStats.riskDistribution).map(([level, count]) => {
                      const total = Object.values(securityStats.riskDistribution).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      
                      return (
                        <div key={level} className="flex items-center space-x-3">
                          <div className="w-16 text-sm font-medium">{level}</div>
                          <Progress value={percentage} className="flex-1" />
                          <div className="w-12 text-sm text-gray-600">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Rate Limits</CardTitle>
              </CardHeader>
              <CardContent>
                {rateLimits.length > 0 ? (
                  <div className="space-y-4">
                    {rateLimits.map((limit, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{limit.keyType} - {limit.window}</p>
                          <p className="text-sm text-gray-600">
                            {limit.used} / {limit.limit} used
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{limit.remaining} remaining</p>
                          <p className="text-xs text-gray-600">
                            Resets: {new Date(limit.resetTime).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No rate limit information available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Email Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Global email integration settings will be displayed here.
                This includes security thresholds, rate limits, and notification preferences.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Integration Creation Dialog - Would be implemented as a separate component */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Email Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Choose an email provider to connect:
              </p>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  🔷 Microsoft 365 / Outlook
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  📧 Gmail
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  📬 IMAP/POP3
                </Button>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}