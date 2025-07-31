# Role-Based Permissions System

The role-based permissions system provides comprehensive access control for the Service Vault application, enabling fine-grained permission management at both system and account levels.

## Overview

The permissions system is built on a hierarchical role model with additional granular permissions for account users. It supports three main user roles (Admin, Employee, Account User) with system-wide permissions and account-specific permissions for detailed access control.

## Architecture

### Role Hierarchy

1. **ADMIN** - Full system access, all permissions
2. **EMPLOYEE** - Most permissions except admin-only functions
3. **ACCOUNT_USER** - Limited permissions based on specific grants

### Permission Model

The system uses a resource-action-scope model:
- **Resource**: What is being accessed (tickets, accounts, billing, etc.)
- **Action**: What operation is being performed (view, create, update, delete)
- **Scope**: The extent of access (own, account, subsidiary)

## Database Schema

### System Permissions

```prisma
model Permission {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  resource    String
  action      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Account-Specific Permissions

```prisma
model AccountPermission {
  id              String   @id @default(cuid())
  accountUserId   String
  permissionName  String
  resource        String
  action          String
  scope           String   @default("own") // own, account, subsidiary
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([accountUserId, permissionName])
}
```

## Permission Types

### System Permissions

#### Ticket Permissions
- `view_tickets` - View tickets
- `create_tickets` - Create new tickets
- `update_tickets` - Update existing tickets
- `delete_tickets` - Delete tickets

#### Time Entry Permissions
- `view_time_entries` - View time entries
- `create_time_entries` - Create time entries
- `update_time_entries` - Update time entries
- `delete_time_entries` - Delete time entries

#### Account Permissions
- `view_accounts` - View account information
- `create_accounts` - Create new accounts
- `update_accounts` - Update account information
- `delete_accounts` - Delete accounts

#### Billing Permissions
- `view_billing` - View billing information
- `create_invoices` - Create invoices
- `update_billing` - Update billing information
- `delete_billing` - Delete billing records

#### Report Permissions
- `view_reports` - View reports and analytics

#### Settings Permissions
- `view_settings` - View system settings
- `update_settings` - Update system settings

#### Admin-Only Permissions
- `manage_permissions` - Manage system permissions
- `manage_users` - Manage system users
- `system_settings` - Manage system-wide settings

### Permission Scopes

- **own** - Access only to user's own records
- **account** - Access to all records within the user's account
- **subsidiary** - Access to account and subsidiary account records

## API Endpoints

### System Permissions Management

#### GET /api/permissions
Retrieve all system permissions (Admin only).

**Response:**
```json
[
  {
    "id": "permission_id",
    "name": "view_tickets",
    "description": "View tickets",
    "resource": "tickets",
    "action": "view",
    "createdAt": "2024-01-26T10:00:00Z",
    "updatedAt": "2024-01-26T10:00:00Z"
  }
]
```

#### POST /api/permissions
Create a new system permission (Admin only).

**Request Body:**
```json
{
  "name": "permission_name",
  "description": "Permission description",
  "resource": "resource_name",
  "action": "action_name"
}
```

### Account Permissions Management

#### GET /api/account-permissions
Retrieve account permissions with optional filtering.

**Query Parameters:**
- `accountUserId` - Filter by account user ID

**Response:**
```json
[
  {
    "id": "account_permission_id",
    "accountUserId": "account_user_id",
    "permissionName": "view_tickets",
    "resource": "tickets",
    "action": "view",
    "scope": "account",
    "createdAt": "2024-01-26T10:00:00Z",
    "updatedAt": "2024-01-26T10:00:00Z"
  }
]
```

#### POST /api/account-permissions
Create a new account permission (Admin only).

**Request Body:**
```json
{
  "accountUserId": "account_user_id",
  "permissionName": "view_tickets",
  "resource": "tickets",
  "action": "view",
  "scope": "own"
}
```

#### DELETE /api/account-permissions
Delete an account permission (Admin only).

**Request Body:**
```json
{
  "id": "account_permission_id"
}
```

## Permission Utility Functions

### Core Functions

```typescript
// Check if user has specific permission
async function hasPermission(
  userId: string,
  permission: PermissionCheck
): Promise<boolean>

// Require permission (throws error if not authorized)
async function requirePermission(permission: PermissionCheck): Promise<boolean>

