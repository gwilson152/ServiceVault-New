# API Overview

> ⚠️ **IMPORTANT**: Always update this documentation when making API changes, adding new endpoints, or modifying authentication/permission patterns.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Authentication & Authorization](#authentication--authorization)
- [API Conventions](#api-conventions)
- [Request/Response Patterns](#requestresponse-patterns)
- [Error Handling](#error-handling)
- [Permission System](#permission-system)
- [Data Filtering & Pagination](#data-filtering--pagination)
- [Database Patterns](#database-patterns)
- [API Endpoint Categories](#api-endpoint-categories)

## Architecture Overview

The Service Vault API is built on **Next.js 15 App Router** with **TypeScript** and uses:
- **Authentication**: NextAuth.js with session-based auth
- **Database**: SQLite with Prisma ORM
- **Authorization**: ABAC (Attribute-Based Access Control) system
- **Validation**: Server-side request validation
- **Type Safety**: Full TypeScript integration

### Core Principles
1. **Security First**: Every endpoint validates authentication and permissions
2. **Role-Based Access**: Different data visibility based on user roles
3. **Consistent Patterns**: Standardized request/response formats
4. **Type Safety**: Full TypeScript interfaces for all endpoints
5. **Error Handling**: Consistent error responses with proper HTTP status codes

## Authentication & Authorization

### Authentication Pattern
Every API route follows this authentication pattern:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Continue with authorized logic...
}
```

### Permission Checking (Updated 2025-08-06)
After authentication, endpoints check specific permissions using the PermissionService:

```typescript
import { permissionService } from "@/lib/permissions/PermissionService";

// CORRECT: Use object format with permissionService
const canViewAccounts = await permissionService.hasPermission({
  userId: session.user.id,
  resource: "accounts", 
  action: "view",
  accountId: accountId // Optional context
});

if (!canViewAccounts) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// INCORRECT: Old formats (will cause errors)
// ❌ await hasPermission(session.user.id, resource, action)
// ❌ await permissionService.hasPermission(userId, resource, action)
```

### Permission-Based Data Filtering
Data access is filtered using the `applyPermissionFilter` utility:

```typescript
import { applyPermissionFilter } from "@/lib/permissions/PermissionService";

// Apply permission-based filtering to queries
const filteredQuery = await applyPermissionFilter(
  session.user.id,
  'accounts',      // resource type
  baseQuery,       // base Prisma query
  'id'            // ID field name
);

const results = await prisma.account.findMany(filteredQuery);

// The filter automatically handles:
// - Super-admin: See all data
// - Account-scoped users: See only their account data
// - Hierarchical permissions: Include subsidiary accounts
```

## API Conventions

### Standard HTTP Methods

| Method | Purpose | Example |
|--------|---------|---------|
| `GET` | Retrieve resources | `GET /api/accounts` |
| `POST` | Create new resource | `POST /api/accounts` |
| `PUT` | Update entire resource | `PUT /api/accounts/[id]` |
| `PATCH` | Partial update | `PATCH /api/accounts/[id]` |
| `DELETE` | Remove resource | `DELETE /api/accounts/[id]` |

### URL Structure

```
/api/{resource}           # Collection operations
/api/{resource}/[id]      # Individual resource operations
/api/{resource}/[id]/{sub-resource}  # Nested resource operations
/api/{resource}/{action}  # Special actions (e.g., /generate, /preview)
```

### Query Parameters

#### Common Parameters
- `page`: Page number for pagination (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `search`: Text search across relevant fields
- `sort`: Sort field (default: varies by endpoint)
- `order`: Sort direction (`asc` | `desc`, default: `asc`)

#### Filtering Parameters
- `{field}`: Direct field filtering (e.g., `status=OPEN`)
- `{field}_contains`: Text contains (case-insensitive)
- `{field}_start`: Range start (dates, numbers)
- `{field}_end`: Range end (dates, numbers)

### Request Headers
```http
Content-Type: application/json
Cookie: next-auth.session-token=...
```

## Request/Response Patterns

### Request Body Format
```typescript
// POST/PUT requests
{
  "field1": "value",
  "field2": 123,
  "nestedField": {
    "subField": "value"
  }
}
```

### Response Format

#### Success Response (Single Item)
```typescript
{
  "id": "cuid",
  "field1": "value",
  "field2": 123,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Success Response (Collection)
```typescript
{
  "items": [...],           // Array of resources
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "meta": {                 // Optional metadata
    "filters": {...},
    "stats": {...}
  }
}
```

#### Error Response
```typescript
{
  "error": "Human-readable error message",
  "details": "Optional detailed error information",
  "code": "OPTIONAL_ERROR_CODE"
}
```

## Error Handling

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200` | OK | Successful GET, PUT, PATCH |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Invalid request data |
| `401` | Unauthorized | Not authenticated |
| `403` | Forbidden | Not authorized (lacks permission) |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource conflict (duplicate, etc.) |
| `422` | Unprocessable Entity | Validation errors |
| `500` | Internal Server Error | Server error |

### Error Response Examples

#### Validation Error (400)
```json
{
  "error": "Validation failed",
  "details": {
    "email": "Email is required",
    "name": "Name must be at least 2 characters"
  }
}
```

#### Permission Error (403)
```json
{
  "error": "Forbidden",
  "details": "You don't have permission to access this resource"
}
```

#### Not Found Error (404)
```json
{
  "error": "Account not found",
  "details": "Account with ID 'abc123' does not exist"
}
```

## Permission System

### Permission Structure
```typescript
interface PermissionCheck {
  resource: string;    // e.g., "accounts", "tickets", "time-entries"
  action: string;      // e.g., "view", "create", "update", "delete"
  scope?: string;      // e.g., "own", "account", "subsidiary", "global"
  accountId?: string;  // For account-context permissions
}
```

### Common Permission Patterns

#### Resource-Level Permissions
```typescript
// Can view any accounts
{ resource: "accounts", action: "view" }

// Can create tickets
{ resource: "tickets", action: "create" }

// Can approve time entries
{ resource: "time-entries", action: "approve" }
```

#### Scope-Based Permissions
```typescript
// Can update own time entries
{ resource: "time-entries", action: "update", scope: "own" }

// Can view account-level invoices
{ resource: "invoices", action: "view", scope: "account", accountId: "..." }

// Can manage subsidiary accounts
{ resource: "accounts", action: "manage", scope: "subsidiary" }
```

### Permission Checking in APIs
```typescript
// Single permission check
const canView = await hasPermission(userId, {
  resource: "tickets",
  action: "view"
});

// Batch permission check (for performance)
const permissions = await checkPermissions([
  { resource: "tickets", action: "view" },
  { resource: "tickets", action: "create" },
  { resource: "time-entries", action: "create" }
]);
```

## Data Filtering & Pagination

### Query Parameter Processing
```typescript
const searchParams = request.nextUrl.searchParams;
const page = parseInt(searchParams.get('page') || '1');
const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
const search = searchParams.get('search') || '';
const status = searchParams.get('status');
```

### Database Query Construction
```typescript
// Build dynamic where clause
const whereClause: Record<string, unknown> = {};

// Text search
if (search) {
  whereClause.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } }
  ];
}

// Status filtering
if (status && status !== 'ALL') {
  whereClause.status = status;
}

// Role-based filtering
if (session.user?.role === "ACCOUNT_USER") {
  whereClause.accountId = userAccountId;
}
```

### Pagination Implementation
```typescript
const skip = (page - 1) * limit;

const [items, totalCount] = await Promise.all([
  prisma.resource.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' }
  }),
  prisma.resource.count({ where: whereClause })
]);

const totalPages = Math.ceil(totalCount / limit);

return NextResponse.json({
  items,
  pagination: {
    page,
    limit,
    total: totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  }
});
```

## Database Patterns

### Prisma Usage Patterns

#### Standard CRUD Operations
```typescript
// Create
const item = await prisma.resource.create({
  data: requestData,
  include: { relatedResource: true }
});

// Read with relations
const item = await prisma.resource.findUnique({
  where: { id },
  include: {
    relatedResource: {
      select: { id: true, name: true }
    }
  }
});

// Update
const item = await prisma.resource.update({
  where: { id },
  data: updateData
});

// Delete
await prisma.resource.delete({
  where: { id }
});
```

#### Complex Queries with Relations
```typescript
const accounts = await prisma.account.findMany({
  where: whereClause,
  include: {
    accountUsers: {
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    },
    tickets: {
      where: { status: { not: 'CLOSED' } },
      take: 5
    },
    _count: {
      select: {
        tickets: true,
        timeEntries: true
      }
    }
  }
});
```

#### Transactions for Data Consistency
```typescript
const result = await prisma.$transaction(async (tx) => {
  const invoice = await tx.invoice.create({ data: invoiceData });
  
  await tx.invoiceItem.createMany({
    data: items.map(item => ({
      ...item,
      invoiceId: invoice.id
    }))
  });
  
  await tx.timeEntry.updateMany({
    where: { id: { in: timeEntryIds } },
    data: { isInvoiced: true }
  });
  
  return invoice;
});
```

## API Endpoint Categories

### Core Resource APIs

#### Accounts (`/api/accounts`)
- **Purpose**: Account management and hierarchy
- **Key Features**: Hierarchical structure, user management, billing
- **Permissions**: Role-based access, account-scoped operations

#### Tickets (`/api/tickets`)
- **Purpose**: Ticket management and tracking
- **Key Features**: Status workflow, assignments, time tracking
- **Permissions**: Account-scoped access, assignee permissions

#### Time Entries (`/api/time-entries`)
- **Purpose**: Time tracking and billing
- **Key Features**: Timer integration, approval workflow, billing rates
- **Permissions**: Own/assignee access, approval permissions

#### Users (`/api/users`)
- **Purpose**: Comprehensive user management and administration
- **Key Features**: User profiles, role assignment, account association, security controls
- **Sub-endpoints**: 
  - `/api/users/[id]/membership-roles` - Role assignment/removal
  - `/api/users/[id]/memberships/[membershipId]` - Account removal
  - `/api/users/[id]/status` - Security status and sessions
  - `/api/users/[id]/disable|enable|unlock` - Account status control
  - `/api/users/[id]/force-password-reset` - Security actions
  - `/api/users/[id]/revoke-sessions` - Session management
  - `/api/users/[id]/effective-permissions` - Permission analysis
- **Permissions**: Admin-only with self-protection mechanisms

### Specialized APIs

#### Role Templates (`/api/role-templates`)
- **Purpose**: ABAC role template management
- **Endpoints**: CRUD operations for role templates
- **Key Features**: Template creation, permission assignment, usage tracking

#### Account User Roles (`/api/account-user-roles`)
- **Purpose**: Role assignments for account users
- **Endpoints**: Assign, remove, and manage account-level role assignments
- **Key Features**: Scope-based permissions, bulk assignment

#### Billing (`/api/billing`)
- **Purpose**: Billing rates and financial operations
- **Key Features**: Rate management, customer-specific rates
- **Permissions**: Billing permission required

#### Invoices (`/api/invoices`)
- **Purpose**: Invoice generation and management  
- **Key Features**: PDF generation, item management, status workflow
- **Permissions**: Account-scoped access, billing permissions

#### Settings (`/api/settings`)
- **Purpose**: System and account configuration
- **Key Features**: Custom fields, company info, email settings
- **Permissions**: Admin-only for system, account-scoped for account settings

### Utility APIs

#### Timers (`/api/timers`)
- **Purpose**: Cross-device timer synchronization
- **Key Features**: Real-time timer state, multiple timers per user
- **Permissions**: User-scoped access

#### Email (`/api/email`)
- **Purpose**: Email template and queue management
- **Key Features**: Template CRUD, email sending, queue management
- **Permissions**: Admin-only operations

## Best Practices

### API Development Guidelines

1. **Always validate authentication first**
2. **Check permissions before data access**
3. **Use role-based filtering in database queries**
4. **Implement proper error handling with specific status codes**
5. **Include relevant data relations in responses**
6. **Use transactions for multi-step operations**
7. **Implement proper pagination for list endpoints**
8. **Validate request data with TypeScript interfaces**
9. **Log errors with sufficient context for debugging**
10. **Use consistent naming conventions across endpoints**

### Performance Considerations

1. **Use database indexes for frequently queried fields**
2. **Implement pagination for all list endpoints**
3. **Use `select` and `include` to limit returned data**
4. **Batch permission checks when possible**
5. **Use database transactions for consistency**
6. **Cache frequently accessed permissions**
7. **Optimize database queries with proper relations**

### Security Guidelines

1. **Never trust client-provided IDs without validation**
2. **Always filter data based on user permissions**
3. **Validate all input data on the server**
4. **Use parameterized queries (Prisma handles this)**
5. **Implement rate limiting for sensitive operations**
6. **Log all permission failures for security monitoring**
7. **Sanitize error messages to prevent information disclosure**

---

## Maintenance Notes

This documentation should be updated whenever:
- New API endpoints are added
- Authentication or permission patterns change
- Request/response formats are modified
- New query parameters are introduced
- Error handling patterns are updated
- Database patterns or relationships change

Last updated: [Current Date]