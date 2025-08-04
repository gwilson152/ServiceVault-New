# User Preferences System

## Overview
The user preferences system provides persistent, user-specific settings storage across the application. It enables personalized experiences by remembering user choices, filter settings, and UI preferences.

## Database Schema

### User Model Enhancement
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  // ... other fields
  preferences   Json?     // User preferences (filters, UI settings, etc.)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

The `preferences` field stores a JSON object containing all user-specific settings organized by feature area.

## API Endpoints

### GET /api/user/preferences
Retrieve user preferences with fallback to defaults.

**Response:**
```json
{
  "preferences": {
    "timePageFilters": {
      "filterPeriod": "last7days",
      "filterTicket": "all",
      "filterAccount": "all",
      "filterUser": "all",
      "filterBillingStatus": "all",
      "filterApprovalStatus": "all",
      "filterInvoiceStatus": "all",
      "filterBillingRate": "all",
      "filterDateStart": "",
      "filterDateEnd": "",
      "showAdvancedFilters": false
    }
  }
}
```

### PUT /api/user/preferences
Update entire preferences object.

**Request Body:**
```json
{
  "preferences": {
    "timePageFilters": { /* complete filter object */ },
    "dashboardSettings": { /* other settings */ }
  }
}
```

### PATCH /api/user/preferences
Update specific preference key.

**Request Body:**
```json
{
  "key": "timePageFilters",
  "value": {
    "filterPeriod": "week",
    "filterTicket": "all"
    // ... other filter settings
  }
}
```

## Implementation

### useUserPreferences Hook

Located at `/src/hooks/useUserPreferences.ts`, this custom hook provides a clean interface for managing user preferences.

#### Key Methods
```typescript
const {
  preferences,              // Current preferences object
  isLoading,               // Loading state
  error,                   // Error state
  updatePreferences,       // Update entire preferences
  updatePreference,        // Update specific key
  getTimePageFilters,      // Get time page filters with defaults
  updateTimePageFilters,   // Update time page filters
  refetch                  // Manually refresh preferences
} = useUserPreferences();
```

#### Type Safety
```typescript
interface TimePageFilters {
  filterPeriod: string;
  filterTicket: string;
  filterAccount: string;
  filterUser: string;
  filterBillingStatus: string;
  filterApprovalStatus: string;
  filterInvoiceStatus: string;
  filterBillingRate: string;
  filterDateStart: string;
  filterDateEnd: string;
  showAdvancedFilters: boolean;
}

interface UserPreferences {
  timePageFilters?: TimePageFilters;
  // Add other page preferences here as needed
}
```

### Integration Pattern

#### Page-Level Integration
```typescript
// In component
const {
  getTimePageFilters,
  updateTimePageFilters,
  isLoading: preferencesLoading
} = useUserPreferences();

// Load preferences on mount
useEffect(() => {
  if (!preferencesLoading) {
    const savedFilters = getTimePageFilters();
    setFilterPeriod(savedFilters.filterPeriod);
    setFilterTicket(savedFilters.filterTicket);
    // ... restore other filters
  }
}, [preferencesLoading, getTimePageFilters]);

// Save preferences when filters change (debounced)
useEffect(() => {
  const timeoutId = setTimeout(() => {
    updateTimePageFilters({
      filterPeriod,
      filterTicket,
      // ... all filter states
    });
  }, 500); // 500ms debounce

  return () => clearTimeout(timeoutId);
}, [filterPeriod, filterTicket, /* other filters */]);
```

## Current Applications

### Time Page Filters
The time tracking page uses preferences to persist:
- Period selection (Today, Last 7 Days, This Week, etc.)
- Billing status filter
- Approval status filter
- Invoice status filter
- Account, user, ticket, and billing rate selections
- Custom date ranges
- Advanced filters visibility state

### Default Values
```typescript
const DEFAULT_TIME_FILTERS: TimePageFilters = {
  filterPeriod: "last7days",
  filterTicket: "all",
  filterAccount: "all",
  filterUser: "all",
  filterBillingStatus: "all",
  filterApprovalStatus: "all",
  filterInvoiceStatus: "all",
  filterBillingRate: "all",
  filterDateStart: "",
  filterDateEnd: "",
  showAdvancedFilters: false
};
```

## Performance Considerations

