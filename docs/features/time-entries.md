# Time Entry System Documentation

## Overview

The time entry system in Service Vault manages time tracking, approval workflows, and billing integration. It supports both ticket-based and direct account time entries with comprehensive approval processes and billing rate management.

## Core Components

### 1. TimeEntry Model

```prisma
model TimeEntry {
  id               String    @id @default(cuid())
  description      String?
  minutes          Int       // Time in minutes
  date             DateTime  @default(now())
  noCharge         Boolean   @default(false)
  billingRateId    String?   // Reference to billing rate used
  billingRateName  String?   // Snapshot of rate name at time of entry
  billingRateValue Float?    // Snapshot of rate value at time of entry
  isApproved       Boolean   @default(false)
  approvedBy       String?   // User ID who approved the entry
  approvedAt       DateTime? // When the entry was approved
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  ticketId         String?   // Optional - supports account-direct entries
  accountId        String?   // Optional - for account-direct time entries
  userId           String

  ticket       Ticket?       @relation(fields: [ticketId], references: [id])
  account      Account?      @relation(fields: [accountId], references: [id])
  user         User          @relation(fields: [userId], references: [id])
  approver     User?         @relation("TimeEntryApprover", fields: [approvedBy], references: [id])
  billingRate  BillingRate?  @relation(fields: [billingRateId], references: [id])
  invoiceItems InvoiceItem[]
}
```

**Key Features**:
- **Flexible Association**: Can be linked to tickets or directly to accounts
- **Billing Integration**: Captures billing rate information at time of creation
- **Approval Workflow**: Built-in approval process with approver tracking
- **Invoice Relationship**: Links to invoice items for billing tracking
- **Time Granularity**: Stores time in minutes for precision

### 2. Time Entry Types

#### Ticket-Based Time Entries
Most common type, associated with specific tickets:

```typescript
interface TicketTimeEntry {
  ticketId: string;     // Required
  accountId?: string;   // Derived from ticket
  description: string;  // Work description
  minutes: number;      // Time spent
  // ... other fields
}
```

**Characteristics**:
- Automatically inherits account from ticket
- Subject to ticket-specific permissions
- Included in ticket time tracking
- Appears in ticket activity feeds

#### Direct Account Time Entries
Time logged directly against an account without a specific ticket:

```typescript
interface DirectTimeEntry {
  accountId: string;    // Required
  ticketId?: null;      // Explicitly null
  description: string;  // Work description
  minutes: number;      // Time spent
  // ... other fields
}
```

**Use Cases**:
- General account maintenance
- Administrative tasks
- Account-wide initiatives
- Non-ticket billable work

### 3. Time Entry Lifecycle

#### Creation Process
1. **User Input**: User selects ticket/account, enters description and time
2. **Rate Selection**: System presents available billing rates
3. **Rate Resolution**: System resolves effective rate (with account overrides)
4. **Snapshot Creation**: Rate information captured at point in time
5. **Permission Check**: Validates user can create entries for target account
6. **Database Creation**: Entry created with all metadata

#### Example Creation Logic
```typescript
async function createTimeEntry(data: TimeEntryInput, userId: string) {
  // 1. Validate permissions
  const accountId = data.ticketId ? 
    (await getTicketAccount(data.ticketId)) : 
    data.accountId;
    
  const hasPermission = await permissionService.hasPermission({
    userId,
    resource: 'time-entries',
    action: 'create',
    accountId
  });

  // 2. Resolve billing rate
  let billingRateValue = null;
  let billingRateName = null;
  
  if (data.billingRateId && !data.noCharge) {
    const effectiveRate = await resolveEffectiveRate(accountId, data.billingRateId);
    const billingRate = await prisma.billingRate.findUnique({
      where: { id: data.billingRateId }
    });
    
    billingRateValue = effectiveRate;
    billingRateName = billingRate?.name;
  }

  // 3. Create entry
  return await prisma.timeEntry.create({
    data: {
      ...data,
      userId,
      billingRateName,
      billingRateValue,
      isApproved: false // Requires approval
    }
  });
}
```

#### Update Process
Time entries can be updated with restrictions:

**Editable Fields** (before approval):
- Description
- Minutes
- Date
- No-charge status
- Billing rate selection

**Restricted Fields** (after approval):
- All fields locked except by approvers
- Administrative override available
- Audit trail maintained

**Permission-Based Editing**:
```typescript
const canEdit = await timeEntryPermissions.canEdit(timeEntry, userId);
const isLocked = timeEntryPermissions.isLocked(timeEntry);
const lockReason = timeEntryPermissions.getLockReason(timeEntry);
```

### 4. Approval Workflow

#### Approval States
- **Pending**: `isApproved = false`, `approvedBy = null`
- **Approved**: `isApproved = true`, `approvedBy = userId`, `approvedAt = timestamp`
- **Rejected**: (Handled through deletion or flagging)

