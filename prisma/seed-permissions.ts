import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPermissions() {
  console.log(`Start seeding permissions...`);

  const permissions = [
    // Ticket permissions
    { name: 'view_tickets', description: 'View tickets', resource: 'tickets', action: 'view' },
    { name: 'create_tickets', description: 'Create new tickets', resource: 'tickets', action: 'create' },
    { name: 'update_tickets', description: 'Update existing tickets', resource: 'tickets', action: 'update' },
    { name: 'delete_tickets', description: 'Delete tickets', resource: 'tickets', action: 'delete' },

    // Time entry permissions
    { name: 'view_time_entries', description: 'View time entries', resource: 'time-entries', action: 'view' },
    { name: 'create_time_entries', description: 'Create time entries', resource: 'time-entries', action: 'create' },
    { name: 'update_time_entries', description: 'Update time entries', resource: 'time-entries', action: 'update' },
    { name: 'delete_time_entries', description: 'Delete time entries', resource: 'time-entries', action: 'delete' },

    // Account permissions
    { name: 'view_accounts', description: 'View account information', resource: 'accounts', action: 'view' },
    { name: 'create_accounts', description: 'Create new accounts', resource: 'accounts', action: 'create' },
    { name: 'update_accounts', description: 'Update account information', resource: 'accounts', action: 'update' },
    { name: 'delete_accounts', description: 'Delete accounts', resource: 'accounts', action: 'delete' },

    // Billing permissions
    { name: 'view_billing', description: 'View billing information', resource: 'billing', action: 'view' },
    { name: 'create_invoices', description: 'Create invoices', resource: 'billing', action: 'create' },
    { name: 'update_billing', description: 'Update billing information', resource: 'billing', action: 'update' },
    { name: 'delete_billing', description: 'Delete billing records', resource: 'billing', action: 'delete' },

    // Report permissions
    { name: 'view_reports', description: 'View reports and analytics', resource: 'reports', action: 'view' },

    // Settings permissions
    { name: 'view_settings', description: 'View system settings', resource: 'settings', action: 'view' },
    { name: 'update_settings', description: 'Update system settings', resource: 'settings', action: 'update' },

    // Admin-only permissions
    { name: 'manage_permissions', description: 'Manage system permissions', resource: 'permissions', action: 'create' },
    { name: 'manage_users', description: 'Manage system users', resource: 'users', action: 'create' },
    { name: 'system_settings', description: 'Manage system-wide settings', resource: 'system-settings', action: 'update' },
  ];

  for (const permission of permissions) {
    const result = await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
    console.log(`Created/Updated permission: ${result.name}`);
  }

  console.log(`Seeding permissions finished.`);
}

seedPermissions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });