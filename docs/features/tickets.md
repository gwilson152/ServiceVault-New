# Ticket Management System

The Service Vault ticket system provides comprehensive issue tracking with advanced assignment capabilities, time tracking integration, and ABAC permission controls.

## Overview

The ticket system supports:

- **Dual Assignment Model**: Direct user assignment + account user assignment
- **Explicit Permission System**: `assignable-to` and `assignable-for` permissions  
- **Hierarchical Account Integration**: Account-based ticket organization
- **Time Tracking Integration**: Seamless time entry creation and billing
- **Addon Management**: Parts and additional items tracking
- **Flexible Custom Fields**: Configurable ticket properties

## Database Schema

### Ticket Model

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
  assignedAccountUserId   String?       // Account user assignment (NEW!)
  
  // Relations
  account                 Account       @relation(fields: [accountId], references: [id])
  creator                 User?         @relation("TicketCreator", fields: [creatorId], references: [id])
  assignee                User?         @relation("TicketAssignee", fields: [assigneeId], references: [id])
  assignedAccountUser     AccountMembership? @relation("TicketAccountUserAssignment", fields: [assignedAccountUserId], references: [id])
  timeEntries             TimeEntry[]
  addons                  TicketAddon[]
}
```

### Key Schema Changes

**Recent Additions:**
- `assignedAccountUserId` - Links to AccountMembership for account-specific user assignment
- Enhanced relationship structure for dual assignment model

## Assignment System

### Dual Assignment Model

The ticket system supports two types of assignment:

#### 1. Direct User Assignment (`assigneeId`)
- Direct assignment to any system user
- Used for cross-account assignments
- Requires `assignable-to` permission

#### 2. Account User Assignment (`assignedAccountUserId`)
- Assignment to users within the ticket's account
- Links to AccountMembership record
- Requires `assignable-for` permission
- Provides account context for permissions

### Permission Structure

#### Assignment Permissions

```typescript
const ticketPermissions = {
  // Basic ticket operations
  'tickets:view',
  'tickets:create', 
  'tickets:edit',
  'tickets:delete',
  
  // Assignment permissions (new explicit structure)
  'tickets:assignable-to',    // Can be assigned tickets directly
  'tickets:assignable-for',   // Can assign tickets to account users
};
```

#### Permission Usage

```typescript
const { 
  canCreateTickets,
  canEditTickets, 
  canAssignTicketsTo,
  canAssignTicketsFor 
} = useTicketPermissions(accountId);

// Direct assignment capability
if (canAssignTicketsTo) {
  // User can be assigned tickets directly
  showDirectAssignmentOption();
}

// Account user assignment capability  
if (canAssignTicketsFor) {
  // User can assign tickets to account users
  showAccountUserSelector();
}
```

## Ticket Creation

### Creation Dialog

The ticket creation dialog includes:

- **Account Selection**: Choose which account owns the ticket
- **Assignment Options**: Based on user permissions
- **Custom Fields**: Account-specific field configuration
- **Priority and Status**: Configurable initial values

### Assignment During Creation

```typescript
interface TicketCreateData {
  title: string;
  description?: string;
  accountId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: string;
  
  // Assignment options (mutually exclusive)
  assigneeId?: string;              // Direct user assignment
  assignedAccountUserId?: string;   // Account user assignment
  
  customFields?: Record<string, any>;
}
```

### Creation Process

1. **Account Selection**: User chooses target account
2. **Permission Check**: Verify create permissions for account
3. **Assignment Configuration**: Based on available permissions
4. **Validation**: Ensure assignment is valid for account
5. **Ticket Creation**: Create with appropriate relationships

## Account User Integration

### AccountUserSelector Component

The account user selector provides:

- **Account Context**: Shows users within specific account
- **Role Display**: Shows user's role within the account
- **Search and Filter**: Find users by name or role
- **Permission Validation**: Only show assignable users

### Usage

```typescript
<AccountUserSelector
  accountId={selectedAccount}
  value={assignedAccountUserId}
  onValueChange={setAssignedAccountUserId}
  placeholder="Select account user"
  showUserRoles={true}
  filterAssignableOnly={true}
