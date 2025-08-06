# System Role Management API

## Overview

The System Role Management API provides endpoints for assigning and removing system-wide roles to/from users. System roles grant global permissions that apply across all accounts and resources in the system.

## Authentication & Authorization

All endpoints require:
- **Authentication**: Valid session via NextAuth
- **Authorization**: `users:edit` permission
- **Super Admin Roles**: Only super administrators can assign/remove super admin system roles

## Endpoints

### POST /api/users/[id]/system-roles

Assigns a system role to a user.

#### Request

**Method**: `POST`  
**Path**: `/api/users/[id]/system-roles`  
**Content-Type**: `application/json`

**Path Parameters**:
- `id` (string): The user ID to assign the role to

**Body**:
```typescript
{
  roleId: string  // The role template ID to assign
}
```

#### Response

**Success (201)**:
```typescript
{
  id: string,
  userId: string,
  roleId: string,
  role: {
    id: string,
    name: string,
    description: string | null,
    inheritAllPermissions: boolean,
    permissions: Permission[]
  }
}
```

**Error Responses**:
- `400` - Invalid roleId, user already has role, or validation errors
- `401` - Unauthorized (no valid session)
- `403` - Insufficient permissions or super admin role assignment by non-super admin
- `404` - User not found or role template not found
- `500` - Internal server error

#### Example

```typescript
// Request
POST /api/users/user123/system-roles
{
  "roleId": "role-template-456"
}

// Response
{
  "id": "system-role-789",
  "userId": "user123", 
  "roleId": "role-template-456",
  "role": {
    "id": "role-template-456",
    "name": "System Administrator",
    "description": "Full system administration access",
    "inheritAllPermissions": true,
    "permissions": [...]
  }
}
```

### DELETE /api/users/[id]/system-roles

Removes a system role from a user.

#### Request

**Method**: `DELETE`  
**Path**: `/api/users/[id]/system-roles`  
**Content-Type**: `application/json`

**Path Parameters**:
- `id` (string): The user ID to remove the role from

**Body**:
```typescript
{
  roleId: string  // The role template ID to remove
}
```

#### Response

**Success (200)**:
```typescript
{
  message: "System role removed successfully"
}
```

**Error Responses**:
- `400` - Invalid roleId, last super admin protection, or validation errors
- `401` - Unauthorized (no valid session)
- `403` - Insufficient permissions or super admin role removal by non-super admin
- `404` - User not found or system role assignment not found
- `500` - Internal server error

#### Example

```typescript
// Request
DELETE /api/users/user123/system-roles
{
  "roleId": "role-template-456"
}

// Response
{
  "message": "System role removed successfully"
}
```

## Security Features

### Super Admin Protection

Only super administrators can assign or remove super admin system roles:

```typescript
// Super admin role assignment
if (roleTemplate.inheritAllPermissions) {
  const isSuperAdmin = await permissionService.isSuperAdmin(session.user.id);
  if (!isSuperAdmin) {
    return NextResponse.json({ 
      error: "Only super administrators can assign super admin system roles" 
    }, { status: 403 });
  }
}
```

### Last Admin Protection

The system prevents removal of the last super administrator:

```typescript
// Prevent removing last super admin
if (systemRole.role.inheritAllPermissions) {
  const superAdminCount = await prisma.systemRole.count({
    where: {
      role: {
        inheritAllPermissions: true
      }
    }
  });

  if (superAdminCount === 1) {
    return NextResponse.json({ 
      error: "Cannot remove the last super administrator system role" 
    }, { status: 400 });
  }
}
```

### Permission Validation

All operations require proper user management permissions:

```typescript
const canManageUsers = await permissionService.hasPermission({
  userId: session.user.id,
  resource: "users",
  action: "edit"
});

if (!canManageUsers) {
  return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
}
```

## Usage Examples

### Frontend Integration

```typescript
// Add system role
const addSystemRole = async (userId: string, roleId: string) => {
  const response = await fetch(`/api/users/${userId}/system-roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roleId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to add system role');
  }

  return response.json();
};

// Remove system role
const removeSystemRole = async (userId: string, roleId: string) => {
  const response = await fetch(`/api/users/${userId}/system-roles`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roleId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to remove system role');
  }

  return response.json();
};
```

### SystemRoleManagementDialog Integration

The SystemRoleManagementDialog component uses these endpoints:

```typescript
// Add role handler in SystemRoleManagementDialog
const handleAddSystemRole = async () => {
  try {
    setLoading(true);
    const response = await fetch(`/api/users/${userId}/system-roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roleId: selectedRoleId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add system role');
    }

    toast({
      title: "Success",
      description: "System role added successfully"
    });

    onRoleChanged(); // Refresh parent data
  } catch (error) {
    toast({
      title: "Error", 
      description: error.message,
      variant: "destructive"
    });
  } finally {
    setLoading(false);
  }
};
```

## Error Handling

### Common Error Scenarios

**Role Already Assigned**:
```json
{
  "error": "User already has this system role",
  "status": 400
}
```

**Super Admin Assignment by Non-Super Admin**:
```json
{
  "error": "Only super administrators can assign super admin system roles",
  "status": 403
}
```

**Last Super Admin Protection**:
```json
{
  "error": "Cannot remove the last super administrator system role",
  "status": 400
}
```

**Invalid Role Template**:
```json
{
  "error": "Role template not found",
  "status": 404
}
```

### Best Practices

1. **Always handle errors gracefully** in the frontend
2. **Show meaningful error messages** to users
3. **Use confirmation dialogs** for destructive operations
4. **Refresh data** after successful operations
5. **Check permissions** before making API calls
6. **Validate input** before sending requests

## Database Impact

### SystemRole Table

System role assignments are stored in the `SystemRole` table:

```prisma
model SystemRole {
  id     String @id @default(cuid())
  userId String
  roleId String
  user   User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   RoleTemplate @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
  @@index([userId])
  @@index([roleId])
}
```

### Performance Considerations

- **Caching**: User permissions are cached for 5 minutes
- **Indexing**: Queries are optimized with proper database indexes
- **Cascading**: Role assignments are automatically cleaned up when users or roles are deleted

## Testing

### Manual Testing

1. **Happy Path**:
   - Assign system role to user → should succeed
   - Remove system role from user → should succeed

2. **Security Testing**:
   - Try to assign super admin role as non-super admin → should fail
   - Try to remove last super admin role → should fail
   - Try to manage roles without permissions → should fail

3. **Edge Cases**:
   - Assign same role twice → should fail gracefully
   - Remove non-existent role assignment → should fail gracefully
   - Invalid user ID → should return 404

### API Testing

```bash
# Add system role
curl -X POST http://localhost:3000/api/users/user123/system-roles \
  -H "Content-Type: application/json" \
  -d '{"roleId": "role-template-456"}' \
  -b "next-auth.session-token=..."

# Remove system role  
curl -X DELETE http://localhost:3000/api/users/user123/system-roles \
  -H "Content-Type: application/json" \
  -d '{"roleId": "role-template-456"}' \
  -b "next-auth.session-token=..."
```

## Related Documentation

- [User Management System](../features/user-management.md)
- [ABAC Permissions System](../system/permissions.md)
- [SystemRoleManagementDialog Component](../components/dialogs.md)
- [Role Template Management](../features/role-templates.md)