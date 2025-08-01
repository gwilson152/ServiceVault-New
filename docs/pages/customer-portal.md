# Customer Portal Documentation

## Overview

The Customer Portal (`/portal`) provides a dedicated interface for customers to view their support tickets, track service activity, and interact with their account. The portal features role-based access control and is optimized for customer self-service.

## Authentication & Authorization

### Access Control
- **Route Protection**: Automatically redirects unauthenticated users to login page
- **Role-Based Routing**: Customers are redirected to portal, other roles to admin dashboard
- **Customer-Only Access**: Only users with `CUSTOMER` role can access portal features

### Role Enforcement
```typescript
// Redirect logic in portal pages
if (session.user?.role !== "CUSTOMER") {
  router.push("/dashboard");
}
```

## Portal Structure

### Main Portal (`/portal`)
**Customer Dashboard Overview**

#### Header Navigation
- **Portal Branding**: Customer Portal title with user icon
- **User Information**: Welcome message with customer name/email
- **Role Badge**: Shows "Customer" status
- **Action Icons**: Settings and logout functionality

#### Dashboard Statistics
Four key metric cards for customer overview:

1. **Open Tickets**
   - Count of active support requests
   - Icon: FileText (Orange)
   - Shows tickets needing attention

2. **Total Tickets**
   - All-time ticket count
   - Icon: FileText (Blue)
   - Historical service requests

3. **Hours Logged**
   - Total time spent on customer's issues
   - Icon: Clock (Green)
   - Transparency in service delivery

4. **Last Activity**
   - Most recent update timestamp
   - Icon: Clock (Purple)
   - Shows system engagement

#### Main Content Areas

**Recent Tickets Section**
- Displays last 3-5 tickets with priority and status
- Interactive ticket cards with hover effects
- Quick access to create new tickets
- "View All Tickets" navigation button

**Quick Actions Panel**
- Primary: "Create New Support Request" button
- Secondary: "View All Tickets" link
- Support information display with hours and contact details
- Help section with guidance for customers

### Tickets Page (`/portal/tickets`)
**Comprehensive Ticket Management**

#### Features
- **Back Navigation**: Return to portal dashboard
- **Filtering System**: Filter by status (all, open, closed) and priority
- **Ticket Search**: Visual filtering with count display
- **Detailed Ticket Cards**: Comprehensive ticket information display

#### Ticket Card Information
Each ticket displays:
- **Ticket ID**: Unique identifier (monospace font)
- **Priority Badge**: High (red), Medium (default), Low (secondary)
- **Status Badge**: Open, In Progress, Resolved, Closed
- **Category Badge**: Bug, Feature, Enhancement, Documentation
- **Title & Description**: Clear formatting with line clamping
- **Metadata**: Creation date, assignee, time spent, comment count
- **Actions**: View Details, Add Comment (for active tickets)

#### Filtering Options
- **All Tickets**: Complete ticket history
- **Open**: Active tickets (Open + In Progress)
- **Closed**: Completed tickets (Resolved + Closed)
- **High Priority**: Urgent tickets only

#### Summary Statistics
- Total/Filtered ticket count
- Aggregate time spent
- Active ticket count
- Total comment count

## User Experience Features

### Responsive Design
- **Mobile-First**: Optimized for all screen sizes
- **Flexible Layout**: Cards adapt to screen width
- **Touch-Friendly**: Appropriate touch targets
- **Readable Typography**: Hierarchical text sizing

### Visual Design
- **Consistent Branding**: Matches admin dashboard aesthetic
- **Status Indicators**: Color-coded badges for quick recognition
- **Interactive Elements**: Hover states and transitions
- **Information Hierarchy**: Clear visual priority structure

### Navigation Patterns
- **Breadcrumb-Style**: Back navigation with arrow icons
- **Action-Oriented**: Prominent CTA buttons
- **Contextual**: Actions appear based on ticket status
- **Consistent**: Same header pattern across portal pages

## Data Display Patterns

### Mock Data Structure
```typescript
interface CustomerTicket {
  id: string;           // Ticket identifier
  title: string;        // Brief description
  description: string;  // Detailed description
  status: string;       // Current status
  priority: string;     // Priority level
  createdAt: string;    // Creation date
  updatedAt: string;    // Last modification
  assignee: string;     // Assigned staff member
  category: string;     // Ticket category
  timeSpent: number;    // Minutes logged
  comments: number;     // Comment count
}
```

### Badge Variants
```typescript
// Status colors
"open" -> "default"
"in progress" -> "secondary" 
"resolved" -> "outline"
"closed" -> "outline"

// Priority colors  
"high" -> "destructive"
"medium" -> "default"
"low" -> "secondary"
```

## Future Enhancements

### Planned Features
1. **Ticket Creation Form**: In-portal ticket submission
2. **Real-time Updates**: Live status changes via WebSocket
3. **File Attachments**: Upload capabilities for tickets
4. **Comment System**: Customer-staff communication
5. **Notification Preferences**: Email/SMS settings
6. **Service History**: Detailed service timeline
7. **Satisfaction Surveys**: Post-resolution feedback
8. **Knowledge Base**: Self-service articles

### Integration Points
- **Database Queries**: Replace mock data with Prisma queries
- **Real-time Communications**: WebSocket for live updates
- **File Storage**: Cloud storage for attachments
- **Email Service**: Automated notifications
- **Analytics**: Customer satisfaction tracking

## API Integration (Future)

### Expected Endpoints
```typescript
// Customer-specific data
GET /api/portal/dashboard/stats
GET /api/portal/tickets
GET /api/portal/tickets/[id]
POST /api/portal/tickets
PUT /api/portal/tickets/[id]/comment

// Customer profile
GET /api/portal/profile
PUT /api/portal/profile
```

### Data Fetching Patterns
```typescript
// Dashboard stats
interface PortalStats {
  openTickets: number;
  totalTickets: number;
  timeLogged: number; // in minutes
  lastActivity: string;
}

// Ticket filtering
interface TicketFilters {
  status?: 'open' | 'closed' | 'all';
  priority?: 'high' | 'medium' | 'low';
  dateRange?: { start: Date; end: Date };
}
```

## Accessibility Features

### Keyboard Navigation
- Tab order follows logical flow
- Keyboard shortcuts for common actions
- Focus indicators on interactive elements
- Screen reader compatible markup

### Visual Accessibility
- High contrast color schemes
- Readable font sizes and line heights
- Clear visual hierarchy
- Alternative text for icons

## Performance Considerations

### Optimization Strategies
- **Lazy Loading**: Load tickets progressively
- **Caching**: Cache frequently accessed data
- **Virtualization**: Handle large ticket lists efficiently
- **Progressive Enhancement**: Core functionality without JavaScript

### Loading States
- Skeleton screens for data loading
- Progressive content disclosure
- Error state handling
- Offline capability indicators

## Security Considerations

### Data Protection
- Customer data isolation
- Secure session management
- CSRF protection on forms
- Input validation and sanitization

### Privacy Controls
- Granular data visibility settings
- Audit trail for data access
- Data retention policies
- GDPR compliance features