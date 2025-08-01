# Admin Dashboard Documentation

## Overview

The admin dashboard (`/dashboard`) is the main interface for administrators and employees to manage tickets, time tracking, customers, and invoicing. The dashboard features role-based access control and a responsive design.

## Authentication & Authorization

### Access Control
- **Route Protection**: Automatically redirects unauthenticated users to login page
- **Role-Based Features**: Different UI elements shown based on user role
  - `ADMIN`: Full access to all features
  - `EMPLOYEE`: Access to tickets and time tracking
  - `CUSTOMER`: Redirected to customer portal (future implementation)

### User Roles
```typescript
const isAdmin = session.user?.role === "ADMIN";
const isEmployee = session.user?.role === "EMPLOYEE" || isAdmin;
```

## Layout Structure

### Header Navigation
- **Brand**: Service Vault logo/title
- **Mobile Menu**: Hamburger menu for mobile devices
- **User Info**: Welcome message with user name/email
- **Role Badge**: Shows current user role
- **Action Icons**: Settings and logout buttons

### Sidebar Navigation
- **Responsive**: Collapsible on mobile, fixed on desktop
- **Role-Based Items**:
  - All users: Overview
  - Employees: Tickets, Time Tracking
  - Admins: Customers, Invoicing, Settings

### Main Content Area
- **Statistics Cards**: Key metrics overview
- **Tabbed Interface**: Different views for content organization
- **Responsive Grid**: Cards adapt to screen size

## Features

### Statistics Dashboard
Four key metric cards displayed at the top:

1. **Active Tickets**
   - Shows count of open support tickets
   - Icon: FileText
   - Color: Blue

2. **Hours This Week**
   - Total time logged for current week
   - Icon: Clock
   - Color: Green

3. **Total Customers**
   - Active customer account count
   - Icon: Users
   - Color: Purple

4. **Monthly Revenue**
   - Revenue generated this month
   - Icon: DollarSign
   - Color: Yellow

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