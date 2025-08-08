'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Search, 
  Filter,
  Download,
  Calendar,
  Clock,
  User,
  Settings,
  Eye,
  Loader2,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface AuditLog {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  sessionId: string | null;
  action: string;
  description: string | null;
  success: boolean;
  errorMessage: string | null;
  processingTime: number | null;
  timestamp: string;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  accountId: string | null;
  integrationId: string | null;
  messageId: string | null;
}

interface AccessLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  accountId: string | null;
  integrationId: string | null;
  searchQuery: string | null;
  resultCount: number | null;
  success: boolean;
  errorMessage: string | null;
  responseTime: number | null;
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
}

interface SecurityLog {
  id: string;
  threatType: string;
  riskLevel: string;
  securityScore: number | null;
  action: string;
  reason: string | null;
  timestamp: string;
  integrationId: string | null;
  messageId: string | null;
  attachmentId: string | null;
  falsePositive: boolean;
  reviewedBy: string | null;
}

interface AuditStatistics {
  summary: {
    totalAuditEvents: number;
    failedAuditEvents: number;
    auditSuccessRate: string;
    totalAccessEvents: number;
    failedAccessEvents: number;
    accessSuccessRate: string;
    totalSecurityEvents: number;
    highRiskSecurityEvents: number;
    securityRiskRate: string;
  };
  breakdown: {
    eventTypes: Array<{ eventType: string; count: number }>;
    accessActions: Array<{ action: string; count: number }>;
  };
}

interface AuditDashboardProps {
  accountId?: string;
  className?: string;
}