// Get all permissions for a user
async function getUserPermissions(userId: string): Promise<Permission[]>
```

### Permission Constants

```typescript
export const PERMISSIONS = {
  TICKETS: {
    VIEW: { resource: "tickets", action: "view" },
    CREATE: { resource: "tickets", action: "create" },
    UPDATE: { resource: "tickets", action: "update" },
    DELETE: { resource: "tickets", action: "delete" },
  },
  TIME_ENTRIES: {
    VIEW: { resource: "time-entries", action: "view" },
    CREATE: { resource: "time-entries", action: "create" },
    UPDATE: { resource: "time-entries", action: "update" },
    DELETE: { resource: "time-entries", action: "delete" },
  },
  // ... other permission constants
} as const;
```

## Permissions Management Interface

### Admin Interface (`/permissions`)

The permissions management page provides comprehensive tools for managing system and account permissions:

#### System Permissions Tab
- **Permission List**: Display all system permissions with resource/action details
- **Permission Details**: Name, description, resource, action, and creation date
- **Permission Actions**: Edit permissions (delete not implemented for safety)

#### Account Permissions Tab
- **Assignment Interface**: Assign permissions to specific account users
- **Permission Selection**: Choose from available system permissions
- **Scope Configuration**: Set permission scope (own, account, subsidiary)
- **Permission List**: View all assigned account permissions
- **Permission Removal**: Delete specific account permissions

#### Create Permission Tab
- **Permission Creation**: Create new system permissions
- **Resource Selection**: Choose from predefined resources
- **Action Selection**: Choose from standard actions (view, create, update, delete)
- **Description**: Optional detailed description

### Statistics Dashboard

The permissions interface displays key metrics:
- **System Permissions**: Count of available system permissions
- **Account Users**: Count of users with account permissions
- **Account Permissions**: Count of assigned permissions
- **Resources**: Count of protected resources

## Role-Based Access Control

### Admin Users
- Full access to all system features
- Can manage all permissions and users
- Can create, edit, delete system permissions
- Can assign/revoke account permissions
- Access to all protected resources

### Employee Users
- Access to most system features
- Cannot manage permissions or users
- Cannot access admin-only resources
- Can view and work with assigned tasks
- Limited to employee-accessible features

### Account Users
- Access based on specifically assigned permissions
- Can only access resources explicitly granted
- Scope-limited access (own records by default)
- Cannot access admin or employee functions
- Managed through account permission system

## Permission Enforcement

### Server-Side Enforcement

All API endpoints implement permission checking:

```typescript
// Example API route with permission check
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Role-based check
  if (session.user?.role === "ACCOUNT_USER") {
    // Check specific permissions for account users
    const hasAccess = await hasPermission(session.user.id, {
      resource: "tickets",
      action: "view"
    });
    
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  
  // Continue with request processing
}
```

### Client-Side Enforcement

UI components conditionally render based on user roles:

```typescript
// Example component with role-based rendering
{isAdmin && (
  <Button onClick={() => router.push("/permissions")}>
    <Shield className="mr-2 h-4 w-4" />
    Permissions
  </Button>
)}

{isEmployee && (
  <Button onClick={() => router.push("/tickets")}>
    <FileText className="mr-2 h-4 w-4" />
    Tickets
  </Button>
)}
```

## Permission Seeding

The system includes a comprehensive permission seed script:

```typescript
// Example seeded permissions
const permissions = [
  { name: 'view_tickets', description: 'View tickets', resource: 'tickets', action: 'view' },
  { name: 'create_tickets', description: 'Create new tickets', resource: 'tickets', action: 'create' },
  // ... more permissions
];
```

### Running Permission Seed

```bash
npx tsx prisma/seed-permissions.ts
```

## Security Considerations

### Access Control
- All permission checks performed server-side
- Session validation required for all operations
- Role hierarchy enforced at database level
- Permission assignment requires admin privileges

### Data Protection
- Account users can only access their account data
- Permission changes logged for audit trail
- No permission escalation without admin approval
- Secure session management throughout

## Best Practices

### Permission Design
- Use resource-action naming convention
- Provide clear permission descriptions
- Group related permissions logically
- Minimize permission complexity

### Assignment Strategy
- Start with minimal permissions
- Grant permissions based on job requirements
- Regular permission audits and cleanup
- Document permission assignments

### Security Guidelines
- Never bypass permission checks
- Always validate permissions server-side
- Use least-privilege principle
- Monitor permission usage and changes

## Integration Points

### Authentication System
- Integrates with NextAuth for session management
- Uses role information from user session
- Validates permissions on every request
- Supports multiple authentication providers

### Database Integration
- Uses Prisma for permission storage
- Efficient querying with proper indexes
- Transaction support for permission changes
- Audit trail capabilities

### User Interface
- Role-based navigation rendering
- Permission-aware component display
- Dynamic menu generation
- Access control feedback

## Future Enhancements

### Advanced Features
- **Permission Groups**: Organize permissions into logical groups
- **Temporary Permissions**: Time-limited permission grants
- **Permission Inheritance**: Hierarchical permission inheritance
- **Conditional Permissions**: Context-based permission rules

### Audit and Compliance
- **Permission Audit Log**: Track all permission changes
- **Access Reports**: Generate permission usage reports
- **Compliance Monitoring**: Monitor permission compliance
- **Permission Reviews**: Periodic permission review workflows

### User Experience
- **Permission Request System**: Allow users to request permissions
- **Self-Service Portal**: Users can view their permissions
- **Permission Wizard**: Guided permission assignment
- **Role Templates**: Pre-configured permission sets

## Error Handling

### Common Scenarios
- **Unauthorized Access**: Clear messaging for access denial
- **Permission Conflicts**: Handle conflicting permission assignments
- **Invalid Permissions**: Validate permission existence
- **Database Errors**: Graceful handling of database issues

### Recovery Strategies
- **Permission Fallback**: Default to safe permission state
- **Error Logging**: Comprehensive error tracking
- **User Notification**: Clear error messages for users
- **Admin Alerts**: Notify admins of permission issues

This comprehensive permissions system provides robust access control while maintaining flexibility and ease of management for administrators.