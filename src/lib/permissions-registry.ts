import { prisma } from "@/lib/prisma";

// Permission registry - automatically seeds permissions when used
export interface PermissionDefinition {
  resource: string;
  action: string;
  description?: string;
  scope?: "own" | "account" | "subsidiary";
}

// Central registry of all permissions used in the application
export const PERMISSIONS_REGISTRY = {
  TIME_ENTRIES: {
    VIEW: {
      resource: "time-entries",
      action: "view",
      description: "View time entries"
    },
    CREATE: {
      resource: "time-entries", 
      action: "create",
      description: "Create new time entries"
    },
    UPDATE: {
      resource: "time-entries",
      action: "update", 
      description: "Edit existing time entries"
    },
    DELETE: {
      resource: "time-entries",
      action: "delete",
      description: "Delete time entries"
    },
    APPROVE: {
      resource: "time-entries",
      action: "approve",
      description: "Approve time entries for invoicing"
    },
    REJECT: {
      resource: "time-entries",
      action: "reject",
      description: "Reject time entries"
    }
  },
  BILLING: {
    VIEW: {
      resource: "billing",
      action: "view",
      description: "View billing rates and revenue information"
    },
    CREATE: {
      resource: "billing",
      action: "create",
      description: "Create billing rates"
    },
    UPDATE: {
      resource: "billing",
      action: "update",
      description: "Update billing rates"
    },
    DELETE: {
      resource: "billing",
      action: "delete",
      description: "Delete billing rates"
    }
  },
  REPORTS: {
    VIEW: {
      resource: "reports",
      action: "view",
      description: "View reports and analytics"
    },
    EXPORT: {
      resource: "reports",
      action: "export",
      description: "Export reports and data"
    }
  },
  TICKETS: {
    VIEW: {
      resource: "tickets",
      action: "view",
      description: "View tickets"
    },
    CREATE: {
      resource: "tickets",
      action: "create",
      description: "Create new tickets"
    },
    UPDATE: {
      resource: "tickets",
      action: "update",
      description: "Edit existing tickets"
    },
    DELETE: {
      resource: "tickets",
      action: "delete",
      description: "Delete tickets"
    },
    ASSIGN: {
      resource: "tickets",
      action: "assign",
      description: "Assign tickets to users"
    }
  },
  ACCOUNTS: {
    VIEW: {
      resource: "accounts",
      action: "view",
      description: "View accounts"
    },
    CREATE: {
      resource: "accounts",
      action: "create",
      description: "Create new accounts"
    },
    UPDATE: {
      resource: "accounts",
      action: "update",
      description: "Edit existing accounts"
    },
    DELETE: {
      resource: "accounts",
      action: "delete",
      description: "Delete accounts"
    }
  },
  USERS: {
    VIEW: {
      resource: "users",
      action: "view",
      description: "View user lists and account users"
    },
    CREATE: {
      resource: "users",
      action: "create",
      description: "Create new account users"
    },
    UPDATE: {
      resource: "users",
      action: "update",
      description: "Edit user information"
    },
    DELETE: {
      resource: "users",
      action: "delete",
      description: "Remove users from accounts"
    },
    INVITE: {
      resource: "users",
      action: "invite",
      description: "Send user invitations"
    },
    MANAGE: {
      resource: "users",
      action: "manage",
      description: "Manage user status and permissions"
    },
    CREATE_MANUAL: {
      resource: "users",
      action: "create-manual",
      description: "Create users manually without invitation process"
    },
    RESEND_INVITATION: {
      resource: "users",
      action: "resend-invitation",
      description: "Re-send invitation emails to pending users"
    }
  },
  EMAIL: {
    SEND: {
      resource: "email",
      action: "send",
      description: "Send emails through the system"
    },
    TEMPLATES: {
      resource: "email",
      action: "templates",
      description: "Manage email templates"
    },
    SETTINGS: {
      resource: "email",
      action: "settings",
      description: "Configure SMTP and email settings"
    },
    QUEUE: {
      resource: "email",
      action: "queue",
      description: "View and manage email queue"
    },
    CONFIGURE: {
      resource: "email",
      action: "configure",
      description: "Configure email integration settings per account"
    },
    ACCESS: {
      resource: "email",
      action: "access",
      description: "Access email accounts for ticket processing"
    },
    ADMIN: {
      resource: "email",
      action: "admin",
      description: "Administer email system and global settings"
    },
    PROCESS: {
      resource: "email",
      action: "process",
      description: "Process incoming emails and create tickets"
    },
    VIEW_LOGS: {
      resource: "email",
      action: "view-logs",
      description: "View email processing logs and audit trails"
    },
    SYNC: {
      resource: "email",
      action: "sync",
      description: "Manually trigger email synchronization"
    },
    TEST: {
      resource: "email",
      action: "test",
      description: "Test email connections and integrations"
    }
  },
  INVOICES: {
    VIEW: {
      resource: "invoices",
      action: "view",
      description: "View invoices"
    },
    CREATE: {
      resource: "invoices",
      action: "create",
      description: "Create new invoices"
    },
    UPDATE: {
      resource: "invoices",
      action: "update",
      description: "Edit existing invoices"
    },
    DELETE: {
      resource: "invoices",
      action: "delete",
      description: "Delete invoices"
    },
    EDIT_ITEMS: {
      resource: "invoices",
      action: "edit-items",
      description: "Edit invoice line items"
    },
    MARK_SENT: {
      resource: "invoices",
      action: "mark-sent",
      description: "Mark invoices as sent"
    },
    MARK_PAID: {
      resource: "invoices",
      action: "mark-paid",
      description: "Mark invoices as paid"
    },
    UNMARK_PAID: {
      resource: "invoices",
      action: "unmark-paid",
      description: "Unmark invoices as paid (revert to sent)"
    },
    EXPORT_PDF: {
      resource: "invoices",
      action: "export-pdf",
      description: "Export invoices as PDF"
    },
    UPDATE_DATES: {
      resource: "invoices",
      action: "update-dates",
      description: "Update invoice issue date and due date"
    }
  },
  SETTINGS: {
    VIEW: {
      resource: "settings",
      action: "view",
      description: "View system settings"
    },
    UPDATE: {
      resource: "settings",
      action: "update",
      description: "Update system settings"
    }
  },
  SYSTEM: {
    ADMIN: {
      resource: "system",
      action: "admin",
      description: "Full system administration access"
    },
    BACKUP: {
      resource: "system",
      action: "backup",
      description: "Create and manage backups"
    },
    LOGS: {
      resource: "system",
      action: "logs",
      description: "View system logs"
    }
  }
} as const;