#### Approval Rules
1. **Self-Approval Restriction**: Users cannot approve their own entries
2. **Permission-Based**: Only users with approval permissions can approve
3. **Account-Scoped**: Approvers can only approve entries for accounts they manage
4. **Bulk Operations**: Multiple entries can be approved simultaneously

#### Approval Process
```typescript
async function approveTimeEntry(entryId: string, approverId: string) {
  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
    include: { user: true, ticket: { include: { account: true } } }
  });

  // Validation checks
  if (entry.userId === approverId) {
    throw new Error("Cannot approve own time entries");
  }

  const hasPermission = await permissionService.hasPermission({
    userId: approverId,
    resource: 'time-entries',
    action: 'approve',
    accountId: entry.accountId || entry.ticket?.accountId
  });

  if (!hasPermission) {
    throw new Error("Insufficient permissions to approve");
  }

  // Update rate if needed (for entries created before override system)
  let updateData: any = {
    isApproved: true,
    approvedBy: approverId,
    approvedAt: new Date()
  };

  if (entry.billingRateId && !entry.billingRateValue) {
    const effectiveRate = await resolveEffectiveRate(
      entry.accountId || entry.ticket?.accountId,
      entry.billingRateId
    );
    updateData.billingRateValue = effectiveRate;
  }

  return await prisma.timeEntry.update({
    where: { id: entryId },
    data: updateData
  });
}
```

### 5. Billing Integration

#### Rate Snapshot System
Time entries capture billing rate information at creation time:

```typescript
interface BillingSnapshot {
  billingRateId: string;    // Reference to rate definition
  billingRateName: string;  // Rate name (e.g., "Senior Developer")
  billingRateValue: number; // Actual rate value (with overrides applied)
}
```

**Benefits**:
- **Historical Accuracy**: Rates preserved even if system rates change
- **Audit Trail**: Clear record of billing decisions
- **Invoice Integrity**: Invoices remain accurate over time
- **Dispute Resolution**: Evidence of agreed rates

#### Rate Resolution (Current vs Planned)

**Current Implementation**:
```typescript
// Simple rate lookup without overrides
const billingRate = await prisma.billingRate.findUnique({
  where: { id: billingRateId }
});
billingRateValue = billingRate?.rate || 0;
```

**Planned Implementation**:
```typescript
// Proper override resolution
async function resolveEffectiveRate(accountId: string, billingRateId: string): Promise<number> {
  // Check for account-specific override
  const accountRate = await prisma.accountBillingRate.findUnique({
    where: {
      accountId_billingRateId: { accountId, billingRateId }
    }
  });
  
  if (accountRate) {
    return accountRate.rate; // Use override
  }
  
  // Fall back to default rate
  const defaultRate = await prisma.billingRate.findUnique({
    where: { id: billingRateId }
  });
  
  return defaultRate?.rate || 0;
}
```

### 6. Timer Integration

#### Persistent Timer System
The system includes a persistent timer for cross-device time tracking:

```prisma
model Timer {
  id         String    @id @default(cuid())
  userId     String
  ticketId   String
  startTime  DateTime  @default(now())
  pausedTime Int       @default(0) // Accumulated paused seconds
  isRunning  Boolean   @default(true)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  user   User   @relation(fields: [userId], references: [id])
  ticket Ticket @relation(fields: [ticketId], references: [id])

  @@unique([userId, ticketId]) // One timer per ticket per user
}
```

#### Timer Workflow
1. **Start Timer**: Create timer record, begin time tracking
2. **Pause/Resume**: Update `pausedTime` and `isRunning` status
3. **Stop & Log**: Convert timer to time entry, delete timer record
4. **Cross-Device Sync**: Timer state synchronized across browser sessions

#### Timer API Integration
```typescript
// Stop timer and create time entry
async function stopTimerAndLog(timerId: string, description: string) {
  const timer = await prisma.timer.findUnique({
    where: { id: timerId },
    include: { ticket: true }
  });

  // Calculate total time
  const currentElapsed = timer.isRunning 
    ? Math.floor((Date.now() - timer.startTime.getTime()) / 1000)
    : 0;
  const totalSeconds = timer.pausedTime + currentElapsed;
  const totalMinutes = Math.round(totalSeconds / 60);

  // Create time entry
  const timeEntry = await prisma.timeEntry.create({
    data: {
      userId: timer.userId,
      ticketId: timer.ticketId,
      description,
      minutes: totalMinutes,
      date: new Date()
    }
  });

  // Delete timer
  await prisma.timer.delete({
    where: { id: timerId }
  });

  return timeEntry;
}
```

### 7. Permission System Integration

