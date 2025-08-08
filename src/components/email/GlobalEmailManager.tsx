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
  Zap,
  Globe,
  Server
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface GlobalEmailIntegration {
  id: string;
  name: string;
  provider: 'MICROSOFT_GRAPH' | 'GMAIL' | 'IMAP' | 'POP3';
  isActive: boolean;
  status: 'CONNECTED' | 'ERROR' | 'CONFIGURING' | 'DISABLED';
  lastSync: string | null;
  messageCount: number;
  ticketCount: number;
  errorCount: number;
  providerConfig: any;
  processingRules: any;
  createdAt: string;
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

interface GlobalEmailManagerProps {
  className?: string;
}

export function GlobalEmailManager({ className }: GlobalEmailManagerProps) {
  const [integrations, setIntegrations] = useState<GlobalEmailIntegration[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { canAdminEmailGlobal } = usePermissions();

  useEffect(() => {
    if (canAdminEmailGlobal) {
      loadGlobalEmailData();
    }
  }, [canAdminEmailGlobal]);

  const loadGlobalEmailData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [integrationsResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/email/integrations'),
        fetch('/api/admin/email/stats')
      ]);

      if (!integrationsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to load email integration data');
      }

      const integrationsData = await integrationsResponse.json();
      const statsData = await statsResponse.json();

      setIntegrations(integrationsData.integrations);
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
      await loadGlobalEmailData();
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
      await loadGlobalEmailData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sync');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED': return 'bg-green-100 text-green-800';
      case 'ERROR': return 'bg-red-100 text-red-800';
      case 'CONFIGURING': return 'bg-yellow-100 text-yellow-800';
      case 'DISABLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!canAdminEmailGlobal) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to manage global email integrations.
        </AlertDescription>
      </Alert>
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

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Globe className="h-6 w-6 mr-2" />
            Global Email Integrations
          </h2>
          <p className="text-gray-600">Manage system-wide email integrations and processing</p>
        </div>
        <Button onClick={() => window.location.href = '/admin/email/integrations/new'}>
          <Plus className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
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

      {/* Integrations List */}
      <Card>
        <CardHeader>
          <CardTitle>Email Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Email Integrations</h3>
              <p className="text-gray-600 mb-4">Get started by adding your first email integration.</p>
              <Button onClick={() => window.location.href = '/admin/email/integrations/new'}>
                <Plus className="h-4 w-4 mr-2" />
                Add Integration
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div key={integration.id} className="border rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{getProviderIcon(integration.provider)}</div>
                      <div>
                        <h3 className="text-lg font-semibold">{integration.name}</h3>
                        <p className="text-sm text-gray-600">{integration.provider}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge className={getStatusColor(integration.status)}>
                            {integration.status}
                          </Badge>
                          <Badge variant="outline">
                            {integration.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-right space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">{integration.messageCount}</span> messages
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{integration.ticketCount}</span> tickets
                        </div>
                        <div className="text-sm text-gray-500">
                          Last sync: {integration.lastSync 
                            ? new Date(integration.lastSync).toLocaleDateString()
                            : 'Never'
                          }
                        </div>
                        {integration.errorCount > 0 && (
                          <div className="text-sm text-red-600">
                            {integration.errorCount} errors
                          </div>
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
                          <Zap className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleIntegration(integration.id, integration.isActive)}
                          title={integration.isActive ? 'Disable' : 'Enable'}
                        >
                          {integration.isActive ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `/admin/email/integrations/${integration.id}/edit`}
                          title="Edit integration"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this integration?')) {
                              // Delete integration logic
                            }
                          }}
                          title="Delete integration"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Processing Rules Preview */}
                  {integration.processingRules && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Processing Rules:</span>
                        {integration.processingRules.autoCreateTickets && ' Auto-create tickets'}
                        {integration.processingRules.domainRouting && ' • Domain-based routing'}
                        {integration.processingRules.spamFiltering && ' • Spam filtering'}
                        {integration.processingRules.attachmentScanning && ' • Attachment scanning'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}