# User Preferences System

The Service Vault application includes a robust user preferences system that provides database-backed, type-safe preference management with automatic persistence and performance optimization.

## Overview

### Key Features

- **Database-backed persistence** - Preferences stored in PostgreSQL
- **Type-safe TypeScript interface** - Full type checking and IntelliSense
- **Debounced auto-save** - Prevents excessive API calls (500ms delay)
- **Real-time synchronization** - Changes reflected immediately across UI
- **Extensible schema** - Easy to add new preference types
- **Fallback handling** - Graceful defaults when preferences don't exist

## Architecture

### Database Schema

```sql
-- User preferences stored as JSONB
table UserPreference {
  id          String   @id @default(cuid())
  userId      String   
  key         String   -- Preference category (e.g., "filters", "ui", "dashboard")
  value       Json     -- JSONB storage for flexible schema
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, key])
  @@index([userId])
}
```

### TypeScript Interface

```typescript
// Base preference structure
export interface UserPreferences {
  filters: FilterPreferences;
  ui: UIPreferences;
  dashboard: DashboardPreferences;
  // ... extensible for new categories
}

// Specific preference categories
export interface FilterPreferences {
  timeEntries: {
    accountFilter: string;
    dateRange: string;
    statusFilter: string;
  };
  tickets: {
    statusFilter: string;
    priorityFilter: string;
    assigneeFilter: string;
  };
  users: {
    roleFilter: string;
    accountFilter: string;
  };
}

export interface UIPreferences {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  tablePageSize: number;
  accountViewMode: 'grid' | 'tree';
}

export interface DashboardPreferences {
  widgetOrder: string[];
  hiddenWidgets: string[];
  refreshInterval: number;
}
```

## React Hook: `useUserPreferences`

### Basic Usage

```typescript
import { useUserPreferences } from '@/hooks/useUserPreferences';

function MyComponent() {
  const {
    preferences,
    updatePreference,
    isLoading,
    error
  } = useUserPreferences();

  const handleFilterChange = (newFilter: string) => {
    updatePreference('filters.timeEntries.accountFilter', newFilter);
  };

  return (
    <div>
      {isLoading ? (
        <div>Loading preferences...</div>
      ) : (
        <FilterComponent 
          value={preferences.filters.timeEntries.accountFilter}
          onChange={handleFilterChange}
        />
      )}
    </div>
  );
}
```

### Advanced Usage with Debouncing

```typescript
function SearchComponent() {
  const { preferences, updatePreference } = useUserPreferences();
  const [localValue, setLocalValue] = useState(
    preferences.filters.timeEntries.searchTerm || ''
  );

  // Debounced update to preferences
  const debouncedUpdate = useMemo(
    () => debounce((value: string) => {
      updatePreference('filters.timeEntries.searchTerm', value);
    }, 500),
    [updatePreference]
  );

  const handleSearchChange = (value: string) => {
    setLocalValue(value); // Immediate UI update
    debouncedUpdate(value); // Debounced persistence
  };

  return (
    <Input
      value={localValue}
      onChange={(e) => handleSearchChange(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

## API Integration

### Endpoints

**GET `/api/user-preferences`**
```typescript
// Get all preferences for current user
const response = await fetch('/api/user-preferences');
const preferences = await response.json();
```

**PUT `/api/user-preferences`**
```typescript
// Update specific preference
await fetch('/api/user-preferences', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'filters.timeEntries.accountFilter',
    value: 'account-123'
  })
});
```

**DELETE `/api/user-preferences/:key`**
```typescript
// Reset preference to default
await fetch('/api/user-preferences/filters.timeEntries', {
  method: 'DELETE'
});
```

### Server-Side Implementation

```typescript
// /src/app/api/user-preferences/route.ts
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  const preferences = await prisma.userPreference.findMany({
    where: { userId: session.user.id },
    select: { key: true, value: true }
  });

  // Convert to nested object structure
  const preferencesObject = preferences.reduce((acc, pref) => {
    setNestedValue(acc, pref.key, pref.value);
    return acc;
  }, {} as UserPreferences);

  return NextResponse.json(preferencesObject);
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const { key, value } = await request.json();

  await prisma.userPreference.upsert({
    where: {
      userId_key: {
        userId: session.user.id,
        key
      }
    },
    create: {
      userId: session.user.id,
      key,
      value
    },
    update: {
      value,
      updatedAt: new Date()
    }
  });

  return NextResponse.json({ success: true });
}
```

## Common Use Cases

### Filter Persistence

```typescript
// Persist table filters across sessions
function DataTable() {
  const { preferences, updatePreference } = useUserPreferences();
  
  const [filters, setFilters] = useState(
    preferences.filters.timeEntries || {}
  );

  const handleFilterChange = (filterType: string, value: string) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    updatePreference('filters.timeEntries', newFilters);
  };

  return (
    <div>
      <FilterBar 
        filters={filters}
        onChange={handleFilterChange}
      />
      <Table data={filteredData} />
    </div>
  );
}
```

### UI State Persistence

```typescript
// Remember sidebar state
function Layout() {
  const { preferences, updatePreference } = useUserPreferences();
  
  const [sidebarOpen, setSidebarOpen] = useState(
    preferences.ui.sidebarCollapsed !== true
  );

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    updatePreference('ui.sidebarCollapsed', !newState);
  };

  return (
    <div className={sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}>
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <MainContent />
    </div>
  );
}
```

### Dashboard Customization

```typescript
// Customizable dashboard widgets
function Dashboard() {
  const { preferences, updatePreference } = useUserPreferences();
  
  const visibleWidgets = useMemo(() => {
    const { widgetOrder = [], hiddenWidgets = [] } = preferences.dashboard;
    return widgetOrder.filter(id => !hiddenWidgets.includes(id));
  }, [preferences.dashboard]);

  const handleWidgetReorder = (newOrder: string[]) => {
    updatePreference('dashboard.widgetOrder', newOrder);
  };

  const handleWidgetToggle = (widgetId: string, visible: boolean) => {
    const hiddenWidgets = preferences.dashboard.hiddenWidgets || [];
    const newHidden = visible 
      ? hiddenWidgets.filter(id => id !== widgetId)
      : [...hiddenWidgets, widgetId];
    
    updatePreference('dashboard.hiddenWidgets', newHidden);
  };

  return (
    <DashboardGrid 
      widgets={visibleWidgets}
      onReorder={handleWidgetReorder}
      onToggleWidget={handleWidgetToggle}
    />
  );
}
```

## Performance Optimization

### Debouncing Strategy

The system uses a 500ms debounce delay to prevent excessive API calls:

```typescript
// Built into useUserPreferences hook
const debouncedUpdate = useMemo(
  () => debounce(async (key: string, value: any) => {
    try {
      await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
    } catch (error) {
      console.error('Failed to save preference:', error);
    }
  }, 500),
  []
);
```

### Caching Strategy

- **Client-side**: React Query with 5-minute cache
- **Optimistic updates**: UI updates immediately, syncs to server
- **Error handling**: Rollback on failed saves

### Preventing Re-renders

```typescript
// Memoize preference objects to prevent unnecessary re-renders
const memoizedPreferences = useMemo(() => preferences, [
  JSON.stringify(preferences)
]);

