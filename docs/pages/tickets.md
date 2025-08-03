# Ticket Management System Documentation

## Overview

The Ticket Management System (`/tickets`) provides comprehensive support ticket handling for administrators and employees. It integrates with the time tracking and billing systems to provide complete project management capabilities. The system supports custom fields, ticket addons, role-based access control, and automated workflows.

## Authentication & Authorization

### ABAC Permission System
The ticket management system uses comprehensive ABAC (Attribute-Based Access Control) with granular permissions:

- **TICKETS.VIEW** - View tickets and ticket details
- **TICKETS.CREATE** - Create new tickets
- **TICKETS.UPDATE** - Edit existing tickets
- **TICKETS.DELETE** - Delete tickets
- **TICKETS.ASSIGN** - Assign tickets to users
- **ACCOUNTS.VIEW** - View account information for customer selection

### Permission Requirements
- **Route Access**: Requires `TICKETS.VIEW` permission to access ticket management
- **Feature Access**: Each action requires specific permissions
- **Account Scoping**: Permissions can be scoped to specific accounts or subsidiaries
- **Customer Portal**: Account users without ticket permissions redirected to portal

### Permission-Based Features
- **Ticket Viewing**: Based on `TICKETS.VIEW` permission scope (own/account/subsidiary)
- **Ticket Creation**: Requires `TICKETS.CREATE` permission
- **Ticket Editing**: Requires `TICKETS.UPDATE` permission with scope validation
- **Ticket Assignment**: Requires `TICKETS.ASSIGN` permission
- **Ticket Deletion**: Requires `TICKETS.DELETE` permission (typically admin-only)

```typescript
const canViewTickets = await hasPermission(userId, {
  resource: 'tickets',
  action: 'view'
});

if (!canViewTickets) {
  // Redirect based on user type
  if (session.user?.role === "ACCOUNT_USER") {
    router.push("/portal");
  } else {
    router.push("/dashboard");
  }
}
```

## Architecture

### Main Tickets Page (`/tickets/page.tsx`)
**Comprehensive Ticket Management Interface**

#### Header Components
- **Navigation**: Back button to dashboard with breadcrumb navigation
- **Title**: "Ticket Management" with file text icon
- **User Info**: Role badge and logout functionality
- **Settings Access**: Quick access to system settings

#### Statistics Dashboard
Four key metric cards showing ticket overview:

1. **Total Tickets**
   - Count of all tickets in system
   - Icon: FileText (Blue)
   - All-time metric

2. **Open Tickets**
   - Count of tickets needing attention
   - Icon: AlertCircle (Red)
   - Actionable items

3. **In Progress**
   - Count of tickets being worked on
   - Icon: Clock (Yellow)
   - Work in progress tracking

4. **Resolved**
   - Count of completed tickets
   - Icon: CheckCircle (Green)
   - Completion tracking

### Tabbed Interface

## 1. Ticket List Tab - Ticket Management

**Comprehensive Ticket List and Filtering**

### Features
- **Advanced Filtering**: Status, customer, and priority-based filters
- **Ticket Cards**: Detailed information display for each ticket
- **Status Tracking**: Visual status badges and icons
- **Action Buttons**: View, edit, and delete functionality
- **Empty States**: Helpful messaging when no tickets found

### Filter Options
- **Status Filters**: All Status, Open, In Progress, Resolved, Closed
- **Customer Filters**: All Customers or specific customer selection
- **Priority Filters**: All Priority, High, Medium, Low
- **Real-time Updates**: Filters apply immediately

### Ticket Card Information
Each ticket displays:
- **Ticket ID**: Formatted ticket identifier (T-###)
- **Status Icon**: Visual indicator matching ticket status
- **Status Badge**: Color-coded status (Open, In Progress, Resolved, Closed)
- **Priority Badge**: Color-coded priority (High, Medium, Low)
- **Title & Description**: Ticket summary and detailed description
- **Customer Information**: Associated customer name
- **Assignment**: Assigned user information
- **Creation Date**: When ticket was created
- **Time Tracking**: Total hours spent and number of entries
- **Addon Information**: Total addon cost and count
- **Action Buttons**: View, edit, delete operations

### Status and Priority Color Coding
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case "OPEN": return "destructive";    // Red - needs attention
    case "IN_PROGRESS": return "default"; // Blue - being worked
    case "RESOLVED": return "outline";    // Green outline - completed
    case "CLOSED": return "secondary";    // Gray - archived
    default: return "secondary";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "HIGH": return "destructive";    // Red - urgent
    case "MEDIUM": return "default";      // Blue - normal
    case "LOW": return "secondary";       // Gray - low priority
    default: return "secondary";
  }
};
```

## 2. Create Ticket Tab - New Ticket Creation

**Ticket Creation Form with Validation**

### Features
- **Title Input**: Brief description field with validation
- **Priority Selection**: High, Medium, Low priority options
- **Customer Selection**: Dropdown to select customer
- **Assignment**: Optional user assignment for new tickets
- **Description**: Multi-line detailed description field
- **Form Validation**: Required field validation before submission

### Ticket Creation Form
```typescript
interface TicketCreationForm {
  title: string;                // Brief issue description
  description: string;          // Detailed issue description
  priority: "HIGH" | "MEDIUM" | "LOW"; // Ticket priority
  customerId: string;           // Associated customer
  assignedTo?: string;          // Optional user assignment
  customFields?: object;        // Custom field data
}
```

### Creation Process
1. **Title & Description**: Enter ticket summary and details
2. **Priority Setting**: Select appropriate priority level
3. **Customer Selection**: Choose customer from dropdown
4. **Assignment**: Optionally assign to specific user
5. **Submit**: Create ticket with validation
6. **Redirect**: Automatically switch to ticket list view

### Validation Rules
- **Required Fields**: Title, description, and customer selection
- **Title Length**: Minimum meaningful title required
- **Description Length**: Detailed description mandatory
- **Customer Validation**: Must select valid customer
- **Assignment Validation**: If provided, must be valid user

## API Integration

### Ticket Management Endpoints
```typescript
// Main ticket operations
GET    /api/tickets                    // List tickets with filters
POST   /api/tickets                    // Create new ticket
GET    /api/tickets/[id]               // Get specific ticket details
PUT    /api/tickets/[id]               // Update ticket
DELETE /api/tickets/[id]               // Delete ticket (admin only)

