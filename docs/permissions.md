# Permissions System Documentation

## Overview

Service Vault implements a comprehensive Role-Based Access Control (RBAC) system with Attribute-Based Access Control (ABAC) capabilities. This system provides granular permission management for both system users (ADMIN, EMPLOYEE) and account users (ACCOUNT_USER), enabling fine-grained control over application features and data access.

## Permission System Architecture

### Core Components

#### 1. Permission Registry (`src/lib/permissions-registry.ts`)
Central registry defining all available permissions in the application. Permissions are organized by resource and action, with optional scope modifiers.

#### 2. Permission Checking (`src/lib/permissions.ts`)
Server-side permission validation functions that check user permissions against database records and role-based defaults.

#### 3. Permission Hooks (`src/hooks/usePermissions.ts`)
Client-side React hooks for permission checking with caching and batch operations.

#### 4. Database Models
- **Permission**: System-wide permission definitions
- **UserPermission**: Permissions assigned to system users (ADMIN/EMPLOYEE)
- **AccountPermission**: Permissions assigned to account users with scope control

## Permission Structure

### Permission Definition
```typescript
interface PermissionDefinition {
  resource: string;    // The resource being accessed (e.g., "tickets", "time-entries")
  action: string;      // The action being performed (e.g., "view", "create", "update")
  description?: string; // Human-readable description
  scope?: "own" | "account" | "subsidiary" | "global"; // Access scope
}
```

### Permission Naming Convention
Permissions follow the pattern: `{RESOURCE}:{ACTION}`
- Examples: `tickets:view`, `time-entries:create`, `billing:update`

## Available Permissions

### Time Entries
- **`TIME_ENTRIES.VIEW`** - View time entries
- **`TIME_ENTRIES.CREATE`** - Create new time entries
- **`TIME_ENTRIES.UPDATE`** - Edit existing time entries
- **`TIME_ENTRIES.DELETE`** - Delete time entries
- **`TIME_ENTRIES.APPROVE`** - Approve time entries for invoicing
- **`TIME_ENTRIES.REJECT`** - Reject time entries

### Tickets
- **`TICKETS.VIEW`** - View tickets
- **`TICKETS.CREATE`** - Create new tickets
- **`TICKETS.UPDATE`** - Edit existing tickets
- **`TICKETS.DELETE`** - Delete tickets
- **`TICKETS.ASSIGN`** - Assign tickets to users

### Accounts
- **`ACCOUNTS.VIEW`** - View accounts
- **`ACCOUNTS.CREATE`** - Create new accounts
- **`ACCOUNTS.UPDATE`** - Edit existing accounts
- **`ACCOUNTS.DELETE`** - Delete accounts

### Users
- **`USERS.VIEW`** - View user lists and account users
- **`USERS.CREATE`** - Create new account users
- **`USERS.INVITE`** - Send user invitations
- **`USERS.MANAGE`** - Manage user status and permissions
- **`USERS.DELETE`** - Remove users from accounts
- **`USERS.UPDATE`** - Edit user information

### Billing
- **`BILLING.VIEW`** - View billing rates and revenue information
- **`BILLING.CREATE`** - Create billing rates
- **`BILLING.UPDATE`** - Update billing rates
- **`BILLING.DELETE`** - Delete billing rates

### Reports
- **`REPORTS.VIEW`** - View reports and analytics
- **`REPORTS.EXPORT`** - Export reports and data

### Email System
- **`EMAIL.SEND`** - Send emails through the system
- **`EMAIL.TEMPLATES`** - Manage email templates
- **`EMAIL.SETTINGS`** - Configure SMTP and email settings
- **`EMAIL.QUEUE`** - View and manage email queue

### Settings
- **`SETTINGS.VIEW`** - View system settings
- **`SETTINGS.UPDATE`** - Update system settings

### System Administration
- **`SYSTEM.ADMIN`** - Full system administration access
- **`SYSTEM.BACKUP`** - Create and manage backups
- **`SYSTEM.LOGS`** - View system logs

## Role-Based Permission Templates

### Default Permission Sets by Role

#### ADMIN Role
Admins have access to all permissions by default:
```typescript
ADMIN: [
  // All permissions from PERMISSIONS_REGISTRY
  ...Object.values(PERMISSIONS_REGISTRY).flatMap(category => Object.values(category))
]
```

