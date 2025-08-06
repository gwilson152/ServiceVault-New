# User Management Dialogs

This document describes the user management dialogs available in the Service Vault application, including role management, status management, and account assignment interfaces.

## Overview

The user management dialogs provide comprehensive interfaces for managing user permissions, security controls, and account assignments within the ABAC permission system.

## Dialog Components

```
/components/users/
  ├── UserRoleManagementDialog.tsx          # Role assignment and management
  ├── UserStatusManagementDialog.tsx        # Security and account status
  ├── AssignAccountDialog.tsx               # Account assignment and role selection
  └── AddExistingUserDialog.tsx            # Add existing users to accounts
```

## UserRoleManagementDialog

The `UserRoleManagementDialog` provides a comprehensive interface for managing user roles within the ABAC permission system.

### Features

- **System Role Management**: Assign/remove system-wide roles
- **Account Role Management**: Manage roles within specific accounts
- **Role Template Integration**: Works with RoleTemplate system
- **Permission Preview**: Shows effective permissions after role changes
- **Bulk Operations**: Assign/remove multiple roles efficiently
- **Real-time Validation**: Prevents invalid role combinations

### Usage

```typescript
import { UserRoleManagementDialog } from "@/components/users/UserRoleManagementDialog";

<UserRoleManagementDialog
  userId={selectedUserId}
  open={roleDialogOpen}
  onOpenChange={setRoleDialogOpen}
  onRolesUpdated={handleRolesUpdated}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | Required | User ID to manage roles for |
| `open` | `boolean` | Required | Dialog open state |
| `onOpenChange` | `(open: boolean) => void` | Required | Callback when dialog state changes |
| `onRolesUpdated` | `() => void` | Optional | Callback when roles are successfully updated |

### Role Management Features

**System Roles:**
- Super Administrator: Full system access
- Employee: General system access  
- Manager: Enhanced permissions

**Account Roles:**
- Account Administrator: Full account management
- Account User: Standard account access
- Read Only: View-only permissions

## UserStatusManagementDialog

The `UserStatusManagementDialog` provides security-focused user management capabilities.

### Features

- **Account Status Management**: Enable/disable user access to specific accounts
- **Security Controls**: Force password reset, manage session tokens
- **Activity Tracking**: View user login history and security events
- **Bulk Status Changes**: Update multiple account memberships
- **Security Audit Trail**: Track all security-related changes

### Usage

```typescript
import { UserStatusManagementDialog } from "@/components/users/UserStatusManagementDialog";

<UserStatusManagementDialog
  userId={selectedUserId}
  userEmail={userEmail}
  open={statusDialogOpen}
  onOpenChange={setStatusDialogOpen}
  onStatusUpdated={handleStatusUpdated}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | Required | User ID to manage status for |
| `userEmail` | `string` | Required | User email for security operations |
| `open` | `boolean` | Required | Dialog open state |
| `onOpenChange` | `(open: boolean) => void` | Required | Callback when dialog state changes |
| `onStatusUpdated` | `() => void` | Optional | Callback when status is updated |

### Security Operations

- **Force Password Reset**: Require user to reset password on next login
- **Revoke Sessions**: Sign out user from all devices
- **Account Access Control**: Enable/disable access to specific accounts
- **Email Verification**: Re-send verification emails

## AssignAccountDialog

The `AssignAccountDialog` provides an interface for assigning users to accounts with appropriate roles.

### Features

- **Account Selection**: Choose from hierarchical account structure
- **Role Assignment**: Select appropriate role for the account
- **Domain-Based Suggestions**: Auto-suggest accounts based on user email domain
- **Permission Preview**: Show what permissions the user will receive
- **Bulk Assignment**: Assign to multiple accounts with different roles

### Usage

```typescript
import { AssignAccountDialog } from "@/components/users/AssignAccountDialog";

<AssignAccountDialog
  userId={selectedUserId}
  open={assignDialogOpen}
  onOpenChange={setAssignDialogOpen}
  onAssignmentComplete={handleAssignmentComplete}
  excludeAccountIds={existingAccountIds}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | Required | User ID to assign accounts to |
| `open` | `boolean` | Required | Dialog open state |
| `onOpenChange` | `(open: boolean) => void` | Required | Callback when dialog state changes |
| `onAssignmentComplete` | `() => void` | Optional | Callback when assignment completes |
| `excludeAccountIds` | `string[]` | `[]` | Account IDs to exclude from selection |

### Assignment Features

- **Hierarchical Account View**: Navigate parent-child account relationships
- **Role Template Selection**: Choose from available role templates
- **Domain Matching**: Highlight accounts that match user's email domain
- **Validation**: Prevent duplicate assignments and invalid combinations

## AddExistingUserDialog

The `AddExistingUserDialog` allows adding existing system users to specific accounts.

### Features

- **User Search**: Search existing users by name or email
- **Role Selection**: Choose role for the new account membership
- **Duplicate Prevention**: Prevents adding users already in the account
- **Batch Addition**: Add multiple users at once
- **Permission Validation**: Ensure user can be assigned to the account

### Usage

```typescript
import { AddExistingUserDialog } from "@/components/users/AddExistingUserDialog";

<AddExistingUserDialog
  accountId={accountId}
  open={addUserDialogOpen}
  onOpenChange={setAddUserDialogOpen}
  onUserAdded={handleUserAdded}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `accountId` | `string` | Required | Account ID to add users to |
| `open` | `boolean` | Required | Dialog open state |
| `onOpenChange` | `(open: boolean) => void` | Required | Callback when dialog state changes |
| `onUserAdded` | `() => void` | Optional | Callback when user is successfully added |

## Common Dialog Patterns

### Error Handling

All dialogs implement consistent error handling:

```typescript
const [error, setError] = useState<string | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);

try {
  setIsSubmitting(true);
  setError(null);
  
  // Perform operation
  await updateUserRoles(userId, roles);
  
  // Success feedback
  toast.success("Roles updated successfully");
  onClose();
} catch (err) {
  setError(err.message || "Failed to update roles");
} finally {
  setIsSubmitting(false);
}
```

### Loading States

Loading states provide user feedback during operations:

```typescript
{isSubmitting ? (
  <Button disabled>
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    Updating...
  </Button>
) : (
  <Button onClick={handleSave}>
    Save Changes
  </Button>
)}
```

### Validation

Form validation prevents invalid submissions:

```typescript
const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

const validateForm = () => {
  const errors: Record<string, string> = {};
  
  if (!selectedRole) {
    errors.role = "Role selection is required";
  }
  
  if (!selectedAccount) {
    errors.account = "Account selection is required";
  }
  
  setValidationErrors(errors);
  return Object.keys(errors).length === 0;
};
```

## Best Practices

### Dialog State Management

- Use controlled component pattern with `open` and `onOpenChange`
- Reset form state when dialog closes
- Handle escape key and backdrop clicks appropriately

### Permission Checks

- Verify user permissions before showing dialog actions
- Display appropriate messages for insufficient permissions
- Disable actions that user cannot perform

### Data Refresh

- Refresh parent component data after successful operations
- Use optimistic updates for better user experience
- Handle concurrent modification scenarios

### Accessibility

- Proper focus management when dialogs open/close
- Screen reader friendly labels and descriptions
- Keyboard navigation support
- High contrast mode compatibility

### Performance

- Lazy load dialog content when possible
- Debounce search inputs to reduce API calls
- Cache frequently accessed data
- Use React.memo for expensive components

## Integration with Permission System

All dialogs integrate seamlessly with the ABAC permission system:

```typescript
const { 
  canManageUsers, 
  canAssignRoles, 
  canViewAccounts 
} = usePermissions();

// Only show relevant actions based on permissions
{canAssignRoles && (
  <Button onClick={openRoleDialog}>
    Manage Roles
  </Button>
)}

{canManageUsers && (
  <Button onClick={openStatusDialog}>
    Manage Status  
  </Button>
)}
```

This ensures users only see and can perform actions they have permission for, maintaining security throughout the user management workflow.