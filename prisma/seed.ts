import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create essential system settings
  await prisma.systemSettings.upsert({
    where: { key: 'system.ticketCustomFields' },
    update: {},
    create: {
      key: 'system.ticketCustomFields',
      jsonValue: {
        ticketFields: [
          { name: 'priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
          { name: 'environment', type: 'select', options: ['Development', 'Staging', 'Production'] },
        ],
        accountFields: [
          { name: 'account_manager', type: 'text' },
          { name: 'billing_contact', type: 'email' },
        ],
      },
      description: 'Global custom field definitions',
    },
  });

  await prisma.systemSettings.upsert({
    where: { key: 'default_tax_rate' },
    update: {},
    create: {
      key: 'default_tax_rate',
      value: '0.08',
      description: 'Default tax rate for invoices (8%)',
    },
  });

  // Create ticket number template setting
  await prisma.systemSettings.upsert({
    where: { key: 'ticketNumberTemplate' },
    update: {},
    create: {
      key: 'ticketNumberTemplate',
      value: '{account}-{year}-{sequence:3}',
      description: 'Template for generating ticket numbers. Available tags: {account}, {year}, {month}, {day}, {sequence}, {sequence:N}, {random}',
    },
  });

  // Create essential permissions
  const permissions = [
    { name: 'tickets.view', description: 'View tickets', resource: 'tickets', action: 'view' },
    { name: 'tickets.create', description: 'Create tickets', resource: 'tickets', action: 'create' },
    { name: 'tickets.edit', description: 'Edit tickets', resource: 'tickets', action: 'edit' },
    { name: 'tickets.delete', description: 'Delete tickets', resource: 'tickets', action: 'delete' },
    { name: 'time.view', description: 'View time entries', resource: 'time', action: 'view' },
    { name: 'time.create', description: 'Create time entries', resource: 'time', action: 'create' },
    { name: 'invoices.view', description: 'View invoices', resource: 'invoices', action: 'view' },
    { name: 'invoices.create', description: 'Create invoices', resource: 'invoices', action: 'create' },
    { name: 'users.manage', description: 'Manage users', resource: 'users', action: 'manage' },
    { name: 'settings.manage', description: 'Manage settings', resource: 'settings', action: 'manage' },
    { name: 'accounts.view', description: 'View accounts', resource: 'accounts', action: 'view' },
    { name: 'accounts.manage', description: 'Manage accounts', resource: 'accounts', action: 'manage' },
    { name: 'account_users.invite', description: 'Invite account users', resource: 'account_users', action: 'invite' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  // Create default billing rates
  const existingStandardRate = await prisma.billingRate.findFirst({
    where: { name: 'Standard Rate' }
  });
  
  if (!existingStandardRate) {
    await prisma.billingRate.create({
      data: {
        name: 'Standard Rate',
        description: 'Default hourly rate for services',
        rate: 75.00,
        isDefault: true,
      },
    });
  }

  const existingSeniorRate = await prisma.billingRate.findFirst({
    where: { name: 'Senior Rate' }
  });
  
  if (!existingSeniorRate) {
    await prisma.billingRate.create({
      data: {
        name: 'Senior Rate',
        description: 'Senior developer/consultant rate',
        rate: 125.00,
        isDefault: false,
      },
    });
  }

  console.log('Database seed completed successfully!');
  console.log('Essential system settings and configuration have been created.');
  console.log('Use the setup wizard to create your first admin user and complete the initial configuration.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });