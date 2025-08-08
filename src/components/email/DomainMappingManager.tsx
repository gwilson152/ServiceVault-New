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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Globe, 
  Plus, 
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Search,
  Building2,
  ArrowUpDown,
  Shield
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface DomainMapping {
  id: string;
  domain: string;
  accountId: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  account: {
    id: string;
    name: string;
    companyName: string | null;
  };
}

interface Account {
  id: string;
  name: string;
  companyName: string | null;
}

interface DomainMappingManagerProps {
  className?: string;
}

export function DomainMappingManager({ className }: DomainMappingManagerProps) {
  const [domainMappings, setDomainMappings] = useState<DomainMapping[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMapping, setEditingMapping] = useState<DomainMapping | null>(null);
  const [conflicts, setConflicts] = useState<DomainMapping[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    domain: '',
    accountId: '',
    priority: 0,
    isActive: true
  });

  const { canAdminEmailGlobal } = usePermissions();

  useEffect(() => {
    if (canAdminEmailGlobal) {
      loadData();
    }
  }, [canAdminEmailGlobal]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [mappingsResponse, accountsResponse] = await Promise.all([
        fetch('/api/admin/email/domain-mappings'),
        fetch('/api/accounts/all')
      ]);

      if (!mappingsResponse.ok || !accountsResponse.ok) {
        throw new Error('Failed to load data');
      }

      const mappingsData = await mappingsResponse.json();
      const accountsData = await accountsResponse.json();

      setDomainMappings(mappingsData.mappings || []);
      setAccounts(accountsData || []);

      // Detect conflicts - domains that might overlap
      const detectedConflicts = detectDomainConflicts(mappingsData.mappings || []);
      setConflicts(detectedConflicts);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const detectDomainConflicts = (mappings: DomainMapping[]): DomainMapping[] => {
    const conflicts: DomainMapping[] = [];
    
    mappings.forEach(mapping => {
      // Check for exact duplicates
      const duplicates = mappings.filter(m => 
        m.id !== mapping.id && 
        m.domain.toLowerCase() === mapping.domain.toLowerCase() && 
        m.isActive
      );
      
      // Check for subdomain conflicts (less specific domains that might conflict)
      const subdomainConflicts = mappings.filter(m => {
        if (m.id === mapping.id || !m.isActive) return false;
        
        const domain1 = mapping.domain.toLowerCase();
        const domain2 = m.domain.toLowerCase();
        
        // Check if one is a subdomain of the other
        return (domain1.endsWith('.' + domain2) || domain2.endsWith('.' + domain1));
      });
      
      if (duplicates.length > 0 || subdomainConflicts.length > 0) {
        conflicts.push(mapping);
      }
    });
    
    return conflicts;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      
      // Validate domain format
      if (!isValidDomain(formData.domain)) {
        throw new Error('Please enter a valid domain (e.g., company.com)');
      }

      const url = editingMapping 
        ? `/api/admin/email/domain-mappings/${editingMapping.id}`
        : '/api/admin/email/domain-mappings';
      
      const method = editingMapping ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save domain mapping');
      }

      setSuccess(editingMapping ? 'Domain mapping updated successfully' : 'Domain mapping created successfully');
      setShowAddDialog(false);
      setEditingMapping(null);
      resetForm();
      await loadData();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save domain mapping');
    }
  };

  const handleEdit = (mapping: DomainMapping) => {
    setEditingMapping(mapping);
    setFormData({
      domain: mapping.domain,
      accountId: mapping.accountId,
      priority: mapping.priority,
      isActive: mapping.isActive
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (mappingId: string, domain: string) => {
    if (!confirm(`Are you sure you want to delete the domain mapping for "${domain}"?`)) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/admin/email/domain-mappings/${mappingId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete domain mapping');
      }

      setSuccess('Domain mapping deleted successfully');
      await loadData();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete domain mapping');
    }
  };

  const resetForm = () => {
    setFormData({
      domain: '',
      accountId: '',
      priority: 0,
      isActive: true
    });
  };

  const isValidDomain = (domain: string) => {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  };

  const filteredMappings = (domainMappings || []).filter(mapping =>
    mapping.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.account?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (mapping.account?.companyName && mapping.account.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getPriorityBadge = (priority: number) => {
    if (priority > 10) return <Badge variant="outline" className="bg-red-100 text-red-800">High</Badge>;
    if (priority > 0) return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge variant="outline" className="bg-green-100 text-green-800">Low</Badge>;
  };

  if (!canAdminEmailGlobal) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to manage domain mappings.
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
            Domain Mapping
          </h2>
          <p className="text-gray-600">Configure which email domains route to which accounts</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingMapping(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Domain Mapping
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMapping ? 'Edit Domain Mapping' : 'Add Domain Mapping'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  placeholder="e.g., company.com or support.company.com"
                  value={formData.domain}
                  onChange={(e) => setFormData({...formData, domain: e.target.value.toLowerCase().trim()})}
                  required
                />
                <p className="text-xs text-gray-500">
                  Enter the email domain (without @ symbol). Subdomains have higher priority than main domains.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountId">Target Account</Label>
                <Select value={formData.accountId} onValueChange={(value) => setFormData({...formData, accountId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {(accounts || []).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-2" />
                          <span>{account.name}</span>
                          {account.companyName && (
                            <span className="text-gray-500 ml-2">({account.companyName})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="999"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 0})}
                />
                <p className="text-xs text-gray-500">
                  Higher numbers = higher priority. Use for subdomain precedence (e.g., support.company.com over company.com).
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMapping ? 'Update' : 'Create'} Mapping
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Domain Mappings</CardTitle>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search domains or accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredMappings.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Domain Mappings</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'No domain mappings match your search.'
                  : 'Set up domain-to-account mappings to route emails automatically.'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Domain Mapping
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Target Account</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMappings
                  .sort((a, b) => b.priority - a.priority) // Sort by priority descending
                  .map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">{mapping.domain}</span>
                        {mapping.priority > 0 && (
                          <ArrowUpDown className="h-4 w-4 ml-2 text-blue-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{mapping.account.name}</div>
                        {mapping.account.companyName && (
                          <div className="text-sm text-gray-600">{mapping.account.companyName}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>{mapping.priority}</span>
                        {getPriorityBadge(mapping.priority)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        mapping.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }>
                        {mapping.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(mapping.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(mapping)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(mapping.id, mapping.domain)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Domain Mapping Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            How Domain Mapping Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Priority System</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Higher priority numbers take precedence</li>
                <li>• Subdomains typically have higher priority than main domains</li>
                <li>• Example: support.company.com (priority 10) vs company.com (priority 0)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Email Routing</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Emails are routed based on sender domain</li>
                <li>• Most specific domain match is used</li>
                <li>• Inactive mappings are ignored</li>
                <li>• Unmapped domains create tickets in default account</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Example Configuration</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div>• <code>support.acme.com</code> → ACME Support Team (Priority: 10)</div>
              <div>• <code>billing.acme.com</code> → ACME Billing Team (Priority: 10)</div>
              <div>• <code>acme.com</code> → ACME General (Priority: 0)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}