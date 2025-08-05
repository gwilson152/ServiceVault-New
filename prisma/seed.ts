import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with clean data...');

  // Create default role templates
  console.log('Creating default role templates...');

  // Super Admin role - inherits all permissions
  const superAdminRole = await prisma.roleTemplate.upsert({
    where: { name: 'Super Administrator' },
    update: {},
    create: {
      name: 'Super Administrator',
      description: 'Full system access with all permissions automatically inherited',
      permissions: [], // Empty because inheritAllPermissions = true
      inheritAllPermissions: true,
      isSystemRole: true,
      scope: 'global'
    }
  });

  // Employee role - for internal staff
  const employeeRole = await prisma.roleTemplate.upsert({
    where: { name: 'Employee' },
    update: {},
    create: {
      name: 'Employee',
      description: 'Internal staff with time tracking and ticket management permissions',
      permissions: [
        'tickets:view',
        'tickets:create',
        'tickets:update',
        'time-entries:view',
        'time-entries:create',
        'time-entries:update',
        'accounts:view',
        'billing:view'
      ],
      inheritAllPermissions: false,
      isSystemRole: true,
      scope: 'global'
    }
  });

  // Manager role - for team leads
  const managerRole = await prisma.roleTemplate.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      description: 'Team lead with approval permissions and extended access',
      permissions: [
        'tickets:*',
        'time-entries:*',
        'time-entries:approve',
        'accounts:view',
        'accounts:update',
        'billing:view',
        'billing:create',
        'invoices:view',
        'invoices:create',
        'users:view'
      ],
      inheritAllPermissions: false,
      isSystemRole: true,
      scope: 'global'
    }
  });

  // Account Admin role - for account-specific administration
  const accountAdminRole = await prisma.roleTemplate.upsert({
    where: { name: 'Account Administrator' },
    update: {},
    create: {
      name: 'Account Administrator',
      description: 'Full access within assigned accounts',
      permissions: [
        'tickets:*',
        'time-entries:view',
        'users:view',
        'users:invite',
        'account-settings:update'
      ],
      inheritAllPermissions: false,
      isSystemRole: false,
      scope: 'account'
    }
  });

  // Account User role - for regular account users
  const accountUserRole = await prisma.roleTemplate.upsert({
    where: { name: 'Account User' },
    update: {},
    create: {
      name: 'Account User',
      description: 'Basic account access for ticket creation and viewing',
      permissions: [
        'tickets:view',
        'tickets:create',
        'time-entries:view'
      ],
      inheritAllPermissions: false,
      isSystemRole: false,
      scope: 'account'
    }
  });

  // Read-only role - for view-only access
  const readOnlyRole = await prisma.roleTemplate.upsert({
    where: { name: 'Read Only' },
    update: {},
    create: {
      name: 'Read Only',
      description: 'View-only access to assigned resources',
      permissions: [
        'tickets:view',
        'time-entries:view'
      ],
      inheritAllPermissions: false,
      isSystemRole: false,
      scope: 'account'
    }
  });

  console.log('✅ Created default role templates:');
  console.log(`  - Super Administrator (ID: ${superAdminRole.id}) - System Role`);
  console.log(`  - Employee (ID: ${employeeRole.id}) - System Role`);
  console.log(`  - Manager (ID: ${managerRole.id}) - System Role`);
  console.log(`  - Account Administrator (ID: ${accountAdminRole.id}) - Account Role`);
  console.log(`  - Account User (ID: ${accountUserRole.id}) - Account Role`);
  console.log(`  - Read Only (ID: ${readOnlyRole.id}) - Account Role`);

  // Create default system settings
  console.log('\nCreating default system settings...');

  await prisma.systemSettings.upsert({
    where: { key: 'company_name' },
    update: {},
    create: {
      key: 'company_name',
      value: 'Service Vault',
    }
  });

  await prisma.systemSettings.upsert({
    where: { key: 'default_billing_rate' },
    update: {},
    create: {
      key: 'default_billing_rate',
      value: '100.00',
    }
  });

  await prisma.systemSettings.upsert({
    where: { key: 'time_tracking_enabled' },
    update: {},
    create: {
      key: 'time_tracking_enabled',
      value: 'true',
    }
  });

  await prisma.systemSettings.upsert({
    where: { key: 'ticketNumberTemplate' },
    update: {},
    create: {
      key: 'ticketNumberTemplate',
      value: '{account}-{year}-{sequence:3}',
    }
  });

  // Create default billing rates
  console.log('Creating default billing rates...');

  const defaultRate = await prisma.billingRate.upsert({
    where: { name: 'Standard Rate' },
    update: {},
    create: {
      name: 'Standard Rate',
      description: 'Default hourly rate for time entries',
      rate: 100.00,
      isDefault: true
    }
  });

  const seniorRate = await prisma.billingRate.upsert({
    where: { name: 'Senior Rate' },
    update: {},
    create: {
      name: 'Senior Rate',
      description: 'Senior consultant hourly rate',
      rate: 150.00,
      isDefault: false
    }
  });

  console.log('✅ Created default billing rates:');
  console.log(`  - Standard Rate: $${defaultRate.rate}/hour (Default)`);
  console.log(`  - Senior Rate: $${seniorRate.rate}/hour`);

  // Create sample accounts for development (optional)
  if (process.env.NODE_ENV === 'development') {
    console.log('\nCreating sample accounts for development...');

    const sampleOrg = await prisma.account.upsert({
      where: { name: 'ACME Corporation' },
      update: {},
      create: {
        name: 'ACME Corporation',
        accountType: 'ORGANIZATION',
        companyName: 'ACME Corporation',
        domains: 'acme.com,acme.org', // Domain auto-assignment example
        address: '123 Business St, City, State 12345',
        phone: '+1-555-123-4567'
      }
    });

    const sampleSubsidiary = await prisma.account.upsert({
      where: { name: 'ACME Tech Division' },
      update: {},
      create: {
        name: 'ACME Tech Division',
        accountType: 'SUBSIDIARY',
        parentId: sampleOrg.id,
        companyName: 'ACME Tech Division',
        domains: 'tech.acme.com',
        address: '456 Tech Blvd, City, State 12345',
        phone: '+1-555-123-4568'
      }
    });

    console.log('✅ Created sample accounts:');
    console.log(`  - ACME Corporation (ID: ${sampleOrg.id}) - Organization`);
    console.log(`  - ACME Tech Division (ID: ${sampleSubsidiary.id}) - Subsidiary`);
  }

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('✅ Default role templates created with super-admin support');
  console.log('✅ System settings configured');
  console.log('✅ Default billing rates created');
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Sample accounts created for development');
  }
  console.log('\n📋 Next steps:');
  console.log('  1. Create your first user with super-admin role');
  console.log('  2. Configure email settings');
  console.log('  3. Set up additional accounts and users as needed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });