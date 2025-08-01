"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save, 
  X, 
  Copy,
  Tag,
  Mail,
  Info,
  Lightbulb,
  FileText,
  Settings
} from "lucide-react";

interface CreateEmailTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateCreated: () => void;
}

interface TemplateSuggestion {
  name: string;
  type: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  description: string;
  variables: string[];
}

const TEMPLATE_SUGGESTIONS: TemplateSuggestion[] = [
  {
    name: "Welcome New User",
    type: "ACCOUNT_WELCOME",
    subject: "Welcome to {{systemName}} - Your account is ready!",
    description: "Welcome email for manually created user accounts with login credentials",
    variables: ["systemName", "userName", "accountName", "loginEmail", "temporaryPassword", "loginUrl", "createdByName", "createdByEmail"],
    htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #333; margin-bottom: 10px;">{{systemName}}</h1>
    <p style="color: #666; font-size: 16px;">Welcome to the team!</p>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
    <h2 style="color: #333; margin-top: 0;">Hello {{userName}}!</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #555;">
      Your account has been created for <strong>{{accountName}}</strong>. 
      You can now log in and start using the system.
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #555;">
      <strong>Created by:</strong> {{createdByName}} ({{createdByEmail}})
    </p>
  </div>

  <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
    <h3 style="color: #333; margin-top: 0;">Your Login Details</h3>
    <p><strong>Email:</strong> {{loginEmail}}</p>
    <p><strong>Temporary Password:</strong> {{temporaryPassword}}</p>
    <p style="font-size: 12px; color: #888; font-style: italic;">
      You will be required to change this password when you first log in.
    </p>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{loginUrl}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
      Login Now
    </a>
  </div>
</div>`,
    textBody: `Welcome to {{systemName}}!

Hello {{userName}},

Your account has been created for {{accountName}}. You can now log in and start using the system.

Created by: {{createdByName}} ({{createdByEmail}})

Your Login Details:
- Email: {{loginEmail}}
- Temporary Password: {{temporaryPassword}}

Note: You will be required to change this password when you first log in.

Login here: {{loginUrl}}

If you have any questions, please contact your administrator.`
  },
  {
    name: "User Invitation",
    type: "USER_INVITATION",
    subject: "You're invited to join {{accountName}} on {{systemName}}",
    description: "Invitation email for new users to join an account",
    variables: ["systemName", "userName", "accountName", "inviterName", "inviterEmail", "invitationLink", "expirationDate"],
    htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #333; margin-bottom: 10px;">{{systemName}}</h1>
    <p style="color: #666; font-size: 16px;">You're Invited!</p>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
    <h2 style="color: #333; margin-top: 0;">Join {{accountName}}</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #555;">
      Hi {{userName}},
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #555;">
      You've been invited to join <strong>{{accountName}}</strong> on {{systemName}}. 
      This system will allow you to view tickets, track time, and collaborate with your team.
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #555;">
      <strong>Invited by:</strong> {{inviterName}} ({{inviterEmail}})
    </p>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{invitationLink}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
      Accept Invitation
    </a>
  </div>
  
  <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px;">
    <p style="font-size: 14px; color: #666; text-align: center;">
      This invitation will expire on {{expirationDate}}.
    </p>
    <p style="font-size: 12px; color: #999; text-align: center;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
</div>`,
    textBody: `You're Invited to {{systemName}}!

Hi {{userName}},

You've been invited to join {{accountName}} on {{systemName}}. This system will allow you to view tickets, track time, and collaborate with your team.

Invited by: {{inviterName}} ({{inviterEmail}})

To accept this invitation, click the link below:
{{invitationLink}}

This invitation will expire on {{expirationDate}}.

If you didn't expect this invitation, you can safely ignore this email.`
  },
  {
    name: "Ticket Status Update",
    type: "TICKET_STATUS_CHANGE",
    subject: "Ticket #{{ticketNumber}} - Status Updated to {{newStatus}}",
    description: "Notification when a ticket's status changes",
    variables: ["systemName", "userName", "ticketNumber", "ticketTitle", "oldStatus", "newStatus", "updatedBy", "updatedAt", "ticketLink", "statusMessage"],
    htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #333; margin-bottom: 10px;">{{systemName}}</h1>
    <p style="color: #666; font-size: 16px;">Ticket Update Notification</p>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
    <h2 style="color: #333; margin-top: 0;">Ticket Status Updated</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #555;">
      Hi {{userName}},
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #555;">
      The status of your ticket has been updated:
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #333;">{{ticketTitle}}</h3>
      <p><strong>Ticket #:</strong> {{ticketNumber}}</p>
      <p><strong>Previous Status:</strong> <span style="color: #666;">{{oldStatus}}</span></p>
      <p><strong>New Status:</strong> <span style="color: #007bff; font-weight: bold;">{{newStatus}}</span></p>
      <p><strong>Updated by:</strong> {{updatedBy}}</p>
      <p><strong>Updated at:</strong> {{updatedAt}}</p>
    </div>
    
    {{#if statusMessage}}
    <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
      <p style="margin: 0; font-style: italic;">"{{statusMessage}}"</p>
    </div>
    {{/if}}
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ticketLink}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
      View Ticket
    </a>
  </div>
</div>`,
    textBody: `Ticket Status Updated - {{systemName}}

Hi {{userName}},

The status of your ticket has been updated:

Ticket: {{ticketTitle}}
Ticket #: {{ticketNumber}}
Previous Status: {{oldStatus}}
New Status: {{newStatus}}
Updated by: {{updatedBy}}
Updated at: {{updatedAt}}

{{#if statusMessage}}
Message: "{{statusMessage}}"
{{/if}}

View ticket: {{ticketLink}}`
  },
  {
    name: "Password Reset",
    type: "PASSWORD_RESET",
    subject: "Reset your {{systemName}} password",
    description: "Password reset email with secure reset link",
    variables: ["systemName", "userName", "resetLink", "expirationTime", "userEmail"],
    htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #333; margin-bottom: 10px;">{{systemName}}</h1>
    <p style="color: #666; font-size: 16px;">Password Reset Request</p>
  </div>
  
  <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
    <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #555;">
      Hi {{userName}},
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #555;">
      We received a request to reset the password for your account ({{userEmail}}).
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #555;">
      Click the button below to create a new password:
    </p>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{resetLink}}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
      Reset Password
    </a>
  </div>
  
  <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px;">
    <p style="font-size: 14px; color: #666; text-align: center;">
      This reset link will expire in {{expirationTime}}.
    </p>
    <p style="font-size: 12px; color: #999; text-align: center;">
      If you didn't request a password reset, you can safely ignore this email.
    </p>
  </div>
</div>`,
    textBody: `Reset Your {{systemName}} Password

Hi {{userName}},

We received a request to reset the password for your account ({{userEmail}}).

To reset your password, click the link below:
{{resetLink}}

This reset link will expire in {{expirationTime}}.

If you didn't request a password reset, you can safely ignore this email.`
  }
];

const TEMPLATE_VARIABLES = {
  "System & App": [
    { tag: "{{systemName}}", description: "Name of the application/system", example: "Service Vault" },
    { tag: "{{appUrl}}", description: "Base URL of the application", example: "https://app.example.com" },
    { tag: "{{supportEmail}}", description: "Support contact email", example: "support@example.com" },
    { tag: "{{companyName}}", description: "Company name", example: "Acme Corp" }
  ],
  "User Information": [
    { tag: "{{userName}}", description: "Full name of the user", example: "John Doe" },
    { tag: "{{userEmail}}", description: "Email address of the user", example: "john@example.com" },
    { tag: "{{userId}}", description: "Unique user identifier", example: "user_123456" },
    { tag: "{{userRole}}", description: "User's role in the system", example: "Account Manager" }
  ],
  "Account Information": [
    { tag: "{{accountName}}", description: "Name of the account/organization", example: "Tech Solutions Inc" },
    { tag: "{{accountId}}", description: "Unique account identifier", example: "acc_789012" },
    { tag: "{{accountType}}", description: "Type of account", example: "Organization" },
    { tag: "{{parentAccountName}}", description: "Parent account name (for subsidiaries)", example: "Tech Solutions Global" }
  ],
  "Authentication & Security": [
    { tag: "{{loginUrl}}", description: "URL to login page", example: "https://app.example.com/login" },
    { tag: "{{temporaryPassword}}", description: "Temporary password for new accounts", example: "TempPass123!" },
    { tag: "{{invitationLink}}", description: "Link to accept invitation", example: "https://app.example.com/accept?token=..." },
    { tag: "{{resetLink}}", description: "Password reset link", example: "https://app.example.com/reset?token=..." },
    { tag: "{{expirationDate}}", description: "When the link/token expires", example: "January 15, 2024" },
    { tag: "{{expirationTime}}", description: "Time until expiration", example: "24 hours" }
  ],
  "Tickets & Support": [
    { tag: "{{ticketNumber}}", description: "Ticket number/ID", example: "T-001" },
    { tag: "{{ticketTitle}}", description: "Title of the ticket", example: "Login Issue" },
    { tag: "{{ticketDescription}}", description: "Ticket description", example: "Unable to log in to the system" },
    { tag: "{{ticketStatus}}", description: "Current ticket status", example: "In Progress" },
    { tag: "{{oldStatus}}", description: "Previous ticket status", example: "Open" },
    { tag: "{{newStatus}}", description: "New ticket status", example: "Resolved" },
    { tag: "{{ticketPriority}}", description: "Ticket priority level", example: "High" },
    { tag: "{{ticketLink}}", description: "Direct link to the ticket", example: "https://app.example.com/tickets/123" },
    { tag: "{{assigneeName}}", description: "Name of assigned user", example: "Jane Smith" },
    { tag: "{{statusMessage}}", description: "Optional status update message", example: "Fixed the authentication issue" }
  ],
  "Time & Billing": [
    { tag: "{{totalHours}}", description: "Total hours worked", example: "40.5" },
    { tag: "{{billableHours}}", description: "Billable hours", example: "35.0" },
    { tag: "{{nonBillableHours}}", description: "Non-billable hours", example: "5.5" },
    { tag: "{{timeEntryCount}}", description: "Number of time entries", example: "12" },
    { tag: "{{periodStart}}", description: "Start of billing period", example: "January 1, 2024" },
    { tag: "{{periodEnd}}", description: "End of billing period", example: "January 31, 2024" },
    { tag: "{{approvalStatus}}", description: "Time entry approval status", example: "approved" },
    { tag: "{{approverName}}", description: "Name of the approver", example: "Manager Name" }
  ],
  "Invoicing": [
    { tag: "{{invoiceNumber}}", description: "Invoice number", example: "INV-2024-001" },
    { tag: "{{invoiceDate}}", description: "Date invoice was generated", example: "January 15, 2024" },
    { tag: "{{dueDate}}", description: "Invoice due date", example: "February 15, 2024" },
    { tag: "{{totalAmount}}", description: "Total invoice amount", example: "2,450.00" },
    { tag: "{{subtotal}}", description: "Invoice subtotal", example: "2,200.00" },
    { tag: "{{taxAmount}}", description: "Tax amount", example: "250.00" },
    { tag: "{{invoiceLink}}", description: "Link to view invoice", example: "https://app.example.com/invoices/123" },
    { tag: "{{downloadLink}}", description: "Link to download PDF", example: "https://app.example.com/invoices/123/pdf" },
    { tag: "{{addonCount}}", description: "Number of additional items", example: "3" }
  ],
  "People & Actions": [
    { tag: "{{createdByName}}", description: "Name of person who created/invited", example: "Admin User" },
    { tag: "{{createdByEmail}}", description: "Email of creator", example: "admin@example.com" },
    { tag: "{{inviterName}}", description: "Name of person sending invitation", example: "Team Lead" },
    { tag: "{{inviterEmail}}", description: "Email of inviter", example: "lead@example.com" },
    { tag: "{{updatedBy}}", description: "Who made the update", example: "Support Agent" },
    { tag: "{{updatedAt}}", description: "When the update occurred", example: "January 15, 2024 at 10:30 AM" }
  ],
  "Dates & Times": [
    { tag: "{{currentDate}}", description: "Current date", example: "January 15, 2024" },
    { tag: "{{currentTime}}", description: "Current time", example: "10:30 AM" },
    { tag: "{{year}}", description: "Current year", example: "2024" },
    { tag: "{{timestamp}}", description: "Full timestamp", example: "2024-01-15 10:30:00" }
  ]
};

export function CreateEmailTemplateDialog({ open, onOpenChange, onTemplateCreated }: CreateEmailTemplateDialogProps) {
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<TemplateSuggestion | null>(null);

  const templateTypes = [
    { value: "USER_INVITATION", label: "User Invitation" },
    { value: "ACCOUNT_WELCOME", label: "Account Welcome" },
    { value: "TICKET_STATUS_CHANGE", label: "Ticket Status Change" },
    { value: "TIME_ENTRY_APPROVAL", label: "Time Entry Approval" },
    { value: "INVOICE_GENERATED", label: "Invoice Generated" },
    { value: "PASSWORD_RESET", label: "Password Reset" },
    { value: "SYSTEM_NOTIFICATION", label: "System Notification" }
  ];

  const handleSuggestionSelect = (suggestion: TemplateSuggestion) => {
    setSelectedSuggestion(suggestion);
    setTemplateName(suggestion.name);
    setTemplateType(suggestion.type);
    setSubject(suggestion.subject);
    setHtmlBody(suggestion.htmlBody);
    setTextBody(suggestion.textBody);
    setActiveTab("details");
  };

  const copyVariableTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
  };

  const handleSubmit = async () => {
    if (!templateName || !templateType || !subject) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          type: templateType,
          subject,
          htmlBody,
          textBody,
          status: 'ACTIVE'
        })
      });

      if (response.ok) {
        onTemplateCreated();
        onOpenChange(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTemplateName("");
    setTemplateType("");
    setSubject("");
    setHtmlBody("");
    setTextBody("");
    setSelectedSuggestion(null);
    setActiveTab("details");
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Create Email Template</span>
          </DialogTitle>
          <DialogDescription>
            Create a new email template with dynamic content and variables.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="suggestions">
              <Lightbulb className="mr-2 h-4 w-4" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="details">
              <FileText className="mr-2 h-4 w-4" />
              Template Details
            </TabsTrigger>
            <TabsTrigger value="variables">
              <Tag className="mr-2 h-4 w-4" />
              Variables
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Settings className="mr-2 h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[60vh]">
            <TabsContent value="suggestions" className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Info className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-muted-foreground">
                  Choose from pre-built templates to get started quickly. You can customize them after selection.
                </p>
              </div>
              
              <div className="grid gap-4">
                {TEMPLATE_SUGGESTIONS.map((suggestion, index) => (
                  <Card key={index} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleSuggestionSelect(suggestion)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{suggestion.name}</CardTitle>
                        <Badge variant="outline">{suggestion.type.replace(/_/g, ' ')}</Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {suggestion.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.variables.slice(0, 6).map((variable) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                        {suggestion.variables.length > 6 && (
                          <Badge variant="secondary" className="text-xs">
                            +{suggestion.variables.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Template Name *</Label>
                  <Input
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Enter template name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="templateType">Template Type *</Label>
                  <Select value={templateType} onValueChange={setTemplateType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template type" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject (can include {{variables}})"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="htmlBody">HTML Body</Label>
                <Textarea
                  id="htmlBody"
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  placeholder="Enter HTML email content with {{variables}}"
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="textBody">Plain Text Body (Optional)</Label>
                <Textarea
                  id="textBody"
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  placeholder="Enter plain text version (fallback for email clients that don't support HTML)"
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="variables" className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Tag className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-muted-foreground">
                  Click on any variable to copy it to your clipboard. Use these in your subject and body content.
                </p>
              </div>

              <div className="space-y-6">
                {Object.entries(TEMPLATE_VARIABLES).map(([category, variables]) => (
                  <div key={category}>
                    <h4 className="font-semibold text-sm mb-3 text-gray-700">{category}</h4>
                    <div className="grid gap-2">
                      {variables.map((variable) => (
                        <div
                          key={variable.tag}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => copyVariableTag(variable.tag)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">
                                {variable.tag}
                              </code>
                              <Copy className="h-3 w-3 text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{variable.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              <strong>Example:</strong> {variable.example}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-muted-foreground">
                  Preview how your template will look. Variables will be replaced with actual values when sent.
                </p>
              </div>

              {subject && (
                <div className="space-y-2">
                  <Label>Subject Preview</Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    <code className="text-sm">{subject}</code>
                  </div>
                </div>
              )}

              {htmlBody && (
                <div className="space-y-2">
                  <Label>HTML Content Preview</Label>
                  <div className="p-4 bg-white border rounded max-h-96 overflow-y-auto">
                    <div 
                      dangerouslySetInnerHTML={{ __html: htmlBody }}
                      className="prose prose-sm max-w-none"
                    />
                  </div>
                </div>
              )}

              {textBody && (
                <div className="space-y-2">
                  <Label>Plain Text Preview</Label>
                  <div className="p-3 bg-gray-50 rounded border max-h-48 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap">{textBody}</pre>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!templateName || !templateType || !subject || isLoading}
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Creating...' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}