#### EMPLOYEE Role
Employees have most operational permissions but limited system administration:
```typescript
EMPLOYEE: [
  // Time management
  TIME_ENTRIES.VIEW, TIME_ENTRIES.CREATE, TIME_ENTRIES.UPDATE, TIME_ENTRIES.DELETE,
  
  // Ticket management
  TICKETS.VIEW, TICKETS.CREATE, TICKETS.UPDATE, TICKETS.ASSIGN,
  
  // Account access
  ACCOUNTS.VIEW,
  
  // Reporting
  REPORTS.VIEW,
  
  // User viewing
  USERS.VIEW
]
```

#### ACCOUNT_USER Role
Account users have limited permissions focused on their own account:
```typescript
ACCOUNT_USER: [
  // Basic ticket access
  TICKETS.VIEW, TICKETS.CREATE,
  
  // Account viewing
  ACCOUNTS.VIEW
]
```

## Permission Scopes

### Scope Types
- **`own`**: User can only access their own records
- **`account`**: User can access all records for their account
- **`subsidiary`**: User can access records from their account and child accounts
- **`global`**: User can access all records (admin-level access)

### Scope Application
```typescript
// Example: User with "tickets:view" permission and "account" scope
// Can view all tickets belonging to their account
const canView = await hasPermission(userId, {
  resource: "tickets",
  action: "view",
  scope: "account"
});
```

## Implementation Guide

### Server-Side Permission Checking

#### Basic Permission Check
```typescript
import { hasPermission } from "@/lib/permissions";

// Check if user has permission
const canCreateTickets = await hasPermission(userId, {
  resource: "tickets",
  action: "create"
});

if (!canCreateTickets) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

#### API Route Protection
```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use permission instead of role check
  const hasCreatePermission = await hasPermission(session.user.id, {
    resource: "tickets",
    action: "create"
  });

  if (!hasCreatePermission) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Proceed with operation...
}
```

### Client-Side Permission Checking

#### Using Permission Hooks
```typescript
import { usePermissions } from "@/hooks/usePermissions";

function TicketManagement() {
  const { canCreateTickets, canViewBilling, isLoading } = usePermissions();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {canCreateTickets && <Button>Create Ticket</Button>}
      {canViewBilling && <BillingSection />}
    </div>
  );
}
```

#### Context-Aware Permissions
```typescript
import { useTimeEntryPermissions } from "@/hooks/usePermissions";

function TimeEntryCard({ entry }) {
  const { canEdit, canDelete, isLocked } = useTimeEntryPermissions(entry);
  
  return (
    <Card>
      {/* Entry content */}
      <div className="actions">
        {canEdit && !isLocked && <Button>Edit</Button>}
        {canDelete && !isLocked && <Button>Delete</Button>}
      </div>
    </Card>
  );
}
```

### Permission-Based UI Components

#### Permission Gate Component
```typescript
import { hasPermission } from "@/lib/permissions";

interface PermissionGateProps {
  permission: { resource: string; action: string; scope?: string };
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { hasPermission: checkPermission } = usePermissions();
  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    checkPermission(permission).then(setCanAccess);
  }, [permission, checkPermission]);

  return canAccess ? <>{children}</> : <>{fallback}</>;
}

// Usage
<PermissionGate permission={{ resource: "tickets", action: "create" }}>
  <CreateTicketButton />
