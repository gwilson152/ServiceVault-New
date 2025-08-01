# ActionBar System Documentation

## Overview

The ActionBar system provides a global, context-aware action bar that appears in the application header. Pages can dynamically add, remove, and manage actions that appear in the top bar, providing a consistent user experience for page-specific operations.

## Architecture

### Components

- **`ActionBarProvider`** - React Context provider for managing global action state
- **`ActionBar`** - UI component that renders actions in the application header
- **`useActionBar`** - Hook for accessing and managing actions

### Files

- `src/components/providers/ActionBarProvider.tsx` - Context provider and hook
- `src/components/ui/ActionBar.tsx` - Action bar UI component
- `docs/components/action-bar.md` - This documentation

## Usage

### 1. Provider Setup

Wrap your application with the `ActionBarProvider`:

```tsx
import { ActionBarProvider } from "@/components/providers/ActionBarProvider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ActionBarProvider>
      {children}
    </ActionBarProvider>
  );
}
```

### 2. Header Integration

Add the `ActionBar` component to your application header:

```tsx
import { ActionBar } from "@/components/ui/ActionBar";

function AppHeader() {
  return (
    <header className="flex items-center justify-between p-4">
      <div>App Title</div>
      <div className="flex items-center gap-4">
        <ActionBar />
        <UserMenu />
      </div>
    </header>
  );
}
```

### 3. Managing Actions in Pages

Use the `useActionBar` hook to manage actions within your pages:

```tsx
import { useActionBar } from "@/components/providers/ActionBarProvider";
import { Users, Download, Settings } from "lucide-react";

function MyPage() {
  const { addAction, removeAction, clearActions } = useActionBar();

  useEffect(() => {
    // Add actions when page loads
    addAction({
      id: "approval-wizard",
      label: "Approval Wizard",
      icon: <Users className="h-4 w-4" />,
      onClick: () => setWizardOpen(true),
      tooltip: "Review and approve pending items"
    });

    addAction({
      id: "export-data",
      label: "Export",
      icon: <Download className="h-4 w-4" />,
      onClick: handleExport,
      variant: "outline"
    });

    // Cleanup actions when page unmounts
    return () => {
      clearActions();
    };
  }, [addAction, clearActions]);

  // Actions are automatically displayed in the header
  return <div>Page content...</div>;
}
```

## API Reference

### ActionItem Interface

```typescript
interface ActionItem {
  id: string;              // Unique identifier for the action
  label: string;           // Display text for the action
  icon: ReactNode;         // Icon component (typically from lucide-react)
  onClick: () => void;     // Click handler function
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
  disabled?: boolean;      // Whether the action is disabled
  loading?: boolean;       // Show loading spinner
  tooltip?: string;        // Optional tooltip text
}
```

### useActionBar Hook

```typescript
interface ActionBarContextValue {
  actions: ActionItem[];                    // Current list of actions
  setActions: (actions: ActionItem[]) => void;  // Replace all actions
  addAction: (action: ActionItem) => void;      // Add or update single action
  removeAction: (id: string) => void;           // Remove action by ID
  clearActions: () => void;                     // Remove all actions
}
```

## Examples

### Basic Action

```tsx
addAction({
  id: "save",
  label: "Save",
  icon: <Save className="h-4 w-4" />,
  onClick: handleSave
});
```

### Loading State

```tsx
addAction({
  id: "submit",
  label: "Submit",
  icon: <Send className="h-4 w-4" />,
  onClick: handleSubmit,
  loading: isSubmitting,
  disabled: !isValid
});
```

### Permission-Based Action

```tsx
useEffect(() => {
  const checkPermission = async () => {
    const canApprove = await hasPermission('APPROVE_ENTRIES');
    if (canApprove) {
      addAction({
        id: "approve",
        label: "Approve All",
        icon: <CheckCircle className="h-4 w-4" />,
        onClick: handleApproveAll,
        variant: "secondary"
      });
    }
  };
  
  checkPermission();
}, [addAction]);
```

### Conditional Actions

```tsx
// Add different actions based on page state
useEffect(() => {
  if (editMode) {
    addAction({
      id: "save",
      label: "Save Changes",
      icon: <Save className="h-4 w-4" />,
      onClick: handleSave,
      disabled: !hasChanges
    });
    
    addAction({
      id: "cancel",
      label: "Cancel",
      icon: <X className="h-4 w-4" />,
      onClick: handleCancel,
      variant: "outline"
    });
  } else {
    addAction({
      id: "edit",
      label: "Edit",
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit
    });
  }
}, [editMode, hasChanges, addAction]);
```

## Best Practices

### 1. Action Lifecycle Management

Always clean up actions when components unmount:

```tsx
useEffect(() => {
  // Add actions
  addAction({ ... });
  
  // Cleanup on unmount
  return () => {
    clearActions();
  };
}, []);
```

### 2. Permission-Based Actions

Check permissions before adding actions:

```tsx
useEffect(() => {
  const setupActions = async () => {
    const permissions = await getUserPermissions();
    
    if (permissions.includes('DELETE')) {
      addAction({
        id: "delete",
        label: "Delete",
        icon: <Trash2 className="h-4 w-4" />,
        onClick: handleDelete,
        variant: "destructive"
      });
    }
  };
  
  setupActions();
}, []);
```

### 3. Loading States

Use loading states for async operations:

```tsx
const handleAction = async () => {
  // Update action to show loading
  addAction({
    id: "process",
    label: "Processing...",
    icon: <Loader className="h-4 w-4" />,
    onClick: () => {},
    loading: true,
    disabled: true
  });
  
  try {
    await performAction();
  } finally {
    // Reset action state
    addAction({
      id: "process",
      label: "Process",
      icon: <Play className="h-4 w-4" />,
      onClick: handleAction
    });
  }
};
```

### 4. Responsive Design

Actions automatically hide labels on small screens and show tooltips. Use descriptive labels and tooltips:

```tsx
addAction({
  id: "export",
  label: "Export Data",
  icon: <Download className="h-4 w-4" />,
  onClick: handleExport,
  tooltip: "Export current data to CSV file"
});
```

## Integration Examples

### Time Tracking Page

```tsx
function TimeTrackingPage() {
  const { addAction, clearActions } = useActionBar();
  const { canApproveTimeEntries } = usePermissions();
  
  useEffect(() => {
    const setupActions = async () => {
      const canApprove = await canApproveTimeEntries();
      
      if (canApprove) {
        addAction({
          id: "approval-wizard",
          label: "Approval Wizard",
          icon: <Users className="h-4 w-4" />,
          onClick: () => setApprovalWizardOpen(true),
          tooltip: "Review and approve pending time entries"
        });
      }
    };
    
    setupActions();
    return () => clearActions();
  }, [addAction, clearActions, canApproveTimeEntries]);
  
  return <div>Time tracking content...</div>;
}
```

### Settings Page

```tsx
function SettingsPage() {
  const { addAction, clearActions } = useActionBar();
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    if (hasChanges) {
      addAction({
        id: "save-settings",
        label: "Save Changes",
        icon: <Save className="h-4 w-4" />,
        onClick: handleSave,
        tooltip: "Save configuration changes"
      });
      
      addAction({
        id: "reset-settings",
        label: "Reset",
        icon: <RotateCcw className="h-4 w-4" />,
        onClick: handleReset,
        variant: "outline",
        tooltip: "Reset to original values"
      });
    }
    
    return () => clearActions();
  }, [hasChanges, addAction, clearActions]);
  
  return <div>Settings content...</div>;
}
```

## Benefits

- **Consistent UX**: Actions appear in the same location across all pages
- **Context-Aware**: Each page can provide its own relevant actions
- **Permission-Aware**: Actions can be conditionally shown based on user permissions
- **Responsive**: Actions adapt to different screen sizes
- **Accessible**: Built-in tooltip support and keyboard navigation
- **Flexible**: Support for different button variants and states