// Use selectors for specific preference sections
const filterPreferences = useMemo(
  () => preferences.filters,
  [preferences.filters]
);
```

## Extending the System

### Adding New Preference Categories

1. **Update TypeScript interface:**
```typescript
export interface UserPreferences {
  // ... existing categories
  reporting: ReportingPreferences; // New category
}

export interface ReportingPreferences {
  defaultDateRange: string;
  includeWeekends: boolean;
  groupBy: 'account' | 'user' | 'project';
}
```

2. **Update default values:**
```typescript
const DEFAULT_PREFERENCES: UserPreferences = {
  // ... existing defaults
  reporting: {
    defaultDateRange: 'last30days',
    includeWeekends: false,
    groupBy: 'account'
  }
};
```

3. **Use in components:**
```typescript
function ReportsPage() {
  const { preferences, updatePreference } = useUserPreferences();
  
  return (
    <div>
      <Select 
        value={preferences.reporting.groupBy}
        onChange={(value) => updatePreference('reporting.groupBy', value)}
      >
        <option value="account">By Account</option>
        <option value="user">By User</option>
        <option value="project">By Project</option>
      </Select>
    </div>
  );
}
```

## Error Handling

### Network Failures

```typescript
const { preferences, updatePreference, error } = useUserPreferences();

// Display error state
if (error) {
  return (
    <Alert variant="destructive">
      Failed to load preferences. Using defaults.
    </Alert>
  );
}

// Handle save failures
const handlePreferenceChange = async (key: string, value: any) => {
  try {
    await updatePreference(key, value);
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to save preference",
      variant: "destructive"
    });
  }
};
```

### Fallback Handling

```typescript
// Graceful degradation when preferences fail to load
const safeGetPreference = (path: string, fallback: any) => {
  try {
    return get(preferences, path) ?? fallback;
  } catch {
    return fallback;
  }
};

const accountFilter = safeGetPreference(
  'filters.timeEntries.accountFilter', 
  'all'
);
```

## Testing

### Unit Tests

```typescript
// Test preference updates
it('should update preferences with debouncing', async () => {
  const { result } = renderHook(() => useUserPreferences());
  
  act(() => {
    result.current.updatePreference('ui.theme', 'dark');
  });

  expect(result.current.preferences.ui.theme).toBe('dark');
  
  // Wait for debounced API call
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith('/api/user-preferences', {
      method: 'PUT',
      body: JSON.stringify({
        key: 'ui.theme',
        value: 'dark'
      })
    });
  });
});
```

### Integration Tests

```typescript
// Test full preference flow
it('should persist preferences across sessions', async () => {
  // Set preference
  await updateUserPreference(userId, 'filters.status', 'active');
  
  // Simulate new session
  const preferences = await getUserPreferences(userId);
  
  expect(preferences.filters.status).toBe('active');
});
```

## Best Practices

1. **Use debouncing** for frequently changing preferences
2. **Provide fallbacks** for all preference accesses
3. **Keep preferences granular** - separate concerns into different keys
4. **Validate preference values** before saving
5. **Use TypeScript** for type safety
6. **Test preference persistence** in integration tests
7. **Monitor performance** - avoid excessive API calls
8. **Document new preferences** when adding features

## Migration Guide

When adding preferences to existing components:

1. **Identify state to persist** (filters, UI state, etc.)
2. **Add to TypeScript interface** with proper typing
3. **Update components** to use `useUserPreferences`
4. **Add fallback values** for backward compatibility
5. **Test across user sessions** to ensure persistence