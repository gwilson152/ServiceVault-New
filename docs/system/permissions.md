# ABAC Permissions System

The Service Vault application uses an Attribute-Based Access Control (ABAC) system that provides flexible, granular permissions management without hard-coded roles.

## System Overview

### Core Principles

1. **Role Template Based** - All permissions managed through reusable role templates
2. **No Manual Permission Assignment** - Users receive permissions only through assigned roles
3. **Attribute-Based** - Permissions based on user attributes, resources, actions, and context
4. **Hierarchical Inheritance** - Account parent-child relationships affect permission scope
5. **Super-Admin Support** - `inheritAllPermissions` flag provides universal access
6. **Performance Optimized** - 5-minute caching with TanStack Query integration

### Architecture Simplified (2025-08-06)

The permission system has been simplified to eliminate manual permission assignment:
- **Role Templates**: Defined at `/dashboard/roles` (super-admin only)
- **Role Assignments**: Managed through account pages and user management
- **No Direct Permissions**: All access controlled through role templates

## Database Architecture

### Key Entities

```typescript
// Role definitions with permissions
RoleTemplate {
  id: string
  name: string
  description: string
  inheritAllPermissions: boolean  // Super-admin flag
  isSystemRole: boolean
  scope: string
  permissions: Permission[]
}

// System-wide role assignments
SystemRole {
  userId: string
  roleId: string
  role: RoleTemplate
}

// Account-specific role assignments
MembershipRole {
  membershipId: string
  roleId: string
  role: RoleTemplate
}

// Individual permissions
Permission {
  id: string
  resource: string  // "accounts", "users", "tickets", etc.
  action: string    // "view", "create", "edit", "delete"
  scope: string     // "SYSTEM", "ACCOUNT", "SELF"
  conditions: Json  // Additional conditions
}
```

## Permission Service

### Core Service: `PermissionService.ts`

```typescript
class PermissionService {
  // Check if user has permission for specific action
  async hasPermission({
    userId,
    resource,
    action,
    accountId?, // Optional account context
    resourceId? // Optional resource-specific context
  }): Promise<boolean>

  // Get user's permissions for a resource
  async getUserPermissions(userId: string, resource: string): Promise<UserPermissions>

  // Check super-admin status
  async isSuperAdmin(userId: string): Promise<boolean>
}
```

### Permission Caching

- **5-minute cache** per user to prevent N+1 database queries
- **TanStack Query integration** for client-side caching
- **Automatic invalidation** when user roles change

## React Integration

### `usePermissions` Hook

```typescript
const {
  canViewInvoices,
  canViewBilling, 
  canViewSettings,
  canViewUsers,
  canViewAccounts,
  canViewTickets,
  canViewTimeEntries,
  // ... computed permissions
  isLoading,
  error
} = usePermissions();
```

**Features:**
- Computed permission values for common UI needs
- Reactive updates when permissions change
- Loading and error states
- TypeScript safety

### Component Usage

```typescript
// ✅ Correct - Use computed permissions
const { canViewUsers } = usePermissions();
if (canViewUsers) {
  return <UserManagementComponent />;
}

// ❌ Incorrect - Never use hard-coded role checks
if (user.role === 'ADMIN') { // Don't do this!
  return <AdminComponent />;
}
```

## API Integration

### `withPermissions` Middleware

Server-side filtering for API endpoints:

```typescript
// Apply permission filtering to query results
const filteredResults = await applyPermissionFilter(
  userId,
  'accounts', // resource
  query,     // Prisma query
  'id'       // filter field
);
```

**Usage in API Routes:**

```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Check permission
  const canView = await permissionService.hasPermission({
    userId: session.user.id,
    resource: 'accounts',
    action: 'view'
  });
  
  if (!canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Apply filtering
  const filteredQuery = await applyPermissionFilter(
    session.user.id,
    'accounts',
    baseQuery,
    'id'
  );
  
  const results = await prisma.account.findMany(filteredQuery);
  return NextResponse.json(results);
}
```

## Permission Scopes

### System-Level Permissions
- Apply globally across the application
- Assigned via `SystemRole` table
- Used for admin functions and system management

### Account-Level Permissions  
- Apply within specific account contexts
- Assigned via `MembershipRole` through `AccountMembership`
- Inherit from parent accounts in hierarchy

### Resource-Level Permissions
- Apply to specific resources (tickets, time entries, etc.)
- Can be further restricted by ownership or assignment

## Super-Admin Pattern

### Detection
```typescript
// Check super-admin status
const isSuperAdmin = user.systemRoles?.some(
  sr => sr.role.inheritAllPermissions
);

// Or use the permission service
const isSuperAdmin = await permissionService.isSuperAdmin(userId);
```

