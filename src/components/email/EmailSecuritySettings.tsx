'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Mail, 
  FileText, 
  Link, 
  User, 
  Save,
  RotateCcw,
  TestTube,
  Loader2,
  Plus,
  Trash2
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface SecurityConfig {
  enableSpamFiltering: boolean;
  spamThreshold: number;
  spamQuarantineThreshold: number;
  enableContentScanning: boolean;
  scanAttachments: boolean;
  maxAttachmentSize: number;
  blockedFileTypes: string[];
  quarantineFileTypes: string[];
  enableUrlScanning: boolean;
  urlScanTimeout: number;
  enableSenderReputation: boolean;
  reputationThreshold: number;
  enableContentFiltering: boolean;
  suspiciousPatterns: string[];
  autoQuarantineSuspicious: boolean;
  autoDeleteMalicious: boolean;
  notifyAdminOnThreats: boolean;
  whitelistedDomains: string[];
  whitelistedSenders: string[];
  blacklistedDomains: string[];
  blacklistedSenders: string[];
}

interface SecurityStats {
  totalChecked: number;
  threatsBlocked: number;
  spamDetected: number;
  maliciousAttachments: number;
  averageRiskScore: number;
  riskDistribution: Record<string, number>;
}

interface EmailSecuritySettingsProps {
  className?: string;
}

