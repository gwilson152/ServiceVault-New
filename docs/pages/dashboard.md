# Dashboard Documentation

## Overview

The dashboard (`/dashboard`) is the main interface for administrators and employees to manage tickets, time tracking, customers, and invoicing. The dashboard features comprehensive ABAC permission-based access control, real-time statistics, and ActionBar integration for consistent navigation.

## Authentication & Authorization

### ABAC Permission System
The dashboard uses the comprehensive ABAC (Attribute-Based Access Control) system with granular permissions:

- **Route Protection**: Automatically redirects unauthenticated users to login page
- **Permission-Based Features**: UI elements shown based on specific user permissions
- **Account Scoping**: Permissions can be scoped to specific accounts or subsidiaries
- **Dynamic Access**: Real-time permission checking for all dashboard features

### Permission Requirements
- **Dashboard Access**: Requires authentication (no specific permission needed)
- **Statistics Display**: Uses aggregated data based on user's account access
- **Feature Visibility**: Each section requires specific permissions:
  - Tickets: `TICKETS.VIEW` permission
  - Time Tracking: `TIME_ENTRIES.VIEW` permission  
  - Billing: `BILLING.VIEW` permission
  - Settings: `SETTINGS.VIEW` permission

### Role-Based Defaults
- **ADMIN**: All permissions with global scope
- **EMPLOYEE**: Most operational permissions with account scope
- **ACCOUNT_USER**: Limited permissions for specific accounts only

## Layout Structure

### ActionBar Integration
The dashboard integrates with the shared ActionBar system for consistent navigation:

- **Shared Header**: Uses ActionBarProvider for consistent navigation across all pages
- **Dynamic Actions**: Context-sensitive action buttons based on current page and permissions
- **User Information**: Role badge, account context, and logout functionality
- **Settings Access**: Quick access to system settings (permission-based)

### Navigation Structure
- **Responsive Design**: Mobile-first approach with collapsible elements
- **Permission-Based Menu**: Navigation items shown based on user permissions
- **Account Context**: Shows current account scope when applicable
- **Quick Actions**: Direct access to common operations

### Main Content Area
- **Real-Time Statistics**: Live data from database with automatic updates
- **Permission-Based Cards**: Statistics cards shown based on user access
- **Responsive Grid**: Cards adapt to screen size and available data
- **Loading States**: Progressive loading with skeleton screens

## Features

### Real-Time Statistics Dashboard
Live metrics cards with permission-based visibility:

1. **Active Tickets** (`TICKETS.VIEW` permission)
   - Count of open support tickets scoped to user's access
   - Includes account hierarchy for subsidiary managers
   - Click-through to tickets page
   - Icon: FileText, Color: Blue

2. **Active Timers** (`TIME_ENTRIES.VIEW` permission)
   - Count of currently running timers
   - Shows user's own timers and managed account timers
   - Click-through to time tracking page
   - Icon: Clock, Color: Green

3. **Account Users** (`ACCOUNTS.VIEW` permission)
   - Total account users the current user can access
   - Scoped based on account hierarchy permissions
   - Click-through to accounts page
   - Icon: Users, Color: Purple

4. **Monthly Revenue** (`BILLING.VIEW` permission)
   - Revenue from paid invoices for current month
   - Scoped to accounts user has billing access to
   - Click-through to billing page
   - Icon: DollarSign, Color: Yellow

### Permission-Based Statistics
- **Scoped Data**: All statistics respect user's permission scope (own/account/subsidiary)
- **Real-Time Updates**: Statistics update automatically as data changes
- **Click Navigation**: Cards provide quick navigation to relevant pages
- **Loading States**: Skeleton loading for better user experience

### Tabbed Content

#### Overview Tab
- **Recent Activity**: Latest system activities with status indicators
- **Quick Actions**: Role-based action buttons for common tasks

#### Recent Tickets Tab (Employee+)
- **Ticket List**: Shows recent tickets with:
  - Ticket ID and title
  - Customer name
  - Priority badges (High/Medium/Low)
  - Status badges
- **Interactive Design**: Click-through capabilities for ticket details

#### Time Entries Tab (Employee+)
- **Empty State**: Displays when no time entries exist
- **Quick Action**: "Log Time Entry" button
- **Future**: Will show recent time entries and tracking interface

## Component Architecture

### UI Components Used
- `Card` components for metric displays and content sections
- `Tabs` for organizing dashboard views
- `Badge` for status and priority indicators
- `Button` with various variants for actions
- Lucide React icons for visual elements

### State Management
```typescript
const [isSidebarOpen, setIsSidebarOpen] = useState(false);
```
- Manages mobile sidebar visibility
- Uses Next.js session state for authentication

### Responsive Design
- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: Uses Tailwind responsive classes
- **Sidebar**: Collapsible navigation for smaller screens
- **Grid Layout**: Responsive card arrangements

## Styling

### Design System
- **Colors**: Uses CSS custom properties for theming
- **Spacing**: Consistent spacing scale
- **Typography**: Hierarchical text sizes
- **Shadows**: Subtle elevation effects

### Dark Mode Support
- Built-in support through CSS custom properties
- Automatic switching based on system preference
- Consistent across all components

## Future Enhancements

### Planned Features
1. **Real-time Data**: Replace mock data with live database queries
2. **Interactive Charts**: Add data visualization for metrics
3. **Notification System**: Show alerts and updates
4. **Search Functionality**: Global search across tickets and customers
5. **Customizable Dashboard**: User-configurable widgets

### Integration Points
- Database queries for real statistics
- WebSocket connections for real-time updates
- API endpoints for dashboard data
- Export functionality for reports

## API Integration

### Expected Endpoints
```typescript
// Future API calls
GET /api/dashboard/stats
GET /api/tickets/recent
GET /api/time-entries/user
GET /api/activity/recent
```

### Data Structures
```typescript
interface DashboardStats {
  activeTickets: number;
  timeThisWeek: number; // in minutes
  totalCustomers: number;
  monthlyRevenue: string;
}

interface RecentTicket {
  id: string;
  title: string;
  customer: string;
  priority: "High" | "Medium" | "Low";
  status: string;
}
```

## Performance Considerations

### Optimizations
- **Component Memoization**: Prevent unnecessary re-renders
- **Lazy Loading**: Load dashboard data progressively
- **Caching**: Cache frequently accessed data
- **Virtual Scrolling**: For large lists

### Loading States
- Skeleton screens for content loading
- Progressive enhancement of features
- Graceful error handling

## Testing Strategy

### Test Coverage
- Unit tests for component logic
- Integration tests for user flows
- E2E tests for critical paths
- Accessibility testing

### Key Test Scenarios
- Authentication flow
- Role-based feature visibility
- Mobile responsive behavior
- Data loading and error states