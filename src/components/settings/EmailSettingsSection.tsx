'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Zap,
  Globe,
  Server,
  Map,
  Archive,
  BarChart3
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { DomainMappingManager } from '@/components/email/DomainMappingManager';

interface EmailIntegration {
  id: string;
  name: string;
  provider: 'MICROSOFT_GRAPH' | 'GMAIL' | 'GENERIC_IMAP' | 'GENERIC_POP3';
  isActive: boolean;
  status: 'CONNECTED' | 'ERROR' | 'CONFIGURING' | 'DISABLED';
  lastSync: string | null;
  messageCount: number;
  ticketCount: number;
  errorCount: number;
  processingRules: any;
}

interface EmailStats {
  totalIntegrations: number;
  activeIntegrations: number;
  totalMessages: number;
  processedToday: number;
  ticketsCreated: number;
  threatsBlocked: number;
  averageProcessingTime: number;
}

export function EmailSettingsSection() {
  const [integrations, setIntegrations] = useState<EmailIntegration[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('subtab') || 'overview';
    }
    return 'overview';
  });
  
  const { canAdminEmailGlobal, canViewSettings } = usePermissions();

  useEffect(() => {
    if (canAdminEmailGlobal) {
      loadEmailData();
    }
  }, [canAdminEmailGlobal]);

  const loadEmailData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [integrationsResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/email/integrations'),
        fetch('/api/admin/email/stats')
      ]);

      if (!integrationsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to load email data');
      }

      const integrationsData = await integrationsResponse.json();
      const statsData = await statsResponse.json();

      setIntegrations(integrationsData.integrations || []);
      setStats(statsData.stats);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleIntegration = async (integrationId: string, isActive: boolean) => {
    try {
      setError(null);
      const response = await fetch(`/api/admin/email/integrations/${integrationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to update integration');
      }

      setSuccess(`Integration ${!isActive ? 'enabled' : 'disabled'} successfully`);
      await loadEmailData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update integration');
    }
  };

  const syncIntegration = async (integrationId: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/admin/email/integrations/${integrationId}/sync`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to start sync');
      }

      setSuccess('Email sync started successfully');
      await loadEmailData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sync');
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'MICROSOFT_GRAPH': return '🔷';
      case 'GMAIL': return '📧';
      case 'GENERIC_IMAP': return '📬';
      case 'GENERIC_POP3': return '📪';
      default: return '✉️';
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

  if (!canViewSettings) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to view system settings.
        </AlertDescription>
      </Alert>
    );
  }

  if (!canAdminEmailGlobal) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to manage email integrations. Contact your system administrator to configure email settings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="domains">Domain Mapping</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Email System Overview
              </h3>
              <p className="text-sm text-muted-foreground">
                Global email integration status and processing statistics
              </p>
            </div>
            <Button onClick={loadEmailData} size="sm" variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Integrations</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalIntegrations}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeIntegrations} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.processedToday}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalMessages} total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tickets Created</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.ticketsCreated}</div>
                  <p className="text-xs text-muted-foreground">
                    From email processing
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Threats Blocked</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.threatsBlocked}</div>
                  <p className="text-xs text-muted-foreground">
                    Security filtering
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email Processing</span>
                    <Badge className={stats && stats.activeIntegrations > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {stats && stats.activeIntegrations > 0 ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Security Monitoring</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Domain Resolution</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  {stats && stats.averageProcessingTime > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Processing Time</span>
                      <span className="text-sm font-medium">{stats.averageProcessingTime}ms</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Email Integrations</h3>
              <p className="text-sm text-muted-foreground">
                Manage email providers and their configurations
              </p>
            </div>
            <Button onClick={() => window.location.href = '/settings/email/integrations/new'}>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : integrations.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Email Integrations</h3>
                  <p className="text-gray-600 mb-4">Get started by adding your first email integration.</p>
                  <Button onClick={() => window.location.href = '/settings/email/integrations/new'}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Integration
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {integrations.map((integration) => (
                    <div key={integration.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-xl">{getProviderIcon(integration.provider)}</div>
                          <div>
                            <h4 className="font-semibold">{integration.name}</h4>
                            <p className="text-sm text-gray-600">{integration.provider.replace('_', ' ')}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={getStatusColor(integration.status)} size="sm">
                                {integration.status}
                              </Badge>
                              <Badge variant="outline" size="sm">
                                {integration.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right text-sm">
                            <div className="font-medium">{integration.messageCount} messages</div>
                            <div className="text-gray-500">{integration.ticketCount} tickets</div>
                            {integration.errorCount > 0 && (
                              <div className="text-red-600">{integration.errorCount} errors</div>
                            )}
                          </div>

                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => syncIntegration(integration.id)}
                              disabled={!integration.isActive}
                              title="Sync now"
                            >
                              <Zap className="h-3 w-3" />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleIntegration(integration.id, integration.isActive)}
                              title={integration.isActive ? 'Disable' : 'Enable'}
                            >
                              {integration.isActive ? (
                                <Pause className="h-3 w-3" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.location.href = `/settings/email/integrations/${integration.id}/edit`}
                              title="Edit"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domains" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Domain Mapping</h3>
            <p className="text-sm text-muted-foreground">
              Configure how email domains route to accounts
            </p>
          </div>
          <DomainMappingManager />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Security Settings</h3>
            <p className="text-sm text-muted-foreground">
              Configure email security policies and monitoring
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Security Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Security configuration is managed through the global email system settings. 
                    Advanced security policies and quarantine management are available in the full admin interface.
                  </AlertDescription>
                </Alert>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/admin/email?tab=security'}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Advanced Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Audit & Monitoring</h3>
            <p className="text-sm text-muted-foreground">
              View email processing logs and system activity
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <BarChart3 className="h-4 w-4" />
                  <AlertDescription>
                    Comprehensive audit logs and analytics are available in the full email management interface. 
                    This includes processing logs, security events, and performance metrics.
                  </AlertDescription>
                </Alert>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/admin/email?tab=audit'}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Full Audit Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}