export function AuditDashboard({ accountId, className }: AuditDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [dateRange, setDateRange] = useState('7d');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  });

  const { canAdminEmail } = usePermissions();

  useEffect(() => {
    if (canAdminEmail) {
      loadData();
    }
  }, [canAdminEmail, activeTab, dateRange, eventTypeFilter, successFilter, userFilter, pagination.page]);

  const getDateRangeFilter = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        return {};
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const dateFilter = getDateRangeFilter();
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...dateFilter
      });

      if (accountId) params.append('accountId', accountId);
      if (eventTypeFilter) params.append('eventType', eventTypeFilter);
      if (successFilter) params.append('success', successFilter);
      if (userFilter) params.append('userId', userFilter);

      let endpoint = '/api/email/audit/logs';
      if (activeTab === 'access') {
        endpoint = '/api/email/audit/access';
      } else if (activeTab === 'security') {
        endpoint = '/api/email/audit/security';
      } else if (activeTab === 'overview') {
        endpoint = '/api/email/audit/statistics';
      }

      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to load audit data');
      }

      const data = await response.json();

      if (activeTab === 'overview') {
        setStatistics(data);
      } else if (activeTab === 'access') {
        setAccessLogs(data.logs);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages
        }));
      } else if (activeTab === 'security') {
        setSecurityLogs(data.logs);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages
        }));
      } else {
        setAuditLogs(data.logs);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages
        }));
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const dateFilter = getDateRangeFilter();
      const params = new URLSearchParams({
        format: 'csv',
        ...dateFilter
      });

      if (accountId) params.append('accountId', accountId);
      if (eventTypeFilter) params.append('eventType', eventTypeFilter);
      if (successFilter) params.append('success', successFilter);

      const endpoint = `/api/email/audit/${activeTab}/export`;
      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export logs');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `email-${activeTab}-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export logs');
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('ERROR') || eventType.includes('FAILED')) {
      return 'bg-red-100 text-red-800';
    } else if (eventType.includes('WARNING') || eventType.includes('QUARANTINE')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (eventType.includes('SUCCESS') || eventType.includes('COMPLETED')) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  if (!canAdminEmail) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access audit logs.
        </AlertDescription>
      </Alert>
    );
  }

  const filteredAuditLogs = auditLogs.filter(log =>
    (searchTerm === '' || 
     log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
     log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     log.entityType.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredAccessLogs = accessLogs.filter(log =>
    (searchTerm === '' || 
     log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
     log.resourceType.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSecurityLogs = securityLogs.filter(log =>
    (searchTerm === '' || 
     log.threatType.toLowerCase().includes(searchTerm.toLowerCase()) ||
     log.reason?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          <h2 className="text-2xl font-bold">Email Audit Dashboard</h2>
          <p className="text-gray-600">Monitor email integration activities and security events</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="access">Access Logs</TabsTrigger>
          <TabsTrigger value="security">Security Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : statistics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Audit Events</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics.summary.totalAuditEvents}</div>
                    <p className="text-xs text-muted-foreground">
                      {statistics.summary.auditSuccessRate}% success rate
                    </p>
                    <div className="mt-2 flex items-center">
                      {parseFloat(statistics.summary.auditSuccessRate) >= 95 ? (
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                      )}
                      <span className="text-xs text-green-600">
                        {statistics.summary.totalAuditEvents - statistics.summary.failedAuditEvents} successful
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Access Events</CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics.summary.totalAccessEvents}</div>
                    <p className="text-xs text-muted-foreground">
                      {statistics.summary.accessSuccessRate}% success rate
                    </p>
                    <div className="mt-2 flex items-center">
                      {parseFloat(statistics.summary.accessSuccessRate) >= 95 ? (
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                      )}
                      <span className="text-xs text-green-600">
                        {statistics.summary.totalAccessEvents - statistics.summary.failedAccessEvents} successful
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Security Events</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statistics.summary.totalSecurityEvents}</div>
                    <p className="text-xs text-muted-foreground">
                      {statistics.summary.securityRiskRate}% high risk
                    </p>
                    <div className="mt-2 flex items-center">
                      {parseFloat(statistics.summary.securityRiskRate) <= 5 ? (
                        <TrendingDown className="h-4 w-4 text-green-600 mr-1" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-red-600 mr-1" />
                      )}
                      <span className="text-xs text-red-600">
                        {statistics.summary.highRiskSecurityEvents} high risk
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Event Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {statistics.breakdown.eventTypes.slice(0, 10).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge className={getEventTypeColor(item.eventType)}>
                              {item.eventType.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <span className="text-sm font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Access Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {statistics.breakdown.accessActions.slice(0, 10).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{item.action.replace(/_/g, ' ')}</span>
                          <span className="text-sm font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <CardTitle>Audit Events</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Event Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Events</SelectItem>
                      <SelectItem value="INTEGRATION_CREATED">Integration Created</SelectItem>
                      <SelectItem value="MESSAGE_PROCESSED">Message Processed</SelectItem>
                      <SelectItem value="TICKET_CREATED">Ticket Created</SelectItem>
                      <SelectItem value="SECURITY_ALERT_GENERATED">Security Alert</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={successFilter} onValueChange={setSuccessFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      <SelectItem value="true">Success</SelectItem>
                      <SelectItem value="false">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <Badge className={getEventTypeColor(log.eventType)}>
                                {log.eventType.replace(/_/g, ' ')}
                              </Badge>
                              <div className="text-sm text-gray-600 mt-1">{log.action}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.entityType}</div>
                              <div className="text-sm text-gray-600">{log.entityId}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {log.userId ? (
                                <div>
                                  <User className="h-4 w-4 inline mr-1" />
                                  {log.userId}
                                </div>
                              ) : (
                                <div className="text-gray-500">System</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.success ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Success
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-100 text-red-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {log.processingTime ? `${log.processingTime}ms` : '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {pagination.pages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-600">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total} events
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          disabled={pagination.page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          disabled={pagination.page === pagination.pages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <CardTitle>Access Events</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search access..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccessLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</div>
                          {log.searchQuery && (
                            <div className="text-sm text-gray-600">"{log.searchQuery}"</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.resourceType}</div>
                            {log.resourceId && (
                              <div className="text-sm text-gray-600">{log.resourceId}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{log.userId}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {log.resultCount !== null ? `${log.resultCount} items` : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {log.responseTime ? `${log.responseTime}ms` : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <CardTitle>Security Events</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search threats..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Threat</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>False Positive</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSecurityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.threatType}</div>
                            {log.reason && (
                              <div className="text-sm text-gray-600">{log.reason}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRiskLevelColor(log.riskLevel)}>
                            {log.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="capitalize">{log.action.replace(/_/g, ' ')}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {log.securityScore !== null ? `${log.securityScore}/100` : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.falsePositive ? (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              No
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}