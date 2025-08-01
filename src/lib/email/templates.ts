import { EmailTemplateType } from '@prisma/client';

export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
  required: boolean;
}

export interface DefaultTemplate {
  name: string;
  type: EmailTemplateType;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: TemplateVariable[];
}

// Default email templates
export const DEFAULT_EMAIL_TEMPLATES: DefaultTemplate[] = [
  {
    name: 'User Invitation',
    type: 'USER_INVITATION',
    subject: 'You\'re invited to join {{accountName}} on {{systemName}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">{{systemName}}</h1>
          <p style="color: #666; font-size: 16px;">Time Management & Invoicing System</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #333; margin-top: 0;">You're Invited!</h2>
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
          <a href="{{invitationLink}}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
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
      </div>
    `,
    textBody: `
You're Invited to {{systemName}}!

Hi {{userName}},

You've been invited to join {{accountName}} on {{systemName}}. This system will allow you to view tickets, track time, and collaborate with your team.

Invited by: {{inviterName}} ({{inviterEmail}})

To accept this invitation, click the link below:
{{invitationLink}}

This invitation will expire on {{expirationDate}}.

If you didn't expect this invitation, you can safely ignore this email.
    `,
    variables: [
      { name: 'systemName', description: 'Name of the system', example: 'ServiceVault', required: true },
      { name: 'userName', description: 'Name of the invited user', example: 'John Doe', required: true },
      { name: 'accountName', description: 'Name of the account/organization', example: 'Acme Corp', required: true },
      { name: 'inviterName', description: 'Name of the person sending the invitation', example: 'Jane Smith', required: true },
      { name: 'inviterEmail', description: 'Email of the person sending the invitation', example: 'jane@acme.com', required: true },
      { name: 'invitationLink', description: 'Link to accept the invitation', example: 'https://app.example.com/accept?token=xyz', required: true },
      { name: 'expirationDate', description: 'When the invitation expires', example: 'January 15, 2024', required: true }
    ]
  },
  {
    name: 'Ticket Status Update',
    type: 'TICKET_STATUS_CHANGE',
    subject: 'Ticket #{{ticketNumber}} - Status Updated to {{newStatus}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
            <p style="margin: 10px 0;"><strong>Ticket #:</strong> {{ticketNumber}}</p>
            <p style="margin: 10px 0;"><strong>Previous Status:</strong> <span style="color: #666;">{{oldStatus}}</span></p>
            <p style="margin: 10px 0;"><strong>New Status:</strong> <span style="color: #007bff; font-weight: bold;">{{newStatus}}</span></p>
            <p style="margin: 10px 0;"><strong>Updated by:</strong> {{updatedBy}}</p>
            <p style="margin: 10px 0;"><strong>Updated at:</strong> {{updatedAt}}</p>
          </div>
          
          {{#if statusMessage}}
          <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
            <p style="margin: 0; font-style: italic;">"{{statusMessage}}"</p>
          </div>
          {{/if}}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{ticketLink}}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            View Ticket
          </a>
        </div>
        
        <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            You're receiving this notification because you're associated with this ticket.
          </p>
        </div>
      </div>
    `,
    textBody: `
Ticket Status Updated - {{systemName}}

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

View ticket: {{ticketLink}}

You're receiving this notification because you're associated with this ticket.
    `,
    variables: [
      { name: 'systemName', description: 'Name of the system', example: 'ServiceVault', required: true },
      { name: 'userName', description: 'Name of the recipient', example: 'John Doe', required: true },
      { name: 'ticketNumber', description: 'Ticket number', example: 'T-001', required: true },
      { name: 'ticketTitle', description: 'Title of the ticket', example: 'Login Issue', required: true },
      { name: 'oldStatus', description: 'Previous ticket status', example: 'Open', required: true },
      { name: 'newStatus', description: 'New ticket status', example: 'In Progress', required: true },
      { name: 'updatedBy', description: 'Who updated the ticket', example: 'Jane Smith', required: true },
      { name: 'updatedAt', description: 'When the ticket was updated', example: 'January 15, 2024 at 10:30 AM', required: true },
      { name: 'ticketLink', description: 'Link to view the ticket', example: 'https://app.example.com/tickets/123', required: true },
      { name: 'statusMessage', description: 'Optional message about the status change', example: 'Working on reproducing the issue', required: false }
    ]
  },
  {
    name: 'Time Entry Approval',
    type: 'TIME_ENTRY_APPROVAL',
    subject: 'Your time entries have been {{approvalStatus}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">{{systemName}}</h1>
          <p style="color: #666; font-size: 16px;">Time Entry Notification</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #333; margin-top: 0;">Time Entries {{approvalStatus}}</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Hi {{userName}},
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Your time entries for the period {{periodStart}} to {{periodEnd}} have been {{approvalStatus}} by {{approverName}}.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Summary</h3>
            <p style="margin: 10px 0;"><strong>Total Hours:</strong> {{totalHours}}</p>
            <p style="margin: 10px 0;"><strong>Billable Hours:</strong> {{billableHours}}</p>
            <p style="margin: 10px 0;"><strong>Non-billable Hours:</strong> {{nonBillableHours}}</p>
            <p style="margin: 10px 0;"><strong>Number of Entries:</strong> {{entryCount}}</p>
          </div>
          
          {{#if approvalMessage}}
          <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
            <p style="margin: 0; font-style: italic;">"{{approvalMessage}}"</p>
          </div>
          {{/if}}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{timeEntriesLink}}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            View Time Entries
          </a>
        </div>
      </div>
    `,
    textBody: `
Time Entries {{approvalStatus}} - {{systemName}}

Hi {{userName}},

Your time entries for the period {{periodStart}} to {{periodEnd}} have been {{approvalStatus}} by {{approverName}}.

Summary:
- Total Hours: {{totalHours}}
- Billable Hours: {{billableHours}}
- Non-billable Hours: {{nonBillableHours}}
- Number of Entries: {{entryCount}}

{{#if approvalMessage}}
Message: "{{approvalMessage}}"
{{/if}}

View your time entries: {{timeEntriesLink}}
    `,
    variables: [
      { name: 'systemName', description: 'Name of the system', example: 'ServiceVault', required: true },
      { name: 'userName', description: 'Name of the recipient', example: 'John Doe', required: true },
      { name: 'approvalStatus', description: 'Approval status (approved/rejected)', example: 'approved', required: true },
      { name: 'approverName', description: 'Name of the approver', example: 'Jane Smith', required: true },
      { name: 'periodStart', description: 'Start of the time period', example: 'January 1, 2024', required: true },
      { name: 'periodEnd', description: 'End of the time period', example: 'January 7, 2024', required: true },
      { name: 'totalHours', description: 'Total hours in the entries', example: '40.5', required: true },
      { name: 'billableHours', description: 'Billable hours', example: '35.0', required: true },
      { name: 'nonBillableHours', description: 'Non-billable hours', example: '5.5', required: true },
      { name: 'entryCount', description: 'Number of time entries', example: '12', required: true },
      { name: 'timeEntriesLink', description: 'Link to view time entries', example: 'https://app.example.com/time', required: true },
      { name: 'approvalMessage', description: 'Optional message from approver', example: 'Great work this week!', required: false }
    ]
  },
  {
    name: 'Invoice Generated',
    type: 'INVOICE_GENERATED',
    subject: 'Invoice #{{invoiceNumber}} has been generated',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">{{systemName}}</h1>
          <p style="color: #666; font-size: 16px;">Invoice Notification</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #333; margin-top: 0;">New Invoice Generated</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Hi {{userName}},
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            A new invoice has been generated for {{accountName}}.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Invoice Details</h3>
            <p style="margin: 10px 0;"><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
            <p style="margin: 10px 0;"><strong>Account:</strong> {{accountName}}</p>
            <p style="margin: 10px 0;"><strong>Invoice Date:</strong> {{invoiceDate}}</p>
            <p style="margin: 10px 0;"><strong>Due Date:</strong> {{dueDate}}</p>
            <p style="margin: 10px 0;"><strong>Period:</strong> {{periodStart}} - {{periodEnd}}</p>
            <p style="margin: 10px 0;"><strong>Total Amount:</strong> ${{totalAmount}}</p>
            
            <div style="margin: 20px 0;">
              <h4 style="color: #333; margin-bottom: 10px;">Summary:</h4>
              <p style="margin: 5px 0;">• Total Hours: {{totalHours}}</p>
              <p style="margin: 5px 0;">• Billable Hours: {{billableHours}}</p>
              <p style="margin: 5px 0;">• Time Entries: {{timeEntryCount}}</p>
              <p style="margin: 5px 0;">• Additional Items: {{addonCount}}</p>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{invoiceLink}}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 10px;">
            View Invoice
          </a>
          <a href="{{downloadLink}}" 
             style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Download PDF
          </a>
        </div>
      </div>
    `,
    textBody: `
New Invoice Generated - {{systemName}}

Hi {{userName}},

A new invoice has been generated for {{accountName}}.

Invoice Details:
- Invoice Number: {{invoiceNumber}}
- Account: {{accountName}}
- Invoice Date: {{invoiceDate}}
- Due Date: {{dueDate}}
- Period: {{periodStart}} - {{periodEnd}}
- Total Amount: ${{totalAmount}}

Summary:
- Total Hours: {{totalHours}}
- Billable Hours: {{billableHours}}
- Time Entries: {{timeEntryCount}}
- Additional Items: {{addonCount}}

View invoice: {{invoiceLink}}
Download PDF: {{downloadLink}}
    `,
    variables: [
      { name: 'systemName', description: 'Name of the system', example: 'ServiceVault', required: true },
      { name: 'userName', description: 'Name of the recipient', example: 'John Doe', required: true },
      { name: 'invoiceNumber', description: 'Invoice number', example: 'INV-2024-001', required: true },
      { name: 'accountName', description: 'Name of the account', example: 'Acme Corp', required: true },
      { name: 'invoiceDate', description: 'Date the invoice was generated', example: 'January 15, 2024', required: true },
      { name: 'dueDate', description: 'Invoice due date', example: 'February 15, 2024', required: true },
      { name: 'periodStart', description: 'Start of billing period', example: 'January 1, 2024', required: true },
      { name: 'periodEnd', description: 'End of billing period', example: 'January 31, 2024', required: true },
      { name: 'totalAmount', description: 'Total invoice amount', example: '2,450.00', required: true },
      { name: 'totalHours', description: 'Total hours on invoice', example: '40.5', required: true },
      { name: 'billableHours', description: 'Billable hours', example: '35.0', required: true },
      { name: 'timeEntryCount', description: 'Number of time entries', example: '12', required: true },
      { name: 'addonCount', description: 'Number of additional items', example: '3', required: true },
      { name: 'invoiceLink', description: 'Link to view the invoice', example: 'https://app.example.com/invoices/123', required: true },
      { name: 'downloadLink', description: 'Link to download PDF', example: 'https://app.example.com/invoices/123/pdf', required: true }
    ]
  }
];

/**
 * Get template variables for a specific template type
 */
export function getTemplateVariables(type: EmailTemplateType): TemplateVariable[] {
  const template = DEFAULT_EMAIL_TEMPLATES.find(t => t.type === type);
  return template?.variables || [];
}

/**
 * Get default template for a specific type
 */
export function getDefaultTemplate(type: EmailTemplateType): DefaultTemplate | null {
  return DEFAULT_EMAIL_TEMPLATES.find(t => t.type === type) || null;
}

/**
 * Validate template variables against required variables
 */
export function validateTemplateVariables(
  type: EmailTemplateType,
  variables: Record<string, any>
): { isValid: boolean; missingRequired: string[]; warnings: string[] } {
  const templateVars = getTemplateVariables(type);
  const missingRequired: string[] = [];
  const warnings: string[] = [];

  templateVars.forEach(templateVar => {
    if (templateVar.required && !variables[templateVar.name]) {
      missingRequired.push(templateVar.name);
    }
  });

  // Check for extra variables not defined in template
  Object.keys(variables).forEach(varName => {
    if (!templateVars.find(tv => tv.name === varName)) {
      warnings.push(`Variable '${varName}' is not defined for this template type`);
    }
  });

  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    warnings
  };
}