### Debounced Saving
- **500ms debounce** prevents excessive API calls during rapid filter changes
- **Automatic cleanup** of debounce timers prevents memory leaks
- **Immediate UI updates** with background preference saving

### Caching Strategy
- **Client-side caching** of preferences to reduce API calls
- **Session-based loading** only fetches preferences once per session
- **Optimistic updates** for immediate user feedback

### Memory Management
- **Cleanup effects** properly clear timers and listeners
- **Stable function references** prevent unnecessary re-renders
- **Minimal dependencies** in useEffect arrays

## Extensibility

### Adding New Preference Types
1. **Update TypeScript interfaces** in `useUserPreferences.ts`
2. **Add getter/setter methods** to the hook
3. **Implement default values** for new preference types
4. **Update API validation** if needed

Example for dashboard preferences:
```typescript
interface UserPreferences {
  timePageFilters?: TimePageFilters;
  dashboardSettings?: DashboardSettings; // New preference type
}

// Add to hook
const getDashboardSettings = useCallback((): DashboardSettings => {
  return preferences.dashboardSettings || DEFAULT_DASHBOARD_SETTINGS;
}, [preferences.dashboardSettings]);

const updateDashboardSettings = useCallback(async (settings: Partial<DashboardSettings>) => {
  const currentSettings = getDashboardSettings();
  const newSettings = { ...currentSettings, ...settings };
  return await updatePreference('dashboardSettings', newSettings);
}, [getDashboardSettings, updatePreference]);
```

### Page Integration Template
```typescript
// 1. Import hook
import { useUserPreferences } from '@/hooks/useUserPreferences';

// 2. Use in component
const {
  getPageSettings,      // Replace with specific getter
  updatePageSettings,   // Replace with specific setter
  isLoading: preferencesLoading
} = useUserPreferences();

// 3. Load on mount
useEffect(() => {
  if (!preferencesLoading) {
    const saved = getPageSettings();
    // Apply saved settings to component state
  }
}, [preferencesLoading, getPageSettings]);

// 4. Save on change (debounced)
useEffect(() => {
  const timeoutId = setTimeout(() => {
    updatePageSettings({/* current settings */});
  }, 500);
  return () => clearTimeout(timeoutId);
}, [/* setting dependencies */, updatePageSettings]);
```

## Security Considerations

### Access Control
- **User-specific storage**: Preferences are scoped to authenticated user
- **Session validation**: All API calls require valid user session
- **Input validation**: JSON preferences validated for structure and size
- **No sensitive data**: Preferences should not contain sensitive information

### Data Validation
```typescript
// API validation example
if (!preferences || typeof preferences !== 'object') {
  return NextResponse.json(
    { error: "Invalid preferences data" },
    { status: 400 }
  );
}
```

### Size Limits
- **JSON field size**: Consider database JSON field limits
- **Client memory**: Large preference objects may impact performance
- **Network efficiency**: Large preferences increase request sizes

## Monitoring and Debugging

### Development Tools
- **Console logging**: Development mode shows preference save/load operations
- **React DevTools**: Track preference hook state and updates
- **Network tab**: Monitor API calls for preference operations
- **Database inspection**: Verify preference storage in development

### Error Handling
```typescript
// Hook includes comprehensive error handling
const [error, setError] = useState<string | null>(null);

try {
  // API operation
} catch (err) {
  console.error('Error updating preferences:', err);
  setError('Failed to save preferences');
  return false;
}
```

### Troubleshooting Guide
- **Preferences not saving**: Check user authentication and API endpoints
- **Defaults not loading**: Verify default value definitions
- **Performance issues**: Check debounce timing and useEffect dependencies
- **Type errors**: Ensure TypeScript interfaces match API structure

## Future Enhancements

### Planned Features
- **Export/Import**: Allow users to backup and restore preferences
- **Admin Override**: Admin ability to set organization-wide defaults
- **Preference Profiles**: Named preference sets for different workflows
- **Sync Across Devices**: Real-time preference synchronization
- **Preference History**: Track changes and allow rollback

### Technical Improvements
- **Schema Versioning**: Handle preference structure migrations
- **Compression**: Compress large preference objects
- **Offline Support**: Cache preferences for offline functionality
- **Real-time Updates**: WebSocket-based preference synchronization