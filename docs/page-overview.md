# Page Overview

> ⚠️ **IMPORTANT**: Always update this documentation when adding/modifying pages, changing routing, or updating navigation patterns.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Page Categories](#page-categories)
- [Authentication & Authorization](#authentication--authorization)
- [Page Structure Patterns](#page-structure-patterns) 
- [State Management](#state-management)
- [Navigation & Routing](#navigation--routing)
- [Component Integration](#component-integration)
- [Page Documentation Standard](#page-documentation-standard)

## Architecture Overview

The Service Vault frontend is built on **Next.js 15 App Router** with:
- **Framework**: Next.js 15 with TypeScript
- **Authentication**: NextAuth.js with session management
- **State Management**: React useState/useEffect + TanStack Query
- **UI Framework**: Shadcn/UI components + Tailwind CSS
- **Global State**: Context providers for cross-component state
- **Routing**: File-based routing with App Router

### Core Principles
1. **Role-Based Access**: Different page visibility based on user roles
2. **Permission Gating**: Page-level and component-level permission checks
3. **Consistent Layouts**: Shared navigation and layout components
4. **Real-Time Updates**: Live data updates via TanStack Query
5. **Mobile Responsive**: All pages work across device sizes

## Page Categories

### Public Pages (No Authentication Required)
- **`/` (Root)** - Login page with authentication forms
- **`/setup`** - Initial system setup wizard  
- **`/portal/accept-invitation`** - Account user invitation acceptance

### Admin Pages (ADMIN Role Required)
- **`/dashboard`** - Admin dashboard with system overview
- **`/accounts`** - Account management with hierarchy
- **`/accounts/[id]`** - Individual account details and management
- **`/permissions`** - Permission and role management
- **`/settings`** - System configuration and settings

### Workflow Pages (ADMIN/EMPLOYEE Roles)
- **`/tickets`** - Ticket management and assignment
- **`/time`** - Time tracking and entry management
- **`/billing`** - Billing rates and invoice generation
- **`/invoices/[id]`** - Individual invoice details and PDF export
- **`/reports`** - Time and billing reports

### Portal Pages (ACCOUNT_USER Role)
- **`/portal`** - Customer dashboard with limited access
- **`/portal/tickets`** - Customer ticket view and creation

## Authentication & Authorization

### Authentication Flow
Every page follows this authentication pattern:

```typescript
const { data: session, status } = useSession();
const router = useRouter();

useEffect(() => {
  if (status === "unauthenticated") {
    router.push("/");
  } else if (status === "authenticated") {
    // Role-based access control
    if (session.user?.role !== "ADMIN" && requiresAdmin) {
      router.push("/dashboard");
    }
  }
}, [status, session, router]);
```

### Permission Checking
Pages use permission hooks for fine-grained access control:

```typescript
const {
  canViewTimeEntries,
  canCreateTimeEntries,
  isLoading: permissionsLoading
} = usePermissions();

useEffect(() => {
  const checkAccess = async () => {
    const hasAccess = await canViewTimeEntries();
    if (!hasAccess) {
      router.push("/dashboard");
    }
  };
  checkAccess();
}, [canViewTimeEntries]);
```

### Role-Based Page Access

| Page | ADMIN | EMPLOYEE | ACCOUNT_USER |
|------|-------|----------|--------------|
| `/dashboard` | ✅ Full access | ✅ Limited stats | ✅ Redirect to portal |
| `/accounts` | ✅ Full management | ❌ | ❌ |
| `/tickets` | ✅ Full access | ✅ Assigned tickets | ❌ |
| `/time` | ✅ All entries | ✅ Own entries | ❌ |
| `/billing` | ✅ Full access | ✅ View only | ❌ |
| `/portal` | ❌ | ❌ | ✅ Own account only |
| `/settings` | ✅ Full access | ❌ | ❌ |

## Page Structure Patterns

### Standard Page Structure
```typescript
/**
 * PAGE HEADER COMMENT
 * [See Page Documentation Standard below]
 */

export default function PageName() {
  // 1. Hooks (must be at top, no conditional calls)
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  // 2. Permission hooks
  const { canViewResource, canCreateResource } = usePermissions();
  
  // 3. Data fetching hooks (TanStack Query preferred)
  const { data: items, isLoading: dataLoading } = useResourceQuery();
  
  // 4. Local state
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  
  // 5. Action bar integration
  const { addAction, clearActions } = useActionBar();
  
  // 6. Callbacks and handlers
  const handleCreate = useCallback(async () => {
    // Handler logic
  }, []);
  
  // 7. Effects (authentication, permissions, action bar setup)
  useEffect(() => {
    // Authentication and permission checking
  }, [status, session]);
  
  useEffect(() => {
    // Action bar setup
    return () => clearActions(); // Cleanup
  }, []);
  
  // 8. Early returns for loading/unauthorized states
  if (status === "loading" || isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!session) {
    return <AccessDenied />;
  }
  
  // 9. Main render
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Page content */}
    </div>
  );
}
```

### Common Page Components

#### Page Header Pattern
```typescript
<div className="space-y-2">
  <h2 className="text-2xl font-bold tracking-tight">Page Title</h2>
  <p className="text-muted-foreground">
    Page description and purpose
  </p>
</div>
```

#### Stats Cards Pattern  
```typescript
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Stat Title</CardTitle>
      <Icon className="h-4 w-4 text-blue-600" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{statValue}</div>
      <p className="text-xs text-muted-foreground">Description</p>
    </CardContent>
  </Card>
</div>
```

#### Tabbed Content Pattern
```typescript
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    <TabContent />
  </TabsContent>
</Tabs>
```

## State Management

### Local State Patterns
```typescript
// UI State
const [isLoading, setIsLoading] = useState(true);
const [activeTab, setActiveTab] = useState("default");
const [showDialog, setShowDialog] = useState(false);

// Form State
const [formData, setFormData] = useState({
  field1: "",
  field2: ""
});

// Selection State
const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
const [selectedItem, setSelectedItem] = useState<Item | null>(null);
```

### Global State (Context Providers)
```typescript
// Action Bar State
const { addAction, clearActions } = useActionBar();

// Timer State
const { activeTimers, startTimer, stopTimer } = useTimeTracking();

// Toast Notifications
const { success, error } = useToast();

// User Preferences
const { getTimePageFilters, updateTimePageFilters } = useUserPreferences();
```

### Data Fetching (TanStack Query)
```typescript
// Preferred: TanStack Query hooks
const { data: accounts, isLoading, error } = useAccountsQuery();
const { data: tickets } = useTicketsQuery({ accountId });

// Legacy: Manual fetch with useEffect
useEffect(() => {
  const fetchData = async () => {
    // Manual fetch logic
  };
  fetchData();
}, [dependencies]);
```

## Navigation & Routing

### Main Navigation Structure
```
/dashboard          # Landing page for all users
├── /accounts       # Account management (Admin only)  
├── /tickets        # Ticket management (Admin/Employee)
├── /time          # Time tracking (Admin/Employee)
├── /billing       # Billing & invoices (Admin/Employee)
├── /reports       # Reports (Admin/Employee)
├── /permissions   # Permission management (Admin only)
└── /settings      # System settings (Admin only)

/portal            # Customer portal
├── /portal/tickets # Customer tickets (Account users)
└── /portal/accept-invitation # Invitation acceptance

/setup             # System setup wizard
```

### Navigation Component Integration
```typescript
// AppNavigation handles role-based menu visibility
<AppNavigation>
  {/* Navigation items filtered by user role */}
</AppNavigation>

// Breadcrumb navigation for deep pages
<Breadcrumb>
  <BreadcrumbItem href="/accounts">Accounts</BreadcrumbItem>
  <BreadcrumbItem href={`/accounts/${accountId}`}>Account Details</BreadcrumbItem>
</Breadcrumb>
```

### Inter-Page Navigation Patterns
```typescript
// Programmatic navigation
const router = useRouter();
router.push(`/tickets/${ticketId}`);

// Navigation with state
router.push(`/accounts?tab=settings`);

// Back navigation with fallback
const handleBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/accounts');
  }
};
```

## Component Integration

### Action Bar Integration
Pages can add contextual actions to the global action bar:

```typescript
useEffect(() => {
  if (canCreateTickets) {
    addAction({
      id: "create-ticket",
      label: "New Ticket",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => setShowCreateDialog(true),
      variant: "default",
      tooltip: "Create a new support ticket"
    });
  }
  
  return () => clearActions(); // Cleanup on unmount
}, [canCreateTickets, addAction, clearActions]);
```

### Dialog and Form Integration
```typescript
// Dialog state management
const [showCreateDialog, setShowCreateDialog] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);

// Form handlers
const handleCreate = async (formData) => {
  try {
    await createMutation.mutateAsync(formData);
    setShowCreateDialog(false);
    success("Created successfully");
  } catch (error) {
    error("Failed to create");
  }
};

// Dialog components
<CreateItemDialog
  open={showCreateDialog}
  onOpenChange={setShowCreateDialog}
  onSuccess={handleCreate}
/>
```

### Real-Time Updates
```typescript
// TanStack Query automatic refetching
const { data, refetch } = useResourceQuery();

// Manual refresh triggers
const handleRefresh = () => {
  refetch();
};

// Timer-based updates
useEffect(() => {
  const interval = setInterval(() => {
    refetch();
  }, 30000); // Refresh every 30 seconds
  
  return () => clearInterval(interval);
}, [refetch]);
```

## Page Documentation Standard

Every page should include a header comment with this format:

```typescript
/**
 * PAGE_NAME
 * 
 * Purpose: Brief description of what this page does and its role in the system
 * Access: Role requirements and permission details
 * 
 * Key Functions:
 * - Primary function 1: Description
 * - Primary function 2: Description  
 * - Primary function 3: Description
 * 
 * Related Pages:
 * - /related-page - Description of relationship and navigation
 * - /another-page - How users move between these pages
 * 
 * API Dependencies:
 * - GET /api/endpoint - What data is fetched and why
 * - POST /api/endpoint - What actions are performed
 * 
 * Components Used:
 * - ComponentName - Purpose and integration
 * - DialogComponent - When and how it's used
 * 
 * State Management:
 * - Local state: What's managed locally and why
 * - Global state: What contexts/providers are used
 * - Data fetching: TanStack Query usage or manual fetching
 * 
 * Navigation:
 * - Entry points: How users reach this page
 * - Exit points: Where users go from here
 * - Deep linking: URL parameters and state
 */
```

### Example Page Header Comment
```typescript
/**
 * TIME TRACKING PAGE
 * 
 * Purpose: Central hub for time entry management, timer controls, and time reporting
 * Access: ADMIN and EMPLOYEE roles only, requires TIME_ENTRIES.VIEW permission
 * 
 * Key Functions:
 * - View and filter time entries with advanced filtering options
 * - Create manual time entries for tickets or accounts directly
 * - Display time statistics (today, week, month, billable amounts)
 * - Integrate with global timer system for seamless time tracking
 * 
 * Related Pages:
 * - /tickets - Time entries are often created from ticket context
 * - /billing - Time entries feed into invoice generation
 * - /dashboard - Summary stats are shown on dashboard
 * 
 * API Dependencies:
 * - GET /api/time-entries - Fetch time entries with role-based filtering
 * - POST /api/tickets/[id]/time-entries - Create time entries for tickets
 * - POST /api/accounts/[id]/time-entries - Create direct account time entries
 * - GET /api/accounts - Account list for form dropdowns
 * - GET /api/tickets - Ticket list for form dropdowns
 * - GET /api/billing/rates - Billing rates for entry creation
 * 
 * Components Used:
 * - TimeEntryCard - Display individual time entries with permissions
 * - TimeEntryEditDialog - Edit existing time entries
 * - TimeEntryApprovalWizard - Bulk approval workflow for managers
 * - AccountSelector - Hierarchical account selection
 * - TicketSelector - Ticket selection with filtering
 * 
 * State Management:
 * - Local state: Filter settings, form data, dialog visibility
 * - Global state: useTimeTracking for timer integration, useActionBar for actions
 * - Data fetching: Manual useEffect with stable fetch functions (legacy pattern)
 * - User preferences: Filter settings persisted via useUserPreferences
 * 
 * Navigation:
 * - Entry points: Main navigation, dashboard quick actions, timer "log time" flow
 * - Exit points: Ticket details (via time entry), billing page (for invoicing)
 * - Deep linking: Supports filter parameters in URL for bookmarking
 */
```

## Page-Specific Patterns

### Dashboard Pages
- **Purpose**: Overview and quick access to key functions
- **Pattern**: Stats cards + recent items + quick actions
- **State**: Aggregated data from multiple sources
- **Refresh**: Auto-refresh every 30 seconds for live stats

### Management Pages (Accounts, Tickets)
- **Purpose**: CRUD operations with search and filtering
- **Pattern**: Search/filter bar + data table/cards + action buttons
- **State**: Paginated data with filter state persistence
- **Actions**: Create, edit, delete with confirmation dialogs

### Form Pages (Time Entry, Ticket Creation)
- **Purpose**: Data entry with validation and submission
- **Pattern**: Multi-section forms with progress indication
- **State**: Form state with validation and error handling
- **Navigation**: Save/cancel with unsaved changes warning

### Detail Pages (Invoice, Account Details)
- **Purpose**: Detailed view with related data and actions
- **Pattern**: Header info + tabbed sections + contextual actions
- **State**: Single item with related data loaded on demand
- **Actions**: Edit, delete, and item-specific operations

### Portal Pages
- **Purpose**: Limited customer access to relevant data
- **Pattern**: Simplified navigation with account-scoped data
- **State**: Filtered data showing only user's account information
- **Permissions**: Strict role-based access with account boundaries

## Best Practices

### Page Development Guidelines

1. **Always validate authentication and permissions first**
2. **Use consistent loading and error states**
3. **Implement proper cleanup in useEffect**
4. **Follow the standard page structure pattern**
5. **Add comprehensive page header comments**
6. **Use TanStack Query for data fetching when possible**
7. **Integrate with action bar for contextual actions**
8. **Handle responsive design for mobile users**
9. **Implement proper error boundaries**
10. **Use consistent styling and spacing**

### Performance Considerations

1. **Use React.memo for expensive components**
2. **Implement proper pagination for large datasets**
3. **Use useCallback for event handlers**
4. **Avoid unnecessary re-renders with proper dependencies**
5. **Load heavy components lazily with React.Suspense**
6. **Use TanStack Query for caching and background updates**
7. **Implement proper loading skeletons**

### Accessibility Guidelines

1. **Use semantic HTML elements**
2. **Implement proper ARIA labels**
3. **Ensure keyboard navigation works**
4. **Use sufficient color contrast**
5. **Provide screen reader friendly content**
6. **Test with keyboard-only navigation**
7. **Use focus management for dialogs and modals**

---

## Maintenance Notes

This documentation should be updated whenever:
- New pages are added to the application
- Routing patterns or navigation changes
- Authentication or permission flows are modified
- Page structure patterns are updated
- State management patterns change
- New component integration patterns are introduced

Each page should have its header comment updated whenever:
- Page functionality changes
- API dependencies are added or removed
- Component usage changes
- Navigation patterns are modified
- Permission requirements change

Last updated: [Current Date]