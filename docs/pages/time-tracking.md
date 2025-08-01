# Time Tracking Documentation

## Overview

The Time Tracking system (`/time`) provides comprehensive time management functionality with granular permission-based access control. It features manual time entry, comprehensive entry management, approval workflows, and detailed reporting capabilities. The system integrates with the ticket system and billing rates for accurate project tracking and invoicing.

## Authentication & Authorization

### ABAC Permission System
The time tracking system uses Attribute-Based Access Control (ABAC) instead of simple role-based checks, providing granular permission control:

- **TIME_ENTRIES.VIEW** - View time entries
- **TIME_ENTRIES.CREATE** - Create new time entries  
- **TIME_ENTRIES.UPDATE** - Edit existing time entries
- **TIME_ENTRIES.DELETE** - Delete time entries
- **TIME_ENTRIES.APPROVE** - Approve time entries for invoicing
- **BILLING.VIEW** - View billing rates and revenue information
- **REPORTS.VIEW** - Access reporting features

### Access Control
- **Permission-Based Access**: Users need `TIME_ENTRIES.VIEW` permission to access time tracking
- **Route Protection**: Automatic redirect for unauthorized users to dashboard
- **Session Validation**: Continuous authentication state monitoring

### Permission-Based Features
- **Entry Management**: Users can edit/delete their own entries (if not approved/invoiced)
- **Approval Workflow**: Only users with `TIME_ENTRIES.APPROVE` can approve entries
- **Billing Information**: Only visible to users with `BILLING.VIEW` permission

```typescript
const hasAccess = await canViewTimeEntries();
if (!hasAccess) {
  router.push("/dashboard");
}
```

## Architecture

### Main Time Tracking Page (`/time/page.tsx`)
**Comprehensive Time Management Interface**

#### Header Components
- **Navigation**: Back button to dashboard with breadcrumb navigation
- **Title**: "Time Tracking" with clock icon
- **User Info**: Role badge and logout functionality
- **Settings Access**: Quick access to system settings

#### Statistics Dashboard
Four key metric cards showing time tracking overview:

1. **Today's Time**
   - Total time logged today (displayed as hours/minutes)
   - Icon: Clock (Blue)
   - Real-time updates

2. **This Week**
   - Weekly time totals
   - Icon: Calendar (Green)
   - Week-to-date tracking

3. **This Month**
   - Monthly time accumulation
   - Icon: Timer (Purple)
   - Month-to-date totals

4. **Billable Time**
   - Billable time this week
   - Icon: DollarSign (Yellow)
   - Revenue-focused tracking

### Tabbed Interface

## 1. Time Entries Tab - Entry Management (Default)

**Comprehensive Time Entry List and Management Interface**

### Features
- **Advanced Filtering**: Period and ticket-based filters with real-time updates
- **Approval Wizard**: Step-by-step workflow for approving pending entries
- **Entry Cards**: Detailed information display with visual status indicators
- **Permission-Based Actions**: Edit/delete functionality based on user permissions
- **Invoice Protection**: Visual indicators for locked entries
- **Summary Statistics**: Aggregated totals and billing information

### Filter Options
- **Dynamic Periods**: Today, This Week, This Month, All Time
- **Ticket Filtering**: All Tickets or specific ticket selection
- **Real-time Updates**: Filters apply immediately with result counts

### Entry Management
Each time entry displays:
- **Visual Status Indicators**: Approved, Pending, Locked badges
- **Invoice Information**: Shows invoice number if entry is invoiced
- **Lock Status**: Clear indication of why entries cannot be edited
- **Permission-Based Actions**: Edit/delete buttons only visible when allowed

### Approval Workflow
- **Approval Wizard Button**: Only visible to users with `TIME_ENTRIES.APPROVE` permission
- **Step-by-Step Review**: Navigate through pending entries one by one
- **Skip Functionality**: Skip entries that aren't ready for approval
- **Inline Editing**: Edit entries directly within the approval wizard
- **Bulk Operations**: Approve multiple entries at once
- **Rate Locking**: Billing rates are locked when entries are approved