#### Permission Levels
Time entry operations respect account-based permissions:

- **View**: Can see time entries for accounts user has access to
- **Create**: Can create time entries for accessible accounts
- **Edit**: Can modify own time entries (with approval restrictions)
- **Approve**: Can approve time entries from other users
- **Delete**: Can remove time entries (usually restricted)

#### Permission Checking Examples
```typescript
// Check if user can view time entries for account
const canView = await permissionService.hasPermission({
  userId: session.user.id,
  resource: 'time-entries',
  action: 'view',
  accountId: entry.accountId
});

// Check if user can edit specific time entry
const canEdit = await timeEntryPermissions.canEdit(entry, userId);

// Check approval permissions
const canApprove = await permissionService.hasPermission({
  userId: session.user.id,
  resource: 'time-entries',
  action: 'approve',
  accountId: entry.accountId
});
```

#### Lock Conditions
Time entries can be locked from editing based on:

1. **Approval Status**: Approved entries locked to non-approvers
2. **Invoice Status**: Invoiced entries completely locked
3. **Time Restrictions**: Old entries may be locked after certain period
4. **Permission Level**: User permission level affects edit capabilities

### 8. UI Components & Features

#### Time Entry Forms
Rich form interface for time entry creation/editing:

```typescript
// TimeEntryEditDialog features:
- Account/Ticket selection with hierarchical display
- Time input with multiple formats (hours, minutes, decimal)
- Billing rate selection with account-specific rate resolution
- Billing rate preview with effective rate calculation
- No-charge toggle with billing implications
- Description with auto-complete suggestions
- Date picker with business logic validation
- Conditional billing rate display based on account context
```

**Billing Rate Selector Integration:**
- **Context-Aware Loading**: Only loads rates when valid account context is available
- **Account Override Support**: Displays account-specific rate overrides
- **Rate Inheritance**: Shows rates inherited from parent accounts
- **Visual Indicators**: Icons and badges distinguish override vs system rates
- **Permission-Based Display**: Only visible to users with billing view permissions

#### Time Entry Lists
Comprehensive display with filtering and sorting:

```typescript
// Time entry list features:
- Multi-column sortable display
- Account/ticket/user filtering
- Date range selection
- Approval status filtering
- Billing amount calculations
- Bulk approval operations
```

#### Timer Widget
Global timer interface for active time tracking:

```typescript
// Timer widget features:
- Always-visible timer display
- Start/pause/stop controls
- Multiple timer support
- Cross-device synchronization
- Quick time entry creation
```

### 9. API Endpoints

#### Time Entry Management
- `GET /api/time-entries` - List time entries with filtering
- `POST /api/time-entries` - Create new time entry
- `GET /api/time-entries/[id]` - Get specific time entry
- `PUT /api/time-entries/[id]` - Update time entry
- `DELETE /api/time-entries/[id]` - Delete time entry

#### Timer Management
- `GET /api/timers/active` - Get active timer for user
- `GET /api/timers/active/all` - Get all active timers (admin)
- `POST /api/timers` - Start new timer
- `PUT /api/timers/[id]` - Update timer (pause/resume)
- `DELETE /api/timers/[id]` - Stop timer and optionally create time entry

#### Approval Workflow
- `POST /api/time-entries/[id]/approve` - Approve time entry
- `POST /api/time-entries/bulk-approve` - Approve multiple entries
- `GET /api/time-entries/pending` - Get entries pending approval

### 10. Data Validation & Business Rules

#### Validation Rules
```typescript
interface TimeEntryValidation {
  // Required fields
  minutes: number;        // Must be > 0
  userId: string;         // Must be valid user
  
  // Optional but validated fields
  ticketId?: string;      // Must exist if provided
  accountId?: string;     // Must exist if provided
  billingRateId?: string; // Must be valid rate if not noCharge
  date: Date;             // Cannot be future date
  
  // Business logic validation
  accountAccess: boolean; // User must have access to target account
  rateCompatibility: boolean; // Rate must be compatible with account
}
```

#### Business Rules
1. **Time Limits**: Maximum hours per day/week configurable
2. **Date Restrictions**: Cannot log time too far in the past
3. **Account Access**: Must have permission for target account
4. **Rate Requirements**: Billable entries must have valid rates
5. **Approval Requirements**: Entries must be approved before invoicing

### 11. Reporting & Analytics

#### Time Entry Statistics
```typescript
interface TimeEntryStats {
  totalEntries: number;
  totalMinutes: number;
  billableMinutes: number;
  approvedMinutes: number;
  pendingApproval: number;
  averageEntrySize: number;
  byUser: Record<string, UserTimeStats>;
  byAccount: Record<string, AccountTimeStats>;
  byTimeframe: TimeframeStats[];
}
```

