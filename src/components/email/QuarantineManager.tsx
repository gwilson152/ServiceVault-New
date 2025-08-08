'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
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
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Mail, 
  Search, 
  Filter,
  Download,
  Trash2,
  UserCheck,
  UserX,
  Eye,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface QuarantinedEmail {
  id: string;
  messageId: string;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  createdAt: string;
  status: string;
  priority: number;
  integration: {
    id: string;
    provider: string;
    account: {
      id: string;
      name: string;
    };
  };
  ticket: {
    id: string;
    ticketNumber: string;
    subject: string;
  } | null;
  attachmentCount: number;
  security: {
    riskLevel: string;
    securityScore: number;
    threats: string[];
    warnings: string[];
    action: string;
    scannedAt: string;
  } | null;
}

interface QuarantineManagerProps {
  className?: string;
}

export function QuarantineManager({ className }: QuarantineManagerProps) {
  const [emails, setEmails] = useState<QuarantinedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('QUARANTINED');
  const [filterRiskLevel, setFilterRiskLevel] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [selectedEmail, setSelectedEmail] = useState<QuarantinedEmail | null>(null);
  
  const { canAdminEmail } = usePermissions();

  useEffect(() => {
    if (canAdminEmail) {
      loadQuarantinedEmails();
    }
  }, [canAdminEmail, pagination.page, filterStatus, filterRiskLevel]);

  const loadQuarantinedEmails = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: filterStatus
      });

      if (filterRiskLevel) {
        params.append('riskLevel', filterRiskLevel);
      }

      const response = await fetch(`/api/email/security/quarantine?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to load quarantined emails');
      }

      const data = await response.json();
      setEmails(data.emails);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        pages: data.pagination.pages
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSelection = (emailId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmails(prev => [...prev, emailId]);
    } else {
      setSelectedEmails(prev => prev.filter(id => id !== emailId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(emails.map(email => email.id));
    } else {
      setSelectedEmails([]);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedEmails.length === 0) {
      setError('Please select at least one email');
      return;
    }

    const reason = prompt(`Reason for ${action}:`);
    if (!reason) return;

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/email/security/quarantine', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          emailIds: selectedEmails,
          reason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} emails`);
      }

      const result = await response.json();
      setSuccess(result.message);
      setSelectedEmails([]);
      await loadQuarantinedEmails();

    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} emails`);
    } finally {
      setProcessing(false);
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

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'MICROSOFT_GRAPH': return '🔷';
      case 'GMAIL': return '📧';
      case 'IMAP': return '📬';
      case 'POP3': return '📪';
      default: return '✉️';
    }
  };

  const filteredEmails = emails.filter(email =>
    email.fromEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (email.fromName && email.fromName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!canAdminEmail) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access quarantine management.
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
          <h2 className="text-2xl font-bold">Quarantine Management</h2>
          <p className="text-gray-600">Review and manage quarantined emails</p>
        </div>
        <Button onClick={loadQuarantinedEmails} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUARANTINED">Quarantined</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedEmails.length > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('release')}
                  disabled={processing}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Release ({selectedEmails.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('delete')}
                  disabled={processing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('block_sender')}
                  disabled={processing}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Block Sender
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('whitelist_sender')}
                  disabled={processing}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Whitelist
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Quarantined Emails</h3>
              <p className="text-gray-600">No emails match your current filters.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEmails.length === filteredEmails.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEmails.includes(email.id)}
                          onCheckedChange={(checked) => handleEmailSelection(email.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {email.fromName || email.fromEmail}
                          </div>
                          {email.fromName && (
                            <div className="text-sm text-gray-600">{email.fromEmail}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={email.subject}>
                          {email.subject}
                        </div>
                        {email.attachmentCount > 0 && (
                          <div className="text-xs text-gray-600">
                            📎 {email.attachmentCount} attachment{email.attachmentCount > 1 ? 's' : ''}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {email.security ? (
                          <div className="space-y-1">
                            <Badge className={getRiskLevelColor(email.security.riskLevel)}>
                              {email.security.riskLevel}
                            </Badge>
                            <div className="text-xs text-gray-600">
                              Score: {email.security.securityScore}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline">No scan</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getProviderIcon(email.integration.provider)}</span>
                          <div className="text-sm text-gray-600">
                            {email.integration.account.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(email.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(email.createdAt).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedEmail(email)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
                    {pagination.total} emails
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

      {/* Email Detail Modal - Simple implementation */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Email Details</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedEmail(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">From</Label>
                  <p>{selectedEmail.fromName || selectedEmail.fromEmail}</p>
                  {selectedEmail.fromName && (
                    <p className="text-sm text-gray-600">{selectedEmail.fromEmail}</p>
                  )}
                </div>
                <div>
                  <Label className="font-semibold">Date</Label>
                  <p>{new Date(selectedEmail.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <Label className="font-semibold">Subject</Label>
                <p>{selectedEmail.subject}</p>
              </div>

              {selectedEmail.security && (
                <div>
                  <Label className="font-semibold">Security Analysis</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={getRiskLevelColor(selectedEmail.security.riskLevel)}>
                        {selectedEmail.security.riskLevel}
                      </Badge>
                      <span>Risk Score: {selectedEmail.security.securityScore}/100</span>
                    </div>
                    
                    {selectedEmail.security.threats.length > 0 && (
                      <div>
                        <Label className="text-red-600">Threats</Label>
                        <ul className="list-disc pl-4">
                          {selectedEmail.security.threats.map((threat, index) => (
                            <li key={index} className="text-sm">{threat}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedEmail.security.warnings.length > 0 && (
                      <div>
                        <Label className="text-orange-600">Warnings</Label>
                        <ul className="list-disc pl-4">
                          {selectedEmail.security.warnings.map((warning, index) => (
                            <li key={index} className="text-sm">{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleBulkAction('release');
                    setSelectedEmail(null);
                  }}
                >
                  Release
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleBulkAction('delete');
                    setSelectedEmail(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium ${className}`}>{children}</div>;
}