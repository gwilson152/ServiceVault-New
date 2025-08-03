# Invoice Management System

## Overview

The invoice management system provides complete lifecycle management for invoices, from creation through payment tracking. It includes status workflow management, PDF export capabilities, and dynamic item management with comprehensive ABAC permission integration.

## Invoice Status Workflow

### Status Definitions

**DRAFT**
- Initial state for all new invoices
- Full editing capabilities available
- Can add/remove time entries and addons
- Can delete entire invoice
- Required for all item modifications

**SENT** 
- Invoice has been sent to customer
- No longer editable (items cannot be added/removed)
- Can be marked as paid or overdue
- Cannot be deleted

**PAID**
- Invoice has been paid by customer
- View-only mode for most operations
- Can be unmarked (reverted to SENT status)
- Complete audit trail maintained

**OVERDUE**
- Automatically set or manually marked for late payments
- Similar restrictions to SENT status
- Can be marked as paid
- Highlighted for attention in lists

### Status Transitions

```
DRAFT → SENT → PAID
       ↓     ↗
    OVERDUE ↗
```

Valid transitions:
- `DRAFT` → `SENT` (Mark as Sent)
- `SENT` → `PAID` (Mark as Paid)
- `SENT` → `OVERDUE` (Mark as Overdue)
- `OVERDUE` → `PAID` (Mark as Paid)
- `PAID` → `SENT` (Unmark as Paid)

## Invoice Detail Page Features

### Header Actions (ActionBar Integration)

The invoice detail page integrates with the shared ActionBar system to provide context-sensitive actions:

**For DRAFT Invoices:**
- **Export PDF**: Generate and download professional PDF
- **Mark as Sent**: Transition to SENT status
- **Edit Invoice**: Toggle edit mode for item management
- **Delete**: Remove draft invoice entirely

**For SENT/OVERDUE Invoices:**
- **Export PDF**: Generate and download professional PDF
- **Mark as Paid**: Transition to PAID status

**For PAID Invoices:**
- **Export PDF**: Generate and download professional PDF
- **Unmark as Paid**: Revert to SENT status

### Item Management

#### Time Entry Items
- Display user name, hours worked, and billing rate
- Show associated ticket information when available
- Include date and description details
- Remove button available in edit mode (DRAFT only)

#### Addon Items
- Display addon name, quantity, and unit price
- Show associated ticket information
- Include description and total amount
- Remove button available in edit mode (DRAFT only)

#### Adding Items (DRAFT Only)
- **Add Time Entries**: Button opens dialog to select unbilled time entries
- **Add Addons**: Button opens dialog to select unbilled ticket addons
- Items are filtered to same account as invoice
- Only unbilled items are available for selection
- Automatic total recalculation after changes

### PDF Export System

#### Features
- Professional invoice layout with company branding
- Complete invoice details including header and line items
- Automatic page breaks for large invoices
- Proper formatting for printing and digital distribution
- Filename format: `invoice-{invoiceNumber}.pdf`

#### Technical Implementation
- Server-side generation using jsPDF library
- Streaming download with proper MIME types
- Optimized for large invoices with pagination
- Includes all invoice data: items, totals, notes, dates

#### Permission Requirements
- Requires `INVOICES.EXPORT_PDF` permission
- Available for all invoice statuses
- Account-scoped permission enforcement

## Permission System Integration

### Required Permissions

**Viewing Invoices:**
- `INVOICES.VIEW` - Basic permission to view invoice details
- Account-scoped: Can view invoices for permitted accounts

**Status Management:**
- `INVOICES.MARK_SENT` - Mark DRAFT invoices as sent
- `INVOICES.MARK_PAID` - Mark SENT/OVERDUE invoices as paid
- `INVOICES.UNMARK_PAID` - Revert PAID invoices to SENT

**Item Management:**
- `INVOICES.EDIT_ITEMS` - Add or remove items from DRAFT invoices
- `INVOICES.DELETE` - Delete DRAFT invoices entirely

**Export Functions:**
- `INVOICES.EXPORT_PDF` - Generate and download PDF versions

### Scope Enforcement

All permissions support three scope levels:
- **Own**: Only invoices created by the user
- **Account**: All invoices for assigned accounts
- **Subsidiary**: Invoices for account hierarchy including child accounts

### Role-Based Defaults

**ADMIN Role:**
- All invoice permissions with global scope
- Full access to all invoice operations

**EMPLOYEE Role:**
- View, create, update, and edit items
- Status management and PDF export
- Account-scoped permissions

**Account Users:**
- View-only access through customer portal
- Limited to invoices for their specific account

## API Endpoints

### Invoice Management
- `GET /api/invoices/[id]` - Retrieve invoice details
- `PUT /api/invoices/[id]` - Update invoice (status, notes, description)
- `DELETE /api/invoices/[id]` - Delete DRAFT invoices

### Item Management
- `POST /api/invoices/[id]/items` - Add time entries and addons
- `DELETE /api/invoices/[id]/items/[itemId]` - Remove specific items
- `GET /api/invoices/[id]/available-items` - List unbilled items for account

### Export Functions
- `GET /api/invoices/[id]/pdf` - Generate and download PDF

### Request/Response Examples

#### Add Items to Invoice
```json
POST /api/invoices/123/items
{
  "timeEntryIds": ["te_001", "te_002"],
  "addonIds": ["addon_001"]
}

Response:
{
  "success": true,
  "itemsAdded": 3,
  "timeEntriesAdded": 2,
  "addonsAdded": 1
}
```

#### Update Invoice Status
```json
PUT /api/invoices/123
{
  "status": "SENT"
}

Response: {
  // Complete updated invoice object
}
```

## Business Rules

### Status Transition Validation
- Only valid status transitions are allowed
- Server-side validation prevents invalid state changes
- Business logic enforced at API level

### Item Management Rules
- Items can only be added to DRAFT invoices
- Items must belong to the same account as the invoice
- Items cannot already be billed on another invoice
- Time entries must be approved before billing

### Deletion Rules
- Only DRAFT invoices can be deleted
- Deletion removes all associated invoice items
- Action is irreversible and requires confirmation

### PDF Generation Rules
- Available for all invoice statuses
- Includes complete invoice data at time of generation
- Consistent formatting regardless of invoice size

## User Experience Features

### Visual Status Indicators
- Color-coded status badges with clear descriptions
- Status-specific action availability
- Progress indicators for multi-step operations

### Empty States
- Helpful messages when invoices have no items
- Guidance for adding items in edit mode
- Clear calls-to-action for next steps

### Error Handling
- Comprehensive error messages for failed operations
- Permission-based error explanations
- Recovery suggestions for common issues

### Loading States
- Progress indicators during PDF generation
- Smooth transitions during status changes
- Non-blocking UI for long operations

## Development Patterns

### Component Architecture
- Shared ActionBar integration for consistent UX
- Permission-based conditional rendering
- Separation of concerns between UI and business logic

### State Management
- React hooks for component state
- Server state synchronization after operations
- Optimistic updates with rollback on errors

### Error Recovery
- Transaction-based operations for data consistency
- Automatic retry mechanisms for transient failures
- Clear error reporting with actionable messages

---

*Invoice Management System - Complete lifecycle management with professional PDF export and comprehensive permission control*