// Flatten permissions for easy access
export const PERMISSIONS = Object.values(PERMISSIONS_REGISTRY)
  .reduce((acc, category) => {
    Object.assign(acc, category);
    return acc;
  }, {} as Record<string, PermissionDefinition>);

// Auto-seed permission in database if it doesn't exist
export async function ensurePermissionExists(permission: PermissionDefinition): Promise<void> {
  try {
    const permissionName = `${permission.resource}:${permission.action}`;
    
    const existingPermission = await prisma.permission.findUnique({
      where: { name: permissionName }
    });

    if (!existingPermission) {
      await prisma.permission.create({
        data: {
          name: permissionName,
          description: permission.description || `${permission.action} ${permission.resource}`,
          resource: permission.resource,
          action: permission.action
        }
      });
      
      console.log(`Auto-seeded permission: ${permissionName}`);
    }
  } catch (error) {
    console.error(`Failed to ensure permission exists: ${permission.resource}:${permission.action}`, error);
    // Don't throw - continue gracefully
  }
}

// Seed all permissions from registry
export async function seedAllPermissions(): Promise<void> {
  try {
    const allPermissions = Object.values(PERMISSIONS_REGISTRY)
      .flatMap(category => Object.values(category));
    
    await Promise.all(
      allPermissions.map(permission => ensurePermissionExists(permission))
    );
    
    console.log(`Seeded ${allPermissions.length} permissions`);
  } catch (error) {
    console.error('Failed to seed permissions:', error);
  }
}

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: [
    // Admin has all permissions
    ...Object.values(PERMISSIONS_REGISTRY).flatMap(category => Object.values(category))
  ],
  EMPLOYEE: [
    // Employees have most permissions except system admin
    PERMISSIONS_REGISTRY.TIME_ENTRIES.VIEW,
    PERMISSIONS_REGISTRY.TIME_ENTRIES.CREATE,
    PERMISSIONS_REGISTRY.TIME_ENTRIES.UPDATE,
    PERMISSIONS_REGISTRY.TIME_ENTRIES.DELETE,
    PERMISSIONS_REGISTRY.TICKETS.VIEW,
    PERMISSIONS_REGISTRY.TICKETS.CREATE,
    PERMISSIONS_REGISTRY.TICKETS.UPDATE,
    PERMISSIONS_REGISTRY.ACCOUNTS.VIEW,
    PERMISSIONS_REGISTRY.REPORTS.VIEW,
    PERMISSIONS_REGISTRY.USERS.VIEW,
    PERMISSIONS_REGISTRY.BILLING.VIEW,
    PERMISSIONS_REGISTRY.BILLING.CREATE,
    PERMISSIONS_REGISTRY.BILLING.UPDATE,
    PERMISSIONS_REGISTRY.BILLING.DELETE,
    PERMISSIONS_REGISTRY.INVOICES.VIEW,
    PERMISSIONS_REGISTRY.INVOICES.CREATE,
    PERMISSIONS_REGISTRY.INVOICES.UPDATE,
    PERMISSIONS_REGISTRY.INVOICES.EDIT_ITEMS,
    PERMISSIONS_REGISTRY.INVOICES.MARK_SENT,
    PERMISSIONS_REGISTRY.INVOICES.MARK_PAID,
    PERMISSIONS_REGISTRY.INVOICES.UNMARK_PAID,
    PERMISSIONS_REGISTRY.INVOICES.EXPORT_PDF,
    PERMISSIONS_REGISTRY.INVOICES.UPDATE_DATES,
    PERMISSIONS_REGISTRY.EMAIL.SEND,
    PERMISSIONS_REGISTRY.EMAIL.TEMPLATES,
    PERMISSIONS_REGISTRY.EMAIL.QUEUE,
    PERMISSIONS_REGISTRY.EMAIL.CONFIGURE,
    PERMISSIONS_REGISTRY.EMAIL.ACCESS,
    PERMISSIONS_REGISTRY.EMAIL.PROCESS,
    PERMISSIONS_REGISTRY.EMAIL.VIEW_LOGS,
    PERMISSIONS_REGISTRY.EMAIL.SYNC,
    PERMISSIONS_REGISTRY.EMAIL.TEST,
    PERMISSIONS_REGISTRY.SETTINGS.VIEW,
    PERMISSIONS_REGISTRY.SETTINGS.UPDATE
  ],
  ACCOUNT_USER: [
    // Account users have limited permissions
    PERMISSIONS_REGISTRY.TICKETS.VIEW,
    PERMISSIONS_REGISTRY.TICKETS.CREATE,
    PERMISSIONS_REGISTRY.ACCOUNTS.VIEW
  ],
  // Account-specific role templates
  ACCOUNT_MANAGER: [
    // Can manage tickets and users within their account
    PERMISSIONS_REGISTRY.TICKETS.VIEW,
    PERMISSIONS_REGISTRY.TICKETS.CREATE,
    PERMISSIONS_REGISTRY.TICKETS.UPDATE,
    PERMISSIONS_REGISTRY.TICKETS.ASSIGN,
    PERMISSIONS_REGISTRY.ACCOUNTS.VIEW,
    PERMISSIONS_REGISTRY.USERS.VIEW,
    PERMISSIONS_REGISTRY.USERS.CREATE,
    PERMISSIONS_REGISTRY.USERS.INVITE,
    PERMISSIONS_REGISTRY.USERS.CREATE_MANUAL,
    PERMISSIONS_REGISTRY.USERS.RESEND_INVITATION,
    PERMISSIONS_REGISTRY.TIME_ENTRIES.VIEW,
    PERMISSIONS_REGISTRY.BILLING.VIEW,
    PERMISSIONS_REGISTRY.INVOICES.VIEW,
    PERMISSIONS_REGISTRY.INVOICES.EXPORT_PDF,
    PERMISSIONS_REGISTRY.EMAIL.CONFIGURE,
    PERMISSIONS_REGISTRY.EMAIL.ACCESS,
    PERMISSIONS_REGISTRY.EMAIL.VIEW_LOGS,
    PERMISSIONS_REGISTRY.EMAIL.SYNC,
    PERMISSIONS_REGISTRY.EMAIL.TEST
  ],
  SUBSIDIARY_MANAGER: [
    // Account manager permissions plus subsidiary access
    PERMISSIONS_REGISTRY.TICKETS.VIEW,
    PERMISSIONS_REGISTRY.TICKETS.CREATE,
    PERMISSIONS_REGISTRY.TICKETS.UPDATE,
    PERMISSIONS_REGISTRY.TICKETS.ASSIGN,
    PERMISSIONS_REGISTRY.ACCOUNTS.VIEW,
    PERMISSIONS_REGISTRY.ACCOUNTS.UPDATE,
    PERMISSIONS_REGISTRY.USERS.VIEW,
    PERMISSIONS_REGISTRY.USERS.CREATE,
    PERMISSIONS_REGISTRY.USERS.INVITE,
    PERMISSIONS_REGISTRY.USERS.MANAGE,
    PERMISSIONS_REGISTRY.USERS.CREATE_MANUAL,
    PERMISSIONS_REGISTRY.USERS.RESEND_INVITATION,
    PERMISSIONS_REGISTRY.TIME_ENTRIES.VIEW,
    PERMISSIONS_REGISTRY.BILLING.VIEW,
    PERMISSIONS_REGISTRY.REPORTS.VIEW,
    PERMISSIONS_REGISTRY.INVOICES.VIEW,
    PERMISSIONS_REGISTRY.INVOICES.CREATE,
    PERMISSIONS_REGISTRY.INVOICES.EXPORT_PDF,
    PERMISSIONS_REGISTRY.EMAIL.CONFIGURE,
    PERMISSIONS_REGISTRY.EMAIL.ACCESS,
    PERMISSIONS_REGISTRY.EMAIL.VIEW_LOGS,
    PERMISSIONS_REGISTRY.EMAIL.SYNC,
    PERMISSIONS_REGISTRY.EMAIL.TEST
  ],
  ACCOUNT_VIEWER: [
    // Read-only access to account information
    PERMISSIONS_REGISTRY.TICKETS.VIEW,
    PERMISSIONS_REGISTRY.ACCOUNTS.VIEW,
    PERMISSIONS_REGISTRY.TIME_ENTRIES.VIEW,
    PERMISSIONS_REGISTRY.BILLING.VIEW,
    PERMISSIONS_REGISTRY.INVOICES.VIEW,
    PERMISSIONS_REGISTRY.INVOICES.EXPORT_PDF
  ]
} as const;

// Get permissions for a role
export function getDefaultPermissionsForRole(role: string): PermissionDefinition[] {
  return DEFAULT_ROLE_PERMISSIONS[role as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
}