// Ticket addon operations
GET    /api/tickets/[id]/addons        // List ticket addons
POST   /api/tickets/[id]/addons        // Create new addon
PUT    /api/tickets/[id]/addons/[addonId]    // Update addon
DELETE /api/tickets/[id]/addons/[addonId]    // Delete addon
```

### Query Parameters
- **customerId**: Filter tickets by specific customer
- **status**: Filter by ticket status
- **assignedTo**: Filter by assigned user
- **priority**: Filter by priority level

## Data Structures

### Ticket Model
```typescript
interface Ticket {
  id: string;                    // Unique ticket identifier
  title: string;                 // Ticket title/summary
  description: string;           // Detailed description
  status: TicketStatus;          // Current status
  priority: TicketPriority;      // Priority level
  customerId: string;            // Associated customer
  customer: string;              // Customer name for display
  assignedTo?: string;           // Assigned user ID
  assignedUser?: string;         // Assigned user name
  createdAt: string;             // Creation date
  totalTimeSpent: number;        // Aggregated time entries
  totalAddonCost: number;        // Aggregated addon costs
  timeEntriesCount: number;      // Count of time entries
  addonsCount: number;           // Count of addons
  customFields?: object;         // Custom field data
}
```

### Ticket Addon Model
```typescript
interface TicketAddon {
  id: string;                    // Unique addon identifier
  ticketId: string;              // Associated ticket
  name: string;                  // Addon name/description
  description?: string;          // Optional detailed description
  price: number;                 // Unit price
  quantity: number;              // Quantity ordered
  total: number;                 // Calculated total (price × quantity)
  createdAt: Date;               // Creation date
}
```

### Filter State Model
```typescript
interface TicketFilters {
  status: string;                // Status filter ("all" or specific status)
  customer: string;              // Customer filter ("all" or customer ID)
  priority: string;              // Priority filter ("all" or specific priority)
}
```

## Business Logic

### Status Workflow
- **OPEN**: Newly created tickets requiring attention
- **IN_PROGRESS**: Tickets being actively worked on
- **RESOLVED**: Completed tickets awaiting customer confirmation
- **CLOSED**: Fully completed and archived tickets

### Priority System
- **HIGH**: Urgent issues requiring immediate attention
- **MEDIUM**: Standard priority for normal issues
- **LOW**: Non-urgent issues that can be scheduled later

### Role-Based Access Rules
- **Customers**: Can only see their own tickets (via portal)
- **Employees**: Can see all tickets, create new tickets, edit assigned tickets
- **Admins**: Full access to all tickets and administrative functions

## User Experience Features

### Visual Design
- **Consistent Styling**: Matches admin dashboard and other system pages
- **Card-Based Layout**: Logical grouping of ticket information
- **Status Indicators**: Color-coded badges and icons for quick identification
- **Responsive Design**: Mobile-optimized with flexible layouts

### Interactive Elements
- **Real-Time Filtering**: Immediate application of filter changes
- **Form Validation**: Instant feedback on required fields
- **Status Updates**: Visual confirmation of operations
- **Action Feedback**: Clear success/error messaging

### Navigation Patterns
- **Tab Navigation**: Keyboard and mouse navigation support
- **Breadcrumb Style**: Clear path back to dashboard
- **Deep Linking**: URL-based tab state persistence
- **Quick Actions**: Fast access to common operations

## Integration Points

### Time Tracking Integration
- **Time Entry Association**: Link time entries to specific tickets
- **Hour Tracking**: Display total hours spent on each ticket
- **Billing Integration**: Hours contribute to invoice generation
- **User Attribution**: Track which users worked on tickets

### Billing System Integration
- **Addon Costs**: Include ticket addons in billing calculations
- **Invoice Generation**: Tickets serve as line items for invoices
- **Cost Tracking**: Monitor project costs and profitability
- **Customer Billing**: Associate costs with proper customer accounts

### Customer Management Integration
- **Customer Association**: Link tickets to customer accounts
- **Portal Integration**: Customers can view tickets via portal
- **Communication**: Track customer interactions and feedback
- **Service History**: Maintain complete service record

## Security Considerations

### Data Protection
- **Role-Based Access**: Tickets filtered by user permissions
- **Customer Isolation**: Customers can only access their own tickets
- **Input Validation**: Server-side validation of all ticket data
- **Audit Trail**: Track all ticket modifications and access

### Access Control
- **Authentication Required**: All endpoints require valid session
- **Permission Validation**: Role-based endpoint access control
- **Data Filtering**: Automatic filtering based on user role
- **Secure Updates**: Validate user permissions for modifications

## Performance Optimization

### Data Loading
- **Lazy Loading**: Progressive loading of ticket data
- **Efficient Filtering**: Client-side filtering for fast response
- **Pagination Support**: Handle large numbers of tickets
- **Caching Strategy**: Cache frequently accessed ticket data

### Database Optimization
- **Indexed Queries**: Optimized database indexes for common filters
- **Aggregated Data**: Pre-calculate statistics and totals
- **Efficient Joins**: Minimize database queries with proper includes
- **Transaction Management**: Use transactions for data consistency

## Testing Strategy

### Unit Testing
- **Filter Logic**: Test all filter combinations and edge cases
- **Form Validation**: Test validation rules and error handling
- **Status Transitions**: Test ticket status workflow
- **Permission Logic**: Test role-based access control

### Integration Testing
- **API Endpoints**: Test all ticket CRUD operations
- **Database Operations**: Test ticket creation, updates, deletions
- **Time Integration**: Test integration with time tracking system
- **Billing Integration**: Test addon cost calculations

### User Experience Testing
- **Form Usability**: Test ticket creation and editing workflows
- **Mobile Responsiveness**: Test on various screen sizes
- **Performance**: Test with large numbers of tickets
- **Error Handling**: Test error scenarios and recovery

## Future Enhancements

### Advanced Features
- **Ticket Templates**: Pre-defined ticket templates for common issues
- **Automated Assignment**: Rule-based automatic ticket assignment
- **SLA Management**: Service level agreement tracking and alerts
- **Escalation Rules**: Automatic escalation based on priority and time
- **Ticket Relationships**: Link related tickets and dependencies

### Communication Features
- **Comment System**: Internal and customer-facing comments
- **Email Integration**: Automatic email notifications for status changes
- **File Attachments**: Support for ticket-related file uploads
- **Activity Timeline**: Complete chronological activity log

### Reporting Features
- **Ticket Analytics**: Detailed reporting on ticket metrics
- **Performance Reports**: User and team performance tracking
- **Customer Reports**: Per-customer ticket history and statistics
- **Export Options**: CSV, PDF export for reporting

## Error Handling

### Common Scenarios
- **Missing Data**: Handle missing customer or user information
- **Permission Errors**: Clear messaging for access restrictions
- **Validation Failures**: Detailed validation error messages
- **Network Issues**: Graceful handling of connectivity problems

### Recovery Strategies
- **Auto-Save**: Periodic saving of form data
- **Retry Logic**: Automatic retry for failed operations
- **Error Boundaries**: React error boundaries for graceful failures
- **User Feedback**: Clear error messages and recovery instructions

## Custom Fields System

### Architecture
- **System-Wide Fields**: Defined in SystemSettings table
- **Customer-Specific Fields**: Override in CustomerSettings table
- **Dynamic Forms**: Generated based on field definitions
- **Validation**: Type-specific validation and constraints

### Field Types
- **Text**: Single-line text input
- **Textarea**: Multi-line text input
- **Select**: Dropdown with predefined options
- **Number**: Numeric input with validation
- **Date**: Date picker input
- **Boolean**: Checkbox input

### Implementation
```typescript
interface CustomField {
  name: string;                  // Field identifier
  label: string;                 // Display label
  type: FieldType;               // Input type
  required: boolean;             // Required field flag  
  options?: string[];            // Options for select fields
  validation?: object;           // Validation rules
}
```

## Addon Management

### Features
- **Dynamic Addon Creation**: Add parts/services to tickets
- **Price Calculation**: Automatic total calculation (price × quantity)
- **Billing Integration**: Addons included in invoice generation
- **Customer Visibility**: Customers can see addons if permitted

### Addon Workflow
1. **Creation**: Add addon to existing ticket
2. **Pricing**: Set unit price and quantity
3. **Calculation**: Automatic total calculation
4. **Billing**: Include in invoice generation
5. **Tracking**: Monitor addon costs and profitability

This comprehensive ticket management system provides all necessary tools for efficient support ticket handling while maintaining security, performance, and user experience standards.