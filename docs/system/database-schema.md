# Database Schema Documentation

This document provides comprehensive documentation of the Service Vault database schema, including recent enhancements and migration patterns.

## Overview

Service Vault uses PostgreSQL with Prisma ORM for type-safe database access. The schema supports:

- **ABAC Permission System** with role templates
- **Hierarchical Account Management** with parent-child relationships
- **Complete Invoicing System** with time entry and addon integration
- **Billing Rate Management** with enable/disable functionality
- **User Management** with domain-based auto-assignment

## Core Entities

### Authentication & Users

```prisma
model User {
  id              String            @id @default(cuid())
  name            String?
  email           String            @unique
  emailVerified   DateTime?
  image           String?
  password        String?
  preferences     Json?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  // Relations
  authAccounts    AuthAccount[]
  sessions        Session[]
  memberships     AccountMembership[]
  systemRoles     SystemRole[]
  timeEntries     TimeEntry[]
  invoices        Invoice[]
  // ... other relations
}

model AccountMembership {
  id        String    @id @default(cuid())
  userId    String
  accountId String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  // Relations
  user      User      @relation(fields: [userId], references: [id])
  account   Account   @relation(fields: [accountId], references: [id])
  roles     MembershipRole[]
  
  @@unique([userId, accountId])
}
```

### Permission System (ABAC)

```prisma
model RoleTemplate {
  id                    String            @id @default(cuid())
  name                  String            @unique
  description           String?
  permissions           String[]          // Array of permission strings
  inheritAllPermissions Boolean           @default(false) // Super-admin flag
  isSystemRole          Boolean           @default(false)
  scope                 String            @default("account")
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
  
  // Relations
  systemRoles           SystemRole[]
  membershipRoles       MembershipRole[]
}

model SystemRole {
  id     String       @id @default(cuid())
  userId String
  roleId String
  
  // Relations
  user   User         @relation(fields: [userId], references: [id])
  role   RoleTemplate @relation(fields: [roleId], references: [id])
  
  @@unique([userId, roleId])
}

model MembershipRole {
  id           String            @id @default(cuid())
  membershipId String
  roleId       String
  
  // Relations  
  membership   AccountMembership @relation(fields: [membershipId], references: [id])
  role         RoleTemplate      @relation(fields: [roleId], references: [id])
  
  @@unique([membershipId, roleId])
}
```

### Account Management

```prisma
model Account {
  id           String            @id @default(cuid())
  name         String
  accountType  AccountType       @default(INDIVIDUAL)
  parentId     String?           // Hierarchical structure
  companyName  String?
  address      String?
  phone        String?
  domains      String?           // CSV for auto-assignment
  customFields Json?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  
  // Relations
  parent       Account?          @relation("AccountHierarchy", fields: [parentId], references: [id])
  children     Account[]         @relation("AccountHierarchy")
  memberships  AccountMembership[]
  tickets      Ticket[]
  invoices     Invoice[]
  billingRates AccountBillingRate[]
  // ... other relations
}

enum AccountType {
  INDIVIDUAL
  ORGANIZATION  
  SUBSIDIARY
}
```

### Billing & Invoicing System

#### Billing Rates

```prisma
model BillingRate {
  id           String               @id @default(cuid())
  name         String               @unique
  rate         Float
  description  String?
  isDefault    Boolean              @default(false)
  isEnabled    Boolean              @default(true)  // Recent addition!
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt
  
  // Relations
  accountRates AccountBillingRate[]
  timeEntries  TimeEntry[]
}

model AccountBillingRate {
  id            String      @id @default(cuid())
  accountId     String
  billingRateId String
  rate          Float       // Override rate for this account
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  // Relations
  account       Account     @relation(fields: [accountId], references: [id])
  billingRate   BillingRate @relation(fields: [billingRateId], references: [id])
  
  @@unique([accountId, billingRateId])
}
```

#### Invoice System

```prisma
model Invoice {
  id            String        @id @default(cuid())
  invoiceNumber String        @unique
  status        String        @default("DRAFT")
  total         Float         // Single total field - NO subtotal/tax!
  issueDate     DateTime      @default(now())
  dueDate       DateTime?
  notes         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  accountId     String
  creatorId     String
  
  // Relations
  account       Account       @relation(fields: [accountId], references: [id])
  creator       User          @relation(fields: [creatorId], references: [id])
  items         InvoiceItem[]
}

model InvoiceItem {
  id          String       @id @default(cuid())
  description String
  quantity    Float
  rate        Float
  amount      Float
  invoiceId   String
  timeEntryId String?
  addonId     String?      // Links to TicketAddon - use "addon" in TS!
  
  // Relations
  invoice     Invoice      @relation(fields: [invoiceId], references: [id])
  timeEntry   TimeEntry?   @relation(fields: [timeEntryId], references: [id])
  addon       TicketAddon? @relation("InvoiceItemAddon", fields: [addonId], references: [id])
}
```

### Time Tracking

```prisma
model TimeEntry {
  id               String        @id @default(cuid())
  description      String?
  minutes          Int
  date             DateTime      @default(now())
  noCharge         Boolean       @default(false)
  billingRateId    String?
  billingRateName  String?       // Cached for historical accuracy
  billingRateValue Float?        // Cached for historical accuracy
  isApproved       Boolean       @default(false)
  approvedBy       String?
  approvedAt       DateTime?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  ticketId         String?
  accountId        String?       // Direct account assignment
  userId           String
  
  // Relations
  ticket           Ticket?       @relation(fields: [ticketId], references: [id])
  account          Account?      @relation(fields: [accountId], references: [id])
  user             User          @relation(fields: [userId], references: [id])
  approver         User?         @relation("TimeEntryApprover", fields: [approvedBy], references: [id])
  billingRate      BillingRate?  @relation(fields: [billingRateId], references: [id])
  invoiceItems     InvoiceItem[]
}
```