### Behavior
- `inheritAllPermissions: true` grants access to all resources and actions
- Bypasses normal permission checks
- Used for system administrators and setup processes

## Management Interfaces

### Role Template Management (`/dashboard/roles`)
- **Access**: Super-admin only (`canViewRoleTemplates`)
- **Features**: Create, edit, delete role templates
- **Permissions Matrix**: Visual interface for permission assignment
- **Usage Tracking**: Shows which users/accounts use each template
- **Templates**: Pre-built templates for common roles (Admin, Employee, Account Manager, etc.)

### Account-Level Role Assignment
- **Access**: Via account pages (`/accounts/[id]` → Users tab → Role management)
- **Scope**: Account-specific role assignments
- **Features**: Assign/remove roles from account users
- **Permissions**: Requires `users:edit` permission for the account

### System-Level Role Assignment
- **Access**: Via user management interfaces
- **Scope**: System-wide role assignments
- **Features**: Assign roles that apply globally
- **Permissions**: Requires system-level user management permissions

## Common Patterns

### Navigation Menus

```typescript
const {
  canViewUsers,
  canViewAccounts,
  canViewSettings
} = usePermissions();

const navigationItems = [
  {
    href: "/users",
    label: "Users", 
    show: canViewUsers
  },
  {
    href: "/accounts",
    label: "Accounts",
    show: canViewAccounts  
  },
  // ...
].filter(item => item.show);
```

### Conditional Rendering

```typescript
const { canCreateTickets } = usePermissions();

return (
  <div>
    {canCreateTickets && (
      <Button onClick={handleCreateTicket}>
        Create Ticket
      </Button>
    )}
  </div>
);
```

### API Route Protection

```typescript
// Check permission before processing
const canEdit = await permissionService.hasPermission({
  userId: session.user.id,
  resource: 'tickets',
  action: 'edit',
  accountId: ticket.accountId // Account context
});

if (!canEdit) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Performance Considerations

### Caching Strategy
- **Server-side**: 5-minute Redis/memory cache per user
- **Client-side**: TanStack Query with same TTL
- **Invalidation**: Automatic on role changes

### Database Optimization
- **Indexed queries** on user ID and role relationships
- **Minimal joins** - fetch only required permission data
- **Batch loading** for permission checks across multiple resources

### N+1 Prevention
```typescript
// ❌ Don't do this - causes N+1 queries
for (const item of items) {
  const canEdit = await hasPermission(userId, 'edit', item.id);
}

// ✅ Do this - batch permission check
const permissions = await getUserPermissions(userId, 'items');
const editableItems = items.filter(item => 
  permissions.canEdit || permissions.isSuperAdmin
);
```

## Migration from RBAC

### Before (RBAC)
```typescript
// Hard-coded role checks
if (user.role === 'ADMIN') {
  return <AdminPanel />;
}
```

### After (ABAC)
```typescript
// Dynamic permission checks
const { canViewAdminPanel } = usePermissions();
if (canViewAdminPanel) {
  return <AdminPanel />;
}
```

## Troubleshooting

### Common Issues

**Permission denied errors:**
- Check role assignments in `SystemRole` and `MembershipRole`
- Verify `RoleTemplate` has required permissions
- Ensure account context is provided when needed

**Performance issues:**
- Check for N+1 permission queries
- Verify caching is working correctly
- Use batch permission checks for lists

**Super-admin not working:**
- Verify `inheritAllPermissions: true` in RoleTemplate
- Check SystemRole assignment
- Ensure super-admin logic is properly implemented

### Debug Tools

```typescript
// Debug user permissions
const permissions = await permissionService.getUserPermissions(userId, 'all');
console.log('User permissions:', permissions);

// Debug specific permission check
const result = await permissionService.hasPermission({
  userId,
  resource: 'accounts',
  action: 'view'
});
console.log('Can view accounts:', result);
```

## Best Practices

1. **Always use PermissionService** - Never hard-code role checks
2. **Cache permissions** - Use provided caching mechanisms
3. **Check context** - Include account/resource context when relevant
4. **Server-side filtering** - Apply permissions at database level
5. **Fail closed** - Default to denying access when uncertain
6. **Audit permissions** - Log permission changes and access attempts
7. **Test edge cases** - Verify permission inheritance and super-admin behavior

## Future Enhancements

- **Conditional permissions** - Time-based or context-specific rules
- **Permission audit logs** - Track permission grants/denials
- **Role templates UI** - Admin interface for managing role templates
- **Bulk permission operations** - Efficient multi-user permission updates