# Account Management System Documentation

## Overview

The account management system in Service Vault provides hierarchical organization structures, user membership management, and account-specific customizations. It supports complex business relationships through parent-child account hierarchies and granular permission controls.

## Core Components

### 1. Account Structure

#### Account Model
```prisma
model Account {
  id          String      @id @default(cuid())
  name        String
  accountType AccountType @default(INDIVIDUAL)
  parentId    String?
  companyName String?
  address     String?
  phone       String?
  domains     String?     // CSV of email domains for auto-assignment
  customFields Json?      // JSONB for custom fields
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  // Hierarchical relations
  parent   Account?  @relation("AccountHierarchy", fields: [parentId], references: [id])
  children Account[] @relation("AccountHierarchy")

  // Application relations
  memberships AccountMembership[]
  tickets     Ticket[]
  timeEntries TimeEntry[]
  invoices    Invoice[]
  settings    AccountSettings?
  billingRates AccountBillingRate[]
}
```

#### Account Types
```prisma
enum AccountType {
  INDIVIDUAL    // Single person or small entity
  ORGANIZATION  // Company or large entity
  SUBSIDIARY    // Child organization under a parent
}
```

**Type Characteristics**:
- **INDIVIDUAL**: Personal accounts, no hierarchy, simplified management
- **ORGANIZATION**: Top-level business entities, can have subsidiaries
- **SUBSIDIARY**: Child accounts that inherit settings and permissions from parent

### 2. Hierarchical Structure

#### Parent-Child Relationships
The system supports unlimited depth hierarchies with the following rules:

- **Root Accounts**: `parentId = null`, typically ORGANIZATION or INDIVIDUAL type
- **Subsidiary Accounts**: `parentId` references parent account, must be SUBSIDIARY type
- **Inheritance**: Child accounts inherit permissions and settings from parents
- **Aggregation**: Parent accounts can view aggregated data from children

#### Hierarchy Navigation
```typescript
// Build hierarchy tree from flat account list
export function buildAccountHierarchy(accounts: AccountWithHierarchy[]): AccountWithHierarchy[] {
  const accountMap = new Map<string, AccountWithHierarchy>();
  const rootAccounts: AccountWithHierarchy[] = [];
  
  // Create account map
  accounts.forEach(account => {
    accountMap.set(account.id, { ...account, children: [], depth: 0 });
  });

  // Build parent-child relationships
  accounts.forEach(account => {
    const currentAccount = accountMap.get(account.id)!;
    
    if (account.parent?.id) {
      const parent = accountMap.get(account.parent.id);
      if (parent) {
        parent.children!.push(currentAccount);
        currentAccount.depth = (parent.depth || 0) + 1;
      }
    } else {
      rootAccounts.push(currentAccount);
    }
  });

  return rootAccounts;
}
```

### 3. User Membership Management

#### AccountMembership Model
```prisma
model AccountMembership {
  id        String   @id @default(cuid())
  userId    String
  accountId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)
  roles   MembershipRole[]

  @@unique([userId, accountId])
}
```

**Key Features**:
- **Many-to-Many**: Users can belong to multiple accounts
- **Role-Based**: Each membership can have multiple roles
- **Cascade Deletion**: Memberships are automatically cleaned up
- **Unique Constraint**: One membership per user per account

#### Membership Lifecycle
1. **Invitation**: User invited to join account via email
2. **Activation**: User accepts invitation and creates login
3. **Role Assignment**: Roles assigned based on business needs
4. **Status Management**: Active/inactive status controls access
5. **Transfer**: Users can be moved between accounts in same hierarchy

### 4. Account Settings & Customization

#### AccountSettings Model
```prisma
model AccountSettings {
  id           String  @id @default(cuid())
  accountId    String  @unique
  customFields Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  account Account @relation(fields: [accountId], references: [id])
}
```

#### Custom Fields System
Accounts support flexible custom field definitions stored as JSONB:

```typescript
interface CustomField {
  id: string;
  type: 'text' | 'select' | 'number' | 'date' | 'boolean';
  label: string;
  required?: boolean;
  options?: string[]; // For select fields
  defaultValue?: any;
}

interface AccountCustomFields {
  fields: CustomField[];
  values: Record<string, any>;
}
```

### 5. Domain-Based Auto-Assignment

#### Email Domain Matching
The `domains` field supports CSV format for automatic user assignment:

```sql
-- Example account with domains
UPDATE accounts SET domains = 'company.com,subsidiary.com,partner.org' WHERE id = 'account_id';
```

#### Auto-Assignment Logic (To Be Implemented)
```typescript
async function autoAssignUserToAccount(userEmail: string): Promise<string[]> {
  const domain = userEmail.split('@')[1];
  
  const matchingAccounts = await prisma.account.findMany({
    where: {
      domains: {
        contains: domain
      }
    }
  });
  
  const accountIds: string[] = [];
  
  for (const account of matchingAccounts) {
    const accountDomains = account.domains?.split(',').map(d => d.trim()) || [];
    
    if (accountDomains.includes(domain)) {
      // Create membership if not exists
      await prisma.accountMembership.upsert({
        where: {
          userId_accountId: {
            userId: user.id,
            accountId: account.id
          }
        },
        create: {
          userId: user.id,
          accountId: account.id
        },
        update: {} // No changes if exists
      });
      
      accountIds.push(account.id);
    }
  }
  
  return accountIds;
}
```

### 6. Billing Rate Overrides

#### Account-Specific Rates
Each account can override system billing rates:

```prisma
model AccountBillingRate {
  id            String  @id @default(cuid())
  accountId     String
  billingRateId String
  rate          Float   // Override rate for this account
  
  account     Account     @relation(fields: [accountId], references: [id])
  billingRate BillingRate @relation(fields: [billingRateId], references: [id])

  @@unique([accountId, billingRateId])
}
```

**Business Logic**:
- One override per account per billing rate type
- Overrides completely replace default rates
- Used in time entry billing calculations
- Maintains audit trail for rate changes

### 7. UI Components & Views

#### Account Tree View
Hierarchical display with expand/collapse functionality:

```typescript
// AccountTreeView component features:
- Expandable tree structure
- Account type icons (Building, Building2, User)
- Quick stats display (users, tickets, hours)
- Action buttons (view, settings, email)
- Search and filtering capabilities
```

#### Account Grid View
Card-based layout with hierarchy indicators:

```typescript
// AccountHierarchyCard component features:
- Visual hierarchy depth indicators
- Parent account breadcrumbs
- Subsidiary count badges
- Statistics overview
- Quick action buttons
```

#### View Toggle System
User preference-based view switching:

```typescript
// AccountViewToggle component:
- Grid vs Tree view options
- localStorage persistence
- User preference sync
- Responsive design adaptation
```

### 8. Permission Integration

#### Account-Scoped Permissions
The permission system integrates with accounts through:

- **Resource Scoping**: Permissions can be account-specific
- **Hierarchy Inheritance**: Child accounts inherit parent permissions
- **Membership Roles**: Users have different roles per account
- **Action Control**: View, create, update, delete permissions per account

#### Permission Checking Example
```typescript
// Check if user has permission for specific account
const hasPermission = await permissionService.hasPermission({
  userId: session.user.id,
  resource: 'time-entries',
  action: 'create',
  accountId: account.id
});
```

### 9. API Endpoints

#### Account Management
- `GET /api/accounts` - List accounts with hierarchy and stats
- `POST /api/accounts` - Create new account
- `GET /api/accounts/[id]` - Get account details with relationships
- `PUT /api/accounts/[id]` - Update account information
- `DELETE /api/accounts/[id]` - Delete account (with safety checks)