### Ticket Management

```prisma
model Ticket {
  id                      String        @id @default(cuid())
  ticketNumber            String        @unique
  title                   String
  description             String?
  status                  String        @default("OPEN")
  priority                String        @default("MEDIUM")
  customFields            Json?
  createdAt               DateTime      @default(now())
  updatedAt               DateTime      @updatedAt
  accountId               String
  creatorId               String?
  assigneeId              String?       // Direct user assignment
  assignedAccountUserId   String?       // Account user assignment (new!)
  
  // Relations
  account                 Account       @relation(fields: [accountId], references: [id])
  creator                 User?         @relation("TicketCreator", fields: [creatorId], references: [id])
  assignee                User?         @relation("TicketAssignee", fields: [assigneeId], references: [id])
  assignedAccountUser     AccountMembership? @relation("TicketAccountUserAssignment", fields: [assignedAccountUserId], references: [id])
  timeEntries             TimeEntry[]
  addons                  TicketAddon[]
}

model TicketAddon {
  id           String        @id @default(cuid())
  name         String
  description  String?
  price        Float
  quantity     Int           @default(1)
  ticketId     String
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  // Relations
  ticket       Ticket        @relation(fields: [ticketId], references: [id])
  invoiceItems InvoiceItem[] @relation("InvoiceItemAddon")
}
```

## Key Schema Notes

### Invoice Model Constraints

**✅ Fields that exist:**
- `total` - Single amount field
- `issueDate`, `dueDate` - Date fields
- `notes` - Optional text field
- `status` - Workflow status

**❌ Fields that DO NOT exist:**
- `subtotal` - Use only `total`
- `tax` - Calculate separately if needed

### Relationship Naming

**✅ Correct relationship names:**
- `InvoiceItem.addon` - Links to TicketAddon
- `Account.parent/children` - Hierarchical relationships
- `TimeEntry.account` - Direct account link

**❌ Incorrect (common mistakes):**
- `InvoiceItem.ticketAddon` - Should be `addon`
- `Account.parentAccount` - Should be `parent`

### Recent Schema Changes

1. **BillingRate.isEnabled** - Added enable/disable functionality
2. **Ticket.assignedAccountUserId** - Added account user assignment
3. **InvoiceItem.addonId** - Relationship to TicketAddon
4. **Migration regeneration** - All migrations were regenerated from current schema

## Migration Management

### When to Regenerate Migrations

Regenerate migrations when:
- Schema drift occurs (database doesn't match Prisma schema)
- Significant field additions or changes
- Relationship structure modifications

### Regeneration Process

```bash
# 1. Remove existing migrations
rm -rf prisma/migrations

# 2. Create fresh migration from current schema  
npx prisma migrate dev --name initial_complete_schema

# 3. Verify seeding works
npx tsx prisma/seed.ts
```

### Migration Verification

After migration, verify:
- [ ] All schema fields match Prisma models
- [ ] Relationships work correctly  
- [ ] Seed script runs without errors
- [ ] TypeScript compilation succeeds
- [ ] Critical fields like `BillingRate.isEnabled` exist

## Common Schema Issues

### Permission Context Errors

**Problem**: `userId` undefined in database queries

**Cause**: PermissionService called incorrectly

**Solution**: Always use PermissionContext object:
```typescript
// ✅ Correct
await permissionService.hasPermission({
  userId: session.user.id,
  resource: 'invoices',
  action: 'view'
});
```

### Field Mismatch Errors  

**Problem**: TypeScript interface doesn't match database

**Cause**: Interface uses non-existent fields

**Solution**: Align interface with actual schema:
```typescript
// ✅ Correct interface
interface Invoice {
  total: number;        // Only this field exists
  // subtotal: number;  // This does NOT exist
  // tax: number;       // This does NOT exist
}
```

### Relationship Errors

**Problem**: Cannot access relationship data

**Cause**: Using incorrect relationship names

**Solution**: Use correct Prisma relationship names:
```typescript
// ✅ Correct
item.addon?.name              // Not item.ticketAddon
account.parent?.name          // Not account.parentAccount
account.children?.length      // Not account.childAccounts
```

## Schema Evolution

When evolving the schema:

1. **Update Prisma schema** first
2. **Run `npx prisma db push`** for development
3. **Generate migrations** for production deployment
4. **Update TypeScript interfaces** to match
5. **Update documentation** with changes
6. **Test seed scripts** after changes

This ensures consistency between database, application, and documentation.

## Database Indexing

Key indexes for performance:

```sql
-- User lookups
CREATE INDEX "User_email_idx" ON "User"("email");

-- Account hierarchy
CREATE INDEX "Account_parentId_idx" ON "Account"("parentId");
CREATE INDEX "Account_domains_idx" ON "Account"("domains");

-- Permission queries  
CREATE INDEX "AccountMembership_userId_idx" ON "AccountMembership"("userId");
CREATE INDEX "AccountMembership_accountId_idx" ON "AccountMembership"("accountId");

-- Invoice/billing queries
CREATE INDEX "Invoice_accountId_idx" ON "Invoice"("accountId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "TimeEntry_isApproved_idx" ON "TimeEntry"("isApproved");
```

These indexes support the permission system queries and common business operations efficiently.