# Email System Refactoring Migration Guide

This document outlines the steps needed to migrate from the account-scoped email system to the new global email system.

## Database Migration Steps

### 1. Run Prisma Schema Changes

```bash
# Delete existing migrations if doing a fresh migration
rm -rf prisma/migrations

# Generate new migration
npx prisma migrate dev --name email-system-refactoring

# Or if you want to force reset the database
npx prisma db push --force-reset
```

### 2. Data Migration Script

The following SQL should be run to migrate existing data:

```sql
-- Step 1: Create domain mappings from existing account domains
INSERT INTO domain_mappings (id, domain, "accountId", priority, "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid() as id,
  unnest(string_to_array(domains, ',')) as domain,
  id as "accountId",
  0 as priority,
  true as "isActive",
  now() as "createdAt",
  now() as "updatedAt"
FROM accounts 
WHERE domains IS NOT NULL AND domains != '';

-- Step 2: Clean up domain values (trim whitespace, convert to lowercase)
UPDATE domain_mappings 
SET domain = LOWER(TRIM(domain))
WHERE domain != LOWER(TRIM(domain));

-- Step 3: Remove duplicate domains (keep the first one)
DELETE FROM domain_mappings 
WHERE id NOT IN (
  SELECT DISTINCT ON (domain) id 
  FROM domain_mappings 
  ORDER BY domain, "createdAt"
);

-- Step 4: Convert existing EmailIntegration records to global format
-- This requires manual review of existing integrations to consolidate duplicates
-- and remove account-specific references

-- Backup existing integrations first
CREATE TABLE email_integrations_backup AS SELECT * FROM email_integrations;

-- Remove account-specific data (this will be handled by the schema changes)
-- The accountId column will be dropped automatically by Prisma migration
```

### 3. Configuration Migration

After the database migration, update configuration:

```typescript
// Use the DomainResolver to import legacy domains
import { DomainResolver } from '@/lib/email/DomainResolver';

// Run this once to migrate legacy account domains
const result = await DomainResolver.importFromLegacyDomains();
console.log(`Imported ${result.imported} domain mappings`);
```

## Manual Steps Required

### 1. Review Email Integrations

Since integrations are now global, you'll need to:

1. **Consolidate Duplicate Integrations**: If multiple accounts had the same email provider configured, merge them into a single global integration.

2. **Update Integration Names**: Give meaningful names to integrations (e.g., "Company Gmail", "Support Outlook").

3. **Configure Processing Rules**: Set up processing rules for each integration to handle ticket creation and routing.

### 2. Set Up Domain Mappings

1. **Review Auto-Created Mappings**: Check the domain mappings created from `account.domains` field.

2. **Add Missing Domains**: Add any domains that weren't captured in the legacy `domains` field.

3. **Set Priorities**: Configure priority levels for subdomain routing (e.g., support.company.com should have higher priority than company.com).

4. **Test Domain Resolution**: Use the domain resolver to test email routing.

### 3. Update User Permissions

1. **Grant Global Email Admin**: Assign `email:admin-global` permission to super admins.

2. **Update Role Templates**: Create or update role templates to include global email permissions.

3. **Remove Legacy Permissions**: Remove account-specific email permissions that are no longer needed.

## Verification Steps

### 1. Test Domain Resolution

```typescript
import { DomainResolver } from '@/lib/email/DomainResolver';

// Test various email addresses
const testEmails = [
  'customer@company.com',
  'support@company.com', 
  'billing@acme.corp',
  'user@subdomain.company.com'
];

for (const email of testEmails) {
  const result = await DomainResolver.testResolution(email);
  console.log(`${email} -> Account: ${result.resolution?.accountId}`);
}
```

### 2. Verify Integration Status

```typescript
// Check all integrations are properly configured
const integrations = await prisma.emailIntegration.findMany({
  include: {
    emailMessages: {
      take: 1,
      orderBy: { createdAt: 'desc' }
    }
  }
});

integrations.forEach(integration => {
  console.log(`${integration.name}: ${integration.isActive ? 'Active' : 'Inactive'}`);
  console.log(`Last message: ${integration.emailMessages[0]?.createdAt || 'None'}`);
});
```

### 3. Test Email Processing

1. **Send Test Emails**: Send emails to various domains to test routing.

2. **Check Ticket Creation**: Verify tickets are created in the correct accounts.

3. **Review Audit Logs**: Check that all email operations are being logged.

## Rollback Plan

If issues arise, you can rollback by:

1. **Restore Database**: Use database backup from before migration.

2. **Revert Code**: Switch back to the account-scoped email system.

3. **Update Permissions**: Restore previous permission structure.

## Post-Migration Cleanup

After successful migration:

1. **Remove Legacy Fields**: The `account.domains` field can be marked as deprecated.

2. **Update Documentation**: Update user documentation to reflect the new global email system.

3. **Archive Old Components**: Remove or archive the old account-scoped email components.

4. **Monitor Performance**: Watch for any performance issues with the new domain resolution system.

## Benefits After Migration

- **Centralized Management**: All email integrations managed in one place
- **Better Performance**: Single integration per provider instead of duplicates
- **Flexible Routing**: Priority-based domain mapping with subdomain support  
- **Easier Maintenance**: Simplified configuration and monitoring
- **Scalability**: Better handling of multiple accounts and domains
- **Audit Trail**: Comprehensive logging of all email operations

## Support

If you encounter issues during migration:

1. Check the domain resolver cache status
2. Review audit logs for processing errors  
3. Verify permission assignments
4. Test individual components in isolation
5. Consult the email testing framework for validation