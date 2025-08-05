# ActionBarProvider System

> ⚠️ **IMPORTANT**: Update when modifying provider interfaces, action patterns, or global state management.

## Purpose

The ActionBarProvider system provides a centralized way to manage contextual actions that appear in the global action bar. It allows pages to dynamically add, remove, and update actions based on user permissions, page state, and current context, creating a consistent and discoverable action interface.

## Components

### Core Files
- **Provider**: `/src/components/providers/ActionBarProvider.tsx`
- **UI Component**: `/src/components/ui/ActionBar.tsx`
- **Hook**: Included in ActionBarProvider file

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Pages       │───▶│ ActionBarProvider │───▶│   ActionBar     │
│                 │    │                  │    │                 │
│ - Dashboard     │    │ - Global State   │    │ - Button Render │
│ - Tickets       │    │ - Action Mgmt    │    │ - Tooltips      │
│ - Time Tracking │    │ - Context API    │    │ - Icons         │
│ - Accounts      │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Usage

### Basic Setup (App Level)
```tsx
// In layout or app component
import { ActionBarProvider } from "@/components/providers/ActionBarProvider";
import { ActionBar } from "@/components/ui/ActionBar";

function AppLayout({ children }) {
  return (
    <ActionBarProvider>
      <div className="app-layout">
        <header>
          <nav>Navigation</nav>
          <ActionBar /> {/* Global action bar */}
        </header>
        <main>{children}</main>
      </div>
    </ActionBarProvider>
  );
}
```

### Page Integration
```tsx
// In any page component
import { useActionBar } from "@/components/providers/ActionBarProvider";

export default function TicketsPage() {
  const { addAction, clearActions } = useActionBar();
  const { canCreateTickets } = usePermissions();

  useEffect(() => {
    // Add page-specific actions
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

    addAction({
      id: "refresh-tickets",
      label: "Refresh",
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: handleRefresh,
      variant: "outline",
      tooltip: "Refresh ticket list"
    });

    // Cleanup when page unmounts
    return () => clearActions();
  }, [canCreateTickets, addAction, clearActions]);

  // Page content...
}
```

## Props & Interfaces

### ActionItem Interface
```typescript
interface ActionItem {
  id: string;                    // Unique identifier for the action
  label: string;                 // Button text (hidden on mobile)
  icon: ReactNode;              // Icon (always visible)
  onClick: () => void;          // Click handler
  variant?: ButtonVariant;      // Button style variant
  disabled?: boolean;           // Disabled state
  loading?: boolean;            // Loading state with spinner
  tooltip?: string;             // Tooltip text (optional)
}

type ButtonVariant = "default" | "secondary" | "destructive" | "outline" | "ghost";
```

### Context Value Interface
```typescript
interface ActionBarContextValue {
  actions: ActionItem[];                    // Current actions array
  setActions: (actions: ActionItem[]) => void; // Replace all actions
  addAction: (action: ActionItem) => void;     // Add or update single action
  removeAction: (id: string) => void;          // Remove specific action
  clearActions: () => void;                    // Remove all actions
}
```

## Key Features

### 1. **Dynamic Action Management**
```typescript
// Add actions conditionally
if (canCreateTickets) {
  addAction({
    id: "create-ticket",
    label: "New Ticket",
    icon: <Plus className="h-4 w-4" />,
    onClick: handleCreate
  });
}

// Update existing action
addAction({
  id: "create-ticket", // Same ID updates existing
  label: "New Ticket",
  icon: <Plus className="h-4 w-4" />,
  onClick: handleCreate,
  disabled: isCreating, // New state
  loading: isCreating   // Show spinner
});
```

### 2. **Permission-Based Actions**
```typescript
const { canCreate, canApprove, canExport } = usePermissions();

useEffect(() => {
  const actions = [];
  
  if (canCreate) {
    actions.push({
      id: "create",
      label: "Create",
      icon: <Plus className="h-4 w-4" />,
      onClick: handleCreate
    });
  }
  
  if (canApprove) {
    actions.push({
      id: "approve",
      label: "Approve",
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: handleApprove,
      variant: "secondary"
    });
  }
  
  if (canExport) {
    actions.push({
      id: "export",
      label: "Export",
      icon: <Download className="h-4 w-4" />,
      onClick: handleExport,
      variant: "outline"
    });
  }
  
  setActions(actions);
}, [canCreate, canApprove, canExport]);
```

### 3. **Loading States & Async Actions**
```typescript
const handleExport = async () => {
  // Update action to show loading
  addAction({
    id: "export",
    label: "Export",
    icon: <Download className="h-4 w-4" />,
    onClick: handleExport,
    loading: true,
    disabled: true
  });
  
  try {
    await exportData();
    success("Export completed");
  } catch (error) {
    error("Export failed");
  } finally {
    // Reset action state
    addAction({
      id: "export",
      label: "Export",
      icon: <Download className="h-4 w-4" />,
      onClick: handleExport,
      loading: false,
      disabled: false
    });
  }
};
```

### 4. **Context-Aware Actions**
```typescript
// Actions change based on selection state
const [selectedItems, setSelectedItems] = useState(new Set());

useEffect(() => {
  if (selectedItems.size === 0) {
    // No selection - show general actions
    setActions([
      {
        id: "create",
        label: "Create",
        icon: <Plus className="h-4 w-4" />,
        onClick: handleCreate
      }
    ]);
  } else if (selectedItems.size === 1) {
    // Single selection - show edit/delete
    setActions([
      {
        id: "edit",
        label: "Edit",
        icon: <Edit className="h-4 w-4" />,
        onClick: handleEdit
      },
      {
        id: "delete",
        label: "Delete",
        icon: <Trash2 className="h-4 w-4" />,
        onClick: handleDelete,
        variant: "destructive"
      }
    ]);
  } else {
    // Multiple selection - show bulk actions
    setActions([
      {
        id: "bulk-delete",
        label: `Delete ${selectedItems.size}`,
        icon: <Trash2 className="h-4 w-4" />,
        onClick: handleBulkDelete,
        variant: "destructive"
      }
    ]);
  }
}, [selectedItems]);
```

## Provider Implementation

### State Management
```typescript
export function ActionBarProvider({ children }: { children: ReactNode }) {
  const [actions, setActionsState] = useState<ActionItem[]>([]);

  // Stable function references to prevent unnecessary re-renders
  const setActions = useCallback((newActions: ActionItem[]) => {
    setActionsState(newActions);
  }, []);

  const addAction = useCallback((action: ActionItem) => {
    setActionsState(prev => {
      // Replace if action with same ID exists, otherwise add
      const existing = prev.findIndex(a => a.id === action.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = action;
        return updated;
      }
      return [...prev, action];
    });
  }, []);

  const removeAction = useCallback((id: string) => {
    setActionsState(prev => prev.filter(action => action.id !== id));
  }, []);

  const clearActions = useCallback(() => {
    setActionsState([]);
  }, []);

  const contextValue = useMemo(() => ({
    actions,
    setActions,
    addAction,
    removeAction,
    clearActions
  }), [actions, setActions, addAction, removeAction, clearActions]);

  return (
    <ActionBarContext.Provider value={contextValue}>
      {children}
    </ActionBarContext.Provider>
  );
}
```

### Hook Implementation
```typescript
export function useActionBar() {
  const context = useContext(ActionBarContext);
  if (context === undefined) {
    throw new Error('useActionBar must be used within an ActionBarProvider');
  }
  return context;
}
```

## ActionBar UI Component

### Rendering Logic
```typescript
export function ActionBar() {
  const { actions } = useActionBar();

  if (actions.length === 0) {
    return null; // Don't render empty action bar
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Tooltip key={action.id}>
            <TooltipTrigger asChild>
              <Button
                variant={action.variant || "default"}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className="flex items-center gap-2"
              >
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
                {action.loading && (
                  <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                )}
              </Button>
            </TooltipTrigger>
            {action.tooltip && (
              <TooltipContent>
                <p>{action.tooltip}</p>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
```

### Responsive Behavior
- **Desktop**: Shows icon + label
- **Mobile**: Shows icon only (label in tooltip)
- **Loading**: Spinner replaces icon temporarily
- **Disabled**: Grayed out with no interaction

## Integration Patterns

### Page Lifecycle Management
```typescript
export default function SomePage() {
  const { addAction, clearActions } = useActionBar();

  useEffect(() => {
    // Setup page actions
    addAction({
      id: "page-action",
      label: "Page Action",
      icon: <Icon className="h-4 w-4" />,
      onClick: handleAction
    });

    // Critical: Cleanup on unmount
    return () => clearActions();
  }, [addAction, clearActions]);

  // Component rest...
}
```

### Form Integration
```typescript
const [formData, setFormData] = useState(initialData);
const [hasChanges, setHasChanges] = useState(false);

useEffect(() => {
  const actions = [
    {
      id: "save",
      label: hasChanges ? "Save Changes" : "Saved",
      icon: <Save className="h-4 w-4" />,
      onClick: handleSave,
      disabled: !hasChanges,
      variant: hasChanges ? "default" : "secondary"
    },
    {
      id: "cancel",
      label: "Cancel",
      icon: <X className="h-4 w-4" />,
      onClick: handleCancel,
      variant: "outline"
    }
  ];

  setActions(actions);
}, [hasChanges]);
```

### Dialog Integration
```typescript
const [showDialog, setShowDialog] = useState(false);

const handleCreate = () => {
  setShowDialog(true);
};

const handleCreateSuccess = () => {
  setShowDialog(false);
  // Action remains available for next use
};

useEffect(() => {
  addAction({
    id: "create",
    label: "Create",
    icon: <Plus className="h-4 w-4" />,
    onClick: handleCreate
  });
}, []);

return (
  <>
    {/* Page content */}
    <CreateDialog
      open={showDialog}
      onOpenChange={setShowDialog}
      onSuccess={handleCreateSuccess}
    />
  </>
);
```

## Common Patterns

### Permission-Gated Actions
```typescript
const {
  canCreate,
  canEdit,
  canDelete,
  canApprove
} = usePermissions();

useEffect(() => {
  const actions = [];

  if (canCreate) {
    actions.push({
      id: "create",
      label: "Create",
      icon: <Plus className="h-4 w-4" />,
      onClick: handleCreate
    });
  }

  if (selectedItem && canEdit) {
    actions.push({
      id: "edit",
      label: "Edit",
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      variant: "outline"
    });
  }

  if (selectedItem && canDelete) {
    actions.push({
      id: "delete",
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: "destructive"
    });
  }

  if (pendingItems.length > 0 && canApprove) {
    actions.push({
      id: "approve",
      label: `Approve ${pendingItems.length}`,
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: handleBulkApprove,
      variant: "secondary"
    });
  }

  setActions(actions);
}, [canCreate, canEdit, canDelete, canApprove, selectedItem, pendingItems]);
```

### Multi-Step Process Actions
```typescript
const [currentStep, setCurrentStep] = useState(0);
const steps = ['Select', 'Configure', 'Review', 'Complete'];

useEffect(() => {
  const actions = [];

  if (currentStep > 0) {
    actions.push({
      id: "back",
      label: "Back",
      icon: <ChevronLeft className="h-4 w-4" />,
      onClick: () => setCurrentStep(step => step - 1),
      variant: "outline"
    });
  }

  if (currentStep < steps.length - 1) {
    actions.push({
      id: "next",
      label: "Next",
      icon: <ChevronRight className="h-4 w-4" />,
      onClick: () => setCurrentStep(step => step + 1),
      disabled: !isStepValid(currentStep)
    });
  } else {
    actions.push({
      id: "complete",
      label: "Complete",
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: handleComplete,
      disabled: !isFormValid()
    });
  }

  setActions(actions);
}, [currentStep, isStepValid, isFormValid]);
```

