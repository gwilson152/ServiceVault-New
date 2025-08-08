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
  },
  {
    name: 'User Welcome',
    type: 'ACCOUNT_WELCOME',
    subject: 'Welcome to {{systemName}} - Your account is ready!',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">{{systemName}}</h1>
          <p style="color: #666; font-size: 16px;">Time Management & Invoicing System</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #333; margin-top: 0;">Welcome to the team!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Hi {{userName}},
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Your account has been created for <strong>{{accountName}}</strong> on {{systemName}}. 
            You can now log in and start using the system to view tickets, track time, and collaborate with your team.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            <strong>Account created by:</strong> {{createdByName}} ({{createdByEmail}})
          </p>
        </div>

        <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #333; margin-top: 0;">Your Login Details</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #555; margin-bottom: 10px;">
            <strong>Email:</strong> {{loginEmail}}
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #555; margin-bottom: 10px;">
            <strong>Temporary Password:</strong> {{temporaryPassword}}
          </p>
          <p style="font-size: 12px; color: #888; font-style: italic;">
            You will be required to change this password when you first log in.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{loginUrl}}" 
             style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Login Now
          </a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 12px; color: #888; text-align: center;">
            If you have any questions, please contact your administrator or reply to this email.
          </p>
        </div>
      </div>
    `,
    textBody: `
Welcome to {{systemName}} - Your account is ready!

Hi {{userName}},

Your account has been created for {{accountName}} on {{systemName}}. 
You can now log in and start using the system to view tickets, track time, and collaborate with your team.

Account created by: {{createdByName}} ({{createdByEmail}})

Your Login Details:
- Email: {{loginEmail}}
- Temporary Password: {{temporaryPassword}}

Note: You will be required to change this password when you first log in.

Login here: {{loginUrl}}

If you have any questions, please contact your administrator or reply to this email.
    `,
    variables: [
      { name: 'systemName', description: 'Name of the system', example: 'ServiceVault', required: true },
      { name: 'userName', description: 'Name of the new user', example: 'John Doe', required: true },
      { name: 'accountName', description: 'Name of the account', example: 'Acme Corp', required: true },
      { name: 'loginEmail', description: 'Email address for login', example: 'john@example.com', required: true },
      { name: 'temporaryPassword', description: 'Temporary password for first login', example: 'TempPass123!', required: true },
      { name: 'loginUrl', description: 'URL to login page', example: 'https://app.example.com/portal/login', required: true },
      { name: 'createdByName', description: 'Name of the administrator who created the account', example: 'Admin User', required: true },
      { name: 'createdByEmail', description: 'Email of the administrator', example: 'admin@example.com', required: true }
    ]
  },
  {
    name: 'Email Ticket Created',
    type: 'EMAIL_TICKET_CREATED',
    subject: 'Ticket #{{ticketNumber}} created from your email',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">{{systemName}}</h1>
          <p style="color: #666; font-size: 16px;">Ticket Created Notification</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #333; margin-top: 0;">✅ Ticket Created Successfully</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Hi {{senderName}},
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Thank you for contacting us! We've automatically created a support ticket from your email.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">{{ticketSubject}}</h3>
            <p style="margin: 10px 0;"><strong>Ticket Number:</strong> {{ticketNumber}}</p>
            <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #28a745;">{{ticketStatus}}</span></p>
            <p style="margin: 10px 0;"><strong>Priority:</strong> {{ticketPriority}}</p>
            <p style="margin: 10px 0;"><strong>Account:</strong> {{accountName}}</p>
            <p style="margin: 10px 0;"><strong>Created:</strong> {{createdAt}}</p>
            {{#if assignedTo}}
            <p style="margin: 10px 0;"><strong>Assigned to:</strong> {{assignedTo}}</p>
            {{/if}}
          </div>
          
          <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
            <p style="margin: 0; font-size: 14px; color: #333;">
              <strong>What happens next?</strong><br>
              Our support team will review your ticket and respond as soon as possible. 
              You can reply to this email to add more information to your ticket.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{ticketLink}}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            View Ticket Online
          </a>
        </div>
        
        <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated confirmation. Please do not reply to this email unless you want to add information to your ticket.
          </p>
        </div>
      </div>
    `,
    textBody: `
Ticket Created from Email - {{systemName}}

Hi {{senderName}},

Thank you for contacting us! We've automatically created a support ticket from your email.

Ticket Details:
- Subject: {{ticketSubject}}
- Ticket Number: {{ticketNumber}}
- Status: {{ticketStatus}}
- Priority: {{ticketPriority}}
- Account: {{accountName}}
- Created: {{createdAt}}
{{#if assignedTo}}
- Assigned to: {{assignedTo}}
{{/if}}

What happens next?
Our support team will review your ticket and respond as soon as possible. 
You can reply to this email to add more information to your ticket.

View ticket online: {{ticketLink}}

This is an automated confirmation. Please do not reply to this email unless you want to add information to your ticket.
    `,
    variables: [
      { name: 'systemName', description: 'Name of the system', example: 'ServiceVault', required: true },
      { name: 'senderName', description: 'Name of the email sender', example: 'John Doe', required: true },
      { name: 'senderEmail', description: 'Email address of the sender', example: 'john@example.com', required: true },
      { name: 'ticketNumber', description: 'Generated ticket number', example: 'T-2024-001', required: true },
      { name: 'ticketSubject', description: 'Subject of the created ticket', example: 'Login Issue', required: true },
      { name: 'ticketStatus', description: 'Current ticket status', example: 'Open', required: true },
      { name: 'ticketPriority', description: 'Ticket priority level', example: 'Medium', required: true },
      { name: 'accountName', description: 'Name of the associated account', example: 'Acme Corp', required: true },
      { name: 'createdAt', description: 'When the ticket was created', example: 'January 15, 2024 at 10:30 AM', required: true },
      { name: 'ticketLink', description: 'Link to view the ticket', example: 'https://app.example.com/tickets/123', required: true },
      { name: 'assignedTo', description: 'Who the ticket is assigned to (optional)', example: 'Jane Smith', required: false }
    ]
  },
  {
    name: 'Email Ticket Reply',
    type: 'EMAIL_TICKET_REPLY',
    subject: 'Re: Ticket #{{ticketNumber}} - {{ticketSubject}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">{{systemName}}</h1>
          <p style="color: #666; font-size: 16px;">Ticket Update</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #333; margin-top: 0;">📧 New Reply Added to Your Ticket</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Hi {{recipientName}},
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            A new reply has been added to your support ticket.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Ticket #{{ticketNumber}}: {{ticketSubject}}</h3>
            <p style="margin: 10px 0;"><strong>Status:</strong> {{ticketStatus}}</p>
            <p style="margin: 10px 0;"><strong>Priority:</strong> {{ticketPriority}}</p>
            <p style="margin: 10px 0;"><strong>Replied by:</strong> {{replierName}}</p>
            <p style="margin: 10px 0;"><strong>Reply time:</strong> {{replyTime}}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; border-left: 4px solid #28a745;">
            <h4 style="margin-top: 0; color: #333;">Latest Reply:</h4>
            <div style="white-space: pre-wrap; color: #555; line-height: 1.6;">{{replyContent}}</div>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{ticketLink}}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 10px;">
            View Full Conversation
          </a>
          <a href="mailto:{{replyToEmail}}?subject=Re: Ticket {{ticketNumber}}&In-Reply-To={{messageId}}" 
             style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Reply via Email
          </a>
        </div>
        
        <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            You can reply to this email to add your response to the ticket conversation.
          </p>
        </div>
      </div>
    `,
    textBody: `
Ticket Reply - {{systemName}}

Hi {{recipientName}},

A new reply has been added to your support ticket.

Ticket #{{ticketNumber}}: {{ticketSubject}}
Status: {{ticketStatus}}
Priority: {{ticketPriority}}
Replied by: {{replierName}}
Reply time: {{replyTime}}

Latest Reply:
{{replyContent}}

View full conversation: {{ticketLink}}

You can reply to this email to add your response to the ticket conversation.
    `,
    variables: [
      { name: 'systemName', description: 'Name of the system', example: 'ServiceVault', required: true },
      { name: 'recipientName', description: 'Name of the recipient', example: 'John Doe', required: true },
      { name: 'ticketNumber', description: 'Ticket number', example: 'T-2024-001', required: true },
      { name: 'ticketSubject', description: 'Subject of the ticket', example: 'Login Issue', required: true },
      { name: 'ticketStatus', description: 'Current ticket status', example: 'In Progress', required: true },
      { name: 'ticketPriority', description: 'Ticket priority level', example: 'Medium', required: true },
      { name: 'replierName', description: 'Name of person who replied', example: 'Jane Smith', required: true },
      { name: 'replyTime', description: 'When the reply was sent', example: 'January 15, 2024 at 2:30 PM', required: true },
      { name: 'replyContent', description: 'Content of the reply', example: 'We are working on reproducing this issue...', required: true },
      { name: 'ticketLink', description: 'Link to view the ticket', example: 'https://app.example.com/tickets/123', required: true },
      { name: 'replyToEmail', description: 'Email address for replies', example: 'support+T-2024-001@example.com', required: true },
      { name: 'messageId', description: 'Email message ID for threading', example: 'msg-123@example.com', required: true }
    ]
  },
  {
    name: 'Email Security Alert',
    type: 'EMAIL_SECURITY_ALERT',
    subject: '🚨 Security Alert: {{alertType}} detected',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">{{systemName}}</h1>
          <p style="color: #dc3545; font-size: 16px; font-weight: bold;">🚨 Security Alert</p>
        </div>
        
        <div style="background: #fff5f5; border: 1px solid #fed7d7; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #dc3545; margin-top: 0;">Security Threat Detected</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Hi {{adminName}},
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Our email security system has detected and blocked a potential security threat.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="margin-top: 0; color: #dc3545;">Threat Details</h3>
            <p style="margin: 10px 0;"><strong>Alert Type:</strong> {{alertType}}</p>
            <p style="margin: 10px 0;"><strong>Risk Level:</strong> <span style="color: #dc3545; font-weight: bold;">{{riskLevel}}</span></p>
            <p style="margin: 10px 0;"><strong>Security Score:</strong> {{securityScore}}/100</p>
            <p style="margin: 10px 0;"><strong>From Email:</strong> {{senderEmail}}</p>
            <p style="margin: 10px 0;"><strong>Subject:</strong> {{emailSubject}}</p>
            <p style="margin: 10px 0;"><strong>Detected at:</strong> {{detectedAt}}</p>
            <p style="margin: 10px 0;"><strong>Integration:</strong> {{integrationName}}</p>
            <p style="margin: 10px 0;"><strong>Action Taken:</strong> {{actionTaken}}</p>
          </div>
          
          {{#if threats}}
          <div style="background: #fff0f0; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4 style="margin-top: 0; color: #dc3545;">Identified Threats:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              {{#each threats}}
              <li style="color: #555; margin: 5px 0;">{{this}}</li>
              {{/each}}
            </ul>
          </div>
          {{/if}}
          
          {{#if attachments}}
          <div style="background: #fff8f0; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4 style="margin-top: 0; color: #f56500;">Suspicious Attachments:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              {{#each attachments}}
              <li style="color: #555; margin: 5px 0;">{{this.filename}} ({{this.threat}})</li>
              {{/each}}
            </ul>
          </div>
          {{/if}}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{quarantineLink}}" 
             style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 10px;">
            Review in Quarantine
          </a>
          <a href="{{securitySettingsLink}}" 
             style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Security Settings
          </a>
        </div>
        
        <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated security alert. Review the threat and update your security settings if necessary.
          </p>
        </div>
      </div>
    `,
    textBody: `
🚨 SECURITY ALERT - {{systemName}}

Hi {{adminName}},

Our email security system has detected and blocked a potential security threat.

THREAT DETAILS:
- Alert Type: {{alertType}}
- Risk Level: {{riskLevel}}
- Security Score: {{securityScore}}/100
- From Email: {{senderEmail}}
- Subject: {{emailSubject}}
- Detected at: {{detectedAt}}
- Integration: {{integrationName}}
- Action Taken: {{actionTaken}}

{{#if threats}}
IDENTIFIED THREATS:
{{#each threats}}
- {{this}}
{{/each}}
{{/if}}

{{#if attachments}}
SUSPICIOUS ATTACHMENTS:
{{#each attachments}}
- {{this.filename}} ({{this.threat}})
{{/each}}
{{/if}}

Review in quarantine: {{quarantineLink}}
Update security settings: {{securitySettingsLink}}

This is an automated security alert. Review the threat and update your security settings if necessary.
    `,
    variables: [
      { name: 'systemName', description: 'Name of the system', example: 'ServiceVault', required: true },
      { name: 'adminName', description: 'Name of the administrator', example: 'Admin User', required: true },
      { name: 'alertType', description: 'Type of security alert', example: 'Malware Detected', required: true },
      { name: 'riskLevel', description: 'Risk level of the threat', example: 'HIGH', required: true },
      { name: 'securityScore', description: 'Security risk score', example: '85', required: true },
      { name: 'senderEmail', description: 'Email address of sender', example: 'suspicious@badomain.com', required: true },
      { name: 'emailSubject', description: 'Subject of the suspicious email', example: 'Urgent: Update your account', required: true },
      { name: 'detectedAt', description: 'When the threat was detected', example: 'January 15, 2024 at 3:45 PM', required: true },
      { name: 'integrationName', description: 'Name of the email integration', example: 'Support Email', required: true },
      { name: 'actionTaken', description: 'Action taken by the system', example: 'Quarantined', required: true },
      { name: 'threats', description: 'List of identified threats', example: '["Suspicious URLs", "Phishing attempt"]', required: false },
      { name: 'attachments', description: 'List of suspicious attachments', example: '[{"filename": "invoice.exe", "threat": "Malware"}]', required: false },
      { name: 'quarantineLink', description: 'Link to quarantine management', example: 'https://app.example.com/email/quarantine', required: true },
      { name: 'securitySettingsLink', description: 'Link to security settings', example: 'https://app.example.com/email/security', required: true }
    ]
  },
  {
    name: 'Email Integration Error',
    type: 'EMAIL_INTEGRATION_ERROR',
    subject: '⚠️ Email Integration Error - {{integrationName}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">{{systemName}}</h1>
          <p style="color: #f56500; font-size: 16px; font-weight: bold;">⚠️ Integration Error</p>
        </div>
        
        <div style="background: #fffaf0; border: 1px solid #fed7aa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #f56500; margin-top: 0;">Email Integration Issue</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Hi {{adminName}},
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            We've encountered an issue with your email integration that requires your attention.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f56500;">
            <h3 style="margin-top: 0; color: #f56500;">Error Details</h3>
            <p style="margin: 10px 0;"><strong>Integration:</strong> {{integrationName}}</p>
            <p style="margin: 10px 0;"><strong>Provider:</strong> {{providerType}}</p>
            <p style="margin: 10px 0;"><strong>Account:</strong> {{accountName}}</p>
            <p style="margin: 10px 0;"><strong>Error Type:</strong> {{errorType}}</p>
            <p style="margin: 10px 0;"><strong>Occurred at:</strong> {{errorTime}}</p>
            <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #dc3545;">{{integrationStatus}}</span></p>
          </div>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4 style="margin-top: 0; color: #333;">Error Message:</h4>
            <code style="background: #e9ecef; padding: 10px; border-radius: 3px; display: block; color: #495057; font-size: 14px; white-space: pre-wrap;">{{errorMessage}}</code>
          </div>
          
          {{#if suggestedActions}}
          <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4 style="margin-top: 0; color: #007bff;">Suggested Actions:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              {{#each suggestedActions}}
              <li style="color: #555; margin: 5px 0;">{{this}}</li>
              {{/each}}
            </ul>
          </div>
          {{/if}}
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;">
              <strong>Impact:</strong> This integration is currently {{integrationStatus}}. 
              {{#if affectedFeatures}}
              The following features may be affected: {{affectedFeatures}}.
              {{/if}}
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{integrationLink}}" 
             style="background: #f56500; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 10px;">
            Fix Integration
          </a>
          <a href="{{supportLink}}" 
             style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Contact Support
          </a>
        </div>
      </div>
    `,
    textBody: `
⚠️ EMAIL INTEGRATION ERROR - {{systemName}}

Hi {{adminName}},

We've encountered an issue with your email integration that requires your attention.

ERROR DETAILS:
- Integration: {{integrationName}}
- Provider: {{providerType}}
- Account: {{accountName}}
- Error Type: {{errorType}}
- Occurred at: {{errorTime}}
- Status: {{integrationStatus}}

Error Message:
{{errorMessage}}

{{#if suggestedActions}}
SUGGESTED ACTIONS:
{{#each suggestedActions}}
- {{this}}
{{/each}}
{{/if}}

IMPACT:
This integration is currently {{integrationStatus}}. 
{{#if affectedFeatures}}
The following features may be affected: {{affectedFeatures}}.
{{/if}}

Fix integration: {{integrationLink}}
Contact support: {{supportLink}}
    `,
    variables: [
      { name: 'systemName', description: 'Name of the system', example: 'ServiceVault', required: true },
      { name: 'adminName', description: 'Name of the administrator', example: 'Admin User', required: true },
      { name: 'integrationName', description: 'Name of the email integration', example: 'Support Email', required: true },
      { name: 'providerType', description: 'Type of email provider', example: 'Microsoft Graph', required: true },
      { name: 'accountName', description: 'Name of the account', example: 'Acme Corp', required: true },
      { name: 'errorType', description: 'Type of error', example: 'Authentication Failed', required: true },
      { name: 'errorTime', description: 'When the error occurred', example: 'January 15, 2024 at 4:15 PM', required: true },
      { name: 'integrationStatus', description: 'Current status of integration', example: 'Disconnected', required: true },
      { name: 'errorMessage', description: 'Detailed error message', example: 'Token has expired. Please re-authenticate.', required: true },
      { name: 'suggestedActions', description: 'List of suggested actions', example: '["Re-authenticate", "Check permissions"]', required: false },
      { name: 'affectedFeatures', description: 'Features that are affected', example: 'Email to ticket creation, Auto-replies', required: false },
      { name: 'integrationLink', description: 'Link to fix the integration', example: 'https://app.example.com/email/integrations/123', required: true },
      { name: 'supportLink', description: 'Link to contact support', example: 'https://app.example.com/support', required: true }
    ]
  },
  {
    name: 'Email Auto Response',
    type: 'EMAIL_AUTO_RESPONSE',
    subject: 'Re: {{originalSubject}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">{{systemName}}</h1>
          <p style="color: #666; font-size: 16px;">Automated Response</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #333; margin-top: 0;">Thank You for Your Email</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Hi {{senderName}},
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Thank you for contacting {{companyName}}. We have received your email and {{responseAction}}.
          </p>
          
          {{#if ticketCreated}}
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="margin-top: 0; color: #28a745;">✅ Support Ticket Created</h3>
            <p style="margin: 10px 0;"><strong>Ticket Number:</strong> {{ticketNumber}}</p>
            <p style="margin: 10px 0;"><strong>Status:</strong> {{ticketStatus}}</p>
            <p style="margin: 10px 0;"><strong>Priority:</strong> {{ticketPriority}}</p>
          </div>
          {{/if}}
          
          <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
            <p style="margin: 0; font-size: 14px; color: #333;">
              <strong>Expected Response Time:</strong> {{expectedResponseTime}}<br>
              <strong>Business Hours:</strong> {{businessHours}}
              {{#if customMessage}}
              <br><br>{{customMessage}}
              {{/if}}
            </p>
          </div>
        </div>
        
        {{#if ticketCreated}}
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{ticketLink}}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Track Your Ticket
          </a>
        </div>
        {{/if}}
        
        <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated response. Please do not reply to this email unless you have additional information to provide.
          </p>
          {{#if emergencyContact}}
          <p style="font-size: 12px; color: #999; text-align: center;">
            For urgent matters, please contact: {{emergencyContact}}
          </p>
          {{/if}}
        </div>
      </div>
    `,
    textBody: `
Automated Response - {{systemName}}

Hi {{senderName}},

Thank you for contacting {{companyName}}. We have received your email and {{responseAction}}.

{{#if ticketCreated}}
✅ SUPPORT TICKET CREATED
- Ticket Number: {{ticketNumber}}
- Status: {{ticketStatus}}
- Priority: {{ticketPriority}}
{{/if}}

Expected Response Time: {{expectedResponseTime}}
Business Hours: {{businessHours}}
{{#if customMessage}}

{{customMessage}}
{{/if}}

{{#if ticketCreated}}
Track your ticket: {{ticketLink}}
{{/if}}

This is an automated response. Please do not reply to this email unless you have additional information to provide.
{{#if emergencyContact}}
For urgent matters, please contact: {{emergencyContact}}
{{/if}}
    `,
    variables: [
      { name: 'systemName', description: 'Name of the system', example: 'ServiceVault', required: true },
      { name: 'senderName', description: 'Name of the email sender', example: 'John Doe', required: true },
      { name: 'companyName', description: 'Name of the company', example: 'Acme Corp', required: true },
      { name: 'originalSubject', description: 'Subject of the original email', example: 'Login Issue', required: true },
      { name: 'responseAction', description: 'What action was taken', example: 'created a support ticket', required: true },
      { name: 'expectedResponseTime', description: 'Expected response timeframe', example: 'Within 24 hours', required: true },
      { name: 'businessHours', description: 'Business hours for support', example: 'Monday-Friday, 9 AM - 5 PM EST', required: true },
      { name: 'ticketCreated', description: 'Whether a ticket was created', example: 'true', required: false },
      { name: 'ticketNumber', description: 'Ticket number if created', example: 'T-2024-001', required: false },
      { name: 'ticketStatus', description: 'Status of created ticket', example: 'Open', required: false },
      { name: 'ticketPriority', description: 'Priority of created ticket', example: 'Medium', required: false },
      { name: 'ticketLink', description: 'Link to view the ticket', example: 'https://app.example.com/tickets/123', required: false },
      { name: 'customMessage', description: 'Custom message from admin', example: 'We are currently experiencing high volume...', required: false },
      { name: 'emergencyContact', description: 'Emergency contact information', example: 'Call 555-0123 for urgent issues', required: false }
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