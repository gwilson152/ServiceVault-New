'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle,
  Mail,
  Shield,
  Settings,
  TestTube,
  Loader2
} from 'lucide-react';

interface EmailIntegrationWizardProps {
  accountId: string;
  onComplete: (integration: any) => void;
  onCancel: () => void;
  className?: string;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface IntegrationConfig {
  name: string;
  provider: 'MICROSOFT_GRAPH' | 'GMAIL' | 'IMAP' | 'POP3';
  email: string;
  serverConfig?: {
    imapServer?: string;
    imapPort?: number;
    popServer?: string;
    popPort?: number;
    smtpServer?: string;
    smtpPort?: number;
    useSSL?: boolean;
    username?: string;
    password?: string;
  };
  oauthConfig?: {
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    scopes?: string[];
  };
  processingRules: {
    autoCreateTickets: boolean;
    defaultPriority: string;
    defaultStatus: string;
    assignToUser?: string;
    categoryMapping: boolean;
    spamFiltering: boolean;
    securityScanning: boolean;
  };
  webhookConfig: {
    enabled: boolean;
    url?: string;
    events: string[];
  };
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'provider',
    title: 'Choose Provider',
    description: 'Select your email provider',
    icon: <Mail className="h-5 w-5" />
  },
  {
    id: 'connection',
    title: 'Connection Details',
    description: 'Configure connection settings',
    icon: <Settings className="h-5 w-5" />
  },
  {
    id: 'processing',
    title: 'Processing Rules',
    description: 'Set up ticket creation rules',
    icon: <CheckCircle className="h-5 w-5" />
  },
  {
    id: 'security',
    title: 'Security Settings',
    description: 'Configure security and filtering',
    icon: <Shield className="h-5 w-5" />
  },
  {
    id: 'test',
    title: 'Test & Complete',
    description: 'Test connection and finish setup',
    icon: <TestTube className="h-5 w-5" />
  }
];

const PROVIDER_OPTIONS = [
  {
    value: 'MICROSOFT_GRAPH',
    label: 'Microsoft 365 / Outlook',
    description: 'Connect to Office 365, Outlook.com, or Exchange Online',
    icon: '🔷',
    requiresOAuth: true
  },
  {
    value: 'GMAIL',
    label: 'Gmail',
    description: 'Connect to Gmail or Google Workspace',
    icon: '📧',
    requiresOAuth: true
  },
  {
    value: 'IMAP',
    label: 'IMAP',
    description: 'Connect to any email server using IMAP',
    icon: '📬',
    requiresOAuth: false
  },
  {
    value: 'POP3',
    label: 'POP3',
    description: 'Connect to any email server using POP3',
    icon: '📪',
    requiresOAuth: false
  }
];

export function EmailIntegrationWizard({ 
  accountId, 
  onComplete, 
  onCancel, 
  className 
}: EmailIntegrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<IntegrationConfig>({
    name: '',
    provider: 'MICROSOFT_GRAPH',
    email: '',
    processingRules: {
      autoCreateTickets: true,
      defaultPriority: 'MEDIUM',
      defaultStatus: 'OPEN',
      categoryMapping: true,
      spamFiltering: true,
      securityScanning: true
    },
    webhookConfig: {
      enabled: true,
      events: ['new_message', 'reply']
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const currentStepData = WIZARD_STEPS[currentStep];
  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const updateConfig = (updates: Partial<IntegrationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setErrors({});
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Provider
        if (!config.provider) {
          newErrors.provider = 'Please select a provider';
        }
        break;

      case 1: // Connection
        if (!config.name.trim()) {
          newErrors.name = 'Integration name is required';
        }
        if (!config.email.trim()) {
          newErrors.email = 'Email address is required';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email)) {
          newErrors.email = 'Please enter a valid email address';
        }

        if (config.provider === 'IMAP' || config.provider === 'POP3') {
          if (!config.serverConfig?.imapServer && !config.serverConfig?.popServer) {
            newErrors.server = 'Server address is required';
          }
          if (!config.serverConfig?.username) {
            newErrors.username = 'Username is required';
          }
          if (!config.serverConfig?.password) {
            newErrors.password = 'Password is required';
          }
        }

        if (config.provider === 'MICROSOFT_GRAPH' || config.provider === 'GMAIL') {
          if (!config.oauthConfig?.clientId) {
            newErrors.clientId = 'Client ID is required';
          }
          if (!config.oauthConfig?.clientSecret) {
            newErrors.clientSecret = 'Client secret is required';
          }
        }
        break;

      case 2: // Processing rules - no validation needed
        break;

      case 3: // Security settings - no validation needed
        break;

      case 4: // Test - require successful test
        if (!testResults?.success) {
          newErrors.test = 'Please run and pass the connection test';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResults(null);

    try {
      const response = await fetch('/api/email/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          config: {
            email: config.email,
            ...config.serverConfig,
            ...config.oauthConfig
          }
        })
      });

      const result = await response.json();
      setTestResults(result);

      if (!result.success) {
        setErrors({ test: result.error || 'Connection test failed' });
      }
    } catch (error) {
      setTestResults({ success: false, error: 'Connection test failed' });
      setErrors({ test: 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const createIntegration = async () => {
    if (!validateStep(currentStep)) return;

    setCreating(true);
    try {
      const response = await fetch('/api/email/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          ...config
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create integration');
      }

      const integration = await response.json();
      onComplete(integration);
    } catch (error) {
      setErrors({ create: error instanceof Error ? error.message : 'Failed to create integration' });
    } finally {
      setCreating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Provider Selection
        return (
          <div className="space-y-4">
            <div className="grid gap-3">
              {PROVIDER_OPTIONS.map((provider) => (
                <Card
                  key={provider.value}
                  className={`cursor-pointer transition-all ${
                    config.provider === provider.value
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => updateConfig({ provider: provider.value as any })}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{provider.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{provider.label}</h3>
                        <p className="text-sm text-gray-600">{provider.description}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {config.provider === provider.value && (
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {errors.provider && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.provider}</AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 1: // Connection Details
        const selectedProvider = PROVIDER_OPTIONS.find(p => p.value === config.provider);
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Integration Name</Label>
                <Input
                  id="name"
                  value={config.name}
                  onChange={(e) => updateConfig({ name: e.target.value })}
                  placeholder={`${selectedProvider?.label} - ${config.email}`}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={config.email}
                  onChange={(e) => updateConfig({ email: e.target.value })}
                  placeholder="user@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            {selectedProvider?.requiresOAuth ? (
              <div className="space-y-4">
                <h3 className="font-semibold">OAuth Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientId">Client ID</Label>
                    <Input
                      id="clientId"
                      value={config.oauthConfig?.clientId || ''}
                      onChange={(e) => updateConfig({
                        oauthConfig: { ...config.oauthConfig, clientId: e.target.value }
                      })}
                    />
                    {errors.clientId && (
                      <p className="text-sm text-red-600 mt-1">{errors.clientId}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="clientSecret">Client Secret</Label>
                    <Input
                      id="clientSecret"
                      type="password"
                      value={config.oauthConfig?.clientSecret || ''}
                      onChange={(e) => updateConfig({
                        oauthConfig: { ...config.oauthConfig, clientSecret: e.target.value }
                      })}
                    />
                    {errors.clientSecret && (
                      <p className="text-sm text-red-600 mt-1">{errors.clientSecret}</p>
                    )}
                  </div>
                </div>

                {config.provider === 'MICROSOFT_GRAPH' && (
                  <div>
                    <Label htmlFor="tenantId">Tenant ID (Optional)</Label>
                    <Input
                      id="tenantId"
                      value={config.oauthConfig?.tenantId || ''}
                      onChange={(e) => updateConfig({
                        oauthConfig: { ...config.oauthConfig, tenantId: e.target.value }
                      })}
                      placeholder="common"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold">Server Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="server">
                      {config.provider === 'IMAP' ? 'IMAP Server' : 'POP3 Server'}
                    </Label>
                    <Input
                      id="server"
                      value={config.provider === 'IMAP' ? 
                        config.serverConfig?.imapServer || '' : 
                        config.serverConfig?.popServer || ''
                      }
                      onChange={(e) => updateConfig({
                        serverConfig: {
                          ...config.serverConfig,
                          [config.provider === 'IMAP' ? 'imapServer' : 'popServer']: e.target.value
                        }
                      })}
                      placeholder="imap.example.com"
                    />
                    {errors.server && (
                      <p className="text-sm text-red-600 mt-1">{errors.server}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={config.provider === 'IMAP' ?
                        config.serverConfig?.imapPort || 993 :
                        config.serverConfig?.popPort || 995
                      }
                      onChange={(e) => updateConfig({
                        serverConfig: {
                          ...config.serverConfig,
                          [config.provider === 'IMAP' ? 'imapPort' : 'popPort']: parseInt(e.target.value)
                        }
                      })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={config.serverConfig?.username || ''}
                      onChange={(e) => updateConfig({
                        serverConfig: { ...config.serverConfig, username: e.target.value }
                      })}
                    />
                    {errors.username && (
                      <p className="text-sm text-red-600 mt-1">{errors.username}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={config.serverConfig?.password || ''}
                      onChange={(e) => updateConfig({
                        serverConfig: { ...config.serverConfig, password: e.target.value }
                      })}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useSSL"
                    checked={config.serverConfig?.useSSL !== false}
                    onCheckedChange={(checked) => updateConfig({
                      serverConfig: { ...config.serverConfig, useSSL: checked === true }
                    })}
                  />
                  <Label htmlFor="useSSL">Use SSL/TLS</Label>
                </div>
              </div>
            )}
          </div>
        );

      case 2: // Processing Rules
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoCreateTickets"
                  checked={config.processingRules.autoCreateTickets}
                  onCheckedChange={(checked) => updateConfig({
                    processingRules: { ...config.processingRules, autoCreateTickets: checked === true }
                  })}
                />
                <Label htmlFor="autoCreateTickets">Automatically create tickets from emails</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultPriority">Default Priority</Label>
                  <Select
                    value={config.processingRules.defaultPriority}
                    onValueChange={(value) => updateConfig({
                      processingRules: { ...config.processingRules, defaultPriority: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="defaultStatus">Default Status</Label>
                  <Select
                    value={config.processingRules.defaultStatus}
                    onValueChange={(value) => updateConfig({
                      processingRules: { ...config.processingRules, defaultStatus: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="WAITING">Waiting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="categoryMapping"
                  checked={config.processingRules.categoryMapping}
                  onCheckedChange={(checked) => updateConfig({
                    processingRules: { ...config.processingRules, categoryMapping: checked === true }
                  })}
                />
                <Label htmlFor="categoryMapping">Enable intelligent category mapping</Label>
              </div>
            </div>
          </div>
        );

      case 3: // Security Settings
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="spamFiltering"
                  checked={config.processingRules.spamFiltering}
                  onCheckedChange={(checked) => updateConfig({
                    processingRules: { ...config.processingRules, spamFiltering: checked === true }
                  })}
                />
                <Label htmlFor="spamFiltering">Enable spam filtering</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="securityScanning"
                  checked={config.processingRules.securityScanning}
                  onCheckedChange={(checked) => updateConfig({
                    processingRules: { ...config.processingRules, securityScanning: checked === true }
                  })}
                />
                <Label htmlFor="securityScanning">Enable security scanning</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="webhookEnabled"
                  checked={config.webhookConfig.enabled}
                  onCheckedChange={(checked) => updateConfig({
                    webhookConfig: { ...config.webhookConfig, enabled: checked === true }
                  })}
                />
                <Label htmlFor="webhookEnabled">Enable real-time webhooks</Label>
              </div>
            </div>
          </div>
        );

      case 4: // Test & Complete
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Connection Test</h3>
              <p className="text-sm text-gray-600">
                Test your email connection to ensure everything is configured correctly.
              </p>

              <Button 
                onClick={testConnection} 
                disabled={testing}
                className="w-full"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              {testResults && (
                <Alert variant={testResults.success ? 'default' : 'destructive'}>
                  {testResults.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {testResults.success 
                      ? 'Connection test successful! Your email integration is ready.'
                      : testResults.error || 'Connection test failed. Please check your settings.'
                    }
                  </AlertDescription>
                </Alert>
              )}

              {errors.test && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errors.test}</AlertDescription>
                </Alert>
              )}

              {errors.create && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errors.create}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                {currentStepData.icon}
                <span>{currentStepData.title}</span>
              </CardTitle>
              <p className="text-sm text-gray-600">{currentStepData.description}</p>
            </div>
            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {WIZARD_STEPS.length}
            </div>
          </div>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        
        <CardContent>
          <div className="mb-8">
            {renderStepContent()}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={currentStep === 0 ? onCancel : prevStep}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {currentStep === 0 ? 'Cancel' : 'Previous'}
            </Button>

            <Button
              onClick={currentStep === WIZARD_STEPS.length - 1 ? createIntegration : nextStep}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : currentStep === WIZARD_STEPS.length - 1 ? (
                'Create Integration'
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}