## Best Practices

### Action Management
1. **Always clear actions on component unmount**
2. **Use descriptive IDs for actions**
3. **Provide tooltips for icon-only mobile display**
4. **Handle loading states for async operations**
5. **Use appropriate button variants for action hierarchy**

### Performance
1. **Use useCallback for stable onClick handlers**
2. **Memoize permission checks when possible**
3. **Avoid excessive action updates in tight loops**
4. **Use stable action IDs to prevent unnecessary re-renders**

### Accessibility
1. **Provide meaningful tooltips**
2. **Use semantic button variants**
3. **Ensure proper focus management**
4. **Include ARIA labels for complex actions**

### UX Guidelines
1. **Limit to 3-5 primary actions maximum**
2. **Order actions by importance (primary first)**
3. **Use consistent icon conventions**
4. **Provide clear visual feedback for states**

## Error Handling

### Action Failures
```typescript
const handleAction = async () => {
  addAction({
    id: "action",
    label: "Processing...",
    icon: <Loader className="h-4 w-4" />,
    onClick: handleAction,
    loading: true,
    disabled: true
  });

  try {
    await performAction();
    success("Action completed successfully");
  } catch (error) {
    error("Action failed");
    console.error('Action error:', error);
  } finally {
    // Reset action state
    addAction({
      id: "action",
      label: "Retry",
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: handleAction,
      loading: false,
      disabled: false
    });
  }
};
```

### Provider Errors
```typescript
export function useActionBar() {
  const context = useContext(ActionBarContext);
  if (context === undefined) {
    throw new Error(
      'useActionBar must be used within an ActionBarProvider. ' +
      'Make sure to wrap your app with <ActionBarProvider>.'
    );
  }
  return context;
}
```

## Testing

### Unit Tests
```typescript
describe('ActionBarProvider', () => {
  it('provides action management functions', () => {
    const TestComponent = () => {
      const { addAction, actions } = useActionBar();
      
      useEffect(() => {
        addAction({
          id: 'test',
          label: 'Test',
          icon: <div>icon</div>,
          onClick: () => {}
        });
      }, []);
      
      return <div data-testid="actions">{actions.length}</div>;
    };

    render(
      <ActionBarProvider>
        <TestComponent />
      </ActionBarProvider>
    );

    expect(getByTestId('actions')).toHaveTextContent('1');
  });

  it('updates existing actions by ID', () => {
    // Test action updating logic
  });

  it('clears actions properly', () => {
    // Test cleanup functionality
  });
});
```

### Integration Tests
```typescript
describe('ActionBar Integration', () => {
  it('renders actions from provider', () => {
    // Test UI component integration
  });

  it('handles action clicks', () => {
    // Test click handling
  });

  it('shows loading states', () => {
    // Test loading UI
  });
});
```

## Related Components

### Core Integration
- **[ActionBar](../ui/action-bar.md)** - UI component that renders actions
- **Button** - Shadcn/UI button component used for actions
- **Tooltip** - Provides action descriptions

### Provider Ecosystem
- **[TimeTrackingProvider](./time-tracking-provider.md)** - May add timer-related actions
- **[ToastProvider](./toast-provider.md)** - Shows action feedback
- **[QueryProvider](./query-provider.md)** - Actions often trigger data operations

### Usage in Pages
- **Dashboard** - Quick action access
- **Tickets** - Create, edit, assign actions
- **Time Tracking** - Timer controls, approval actions
- **Accounts** - Account management actions
- **Settings** - Save, reset, import/export actions

---

## Maintenance Notes

Update this documentation when:
- ActionItem interface changes
- New action patterns are established
- Provider functionality is extended
- Integration patterns are added
- Performance optimizations are implemented

The ActionBarProvider should remain generic and reusable. Page-specific logic should be implemented in the pages themselves, not in the provider.

Last updated: [Current Date]