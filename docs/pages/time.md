# Time Tracking Page Documentation

## Overview
The Time Tracking page (`/time`) provides comprehensive time entry management with advanced filtering, statistics, and user preference persistence. It serves as the primary interface for viewing, filtering, and managing time entries across the system.

## Key Features

### Advanced Filtering System
The page offers 8 different types of filters that can be combined for precise time entry discovery:

#### **Period Filters**
- **Today**: Entries from today only
- **Last 7 Days** ⭐ (Default): Rolling 7-day window including today
- **This Week (Mon-Sun)**: Calendar week from Monday to Sunday
- **This Month**: Entries from the current calendar month
- **Custom Range**: User-defined start and end dates
- **All Time**: No date filtering

#### **Status Filters**
- **Billing Status**: Filter by billable vs non-billable entries
- **Approval Status**: Filter by approved vs pending approval
- **Invoice Status**: Filter by invoiced vs not-invoiced entries

#### **Entity Filters**
- **Account**: Filter by specific account
- **User**: Filter by who logged the time
- **Ticket**: Filter by specific ticket
- **Billing Rate**: Filter by applied billing rate

### User Preferences Persistence
- **Auto-Save**: Filter settings automatically saved after 500ms delay
- **Session Restore**: Last-used filters restored when user returns to page
- **Per-User Storage**: Each user maintains their own filter preferences
- **Clear All**: Reset to default preferences with one click

### Statistics Dashboard
Real-time statistics cards showing:
- **Today**: Time logged today
- **Last 7 Days**: Rolling 7-day total
- **This Month**: Current month total
- **Billable Time**: Billable time from last 7 days

### Smart Filter Management
- **Active Filter Display**: Visual badges showing all active filters
- **Individual Clear**: Remove specific filters with X buttons
- **Filter Results Summary**: Shows "X of Y entries" with filtered count
- **Advanced Filters Toggle**: Collapsible section for detailed options

## Technical Implementation

### Database Schema
```prisma
model User {
  preferences Json? // Stores user filter preferences
  // ... other fields
}
```

### API Endpoints

#### User Preferences Management
- `GET /api/user/preferences` - Fetch user preferences
- `PUT /api/user/preferences` - Update entire preferences object
- `PATCH /api/user/preferences` - Update specific preference key

#### Time Entries
- `GET /api/time-entries` - Fetch time entries with server-side filtering
- `POST /api/time-entries` - Create new time entry
- `PUT /api/time-entries/[id]` - Update time entry
- `DELETE /api/time-entries/[id]` - Delete time entry

### Key Components

#### **TimeTrackingPage** (`/src/app/time/page.tsx`)
- Main page component with comprehensive filtering
- Statistics calculation and display
- Filter state management and persistence
- Integration with ActionBar for contextual actions

#### **useUserPreferences** (`/src/hooks/useUserPreferences.ts`)
- Custom hook for managing user preferences
- Type-safe filter preference management
- Debounced saving and error handling
- Extensible for other page preferences

#### **TimeEntryCard** (`/src/components/time/TimeEntryCard.tsx`)
- Individual time entry display component
- Permission-based edit/delete actions
- Billing rate and invoice status display

### Filter Logic Implementation

#### Date Calculations
```javascript
// Start of week (Monday-first for business context)
const getStartOfWeek = (date: Date, mondayFirst: boolean = true): Date => {
  const startOfWeek = new Date(date);
  const dayOfWeek = startOfWeek.getDay();
  
  if (mondayFirst) {
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
  }
  
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
};
```

#### Client-Side Filtering
All filters except ticket selection are applied client-side for performance:
- Date range filtering with proper time normalization
- Billing status, approval status, invoice status filtering
- Account, user, and billing rate filtering
- Combined filter logic with proper boolean operations

## User Experience

### Filter Workflow
1. **Page Load**: User's saved preferences automatically applied
2. **Filter Changes**: Immediate UI update with debounced preference saving
3. **Filter Feedback**: Active filters displayed as removable badges
4. **Results Summary**: Live count of filtered vs total entries
5. **Clear Options**: Individual filter removal or clear all functionality

### Default Behavior
- **Default Filter**: "Last 7 Days" for intuitive recent work viewing
- **Advanced Filters**: Collapsed by default, expandable for power users
- **Statistics**: Always show last 7 days for consistency
- **Auto-Save**: Changes persist automatically without user action

### Responsive Design
- **Mobile-Friendly**: Filters stack appropriately on small screens
- **Grid Layouts**: Responsive column layouts for different screen sizes
- **Touch-Friendly**: Clear buttons and selectors sized for mobile use

## Permission Integration

### ABAC Permission Checks
- `TIME_ENTRIES.VIEW` - Required to access the page
- `TIME_ENTRIES.CREATE` - Show manual entry tab
- `TIME_ENTRIES.APPROVE` - Show approval wizard in ActionBar
- `BILLING.VIEW` - Show billing rates and amounts

### Scope-Based Filtering
- **Global Scope**: View all time entries
- **Account Scope**: View entries for user's accounts only
- **Personal Scope**: View only own entries

## Performance Considerations

### Optimization Strategies
- **Client-Side Filtering**: Most filters applied in browser for instant feedback
- **Debounced Saving**: Preferences saved with 500ms delay to reduce API calls
- **Memoized Callbacks**: useCallback and useMemo prevent unnecessary re-renders
- **Efficient Dependencies**: useEffect dependencies minimized to prevent infinite loops
- **Pagination Support**: API supports pagination for large datasets

### Memory Management
- **Cleanup Effects**: Proper cleanup of timers and event listeners
- **Stable References**: Function dependencies properly managed
- **Component Unmounting**: ActionBar actions cleared on unmount

## Future Enhancements

### Planned Features
- **Saved Filter Sets**: Named filter combinations for quick access
- **Export Functionality**: Export filtered time entries to CSV/Excel
- **Bulk Operations**: Multi-select for bulk approval/edit operations
- **Advanced Reporting**: Charts and graphs for time analysis
- **Mobile App**: Native mobile time tracking with sync

### Extensibility
- **Additional Filters**: Easy to add new filter types
- **Custom Statistics**: Configurable dashboard metrics
- **Integration Points**: Hooks for third-party time tracking tools
- **Notification System**: Alerts for approval workflows and deadlines

## Troubleshooting

### Common Issues
- **Filters Not Persisting**: Check user authentication and preferences API
- **Infinite Re-renders**: Verify useEffect dependencies are stable
- **Date Calculations**: Ensure timezone handling is consistent
- **Performance Issues**: Check for excessive API calls or heavy calculations

### Debug Information
- Filter preferences stored in `user.preferences.timePageFilters`
- Console logs available in development for filter state changes
- Network tab shows preference saving API calls
- React DevTools show component re-render patterns