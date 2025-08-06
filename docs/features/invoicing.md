# Invoice Management System

The Service Vault invoicing system provides comprehensive billing functionality with time entry and addon integration, ABAC permissions, and flexible generation options.

## Overview

The invoicing system converts billable time entries and ticket addons into professional invoices with:

- **Automated Invoice Generation**: From time entries and ticket addons
- **Manual Item Selection**: Choose specific items to include
- **Subsidiary Company Support**: Include time entries from child companies
- **Permission-Based Access**: ABAC controls for view/edit/delete operations
- **Account Context**: Invoices are tied to specific accounts with hierarchy support
- **Status Workflow**: Draft → Sent → Paid progression

## Database Schema

### Core Models

```prisma
model Invoice {
  id            String        @id @default(cuid())
  invoiceNumber String        @unique
  status        String        @default("DRAFT")
  total         Float
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
  id          String    @id @default(cuid())
  description String
  quantity    Float
  rate        Float
  amount      Float
  invoiceId   String
  timeEntryId String?   // Link to TimeEntry
  addonId     String?   // Link to TicketAddon
  
  // Relations
  invoice     Invoice     @relation(fields: [invoiceId], references: [id])
  timeEntry   TimeEntry?  @relation(fields: [timeEntryId], references: [id])
  addon       TicketAddon? @relation("InvoiceItemAddon", fields: [addonId], references: [id])
}
```

### Key Points

- **No `subtotal` or `tax` fields**: Use only `total` for invoice amounts
- **Relationship naming**: Use `addon` (not `ticketAddon`) in TypeScript interfaces
- **Flexible items**: Can include time entries, ticket addons, or custom items

## Permission System

### Required Permissions

```typescript
// Invoice-specific permissions
const permissions = {
  'invoices:view',      // View invoice details
  'invoices:create',    // Generate new invoices  
  'invoices:edit',      // Edit draft invoices
  'invoices:delete',    // Delete draft invoices
  'invoices:update-dates', // Modify issue/due dates
  'billing:view',       // General billing access
  'billing:create'      // Generate billing items
};
```

### Frontend Permission Usage

```typescript
const { 
  canViewInvoices, 
  canEditInvoices, 
  canDeleteInvoices,
  canCreateInvoices 
} = usePermissions();

// Status-based permissions
const canEdit = canEditInvoices && invoice.status === 'DRAFT';
const canDelete = canDeleteInvoices && invoice.status === 'DRAFT';
```

### Backend Permission Checks

```typescript
// Always check account context for invoices
const canViewInvoice = await permissionService.hasPermission({
  userId: session.user.id,
  resource: "invoices",
  action: "view", 
  accountId: invoice.accountId  // Critical: include account context
});
```

## API Endpoints

### Core Routes

- `GET /api/invoices` - List invoices with permission filtering
- `POST /api/invoices/generate` - Generate invoice from criteria
- `POST /api/invoices/preview` - Preview items before generation
- `GET /api/invoices/[id]` - Get specific invoice details
- `PUT /api/invoices/[id]` - Update invoice (dates, status, notes)
- `DELETE /api/invoices/[id]` - Delete draft invoices only
- `GET /api/invoices/[id]/available-items` - Get unbilled items for invoice
- `POST /api/invoices/[id]/items` - Add items to existing invoice
- `DELETE /api/invoices/[id]/items/[itemId]` - Remove item from invoice

### API Consistency & Enhanced Discovery

**Critical Enhancement**: Both discovery and validation APIs now use identical filtering logic to prevent "not found" errors.

```typescript
// Both /available-items and /items endpoints use this logic:
const timeEntryFilter = {
  AND: [
    { invoiceItems: { none: {} } },
    { isApproved: true },
    {
      OR: [
        { accountId: { in: accountIds } },     // Direct match
        { ticket: { accountId: { in: accountIds } } }  // Ticket relationship
      ]
    }
  ]
};
```

**Why This Matters**:
- **Before**: Items shown in dialog might fail validation when adding to invoice
- **After**: Items discoverable by `available-items` are guaranteed to pass `items` validation
- **Benefit**: Eliminates "Some time entries not found or already billed" errors for valid items

### Invoice Generation

```typescript
// Generate invoice with automatic item selection
const response = await fetch('/api/invoices/generate', {
  method: 'POST',
  body: JSON.stringify({
    accountId: 'acc_123',
    startDate: '2024-01-01',    // Optional
    endDate: '2024-01-31',      // Optional  
    includeUnbilledOnly: true,  // Default: true
    includeSubsidiaries: false, // Default: false
    // Manual selection (optional)
    selectedTimeEntryIds: ['te_1', 'te_2'],
    selectedAddonIds: ['addon_1']
  })
});
```

### Preview Before Generation

```typescript
// Preview billable items
const preview = await fetch('/api/invoices/preview', {
  method: 'POST',
  body: JSON.stringify({
    accountId: 'acc_123',
    includeUnbilledOnly: true
  })
});

const data = await preview.json();
// Returns: { timeEntries, ticketAddons, summary }
```

### Available Items with Enhanced Discovery

The `available-items` endpoint uses enhanced logic to find billable items through multiple pathways and supports subsidiary company inclusion:

```typescript
// Get available items for current account only
const response = await fetch(`/api/invoices/${invoiceId}/available-items`);

// Include subsidiary companies
const responseWithSubs = await fetch(`/api/invoices/${invoiceId}/available-items?includeSubsidiaries=true`);

const data = await response.json();
// Returns: { 
//   timeEntries: TimeEntry[], 
//   addons: TicketAddon[], 
//   summary: { timeEntryCount, addonCount, totalTimeHours, estimatedTimeValue, estimatedAddonValue }
// }
```

**Hierarchy Resolution**:
- Recursively finds all child accounts using `Account.parentId` relationships
- Includes time entries from all descendant companies in the hierarchy
- Maintains permission checks for each account in the hierarchy
- Only includes approved time entries that haven't been invoiced yet

**Enhanced Time Entry Discovery**:
```typescript
// Multiple pathways for finding billable time entries
const timeEntries = await prisma.timeEntry.findMany({
  where: {
    AND: [
      { invoiceItems: { none: {} } }, // Not already invoiced
      { isApproved: true },           // Only approved entries
      {
        OR: [
          // Direct account match
          { accountId: { in: accountIds } },
          // Ticket relationship - time entries for tickets belonging to invoice account
          {
            ticket: {
              accountId: { in: accountIds }
            }
          }
        ]
      }
    ]
  }
});
```

**Discovery Logic**:
- **Direct Account Match**: `timeEntry.accountId` matches the invoice account
- **Ticket Relationship**: `timeEntry.ticket.accountId` matches the invoice account
- **Hierarchy Support**: Both pathways include subsidiary accounts when `includeSubsidiaries=true`
- **Validation Consistency**: Same logic used in both discovery (`available-items`) and validation (`items`) APIs

## Frontend Components

### Invoice Detail Page

**Location**: `/src/app/invoices/[id]/page.tsx`

**Key Features**:
- Status-based action buttons (Edit, Delete, Mark Sent, etc.)
- Time entry and addon item display with subsidiary toggle
- Date field editing with permissions
- Real-time permission checking
- Add Time Entries and Add Addons dialogs with hierarchy support

**Interface Alignment**:
```typescript
interface Invoice {
  // ✅ Use these fields
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  issueDate: string;
  dueDate?: string;
  notes?: string;
  
  // ❌ Don't use these (don't exist in DB)
  // subtotal: number;  
  // tax: number;
  
  items: InvoiceItem[]; // Use 'addon' not 'ticketAddon'
}
```

### Add Time Entries Dialog

**Location**: `/src/components/invoices/AddTimeEntriesDialog.tsx`