#### Account Users (Legacy - being migrated to memberships)
- `GET /api/account-users` - List account memberships
- `POST /api/account-users/invite` - Invite user to account
- `POST /api/account-users/create-manual` - Create direct membership
- `POST /api/account-users/[id]/move` - Transfer user between accounts
- `POST /api/account-users/[id]/resend-invitation` - Resend invitation
- `DELETE /api/account-users/[id]` - Remove user from account

#### Account Settings
- `GET /api/accounts/[id]/settings` - Get account-specific settings
- `PUT /api/accounts/[id]/settings` - Update account settings

### 10. Data Relationships

#### Primary Relationships
```
Account (1) → (N) AccountMembership → (1) User
Account (1) → (N) Ticket
Account (1) → (N) TimeEntry
Account (1) → (N) Invoice
Account (1) → (1) AccountSettings
Account (1) → (N) AccountBillingRate
Account (1) → (N) Account (children)
Account (N) → (1) Account (parent)
```

#### Statistics Calculations
Account pages display comprehensive statistics:

```typescript
interface AccountStats {
  users: {
    total: number;      // Total memberships
    active: number;     // Users with login
    pending: number;    // Pending invitations
  };
  tickets: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
  timeEntries: {
    total: number;
    totalMinutes: number;
    billableMinutes: number;
    nonBillableMinutes: number;
  };
  invoices: {
    total: number;
    totalAmount: number;
  };
}
```

### 11. Migration Considerations

#### Legacy Schema Migration
The system is migrating from older user management patterns:

**Old Structure**:
- `accountUsers` table with direct user relationships
- `parentAccount` / `childAccounts` field names
- Limited role management

**New Structure** (Current):
- `AccountMembership` with role-based access
- `parent` / `children` relationships
- Comprehensive permission system

#### Migration Requirements
1. **Data Migration**: Move existing `accountUsers` to `AccountMembership`
2. **API Updates**: Update all endpoints to use new schema
3. **UI Components**: Update components to use new data structure
4. **Permission Integration**: Implement account-scoped permissions

### 12. Security Considerations

#### Access Control
- **Hierarchy Respect**: Users can only access accounts they're members of
- **Parent-Child Rules**: Parent account access doesn't automatically grant child access
- **Role-Based**: Different roles provide different access levels
- **Data Isolation**: Strict account-based data separation

#### Data Protection
- **Cascade Deletion Protection**: Prevents accidental data loss
- **Audit Trails**: All account changes tracked with timestamps
- **Input Validation**: Strict validation on account creation/updates
- **Permission Checks**: Every operation validates user permissions

### 13. Performance Optimization

#### Database Indexing
```sql
-- Key indexes for account operations
CREATE INDEX idx_accounts_parent_id ON accounts(parent_id);
CREATE INDEX idx_accounts_domains ON accounts(domains);
CREATE INDEX idx_account_memberships_user_id ON account_memberships(user_id);
CREATE INDEX idx_account_memberships_account_id ON account_memberships(account_id);
```

#### Query Optimization
- **Batch Loading**: Load account hierarchies efficiently
- **Selective Includes**: Only include necessary relationships
- **Statistics Caching**: Cache calculated statistics for large accounts
- **Permission Filtering**: Apply permission filters at database level

### 14. Future Enhancements

#### Planned Features
1. **Advanced Hierarchy Management**: Drag-and-drop hierarchy reorganization
2. **Bulk Operations**: Mass user assignment and role management
3. **Account Templates**: Predefined account structures for quick setup
4. **Integration APIs**: External system integration capabilities
5. **Advanced Analytics**: Account performance and utilization reporting

#### Domain Auto-Assignment
The foundation exists but needs implementation:
- Email domain parsing and matching
- Automatic membership creation
- Conflict resolution for multiple matches
- Administrative override capabilities

## Conclusion

The account management system provides a robust foundation for organizational structure management with hierarchical relationships, flexible membership management, and comprehensive customization options. The ongoing migration to the new permission-based architecture will enhance security and provide more granular control over account access and operations.