## 2. Manual Entry Tab - Manual Time Logging

**Form-Based Time Entry System**

### Features
- **Ticket Selection**: Dropdown with ticket ID, title, and customer
- **Minutes Input**: Integer minute input with 15-minute increments
- **Date Selection**: Calendar date picker for entry date
- **Description Field**: Multi-line text area for work description
- **No Charge Toggle**: Option to mark entries as non-billable
- **Form Validation**: Required field validation before submission

### Form Fields
```typescript
interface TimeEntryForm {
  ticketId: string;      // Selected ticket
  minutes: number;       // Minutes worked (integer)
  description: string;   // Work description
  date: string;         // Entry date (YYYY-MM-DD)
  noCharge: boolean;    // Billable flag
}
```

### Validation Rules
- **Required Fields**: Ticket, minutes, and description
- **Time Limits**: Minimum 0, step 15 for quarter-hour tracking, max 1440 (24 hours)
- **Date Constraints**: Cannot be future dated
- **Description Length**: Minimum meaningful description required

## 3. Time Entries Tab - Entry Management

**Comprehensive Time Entry List and Management**

### Features
- **Advanced Filtering**: Period and ticket-based filters
- **Entry Cards**: Detailed information display for each entry
- **Inline Actions**: Edit and delete functionality
- **Summary Statistics**: Aggregated totals and billing information
- **Empty States**: Helpful messaging when no entries found

### Filter Options
- **Period Filters**: Today, This Week, This Month, All Time
- **Ticket Filters**: All Tickets or specific ticket selection
- **Real-time Updates**: Filters apply immediately

### Entry Card Information
Each time entry displays:
- **Ticket Badge**: Ticket ID with outline styling
- **Title & Customer**: Ticket title and customer name
- **No Charge Badge**: Visual indicator for non-billable entries
- **Description**: Work performed details
- **Metadata**: Date, user, time duration, and billing amount
- **Actions**: Edit and delete buttons

### Summary Statistics
- **Total Time**: Sum of all filtered entries (displayed as hours/minutes)
- **Billable Time**: Excluding no-charge entries
- **Billable Amount**: Time (converted to hours) × billing rate calculation
- **Entry Count**: Number of matching entries

## Data Structures

### Time Entry Model
```typescript
interface TimeEntry {
  id: string;           // Unique entry identifier
  ticketId: string;     // Associated ticket
  ticketTitle: string;  // Ticket title for display
  customer: string;     // Customer name
  description: string;  // Work description
  minutes: number;      // Minutes worked (integer)
  date: string;         // Entry date
  user: string;         // User who logged time
  noCharge: boolean;    // Billable flag
  rate: number;         // Hourly rate applied
}
```

### Statistics Model
```typescript
interface TimeStats {
  todayMinutes: number;    // Minutes logged today
  weekMinutes: number;     // Minutes this week
  monthMinutes: number;    // Minutes this month
  billableMinutes: number; // Billable minutes this week
}
```

## User Experience Features

### Visual Design
- **Consistent Styling**: Matches admin dashboard and portal themes
- **Card-Based Layout**: Logical grouping of related functionality
- **Status Indicators**: Color-coded badges and visual feedback
- **Responsive Design**: Mobile-optimized with flexible layouts

### Interactive Elements
- **Real-Time Timer**: Live updating timer display
- **Form Validation**: Instant feedback on required fields
- **Filter Updates**: Immediate application of filter changes
- **Action Feedback**: Visual confirmation of operations

### Navigation Patterns
- **Tab Navigation**: Keyboard and mouse navigation support
- **Breadcrumb Style**: Clear path back to dashboard
- **Deep Linking**: URL-based tab state persistence
- **Quick Actions**: Fast access to common operations

## Integration Points

### Ticket System Integration
- **Ticket Selection**: Live ticket data for dropdowns
- **Ticket Details**: Customer and title information
- **Status Filtering**: Only active tickets for new entries

### Billing System Integration
- **Rate Application**: Automatic billing rate lookup
- **Revenue Calculation**: Real-time billable amount calculations
- **Invoice Generation**: Time entries as invoice line items

