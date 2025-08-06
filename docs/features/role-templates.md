# Role Template Management System

## Overview

The Role Template Management System provides comprehensive ABAC (Attribute-Based Access Control) role management with a visual permission matrix interface. This system enables super-administrators to create, manage, and assign role templates with granular permissions across all system resources.

## Purpose and Scope

This system serves as the foundation for the application's permission architecture, allowing fine-grained control over user access and capabilities. It supports both account-specific and system-wide role assignments with inheritance patterns.

## Core Architecture

### Database Schema

```sql
-- Role template definitions
RoleTemplate {
  id                    String   @id @default(cuid())
  name                  String   @unique
  description           String?
  permissions           String[] // ["resource:action", "resource:action"]
  inheritAllPermissions Boolean  @default(false) // Super-admin flag
  isSystemRole          Boolean  @default(false) // Global vs account-specific
  scope                 String   @default("account") // "account" | "system" | "global"
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

-- Account-specific role assignments
MembershipRole {
  userId    String
  accountId String
  roleId    String
}

-- System-wide role assignments
SystemRole {
  userId String
  roleId String
}
```

### Permission Model

Permissions follow the format `resource:action` where:

- **Resource**: The entity type (accounts, users, time-entries, tickets, etc.)
- **Action**: The operation (view, create, edit, delete, approve, etc.)

**Example Permissions:**

- `tickets:view` - Can view tickets
- `time-entries:approve` - Can approve time entries
- `users:*` - All user operations (wildcard)
- `*:*` - All permissions (super-admin)

## Key Features

### 1. Role Template Management Interface

**Location**: `/roles`
**Access**: Super-admin only (`role-templates:view` permission)

**Capabilities:**

- **View All Templates**: Grid layout with usage statistics
- **Create Templates**: Permission matrix interface for easy assignment
- **Edit Templates**: Modify existing role configurations
- **Delete Templates**: Remove unused templates (prevents deletion if assigned)
- **Duplicate Templates**: Copy existing templates for customization
- **Search & Filter**: Find templates by name and description

### 2. Permission Matrix System

Visual interface for permission assignment grouped by resource:

**Resource Categories:**

- **Accounts**: View, create, edit, delete account records
- **Users**: Manage user accounts and invitations
- **Time Entries**: Track, edit, and approve time entries
- **Tickets**: Support ticket management and assignment
- **Invoices**: Invoice generation and management
- **Billing**: Billing rates and payment processing
- **Reports**: Report generation and export
- **Settings**: System configuration access
- **Role Templates**: Role template management (super-admin only)

### 3. Super-Admin Controls

**Inherit All Permissions Toggle:**

- When enabled, user bypasses all permission checks
- Automatic access to all current and future system features
- Warning alerts prevent accidental super-admin creation
- Cannot be combined with specific permission selection

**System Role Designation:**

- **System Roles**: Can be assigned globally across accounts
- **Account Roles**: Scoped to specific account contexts
- **Scope Settings**: Account, system, or global scope designation

### 4. Usage Tracking and Safety

- **Assignment Tracking**: Shows how many users have each role
- **Deletion Prevention**: Cannot delete roles currently assigned to users
- **Business Rule Validation**: Prevents unsafe role configurations
- **Permission Format Validation**: Ensures proper `resource:action` format

## API Endpoints

### Role Template CRUD

```typescript
// List all role templates with usage stats
GET /api/role-templates?includeUsage=true

// Create new role template
POST /api/role-templates
{
  name: string,
  description?: string,
  permissions: string[],
  inheritAllPermissions: boolean,
  isSystemRole: boolean,
  scope: string
}

// Get specific role template
GET /api/role-templates/[id]

// Update role template
PUT /api/role-templates/[id]
{
  name: string,
  description?: string,
  permissions: string[],
  inheritAllPermissions: boolean,
  isSystemRole: boolean,
  scope: string
}

// Delete role template
DELETE /api/role-templates/[id]
```

### Permission Validation

- **Name Validation**: 1-100 characters, unique across system
- **Description**: Optional, max 500 characters
- **Permission Format**: Must match `/^[a-z-]+:[a-z-]+$/` pattern
- **Business Rules**: Validates role type compatibility and assignments

## Integration Points

### 1. Permission Service Integration

```typescript
// Role templates integrate with core permission service
const hasPermission = await permissionService.hasPermission({
  userId: "user-id",
  resource: "resource-name",
  action: "action-name",
  accountId: "account-id", // Optional scope
});
```

### 2. User Management Integration

- **Role Assignment**: Users can be assigned multiple role templates
- **Scope Control**: Account-specific vs system-wide role assignments
- **Inheritance**: Super-admin roles automatically grant all permissions

### 3. Navigation Integration

- **Menu Item**: "Role Templates" with Crown icon
- **Permission Gating**: Only visible to users with `role-templates:view`
- **Visual Indicators**: Crown icons identify super-admin roles

## Default Role Templates

### System Roles (Global Scope)

1. **Super Administrator**

   - `inheritAllPermissions: true`
   - Full system access, bypasses all permission checks
   - Cannot be deleted or modified

2. **Employee**

   - Basic time tracking and ticket management
   - Permissions: `tickets:view`, `tickets:create`, `time-entries:*`, `accounts:view`

3. **Manager**
   - Team lead with approval permissions
   - Permissions: `tickets:*`, `time-entries:*`, `time-entries:approve`, `users:view`

### Account Roles (Account Scope)

1. **Account Administrator**

   - Full access within assigned accounts
   - Permissions: `tickets:*`, `time-entries:view`, `users:invite`

2. **Account User**

   - Standard user within account context
   - Permissions: `tickets:view`, `time-entries:view`

3. **Read Only**
   - View-only access to account data
   - Permissions: `tickets:view`, `accounts:view`

## Security Considerations

### Access Control

- **Super-Admin Only**: Role template management requires highest privilege level
- **Permission Validation**: All role operations validate against user permissions
- **Business Rule Enforcement**: Prevents creation of invalid role configurations

### Data Protection

- **Input Sanitization**: All role template data is validated and sanitized
- **SQL Injection Prevention**: Prisma ORM provides automatic protection
- **XSS Prevention**: All user input is properly escaped in UI

### Audit and Monitoring

- **Usage Tracking**: Monitor role assignment and usage patterns
- **Change Logging**: All role template modifications are logged
- **Permission Caching**: 5-minute TTL prevents performance issues

## Best Practices

### Role Design

1. **Principle of Least Privilege**: Grant minimal permissions required
2. **Role Separation**: Create distinct roles for different user types
3. **Regular Review**: Periodically audit role assignments and permissions
4. **Clear Naming**: Use descriptive names that indicate role purpose

### Permission Assignment

1. **Resource Grouping**: Group related permissions logically
2. **Wildcard Usage**: Use wildcards (`*`) sparingly for broad access
3. **Account Scoping**: Prefer account-specific roles over system-wide when possible
4. **Testing**: Verify role permissions in test environment before production

### System Administration

1. **Super-Admin Limitation**: Minimize number of super-admin users
2. **Regular Cleanup**: Remove unused role templates
3. **Documentation**: Document custom role templates and their purposes
4. **Backup**: Include role templates in system backup procedures

## Troubleshooting

### Common Issues

1. **Role Not Visible**: Check `canViewRoleTemplates` permission
2. **Cannot Delete Role**: Verify role is not assigned to any users
3. **Permission Not Working**: Validate permission format and caching
4. **Access Denied**: Confirm user has super-admin privileges

### Performance Considerations

- **Permission Caching**: PermissionService caches permissions for 5 minutes
- **Database Indexing**: Role templates are indexed on critical fields
- **Query Optimization**: Usage statistics use efficient count queries
- **UI Optimization**: Role matrix uses optimized rendering for large permission sets

## Future Enhancements

### Planned Features

1. **Role Template Versioning**: Track role template changes over time
2. **Permission Templates**: Pre-defined permission sets for common roles
3. **Bulk User Assignment**: Assign roles to multiple users simultaneously
4. **Advanced Filtering**: Filter roles by permissions, usage, scope
5. **Role Analytics**: Detailed usage analytics and reporting

### Integration Opportunities

1. **External Identity Providers**: SAML/OAuth role mapping
2. **Automated Role Assignment**: Rules-based role assignment
3. **Compliance Reporting**: SOX/GDPR compliance role reporting
4. **API Documentation**: Interactive API documentation for role management

This role template management system provides a robust foundation for the application's security model while maintaining flexibility for future enhancements and integrations.