**Key Features**:
- Lists unbilled, approved time entries for the invoice account
- **Subsidiary Toggle**: Switch to include time entries from child companies
- Handles time entries without billing rates (shows $0 estimated amount)
- Bulk selection with "Select All" functionality
- Real-time total calculation

**Usage**:
```typescript
<AddTimeEntriesDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  invoiceId={invoice.id}
  onSuccess={handleRefresh}
/>
```

### Add Addons Dialog

**Location**: `/src/components/invoices/AddAddonsDialog.tsx`

**Key Features**:
- Lists unbilled ticket addons for the invoice account
- **Subsidiary Toggle**: Switch to include addons from child companies
- Shows ticket context and addon details
- Bulk selection with total calculation
- Visual feedback for selected items with ring outline (properly contained)

**Usage**:
```typescript
<AddAddonsDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  invoiceId={invoice.id}
  onSuccess={handleRefresh}
/>
```

**UI Improvements**:
- Added padding to scrollable containers to prevent outline clipping
- Consistent toggle UI between both dialogs
- Clear visual feedback for subsidiary inclusion mode

### Billing Management Page

**Location**: `/src/app/billing/page.tsx`

**Features**:
- Invoice list with status filtering
- Generation wizard with preview
- Manual item selection interface
- Account hierarchy support

## Common Issues & Solutions

### 1. Permission Service Parameter Error

**Problem**: `userId` is undefined in PermissionService

**❌ Wrong**:
```typescript
await permissionService.hasPermission(userId, 'invoices', 'view', accountId);
```

**✅ Correct**:
```typescript  
await permissionService.hasPermission({
  userId: session.user.id,
  resource: 'invoices',
  action: 'view',
  accountId: accountId
});
```

### 2. Database Schema Mismatch

**Problem**: Interface doesn't match actual database fields or API includes use wrong relationship names

**❌ Wrong**:
```typescript
// These fields don't exist in the Invoice model
invoice.subtotal
invoice.tax
item.ticketAddon  // Should be 'addon'

// API include statements using wrong relationship name
include: {
  items: {
    include: {
      ticketAddon: {  // Wrong - should be 'addon'
        include: { ticket: true }
      }
    }
  }
}
```

**✅ Correct**:
```typescript
invoice.total     // Only total amount exists
item.addon        // Correct relationship name

// Correct API include statement
include: {
  items: {
    include: {
      addon: {        // Correct relationship name
        include: { ticket: true }
      }
    }
  }
}
```

### 3. Migration Schema Drift

**Problem**: Database schema doesn't match Prisma schema

**Solution**:
```bash
# Delete and regenerate migrations
rm -rf prisma/migrations
npx prisma migrate dev --name initial_complete_schema
```

## Status Workflow

```
DRAFT ──── Mark Sent ───→ SENT ──── Mark Paid ───→ PAID
  │                         │                        │
  │                         │                        │
  └─── Delete ───→ ❌       └── Mark Overdue ──→ OVERDUE
                                      │
                                      └── Mark Paid ──→ PAID
```

### Status Permissions

- **DRAFT**: Full edit, delete, mark sent
- **SENT**: Mark paid, cannot edit items  
- **PAID**: Unmark paid only
- **OVERDUE**: Mark paid, cannot edit

## Testing Checklist

- [ ] Permission service uses PermissionContext format
- [ ] Invoice interface matches database schema  
- [ ] Migration includes all schema fields (especially `isEnabled`)
- [ ] Frontend uses correct relationship names (`addon` not `ticketAddon`)
- [ ] API endpoints check account context permissions
- [ ] Status-based actions work correctly
- [ ] Manual item selection preserves totals

## Migration Notes

When regenerating migrations:

1. **Delete existing**: `rm -rf prisma/migrations`
2. **Create fresh**: `npx prisma migrate dev --name initial_complete_schema`  
3. **Verify fields**: Check `BillingRate.isEnabled` and other recent schema changes
4. **Test seeding**: Ensure `npx tsx prisma/seed.ts` works without errors

This approach ensures the database exactly matches the current Prisma schema without drift.