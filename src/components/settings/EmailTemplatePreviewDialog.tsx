"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  X, 
  Eye,
  Mail,
  FileText,
  Code,
  Info,
  User,
  Calendar
} from "lucide-react";

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

interface EmailTemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
}

// Sample data for preview
const SAMPLE_VARIABLES = {
  systemName: 'Service Vault',
  userName: 'John Doe',
  userEmail: 'john.doe@example.com',
  accountName: 'Acme Corporation',
  accountId: 'acc_123456',
  loginUrl: 'https://app.example.com/login',
  temporaryPassword: 'TempPass123!',
  invitationLink: 'https://app.example.com/accept?token=abc123',
  expirationDate: 'January 31, 2024',
  inviterName: 'Jane Smith',
  inviterEmail: 'jane.smith@acme.com',
  ticketNumber: 'T-001',
  ticketTitle: 'Login Issue Resolution',
  ticketStatus: 'In Progress',
  oldStatus: 'Open',
  newStatus: 'Resolved',
  ticketLink: 'https://app.example.com/tickets/123',
  updatedBy: 'Support Agent',
  updatedAt: 'January 15, 2024 at 2:30 PM',
  statusMessage: 'Issue has been resolved. Please try logging in again.',
  totalHours: '8.5',
  billableHours: '7.0',
  approvalStatus: 'approved',
  approverName: 'Manager Smith',
  invoiceNumber: 'INV-2024-001',
  invoiceDate: 'January 15, 2024',
  totalAmount: '1,250.00',
  invoiceLink: 'https://app.example.com/invoices/123',
  createdByName: 'Admin User',
  createdByEmail: 'admin@acme.com',
  currentDate: new Date().toLocaleDateString(),
  currentTime: new Date().toLocaleTimeString()
};

export function EmailTemplatePreviewDialog({ open, onOpenChange, template }: EmailTemplatePreviewDialogProps) {
  const [activeTab, setActiveTab] = useState("preview");

  if (!template) return null;

  // Process template with sample variables
  const processTemplate = (content: string) => {
    let processed = content;
    Object.entries(SAMPLE_VARIABLES).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value);
    });
    return processed;
  };

  const processedSubject = processTemplate(template.subject);
  const processedHtmlBody = processTemplate(template.htmlBody);
  const processedTextBody = template.textBody ? processTemplate(template.textBody) : '';

  const getTemplateTypeDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      'USER_INVITATION': 'Sent when inviting users to join an account',
      'ACCOUNT_WELCOME': 'Sent when administrators create user accounts manually',
      'TICKET_STATUS_CHANGE': 'Sent when ticket status is updated',
      'TIME_ENTRY_APPROVAL': 'Sent when time entries are approved or rejected',
      'INVOICE_GENERATED': 'Sent when new invoices are generated',
      'PASSWORD_RESET': 'Sent for password reset requests',
      'SYSTEM_NOTIFICATION': 'General system notifications'
    };
    return descriptions[type] || 'System email template';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVariablesList = () => {
    try {
      const variables = template.variables;
      if (typeof variables === 'object' && variables !== null) {
        return Object.keys(variables);
      }
      return [];
    } catch {
      return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Preview Email Template</span>
          </DialogTitle>
          <DialogDescription>
            Preview how this template will appear to recipients with sample data.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preview">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="details">
              <Info className="mr-2 h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="source">
              <Code className="mr-2 h-4 w-4" />
              Source
            </TabsTrigger>
            <TabsTrigger value="variables">
              <FileText className="mr-2 h-4 w-4" />
              Variables
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[60vh]">
            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Email Preview</CardTitle>
                  <CardDescription>
                    This is how the email will appear to recipients (using sample data)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Subject Preview */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Subject Line</Label>
                    <div className="p-3 bg-gray-50 rounded border">
                      <div className="font-medium">{processedSubject}</div>
                    </div>
                  </div>

                  {/* HTML Preview */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email Content</Label>
                    <div className="border rounded bg-white">
                      <div 
                        dangerouslySetInnerHTML={{ __html: processedHtmlBody }}
                        className="p-4 prose prose-sm max-w-none"
                        style={{ fontFamily: 'Arial, sans-serif' }}
                      />
                    </div>
                  </div>

                  {/* Text Preview (if available) */}
                  {processedTextBody && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Plain Text Version</Label>
                      <div className="p-3 bg-gray-50 rounded border text-sm font-mono max-h-48 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{processedTextBody}</pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Template Information</span>
                    <div className="flex items-center space-x-2">
                      {template.isDefault && (
                        <Badge variant="default">Default</Badge>
                      )}
                      <Badge variant={template.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {template.status}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Template Name</Label>
                      <p className="mt-1">{template.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Template Type</Label>
                      <p className="mt-1">{template.type.replace(/_/g, ' ')}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-600">Description</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getTemplateTypeDescription(template.type)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Created By</Label>
                      <div className="mt-1 flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{template.creator.name}</span>
                        <span className="text-gray-400">({template.creator.email})</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Created Date</Label>
                      <div className="mt-1 flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(template.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {template.updatedAt !== template.createdAt && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Last Updated</Label>
                      <div className="mt-1 flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(template.updatedAt)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="source" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Template Source Code</CardTitle>
                  <CardDescription>
                    Raw template content with variable placeholders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Subject Template</Label>
                    <div className="p-3 bg-gray-50 rounded border">
                      <code className="text-sm">{template.subject}</code>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">HTML Body</Label>
                    <div className="p-3 bg-gray-50 rounded border max-h-96 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {template.htmlBody}
                      </pre>
                    </div>
                  </div>

                  {template.textBody && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Plain Text Body</Label>
                      <div className="p-3 bg-gray-50 rounded border max-h-48 overflow-y-auto">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {template.textBody}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variables" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Template Variables</CardTitle>
                  <CardDescription>
                    Variables used in this template and their sample values
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getVariablesList().length > 0 ? (
                      getVariablesList().map((variable) => (
                        <div key={variable} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center space-x-3">
                            <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">
                              {`{{${variable}}}`}
                            </code>
                          </div>
                          <div className="text-sm text-gray-600">
                            {SAMPLE_VARIABLES[variable as keyof typeof SAMPLE_VARIABLES] || 'Sample value'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <p>No variables detected in this template</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}