export function EmailSecuritySettings({ className }: EmailSecuritySettingsProps) {
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  
  const { canAdminEmail } = usePermissions();

  useEffect(() => {
    if (canAdminEmail) {
      loadData();
    }
  }, [canAdminEmail]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [configResponse, statsResponse] = await Promise.all([
        fetch('/api/email/security'),
        fetch('/api/email/security?includeStats=true')
      ]);

      if (!configResponse.ok) throw new Error('Failed to load security configuration');
      
      const configData = await configResponse.json();
      setConfig(configData.config);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (updates: Partial<SecurityConfig>) => {
    if (config) {
      setConfig({ ...config, ...updates });
    }
  };

  const addToList = (field: keyof SecurityConfig, value: string) => {
    if (config && value.trim()) {
      const currentList = config[field] as string[];
      if (!currentList.includes(value.trim())) {
        updateConfig({
          [field]: [...currentList, value.trim()]
        });
      }
    }
  };

  const removeFromList = (field: keyof SecurityConfig, index: number) => {
    if (config) {
      const currentList = config[field] as string[];
      updateConfig({
        [field]: currentList.filter((_, i) => i !== index)
      });
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/email/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save configuration');
      }

      setSuccess('Security configuration saved successfully');
      await loadData(); // Reload to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Reset all security settings to defaults? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      // This would reset to default configuration
      const defaultConfig = {
        enableSpamFiltering: true,
        spamThreshold: 75,
        spamQuarantineThreshold: 90,
        enableContentScanning: true,
        scanAttachments: true,
        maxAttachmentSize: 25 * 1024 * 1024,
        blockedFileTypes: ['exe', 'scr', 'bat', 'cmd', 'com', 'pif', 'vbs', 'js', 'jar'],
        quarantineFileTypes: ['zip', 'rar', '7z', 'tar', 'gz'],
        enableUrlScanning: true,
        urlScanTimeout: 5000,
        enableSenderReputation: true,
        reputationThreshold: 40,
        enableContentFiltering: true,
        suspiciousPatterns: [],
        autoQuarantineSuspicious: true,
        autoDeleteMalicious: false,
        notifyAdminOnThreats: true,
        whitelistedDomains: [],
        whitelistedSenders: [],
        blacklistedDomains: ['tempmail.org', '10minutemail.com', 'guerrillamail.com'],
        blacklistedSenders: []
      };

      const response = await fetch('/api/email/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultConfig)
      });

      if (!response.ok) throw new Error('Failed to reset configuration');

      setSuccess('Configuration reset to defaults');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  const testSecurityScan = async () => {
    setTesting(true);
    setTestResults(null);

    try {
      const testEmail = {
        fromEmail: 'test@example.com',
        fromName: 'Test Sender',
        subject: 'Test security scan',
        textBody: 'This is a test email for security scanning.',
        attachments: []
      };

      const response = await fetch('/api/email/security/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          integrationId: 'test'
        })
      });

      if (!response.ok) throw new Error('Security test failed');
      
      const results = await response.json();
      setTestResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Security test failed');
    } finally {
      setTesting(false);
    }
  };

  if (!canAdminEmail) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to manage email security settings.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading || !config) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
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

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Security Settings</h2>
          <p className="text-gray-600">Configure spam filtering, threat detection, and security policies</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Defaults
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Security Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalChecked}</div>
                <div className="text-sm text-gray-600">Emails Scanned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.threatsBlocked}</div>
                <div className="text-sm text-gray-600">Threats Blocked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.spamDetected}</div>
                <div className="text-sm text-gray-600">Spam Detected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.averageRiskScore.toFixed(1)}</div>
                <div className="text-sm text-gray-600">Avg Risk Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="filtering" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="filtering">
            <Mail className="h-4 w-4 mr-2" />
            Filtering
          </TabsTrigger>
          <TabsTrigger value="attachments">
            <FileText className="h-4 w-4 mr-2" />
            Attachments
          </TabsTrigger>
          <TabsTrigger value="urls">
            <Link className="h-4 w-4 mr-2" />
            URLs
          </TabsTrigger>
          <TabsTrigger value="senders">
            <User className="h-4 w-4 mr-2" />
            Senders
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="h-4 w-4 mr-2" />
            Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="filtering" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spam Filtering</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableSpamFiltering">Enable spam filtering</Label>
                <Switch
                  id="enableSpamFiltering"
                  checked={config.enableSpamFiltering}
                  onCheckedChange={(checked) => updateConfig({ enableSpamFiltering: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Spam Threshold: {config.spamThreshold}%</Label>
                <Slider
                  value={[config.spamThreshold]}
                  onValueChange={([value]) => updateConfig({ spamThreshold: value })}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Emails with a spam score above this threshold will be marked as spam
                </p>
              </div>

              <div className="space-y-2">
                <Label>Quarantine Threshold: {config.spamQuarantineThreshold}%</Label>
                <Slider
                  value={[config.spamQuarantineThreshold]}
                  onValueChange={([value]) => updateConfig({ spamQuarantineThreshold: value })}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Emails with a spam score above this threshold will be quarantined
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Scanning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableContentScanning">Enable content scanning</Label>
                <Switch
                  id="enableContentScanning"
                  checked={config.enableContentScanning}
                  onCheckedChange={(checked) => updateConfig({ enableContentScanning: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enableContentFiltering">Enable content filtering</Label>
                <Switch
                  id="enableContentFiltering"
                  checked={config.enableContentFiltering}
                  onCheckedChange={(checked) => updateConfig({ enableContentFiltering: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoQuarantineSuspicious">Auto-quarantine suspicious emails</Label>
                <Switch
                  id="autoQuarantineSuspicious"
                  checked={config.autoQuarantineSuspicious}
                  onCheckedChange={(checked) => updateConfig({ autoQuarantineSuspicious: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notifyAdminOnThreats">Notify admin on threats</Label>
                <Switch
                  id="notifyAdminOnThreats"
                  checked={config.notifyAdminOnThreats}
                  onCheckedChange={(checked) => updateConfig({ notifyAdminOnThreats: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attachment Scanning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="scanAttachments">Scan attachments</Label>
                <Switch
                  id="scanAttachments"
                  checked={config.scanAttachments}
                  onCheckedChange={(checked) => updateConfig({ scanAttachments: checked })}
                />
              </div>

              <div>
                <Label htmlFor="maxAttachmentSize">
                  Max attachment size: {Math.round(config.maxAttachmentSize / 1024 / 1024)} MB
                </Label>
                <Slider
                  value={[config.maxAttachmentSize / 1024 / 1024]}
                  onValueChange={([value]) => updateConfig({ maxAttachmentSize: value * 1024 * 1024 })}
                  max={100}
                  step={1}
                  className="w-full mt-2"
                />
              </div>

              <div>
                <Label>Blocked File Types</Label>
                <div className="flex flex-wrap gap-1 mt-2 mb-2">
                  {config.blockedFileTypes.map((type, index) => (
                    <Badge key={index} variant="destructive" className="cursor-pointer"
                           onClick={() => removeFromList('blockedFileTypes', index)}>
                      {type} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter file extension (e.g., exe)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addToList('blockedFileTypes', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      addToList('blockedFileTypes', input.value);
                      input.value = '';
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Quarantine File Types</Label>
                <div className="flex flex-wrap gap-1 mt-2 mb-2">
                  {config.quarantineFileTypes.map((type, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer"
                           onClick={() => removeFromList('quarantineFileTypes', index)}>
                      {type} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter file extension (e.g., zip)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addToList('quarantineFileTypes', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      addToList('quarantineFileTypes', input.value);
                      input.value = '';
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="urls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>URL Scanning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableUrlScanning">Enable URL scanning</Label>
                <Switch
                  id="enableUrlScanning"
                  checked={config.enableUrlScanning}
                  onCheckedChange={(checked) => updateConfig({ enableUrlScanning: checked })}
                />
              </div>

              <div>
                <Label htmlFor="urlScanTimeout">Scan timeout: {config.urlScanTimeout}ms</Label>
                <Slider
                  value={[config.urlScanTimeout]}
                  onValueChange={([value]) => updateConfig({ urlScanTimeout: value })}
                  min={1000}
                  max={30000}
                  step={1000}
                  className="w-full mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="senders" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Whitelisted Domains</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1 mb-2 min-h-[2rem]">
                  {config.whitelistedDomains.map((domain, index) => (
                    <Badge key={index} className="bg-green-100 text-green-800 cursor-pointer"
                           onClick={() => removeFromList('whitelistedDomains', index)}>
                      {domain} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="domain.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addToList('whitelistedDomains', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      addToList('whitelistedDomains', input.value);
                      input.value = '';
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Blacklisted Domains</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1 mb-2 min-h-[2rem]">
                  {config.blacklistedDomains.map((domain, index) => (
                    <Badge key={index} className="bg-red-100 text-red-800 cursor-pointer"
                           onClick={() => removeFromList('blacklistedDomains', index)}>
                      {domain} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="spam-domain.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addToList('blacklistedDomains', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      addToList('blacklistedDomains', input.value);
                      input.value = '';
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sender Reputation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableSenderReputation">Enable sender reputation</Label>
                <Switch
                  id="enableSenderReputation"
                  checked={config.enableSenderReputation}
                  onCheckedChange={(checked) => updateConfig({ enableSenderReputation: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Reputation Threshold: {config.reputationThreshold}%</Label>
                <Slider
                  value={[config.reputationThreshold]}
                  onValueChange={([value]) => updateConfig({ reputationThreshold: value })}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Senders with reputation below this threshold will be flagged
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Test your security configuration with a sample email to ensure filters are working correctly.
              </p>

              <Button 
                onClick={testSecurityScan} 
                disabled={testing}
                className="w-full"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Security Test...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Run Security Test
                  </>
                )}
              </Button>

              {testResults && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div><strong>Risk Level:</strong> {testResults.result.riskLevel}</div>
                      <div><strong>Security Score:</strong> {testResults.result.score}/100</div>
                      <div><strong>Recommendation:</strong> {testResults.recommendation}</div>
                      {testResults.result.threats.length > 0 && (
                        <div><strong>Threats:</strong> {testResults.result.threats.join(', ')}</div>
                      )}
                      {testResults.result.warnings.length > 0 && (
                        <div><strong>Warnings:</strong> {testResults.result.warnings.join(', ')}</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}