### User Management Integration
- **User Assignment**: Time entries linked to logged-in user
- **Role-Based Access**: Different views for employees vs. admins
- **Team Visibility**: Admin access to all user entries

## Database Integration (Future)

### API Endpoints
```typescript
// Time entry operations
GET    /api/time/entries          // List user's time entries
POST   /api/time/entries          // Create new time entry
PUT    /api/time/entries/[id]     // Update time entry
DELETE /api/time/entries/[id]     // Delete time entry

// Statistics and reporting
GET /api/time/stats               // User time statistics
GET /api/time/reports             // Detailed time reports

// Timer operations
POST /api/time/timer/start        // Start timer session
POST /api/time/timer/stop         // Stop timer and create entry
```

### Database Schema Integration
- **TimeEntry Table**: Core time tracking data
- **Ticket Relationship**: Foreign key to tickets table
- **User Relationship**: Foreign key to users table
- **Billing Rate Lookup**: Integration with billing rates

## Performance Optimization

### State Management
- **Efficient Updates**: Minimal re-renders with proper state structure
- **Timer Optimization**: Single interval for timer updates
- **Form State**: Debounced input handling for smooth UX
- **Filter Performance**: Client-side filtering for fast response

### Data Loading
- **Lazy Loading**: Progressive loading of time entries
- **Caching Strategy**: Cache frequently accessed data
- **Pagination**: Handle large numbers of time entries
- **Real-time Updates**: WebSocket integration for live updates

## Security Considerations

### Data Protection
- **User Isolation**: Users can only see their own entries (employees)
- **Admin Oversight**: Admins have full visibility for management
- **Input Validation**: Server-side validation of all time entries
- **Rate Protection**: Billing rates secured and validated

### Audit Trail
- **Entry Tracking**: Log all time entry modifications
- **User Attribution**: Track who created/modified entries
- **Change History**: Maintain history of entry changes
- **Deletion Logs**: Soft deletes with audit trail

## Testing Strategy

### Unit Testing
- **Timer Logic**: Test timer start, stop, pause functionality
- **Form Validation**: Test all validation rules and edge cases
- **Filter Logic**: Test filter combinations and edge cases
- **Calculation Logic**: Test billing and summary calculations

### Integration Testing
- **Ticket Integration**: Test ticket selection and data flow
- **User Authentication**: Test role-based access control
- **Database Operations**: Test CRUD operations
- **Timer Persistence**: Test timer state across sessions

### User Experience Testing
- **Mobile Responsiveness**: Test on various screen sizes
- **Timer Accuracy**: Verify timer precision and reliability
- **Form Usability**: Test form flow and error handling
- **Performance**: Test with large datasets

## Future Enhancements

### Advanced Features
- **Bulk Time Entry**: Import/export time entries
- **Time Tracking Analytics**: Advanced reporting and insights
- **Team Time Tracking**: Manager visibility into team time
- **Project Time Budgets**: Track time against project estimates
- **Time Approval Workflow**: Manager approval for time entries

### Integration Enhancements
- **Calendar Integration**: Sync with calendar applications
- **Project Management**: Integration with external PM tools
- **Mobile Apps**: Native mobile time tracking applications
- **Offline Support**: Continue tracking when offline

### Reporting Features
- **Custom Reports**: User-defined reporting criteria
- **Export Options**: CSV, PDF, Excel export formats
- **Scheduled Reports**: Automated report generation and delivery
- **Dashboard Widgets**: Customizable time tracking widgets

## Error Handling

### Common Scenarios
- **Timer Interruption**: Handle browser refresh during active timing
- **Network Issues**: Graceful handling of connectivity problems
- **Invalid Data**: Proper validation and error messaging
- **Permission Errors**: Clear messaging for access restrictions

### Recovery Strategies
- **Auto-Save**: Periodic saving of timer state
- **Retry Logic**: Automatic retry for failed operations
- **Error Boundaries**: React error boundaries for graceful failures
- **User Feedback**: Clear error messages and recovery instructions