</PermissionGate>
```

## Database Schema

### Permission Model
```sql
Permission {
  id          String   @id @default(cuid())
  name        String   @unique          -- Format: "resource:action"
  description String?
  resource    String                    -- Resource type (tickets, accounts, etc.)
  action      String                    -- Action type (view, create, update, etc.)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### UserPermission Model
```sql
UserPermission {
  id              String   @id @default(cuid())
  userId          String
  permissionName  String
  resource        String
  action          String
  scope           String   @default("own")
  grantedBy       String?  -- Who granted this permission
  grantedAt       DateTime @default(now())
  expiresAt       DateTime? -- Optional expiration
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, permissionName])
}
```

### AccountPermission Model
```sql
AccountPermission {
  id              String   @id @default(cuid())
  accountUserId   String
  permissionName  String
  resource        String
  action          String
  scope           String   @default("own")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([accountUserId, permissionName])
}
```

## Best Practices

### 1. Always Use Permission Checks
```typescript
// ❌ Don't use role-based checks
if (session.user?.role === 'ADMIN') {
  // Allow access
}

// ✅ Use permission-based checks
const canAccess = await hasPermission(session.user.id, {
  resource: "settings",
  action: "update"
});
```

### 2. Implement Proper Scoping
```typescript
// ✅ Use appropriate scope for data access
const canViewTickets = await hasPermission(userId, {
  resource: "tickets",
  action: "view",
  scope: "account" // User can see all tickets in their account
});
```

### 3. Cache Permission Results
```typescript
// ✅ The usePermissions hook automatically caches results
const { canCreateTickets } = usePermissions(); // Cached result
```

### 4. Handle Permission Loading States
```typescript
function ProtectedComponent() {
  const { canAccess, isLoading } = usePermissions();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!canAccess) {
    return <AccessDeniedMessage />;
  }
  
  return <ProtectedContent />;
}
```

### 5. Provide Clear Error Messages
```typescript
if (!hasPermission) {
  return NextResponse.json(
    { 
      error: "Insufficient permissions", 
      required: "tickets:create",
      message: "You need permission to create tickets"
    }, 
    { status: 403 }
  );
}
```

## Permission Management

### Assigning Permissions

#### System Users (ADMIN/EMPLOYEE)
```typescript
// API: POST /api/user-permissions
{
  "userId": "user123",
  "permissionName": "tickets:create",
  "resource": "tickets",
  "action": "create",
  "scope": "global"
}
```

#### Account Users
```typescript
// API: POST /api/account-permissions
{
  "accountUserId": "accountUser123",
  "permissionName": "tickets:view",
  "resource": "tickets",
  "action": "view",
  "scope": "account"
}
```

### Bulk Permission Operations
```typescript
// API: POST /api/user-permissions/bulk
{
  "type": "user-permissions",
  "assignments": [
    {
      "userId": "user123",
      "permissions": [
        { "permissionName": "tickets:view", "resource": "tickets", "action": "view" },
        { "permissionName": "tickets:create", "resource": "tickets", "action": "create" }
      ]
    }
  ]
}
```

## Migration from Role-Based to Permission-Based

### Step 1: Identify Role Checks
Search for patterns like:
- `session.user?.role === 'ADMIN'`
- `user.role !== 'ACCOUNT_USER'`
- `role === 'EMPLOYEE'`

### Step 2: Determine Required Permission
Map role checks to appropriate permissions:
- Admin-only features → Specific permission (e.g., `SETTINGS.UPDATE`)
- Employee access → Operational permission (e.g., `TICKETS.CREATE`)
- Account user restrictions → Scoped permission (e.g., `TICKETS.VIEW` with `account` scope)

### Step 3: Replace with Permission Check
```typescript
// Before
if (session.user?.role === 'ADMIN') {
  // Allow access
}

// After
const canAccess = await hasPermission(session.user.id, {
  resource: "settings",
  action: "update"
});

if (canAccess) {
  // Allow access
}
```

### Step 4: Update UI Components
```typescript
// Before
{session.user?.role === 'ADMIN' && <AdminButton />}

// After
<PermissionGate permission={{ resource: "system", action: "admin" }}>
  <AdminButton />
</PermissionGate>
```

## Troubleshooting

### Common Issues

#### 1. Permission Not Found
**Error**: Permission not registered in system
**Solution**: Add permission to `PERMISSIONS_REGISTRY` and seed database

#### 2. Cache Issues
**Error**: Permission changes not reflected immediately
**Solution**: Use `clearCache()` from usePermissions hook

#### 3. Scope Confusion
**Error**: User can't access expected resources
**Solution**: Verify scope setting matches intended access level

### Debugging

#### Check User Permissions
```typescript
// Get all permissions for a user
const userPermissions = await prisma.userPermission.findMany({
  where: { userId: "user123" },
  include: { user: true }
});
```

#### Verify Permission Logic
```typescript
// Test permission checking logic
const result = await hasPermission("user123", {
  resource: "tickets",
  action: "view",
  scope: "account"
});
console.log("Permission result:", result);
```

## Security Considerations

### 1. Server-Side Validation
Always validate permissions on the server side, never rely solely on client-side checks.

### 2. Principle of Least Privilege
Grant users only the minimum permissions necessary for their role.

### 3. Regular Permission Audits
Periodically review user permissions to ensure they remain appropriate.

### 4. Permission Inheritance
Be aware of how role-based default permissions interact with explicitly granted permissions.

### 5. Scope Security
Ensure scope restrictions are properly enforced in database queries.

---

This documentation provides a comprehensive guide to the Service Vault permissions system. For implementation examples and additional patterns, refer to the existing codebase and the change tracking documentation.