/>
```

### Account User Interface

```typescript
interface AccountUser {
  membershipId: string;    // AccountMembership ID
  userId: string;          // User ID
  userName: string;        // User display name
  userEmail: string;       // User email
  roles: {                 // User's roles in this account
    id: string;
    name: string;
    permissions: string[];
  }[];
  canBeAssignedTickets: boolean;  // Permission check result
}
```

## Time Tracking Integration

### Time Entry Creation

Tickets integrate seamlessly with time tracking:

- **Quick Time Entry**: Create time entries directly from ticket
- **Billing Rate Selection**: Choose appropriate billing rate
- **Account Context**: Inherits account from ticket
- **Approval Workflow**: Time entries require approval for billing

### Time Entry Dialog

```typescript
<QuickTimeEntryDialog
  ticketId={ticket.id}
  accountId={ticket.accountId}
  open={timeEntryOpen}
  onOpenChange={setTimeEntryOpen}
  onTimeEntryCreated={handleRefresh}
  defaultBillingRate={ticket.account.defaultBillingRate}
  autoSelectDefaultRate={true}
/>
```

## Addon Management

### Ticket Addons

Track additional items, parts, and services:

```prisma
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

### Addon Features

- **Billing Integration**: Addons can be included in invoices
- **Quantity Tracking**: Support multiple quantities of items
- **Price Management**: Flexible pricing for different addon types
- **Invoice Relationship**: Direct linking to invoice items

## Permission System Integration

### Ticket-Specific Permissions

The ticket system uses account-aware permissions:

```typescript
// Check ticket permissions with account context
const canEditTicket = await permissionService.hasPermission({
  userId: session.user.id,
  resource: 'tickets',
  action: 'edit', 
  accountId: ticket.accountId
});

const canAssignTicketsFor = await permissionService.hasPermission({
  userId: session.user.id,
  resource: 'tickets',
  action: 'assignable-for',
  accountId: ticket.accountId  
});
```

### Frontend Permission Hooks

```typescript
const { 
  canViewTickets,
  canCreateTickets,
  canEditTickets,
  canDeleteTickets,
  canAssignTicketsTo,    // Can be assigned tickets
  canAssignTicketsFor    // Can assign to account users
} = useTicketPermissions(accountId);
```

## Common Patterns

### Ticket Assignment Logic

```typescript
const handleTicketAssignment = async (ticketId: string, assignment: {
  type: 'direct' | 'account-user';
  userId?: string;
  accountUserId?: string;
}) => {
  const updateData: Partial<Ticket> = {};
  
  if (assignment.type === 'direct') {
    updateData.assigneeId = assignment.userId;
    updateData.assignedAccountUserId = null; // Clear other assignment
  } else {
    updateData.assignedAccountUserId = assignment.accountUserId;  
    updateData.assigneeId = null; // Clear other assignment
  }
  
  await updateTicket(ticketId, updateData);
};
```

### Permission-Based UI

```typescript
const TicketAssignmentSection = ({ ticket, canAssignFor, canAssignTo }) => {
  return (
    <div className="space-y-4">
      {canAssignTo && (
        <div>
          <Label>Assign to User</Label>
          <UserSelector 
            value={ticket.assigneeId}
            onValueChange={(userId) => handleAssignment('direct', userId)}
          />
        </div>
      )}
      
      {canAssignFor && (
        <div>
          <Label>Assign to Account User</Label>
          <AccountUserSelector
            accountId={ticket.accountId}
            value={ticket.assignedAccountUserId}
            onValueChange={(userId) => handleAssignment('account-user', userId)}
          />
        </div>
      )}
    </div>
  );
};
```

## Troubleshooting

### Assignment Issues

**Problem**: Cannot assign tickets to account users

**Solution**: Verify `assignable-for` permission and account membership

**Problem**: Ticket assignment not saving

**Solution**: Ensure only one assignment type is set (direct OR account-user)

### Schema Issues

**Problem**: `assignedAccountUserId` field not found

**Solution**: Run database migration to add missing field:
```bash
npx prisma db push
```

### Permission Errors

**Problem**: Permission checks failing for ticket operations

**Solution**: Verify account context is included in permission checks:
```typescript
// Include accountId in permission context
const canEdit = await permissionService.hasPermission({
  userId,
  resource: 'tickets',
  action: 'edit',
  accountId: ticket.accountId  // Critical!
});
```

## Best Practices

### Assignment Strategy

- Use **direct assignment** for cross-account scenarios
- Use **account user assignment** for account-specific workflows
- Never assign both types simultaneously
- Clear opposite assignment when setting new assignment

### Permission Checking

- Always include account context in permission checks
- Use explicit permission names (`assignable-to` vs `assignable-for`)
- Check permissions before showing assignment options
- Validate assignments server-side

### UI/UX Considerations

- Show assignment type clearly in the interface
- Provide context about why assignment options are available/unavailable
- Use consistent terminology across the application
- Implement proper loading and error states

### Performance

- Cache account user lists for large accounts
- Use optimistic updates for assignment changes
- Debounce search inputs in selectors
- Lazy load ticket details when possible

This ticket system provides a flexible, permission-aware foundation for issue tracking while maintaining security and usability across different organizational structures.