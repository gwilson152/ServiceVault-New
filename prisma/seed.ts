import { PrismaClient, Role, AccountType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('Asdf123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  // Create employee user
  const employeePassword = await bcrypt.hash('employee', 10);
  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@example.com' },
    update: {},
    create: {
      email: 'employee@example.com',
      name: 'Employee User',
      password: employeePassword,
      role: Role.EMPLOYEE,
    },
  });

  // Create an organization account
  let techCorpAccount = await prisma.account.findFirst({
    where: { name: 'TechCorp Solutions' },
  });
  
  if (!techCorpAccount) {
    techCorpAccount = await prisma.account.create({
      data: {
        name: 'TechCorp Solutions',
        accountType: AccountType.ORGANIZATION,
        companyName: 'TechCorp Solutions Inc.',
        address: '123 Business St, City, State 12345',
        phone: '(555) 123-4567',
        customFields: {
          industry: 'Technology',
          size: 'Medium',
        },
      },
    });
  }

  // Create account settings for TechCorp
  const existingSettings = await prisma.accountSettings.findUnique({
    where: { accountId: techCorpAccount.id },
  });
  
  if (!existingSettings) {
    await prisma.accountSettings.create({
      data: {
        accountId: techCorpAccount.id,
        canViewTimeEntries: true,
        canCreateTickets: true,
        canAddTicketAddons: false,
        customFields: {
          ticketFields: [
            { name: 'urgency', type: 'select', options: ['Low', 'Medium', 'High'] },
            { name: 'category', type: 'select', options: ['Bug', 'Feature', 'Support'] },
          ],
        },
      },
    });
  }

  // Create account users for TechCorp
  // 1. Account user with login capability
  const johnPassword = await bcrypt.hash('john123', 10);
  const johnUser = await prisma.user.upsert({
    where: { email: 'john.doe@techcorp.com' },
    update: {},
    create: {
      email: 'john.doe@techcorp.com',
      name: 'John Doe',
      password: johnPassword,
      role: Role.ACCOUNT_USER,
    },
  });

  let johnAccountUser = await prisma.accountUser.findFirst({
    where: {
      accountId: techCorpAccount.id,
      userId: johnUser.id,
    },
  });
  
  if (!johnAccountUser) {
    johnAccountUser = await prisma.accountUser.create({
      data: {
        accountId: techCorpAccount.id,
        userId: johnUser.id,
        email: 'john.doe@techcorp.com',
        name: 'John Doe',
        phone: '(555) 234-5678',
        isActive: true,
        permissions: {
          canViewOwnTickets: true,
          canViewAccountTickets: true,
          canCreateTickets: true,
          canManageAccountUsers: false,
        },
      },
    });
  }

  // Update John's user record with accountUserId
  if (!johnUser.accountUserId) {
    await prisma.user.update({
      where: { id: johnUser.id },
      data: { accountUserId: johnAccountUser.id },
    });
  }

  // 2. Account user without login capability (invited but not yet activated)
  let janeAccountUser = await prisma.accountUser.findFirst({
    where: {
      accountId: techCorpAccount.id,
      email: 'jane.smith@techcorp.com',
    },
  });
  
  if (!janeAccountUser) {
    janeAccountUser = await prisma.accountUser.create({
      data: {
        accountId: techCorpAccount.id,
        email: 'jane.smith@techcorp.com',
        name: 'Jane Smith',
        phone: '(555) 345-6789',
        isActive: true,
        invitationToken: 'invite_token_jane_123456',
        invitationExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        permissions: {
          canViewOwnTickets: true,
          canViewAccountTickets: false,
          canCreateTickets: true,
          canManageAccountUsers: false,
        },
      },
    });
  }

  // Create a subsidiary account
  let techCorpSubsidiary = await prisma.account.findFirst({
    where: { name: 'TechCorp Europe' },
  });
  
  if (!techCorpSubsidiary) {
    techCorpSubsidiary = await prisma.account.create({
      data: {
        name: 'TechCorp Europe',
        accountType: AccountType.SUBSIDIARY,
        parentAccountId: techCorpAccount.id,
        companyName: 'TechCorp Europe GmbH',
        address: '456 European Ave, Berlin, Germany',
        phone: '+49 30 12345678',
        customFields: {
          region: 'EMEA',
          currency: 'EUR',
        },
      },
    });
  }

  // Create an individual account
  let individualAccount = await prisma.account.findFirst({
    where: { name: 'Sarah Wilson' },
  });
  
  if (!individualAccount) {
    individualAccount = await prisma.account.create({
      data: {
        name: 'Sarah Wilson',
        accountType: AccountType.INDIVIDUAL,
        address: '789 Freelance Ln, Remote, USA',
        phone: '(555) 987-6543',
        customFields: {
          type: 'Freelancer',
        },
      },
    });
  }

  // Create account user for individual account
  const sarahPassword = await bcrypt.hash('sarah123', 10);
  const sarahUser = await prisma.user.upsert({
    where: { email: 'sarah@freelance.com' },
    update: {},
    create: {
      email: 'sarah@freelance.com',
      name: 'Sarah Wilson',
      password: sarahPassword,
      role: Role.ACCOUNT_USER,
    },
  });

  let sarahAccountUser = await prisma.accountUser.findFirst({
    where: {
      accountId: individualAccount.id,
      userId: sarahUser.id,
    },
  });
  
  if (!sarahAccountUser) {
    sarahAccountUser = await prisma.accountUser.create({
      data: {
        accountId: individualAccount.id,
        userId: sarahUser.id,
        email: 'sarah@freelance.com',
        name: 'Sarah Wilson',
        phone: '(555) 987-6543',
        isActive: true,
        permissions: {
          canViewOwnTickets: true,
          canViewAccountTickets: true,
          canCreateTickets: true,
          canManageAccountUsers: false,
        },
      },
    });
  }

  if (!sarahUser.accountUserId) {
    await prisma.user.update({
      where: { id: sarahUser.id },
      data: { accountUserId: sarahAccountUser.id },
    });
  }

  // Create billing rates
  const standardRate = await prisma.billingRate.upsert({
    where: { id: 'standard-rate' },
    update: {},
    create: {
      id: 'standard-rate',
      name: 'Standard Rate',
      description: 'Standard hourly billing rate',
      rate: 75.00,
      isDefault: true,
    },
  });

  const premiumRate = await prisma.billingRate.upsert({
    where: { id: 'premium-rate' },
    update: {},
    create: {
      id: 'premium-rate',
      name: 'Premium Rate',
      description: 'Premium hourly billing rate for specialized work',
      rate: 125.00,
      isDefault: false,
    },
  });

  // Create account-specific billing rates
  const existingAccountRate = await prisma.accountBillingRate.findFirst({
    where: {
      accountId: techCorpAccount.id,
      userId: employeeUser.id,
    },
  });
  
  if (!existingAccountRate) {
    await prisma.accountBillingRate.create({
      data: {
        accountId: techCorpAccount.id,
        userId: employeeUser.id,
        rate: 95.00,
      },
    });
  }

  // Create sample tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      title: 'Fix login issue',
      description: 'Users are unable to login to the system',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      accountId: techCorpAccount.id,
      accountUserCreatorId: johnAccountUser.id,
      assigneeId: employeeUser.id,
      customFields: {
        urgency: 'High',
        category: 'Bug',
      },
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      title: 'Add dark mode feature',
      description: 'Implement dark mode toggle for better user experience',
      status: 'OPEN',
      priority: 'MEDIUM',
      accountId: individualAccount.id,
      accountUserCreatorId: sarahAccountUser.id,
      assigneeId: employeeUser.id,
      customFields: {
        category: 'Feature',
      },
    },
  });

  // Create time entries
  await prisma.timeEntry.create({
    data: {
      description: 'Initial investigation of login issue',
      hours: 2.5,
      ticketId: ticket1.id,
      userId: employeeUser.id,
      noCharge: false,
    },
  });

  await prisma.timeEntry.create({
    data: {
      description: 'Implementing fix for authentication',
      hours: 4.0,
      ticketId: ticket1.id,
      userId: employeeUser.id,
      noCharge: false,
    },
  });

  await prisma.timeEntry.create({
    data: {
      description: 'Dark mode research and planning',
      hours: 1.5,
      ticketId: ticket2.id,
      userId: employeeUser.id,
      noCharge: false,
    },
  });

  // Create account-direct time entries (not associated with tickets)
  await prisma.timeEntry.create({
    data: {
      description: 'General consultation and account setup',
      hours: 2.0,
      accountId: techCorpAccount.id,
      userId: employeeUser.id,
      noCharge: false,
    },
  });

  await prisma.timeEntry.create({
    data: {
      description: 'Monthly maintenance and system monitoring',
      hours: 3.5,
      accountId: individualAccount.id,
      userId: employeeUser.id,
      noCharge: false,
    },
  });

  // Create ticket addon
  await prisma.ticketAddon.create({
    data: {
      name: 'Security SSL Certificate',
      description: 'Additional SSL certificate for enhanced security',
      price: 199.99,
      quantity: 1,
      ticketId: ticket1.id,
    },
  });

  // Create system settings
  await prisma.systemSettings.upsert({
    where: { key: 'app_name' },
    update: {},
    create: {
      key: 'app_name',
      value: 'Service Vault',
      description: 'Application name displayed in UI',
    },
  });

  await prisma.systemSettings.upsert({
    where: { key: 'custom_fields' },
    update: {},
    create: {
      key: 'custom_fields',
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

  // Create permissions
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

  // Create account-specific permissions for John
  const johnPermissions = [
    {
      accountUserId: johnAccountUser.id,
      permissionName: 'tickets.view',
      resource: 'tickets',
      action: 'view',
      scope: 'account', // Can view all account tickets
    },
    {
      accountUserId: johnAccountUser.id,
      permissionName: 'tickets.create',
      resource: 'tickets',
      action: 'create',
      scope: 'own',
    },
  ];

  for (const perm of johnPermissions) {
    const existing = await prisma.accountPermission.findFirst({
      where: {
        accountUserId: perm.accountUserId,
        permissionName: perm.permissionName,
      },
    });
    if (!existing) {
      await prisma.accountPermission.create({ data: perm });
    }
  }

  // Create account-specific permissions for Jane (when she activates)
  const janePermission = {
    accountUserId: janeAccountUser.id,
    permissionName: 'tickets.view',
    resource: 'tickets',
    action: 'view',
    scope: 'own', // Can only view own tickets
  };
  
  const existingJanePermission = await prisma.accountPermission.findFirst({
    where: {
      accountUserId: janePermission.accountUserId,
      permissionName: janePermission.permissionName,
    },
  });
  
  if (!existingJanePermission) {
    await prisma.accountPermission.create({ data: janePermission });
  }

  console.log('Database seed completed successfully!');
  console.log('Test users created:');
  console.log('- Admin: admin@example.com / Asdf123!');
  console.log('- Employee: employee@example.com / employee');
  console.log('- Account Users with login:');
  console.log('  - John Doe (TechCorp): john.doe@techcorp.com / john123');
  console.log('  - Sarah Wilson (Individual): sarah@freelance.com / sarah123');
  console.log('- Account Users without login (invited):');
  console.log('  - Jane Smith (TechCorp): jane.smith@techcorp.com (invitation token: invite_token_jane_123456)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });