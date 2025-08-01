"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Mail, 
  Send, 
  Eye,
  Edit3,
  Plus,
  Trash2,
  TestTube,
  Settings,
  List
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { CreateEmailTemplateDialog } from "./CreateEmailTemplateDialog";
import { EmailTemplatePreviewDialog } from "./EmailTemplatePreviewDialog";
import { EditEmailTemplateDialog } from "./EditEmailTemplateDialog";

interface EmailSettingsSectionProps {
  onSettingsChange: () => void;
}

interface SMTPSettings {
  id?: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  testMode: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  status: string;
  isDefault: boolean;
  variables: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  creator: { name: string; email: string };
}

interface QueueStats {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
}

export function EmailSettingsSection({ onSettingsChange }: EmailSettingsSectionProps) {
  const [activeTab, setActiveTab] = useState("smtp");
  const [smtpSettings, setSMTPSettings] = useState<SMTPSettings>({
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    smtpSecure: false,
    fromEmail: "",
    fromName: "",
    replyToEmail: "",
    testMode: false,
  });
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending: 0,
    sending: 0,
    sent: 0,
    failed: 0
  });
  const [testEmail, setTestEmail] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("__basic_test__");
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { canUpdateSettings } = usePermissions();

  useEffect(() => {
    loadEmailSettings();
    loadTemplates();
    loadQueueStats();
  }, []);

  const loadEmailSettings = async () => {
    try {
      const response = await fetch('/api/email/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSMTPSettings({
            id: data.settings.id,
            smtpHost: data.settings.smtpHost || "",
            smtpPort: data.settings.smtpPort || 587,
            smtpUsername: data.settings.smtpUsername || "",
            smtpPassword: "", // Never pre-fill password for security
            smtpSecure: data.settings.smtpSecure || false,
            fromEmail: data.settings.fromEmail || "",
            fromName: data.settings.fromName || "",
            replyToEmail: data.settings.replyToEmail || "",
            testMode: data.settings.testMode ?? false,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load email settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/email/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load email templates:', error);
    }
  };

  const loadQueueStats = async () => {
    try {
      const response = await fetch('/api/email/queue');
      if (response.ok) {
        const data = await response.json();
        setQueueStats(data.stats || { pending: 0, sending: 0, sent: 0, failed: 0 });
      }
    } catch (error) {
      console.error('Failed to load queue stats:', error);
    }
  };

  const handleSMTPSettingChange = (key: keyof SMTPSettings, value: string | number | boolean) => {
    setSMTPSettings(prev => ({ ...prev, [key]: value }));
    onSettingsChange();
  };

  const handleSaveSMTP = async () => {
    if (!canUpdateSettings) return;
    
    setIsSaving(true);
    try {
      const method = smtpSettings.id ? 'PUT' : 'POST';
      const response = await fetch('/api/email/settings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpSettings),
      });

      if (response.ok) {
        setSaveStatus('success');
        await loadEmailSettings(); // Reload to get the ID
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Failed to save SMTP settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const getTemplateVariables = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return {};
    
    try {
      const variables = JSON.parse(template.variables);
      return variables;
    } catch {
      return {};
    }
  };

  const getDefaultTestVariables = (templateType: string) => {
    const defaults: Record<string, Record<string, string>> = {
      'USER_INVITATION': {
        systemName: 'Service Vault',
        userName: 'John Test',
        accountName: 'Test Company',
        inviterName: 'Admin User',
        inviterEmail: 'admin@example.com',
        invitationLink: 'https://app.example.com/accept-invitation?token=test123',
        expirationDate: 'January 15, 2024'
      },
      'ACCOUNT_WELCOME': {
        systemName: 'Service Vault',
        userName: 'John Test',
        accountName: 'Test Company',
        loginEmail: testEmail || 'test@example.com',
        temporaryPassword: 'TempPass123!',
        loginUrl: 'https://app.example.com/portal/login',
        createdByName: 'Admin User',
        createdByEmail: 'admin@example.com'
      },
      'TICKET_STATUS_CHANGE': {
        systemName: 'Service Vault',
        userName: 'John Test',
        ticketNumber: 'T-001',
        ticketTitle: 'Test Ticket',
        oldStatus: 'Open',
        newStatus: 'In Progress',
        updatedBy: 'Admin User',
        updatedAt: 'January 15, 2024 at 10:30 AM',
        ticketLink: 'https://app.example.com/tickets/123',
        statusMessage: 'Starting work on this ticket now.'
      },
      'INVOICE_GENERATED': {
        systemName: 'Service Vault',
        userName: 'John Test',
        invoiceNumber: 'INV-2024-001',
        accountName: 'Test Company',
        invoiceDate: 'January 15, 2024',
        dueDate: 'February 15, 2024',
        periodStart: 'January 1, 2024',
        periodEnd: 'January 31, 2024',
        totalAmount: '2,450.00',
        totalHours: '40.5',
        billableHours: '35.0',
        timeEntryCount: '12',
        addonCount: '3',
        invoiceLink: 'https://app.example.com/invoices/123',
        downloadLink: 'https://app.example.com/invoices/123/pdf'
      }
    };
    
    return defaults[templateType] || {};
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === "__basic_test__") {
      setTestVariables({});
    } else {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        const defaultVars = getDefaultTestVariables(template.type);
        setTestVariables(defaultVars);
      }
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !canUpdateSettings) return;
    
    setIsTesting(true);
    try {
      const payload: any = { testEmail };
      
      if (selectedTemplateId && selectedTemplateId !== "__basic_test__") {
        payload.templateId = selectedTemplateId;
        payload.variables = testVariables;
      }

      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 5000);
      } else {
        setTestStatus('error');
        setTimeout(() => setTestStatus('idle'), 5000);
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 5000);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTemplateCreated = () => {
    loadTemplates(); // Refresh the templates list
  };

  const handlePreviewTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowEditDialog(true);
  };

  const handleDeleteTemplate = async (template: EmailTemplate) => {
    if (!canUpdateSettings) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/email/templates/${template.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadTemplates(); // Refresh the templates list
      } else {
        alert('Failed to delete template. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template. Please try again.');
    }
  };

  const handleTemplateUpdated = () => {
    loadTemplates(); // Refresh the templates list
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading email settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="smtp">
            <Settings className="mr-2 h-4 w-4" />
            SMTP Settings
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Mail className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="queue">
            <List className="mr-2 h-4 w-4" />
            Email Queue
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="mr-2 h-4 w-4" />
            Test Email
          </TabsTrigger>
        </TabsList>

        {/* SMTP Settings Tab */}
        <TabsContent value="smtp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">SMTP Configuration</CardTitle>
              <CardDescription>
                Configure your SMTP settings for sending emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={smtpSettings.smtpHost}
                    onChange={(e) => handleSMTPSettingChange('smtpHost', e.target.value)}
                    placeholder="smtp.example.com"
                    disabled={!canUpdateSettings}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={smtpSettings.smtpPort}
                    onChange={(e) => handleSMTPSettingChange('smtpPort', parseInt(e.target.value) || 587)}
                    placeholder="587"
                    disabled={!canUpdateSettings}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">Username (Optional)</Label>
                  <Input
                    id="smtpUsername"
                    value={smtpSettings.smtpUsername}
                    onChange={(e) => handleSMTPSettingChange('smtpUsername', e.target.value)}
                    placeholder="username@example.com (leave blank if no auth required)"
                    disabled={!canUpdateSettings}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty if your SMTP server doesn't require authentication
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">Password (Optional)</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={smtpSettings.smtpPassword}
                    onChange={(e) => handleSMTPSettingChange('smtpPassword', e.target.value)}
                    placeholder="Enter password (leave blank if no auth required)"
                    disabled={!canUpdateSettings}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty if your SMTP server doesn't require authentication
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={smtpSettings.fromEmail}
                    onChange={(e) => handleSMTPSettingChange('fromEmail', e.target.value)}
                    placeholder="noreply@example.com"
                    disabled={!canUpdateSettings}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={smtpSettings.fromName}
                    onChange={(e) => handleSMTPSettingChange('fromName', e.target.value)}
                    placeholder="Service Vault"
                    disabled={!canUpdateSettings}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="replyToEmail">Reply-To Email (Optional)</Label>
                <Input
                  id="replyToEmail"
                  type="email"
                  value={smtpSettings.replyToEmail}
                  onChange={(e) => handleSMTPSettingChange('replyToEmail', e.target.value)}
                  placeholder="support@example.com"
                  disabled={!canUpdateSettings}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="smtpSecure">Use SSL/TLS</Label>
                    <div className="text-sm text-muted-foreground">
                      Enable secure connection to SMTP server
                    </div>
                  </div>
                  <Switch
                    id="smtpSecure"
                    checked={smtpSettings.smtpSecure}
                    onCheckedChange={(checked) => handleSMTPSettingChange('smtpSecure', checked)}
                    disabled={!canUpdateSettings}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="testMode">Test Mode</Label>
                    <div className="text-sm text-muted-foreground">
                      In test mode, emails are logged but not actually sent
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {smtpSettings.testMode && (
                      <Badge variant="secondary">Test Mode</Badge>
                    )}
                    <Switch
                      id="testMode"
                      checked={smtpSettings.testMode}
                      onCheckedChange={(checked) => handleSMTPSettingChange('testMode', checked)}
                      disabled={!canUpdateSettings}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Section */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              {saveStatus === 'success' && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">SMTP settings saved successfully</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">Failed to save SMTP settings</span>
                </>
              )}
            </div>
            
            <Button 
              onClick={handleSaveSMTP}
              disabled={isSaving || !canUpdateSettings}
            >
              {isSaving && <Save className="mr-2 h-4 w-4 animate-spin" />}
              {!isSaving && <Save className="mr-2 h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Save SMTP Settings'}
            </Button>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Email Templates</h3>
              <p className="text-sm text-muted-foreground">
                Manage email templates for system notifications and user management
              </p>
            </div>
            {canUpdateSettings && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            )}
          </div>

          {/* Template Types Info */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-900">Available Template Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-blue-800">USER_INVITATION</span>
                  <span className="text-blue-700">Used when inviting users to create their own accounts</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-800">ACCOUNT_WELCOME</span>
                  <span className="text-blue-700">Used when admins create user accounts manually</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-800">PASSWORD_RESET</span>
                  <span className="text-blue-700">Used for password reset requests</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-800">TICKET_UPDATE</span>
                  <span className="text-blue-700">Used for ticket status and update notifications</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-800">INVOICE_GENERATED</span>
                  <span className="text-blue-700">Used when new invoices are generated</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription>
                        Type: {template.type} • {template.isDefault && 'Default • '}
                        Status: {template.status}
                        {template.type === 'ACCOUNT_WELCOME' && ' • Used for manual user creation'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {template.isDefault && (
                        <Badge variant="default">Default</Badge>
                      )}
                      {template.type === 'ACCOUNT_WELCOME' && (
                        <Badge variant="outline">Manual User Creation</Badge>
                      )}
                      {template.type === 'USER_INVITATION' && (
                        <Badge variant="outline">User Invitations</Badge>
                      )}
                      <Badge variant={template.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {template.status}
                      </Badge>
                      {canUpdateSettings && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            title="Preview Template"
                            onClick={() => handlePreviewTemplate(template)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            title="Edit Template"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          {!template.isDefault && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              title="Delete Template"
                              onClick={() => handleDeleteTemplate(template)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Subject:</strong> {template.subject}
                  </p>
                  {template.variables && Object.keys(template.variables).length > 0 && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Variables:</strong> {Object.keys(template.variables).join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Created by {template.creator.name} on {new Date(template.createdAt).toLocaleDateString()}
                    {template.updatedAt !== template.createdAt && (
                      <span> • Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                    )}
                  </p>
                  {template.type === 'ACCOUNT_WELCOME' && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                      This template is used when administrators create user accounts manually. 
                      It includes login credentials and welcome information.
                    </div>
                  )}
                  {template.type === 'USER_INVITATION' && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                      This template is used for invitation-based user creation. 
                      It includes invitation links and setup instructions.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {templates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No email templates configured yet.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Email Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Email Queue Status</h3>
            <p className="text-sm text-muted-foreground">
              Monitor the status of outbound emails
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pending</CardDescription>
                <CardTitle className="text-2xl">{queueStats.pending}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Sending</CardDescription>
                <CardTitle className="text-2xl">{queueStats.sending}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Sent</CardDescription>
                <CardTitle className="text-2xl text-green-600">{queueStats.sent}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Failed</CardDescription>
                <CardTitle className="text-2xl text-red-600">{queueStats.failed}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Email queue is processed automatically every few minutes.
            </p>
            <Button variant="outline" onClick={loadQueueStats}>
              Refresh Stats
            </Button>
          </div>
        </TabsContent>

        {/* Test Email Tab */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Email Configuration</CardTitle>
              <CardDescription>
                Send a test email to verify your SMTP settings and email templates are working correctly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="testEmail">Test Email Address</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    disabled={!canUpdateSettings}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="templateSelect">Email Template (Optional)</Label>
                  <Select value={selectedTemplateId} onValueChange={handleTemplateChange} disabled={!canUpdateSettings}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template to test" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__basic_test__">Basic SMTP Test (No Template)</SelectItem>
                      {templates.filter(t => t.status === 'ACTIVE').map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedTemplateId && selectedTemplateId !== "__basic_test__" && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <h4 className="font-medium text-sm">Template Variables</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    These test values will be used to populate the template. You can modify them to test different scenarios.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                    {Object.entries(testVariables).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <Label htmlFor={`var-${key}`} className="text-xs font-medium text-gray-700">
                          {key}
                        </Label>
                        <Input
                          id={`var-${key}`}
                          value={value}
                          onChange={(e) => setTestVariables(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={`Enter ${key}`}
                          className="text-sm"
                          disabled={!canUpdateSettings}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                  {testStatus === 'success' && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">
                        {selectedTemplateId && selectedTemplateId !== "__basic_test__" ? 'Template test email sent successfully' : 'Basic test email sent successfully'}
                      </span>
                    </>
                  )}
                  {testStatus === 'error' && (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600">Failed to send test email</span>
                    </>
                  )}
                </div>
                
                <Button 
                  onClick={handleTestEmail}
                  disabled={isTesting || !testEmail || !canUpdateSettings}
                >
                  {isTesting && <Send className="mr-2 h-4 w-4 animate-spin" />}
                  {!isTesting && <Send className="mr-2 h-4 w-4" />}
                  {isTesting ? 'Sending...' : (selectedTemplateId && selectedTemplateId !== "__basic_test__") ? 'Send Template Test' : 'Send Basic Test'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateEmailTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTemplateCreated={handleTemplateCreated}
      />
      
      <EmailTemplatePreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        template={selectedTemplate}
      />
      
      <EditEmailTemplateDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        template={selectedTemplate}
        onTemplateUpdated={handleTemplateUpdated}
      />
    </div>
  );
}