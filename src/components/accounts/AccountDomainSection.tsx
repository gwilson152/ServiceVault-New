'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Mail, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  ExternalLink,
  Info,
  Zap
} from 'lucide-react';

interface DomainMapping {
  id: string;
  domain: string;
  accountId: string;
  priority: number;
  isActive: boolean;
  account: {
    id: string;
    name: string;
    companyName?: string;
  };
}

interface AccountDomainSectionProps {
  accountId: string;
  initialDomains?: string;
  canEdit: boolean;
}

export function AccountDomainSection({ accountId, initialDomains, canEdit }: AccountDomainSectionProps) {
  const [domainsText, setDomainsText] = useState(initialDomains || '');
  const [mappings, setMappings] = useState<DomainMapping[]>([]);
  const [conflicts, setConflicts] = useState<DomainMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDomainMappings();
  }, [accountId]);

  const loadDomainMappings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/email/domain-mappings');
      if (response.ok) {
        const data = await response.json();
        const allMappings = data.mappings || [];
        
        // Filter mappings for this account
        const accountMappings = allMappings.filter((m: DomainMapping) => m.accountId === accountId);
        setMappings(accountMappings);
        
        // Check for conflicts with other accounts
        const currentDomains = domainsText.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
        const conflictMappings = allMappings.filter((m: DomainMapping) => 
          m.accountId !== accountId && 
          currentDomains.includes(m.domain.toLowerCase())
        );
        setConflicts(conflictMappings);
      }
    } catch (err) {
      setError('Failed to load domain mappings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!canEdit) return;

    try {
      setSaving(true);
      setError(null);

      // Save to legacy account domains field
      const accountResponse = await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domains: domainsText.trim()
        })
      });

      if (!accountResponse.ok) {
        throw new Error('Failed to update account domains');
      }

      // Also update the global domain mappings
      const domains = domainsText.split(',').map(d => d.trim()).filter(Boolean);
      for (const domain of domains) {
        try {
          await fetch('/api/admin/email/domain-mappings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              domain: domain.toLowerCase(),
              accountId,
              priority: 0,
              isActive: true
            })
          });
        } catch (err) {
          // Domain might already exist, that's okay
          console.warn(`Could not create mapping for domain ${domain}:`, err);
        }
      }

      await loadDomainMappings();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save domains');
    } finally {
      setSaving(false);
    }
  };

  const handleTestDomain = () => {
    if (!domainsText.trim()) {
      alert('Please enter some domains first');
      return;
    }

    const domains = domainsText.split(',').map(d => d.trim()).filter(Boolean);
    const testEmail = prompt('Enter an email address to test domain matching:');
    if (testEmail) {
      const emailDomain = testEmail.split('@')[1]?.toLowerCase();
      if (emailDomain) {
        const matches = domains.some(domain => domain.toLowerCase() === emailDomain);
        if (matches) {
          alert(`✅ Email "${testEmail}" matches the configured domains and would be assigned to this account.`);
        } else {
          alert(`❌ Email "${testEmail}" does not match any configured domains.`);
        }
      }
    }
  };

  const handleManageGlobally = () => {
    window.location.href = '/settings?tab=email&subtab=domains';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Email Domain Configuration
            </CardTitle>
            <CardDescription>
              Configure email domains for automatic user assignment and email routing
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleManageGlobally}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Globally
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Current Global Mappings */}
        {mappings.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Active Domain Mappings</Label>
            <div className="flex flex-wrap gap-2">
              {mappings.map((mapping) => (
                <Badge key={mapping.id} variant={mapping.isActive ? 'default' : 'secondary'}>
                  {mapping.domain}
                  {mapping.priority > 0 && <span className="ml-1 text-xs">P{mapping.priority}</span>}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Conflict Detection */}
        {conflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Domain Conflicts Detected!</strong></p>
                <p>The following domains are already mapped to other accounts:</p>
                <ul className="list-disc list-inside space-y-1">
                  {conflicts.map((conflict) => (
                    <li key={conflict.id}>
                      <strong>{conflict.domain}</strong> → {conflict.account.name}
                    </li>
                  ))}
                </ul>
                <p className="text-xs">Use the global domain manager to resolve conflicts and set priorities.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Domain Input */}
        <div className="space-y-2">
          <Label htmlFor="domains">Email Domains (comma-separated)</Label>
          <Textarea
            id="domains"
            value={domainsText}
            onChange={(e) => setDomainsText(e.target.value)}
            placeholder="example.com, company.org, subdomain.company.com"
            disabled={!canEdit || loading}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Users with email addresses from these domains will be automatically assigned to this account.
            For complex routing (subdomains, priorities), use the global domain manager.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleSave}
            disabled={saving || !canEdit}
          >
            {saving ? 'Saving...' : 'Save Domains'}
          </Button>
          
          <Button variant="outline" onClick={handleTestDomain} disabled={loading}>
            <Zap className="h-4 w-4 mr-2" />
            Test Domain Matching
          </Button>
        </div>

        {/* Info Box */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>How Domain Routing Works:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Simple domains:</strong> Users with matching email domains are assigned to this account</li>
                <li><strong>Subdomain priorities:</strong> More specific domains (support.company.com) take precedence</li>
                <li><strong>Email integration:</strong> Incoming emails are routed to the matching account</li>
                <li><strong>Conflict resolution:</strong> Use global management to handle overlapping domains</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}