#### Common Reports
- **User Time Summary**: Individual user time tracking
- **Account Time Breakdown**: Time spent per account/project
- **Billing Analysis**: Billable vs non-billable time ratios
- **Approval Queue**: Entries pending approval
- **Invoice Preparation**: Time ready for billing

### 12. Data Migration & Compatibility

#### Legacy Compatibility
The system maintains backward compatibility with older data:

- **Old Rate Storage**: Handles entries without rate snapshots
- **Approval Backfill**: Fills in approval data during access
- **Permission Migration**: Applies new permission rules to old entries

#### Migration Tasks
1. **Rate Snapshot Backfill**: Add missing billing rate values
2. **Permission Updates**: Apply account-based permissions to all entries
3. **Timer Cleanup**: Remove abandoned timer records
4. **Data Validation**: Ensure all entries meet current validation rules

### 13. Performance Considerations

#### Database Optimization
```sql
-- Key indexes for time entry queries
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_account_id ON time_entries(account_id);
CREATE INDEX idx_time_entries_ticket_id ON time_entries(ticket_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_approved ON time_entries(is_approved);
CREATE INDEX idx_time_entries_invoice ON time_entries(id) WHERE billing_rate_value IS NOT NULL AND no_charge = false;
```

#### Query Optimization
- **Pagination**: Large time entry lists use cursor-based pagination
- **Filtering**: Database-level filtering before application processing
- **Aggregation**: Statistical calculations done in database
- **Caching**: Frequently accessed data cached appropriately

### 14. Security Considerations

#### Data Protection
- **Account Isolation**: Strict separation of time data by account
- **User Privacy**: Users can only see their own entries unless approved
- **Audit Trails**: All modifications tracked with user and timestamp
- **Permission Enforcement**: Every operation validates user permissions

#### Input Validation
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: All user input sanitized
- **Business Logic Validation**: Server-side validation of all rules
- **Rate Tampering Prevention**: Billing rates validated server-side

### 15. Recent Improvements & Fixes

#### Billing Rate Selector Enhancements (2025-08-06)
Major improvements to billing rate integration in time entry forms:

**Issues Fixed:**
1. **Duplicate Labels**: Removed duplicate "Billing Rate" labels in TimeEntryEditDialog
2. **Context Loading**: Fixed billing rates not loading due to missing account context
3. **Conditional Display**: Enhanced billing rate selector to show appropriate guidance

**Implementation Details:**
```typescript
// Fixed billing rate selector integration
{showBillingRates && (
  (entryType === "account" && selectedAccount) || (entryType === "ticket" && selectedTicket) ? (
    <BillingRateSelector
      accountId={entryType === "account" ? selectedAccount : tickets.find(t => t.id === selectedTicket)?.account?.id || ""}
      value={selectedBillingRate === "none" ? "" : selectedBillingRate}
      onValueChange={(value) => setSelectedBillingRate(value || "none")}
      placeholder="Select billing rate (optional)"
      showNoChargeOption={false}
    />
  ) : (
    <div className="space-y-2">
      <Label>Billing Rate</Label>
      <div className="text-sm text-muted-foreground">
        {entryType === "ticket" 
          ? "Select a ticket first to choose billing rate" 
          : "Select an account first to choose billing rate"}
      </div>
    </div>
  )
)}
```

**User Experience Improvements:**
- **Clear Guidance**: Users now see helpful messages when billing rates are unavailable
- **Context-Aware Loading**: Billing rates only load when account context is established
- **Clean Interface**: Eliminated duplicate labels and improved form layout
- **Consistent Behavior**: Same billing rate behavior across main page and dialog

### 16. Future Enhancements

#### Planned Features
1. **Enhanced Timer System**: Multiple concurrent timers, timer templates
2. **Advanced Reporting**: Custom report builder, scheduled reports
3. **Mobile Optimization**: Native mobile app integration
4. **AI Suggestions**: Smart time entry suggestions based on patterns
5. **Integration APIs**: External time tracking tool integration

#### Account Override Implementation
Enhanced account billing rate override system is now fully implemented:

```typescript
// Current implementation for time entry creation with overrides
async function createTimeEntryWithOverrides(data: TimeEntryInput) {
  if (data.billingRateId && !data.noCharge) {
    // Proper override resolution implemented
    const effectiveRate = await resolveEffectiveRate(
      data.accountId || await getTicketAccountId(data.ticketId),
      data.billingRateId
    );
    
    data.billingRateValue = effectiveRate;
  }
  
  return await prisma.timeEntry.create({ data });
}
```

## Conclusion

The time entry system provides comprehensive time tracking with built-in approval workflows, billing integration, and flexible association models. The key strengths are the approval system and billing rate snapshots, while the main enhancement opportunity is implementing proper account-specific billing rate overrides in the creation and approval processes.