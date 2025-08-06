# User Management System

## Overview

Service Vault provides comprehensive user management capabilities through an enterprise-level administration interface. The system enables administrators to manage user accounts, roles, permissions, and security settings with fine-grained control and proper audit trails.

## Core Features

### User Detail Management (`/users/[id]`)

The user detail page serves as the central hub for individual user administration, providing:

#### **Profile Management**
- **Edit user information** - Name, email, and basic profile data
- **View user statistics** - Account memberships, activity metrics, creation dates
- **Delete user accounts** - With comprehensive safety confirmations

#### **Role & Permission Management**
- **Comprehensive role assignment** - Add/remove roles from account memberships
- **Account membership control** - Remove users from specific accounts
- **Effective permissions viewer** - Visual display of all user permissions across roles
- **Permission scope clarity** - Global vs account-scoped permission distinction

#### **Security & Status Management**
- **Account status control** - Enable/disable user accounts
- **Password management** - Force password resets with confirmation requirements
- **Session management** - View and revoke active sessions (individual or all)
- **Account unlock** - Reset failed login attempts and unlock locked accounts
- **Login history** - View user authentication and security events

### Account-Centric User Management (`/accounts/[id]`)

Account detail pages provide user management from the account perspective:

#### **Account User Overview**
- **User listing** - All users with access to the account and subsidiaries
- **Quick actions** - Edit, manage permissions, move users between accounts
- **Status indicators** - Visual badges for user status and login state
- **Navigation integration** - Direct links to individual user detail pages

#### **User Assignment Management**
- **Invite new users** - Create invitations for account access
- **Add existing users** - Assign existing system users to accounts
- **Move users** - Transfer users between parent and child accounts
- **Remove users** - Clean removal with proper cascade handling

## User Interface Components

### UserRoleManagementDialog

**Purpose**: Comprehensive role management interface for individual users
**Access**: Permission-based (users:edit required)

**Features**:
- **Role Assignment Tab**:
  - Add roles to existing account memberships
  - Remove roles from memberships
  - Remove users from accounts entirely
  - Real-time role availability filtering
- **Effective Permissions Tab**:
  - Visual permission display grouped by resource
  - Human-readable permission labels
  - Account name resolution for scope clarity
  - Special handling for wildcard permissions

**Security**:
- Confirmation dialogs for destructive actions
- Permission validation before role changes
- Real-time data refresh after modifications

### UserStatusManagementDialog

**Purpose**: User security and status management interface
**Access**: Permission-based (users:edit required)

**Features**:
- **Status Management Tab**:
  - Enable/disable user accounts
  - View current account status and security flags
  - Force password reset functionality
  - Account unlock capabilities
  - Failed login attempt monitoring
- **Session Management Tab**:
  - View all active user sessions
  - Device type, browser, and location information
  - Revoke individual sessions
  - Bulk session revocation
  - Current session protection

**Security**:
- Self-protection (users cannot disable themselves)
- Typed confirmation for critical actions (e.g., "FORCE RESET")
- Comprehensive validation and error handling

## API Architecture

### User Management Endpoints

All user management APIs follow consistent patterns with proper permission checking:

#### **Role Management APIs**
```typescript
POST   /api/users/[id]/membership-roles     // Add role to membership
DELETE /api/users/[id]/membership-roles     // Remove role from membership
DELETE /api/users/[id]/memberships/[membershipId]  // Remove from account
```

#### **Status Management APIs**
```typescript
GET  /api/users/[id]/status                 // Get user status and sessions
POST /api/users/[id]/disable                // Disable user account
POST /api/users/[id]/enable                 // Enable user account
POST /api/users/[id]/unlock                 // Unlock user account
```

#### **Security Management APIs**
```typescript
POST   /api/users/[id]/force-password-reset   // Force password reset
POST   /api/users/[id]/revoke-sessions        // Revoke all sessions
DELETE /api/users/[id]/sessions/[sessionId]   // Revoke specific session
```

#### **Permission Analysis APIs**
```typescript
GET /api/users/[id]/effective-permissions   // Get computed permissions
```

### Permission Requirements

All user management operations require appropriate permissions:
- **users:view** - View user information and status
- **users:edit** - Modify user accounts, roles, and status
- **users:delete** - Delete user accounts

Super-admin roles bypass specific permission checks but still follow security protocols.

## Security Features

### Access Control
- **Permission-based operations** - All actions respect RBAC system
- **Self-protection mechanisms** - Users cannot perform destructive actions on themselves
- **Account isolation** - Users can only manage accounts they have access to

### Data Integrity
- **Cascade handling** - Clean removal of relationships when deleting users
- **Validation checks** - Comprehensive input validation and business rule enforcement
- **Transaction safety** - Database operations use proper transaction boundaries

### Audit Readiness
- **Action logging** - All management operations designed for audit trail integration
- **Change tracking** - Comprehensive logging of who made what changes when
- **Security events** - Password resets, session revocations, and status changes logged

## Usage Patterns

### Common Administrative Tasks

#### **Onboarding New User**
1. Create user account (via `/accounts/[id]` → "Invite User")
2. Assign appropriate roles (via user role management)
3. Verify account access and permissions
4. Send welcome communications

#### **Role Changes**
1. Navigate to user detail page (`/users/[id]`)
2. Click "Manage Roles" button
3. Add/remove roles from specific account memberships
4. Verify effective permissions in permissions tab

#### **Security Incident Response**
1. Access user detail page (`/users/[id]`)
2. Click "Manage Status" button
3. Disable account and/or revoke all sessions
4. Force password reset if needed
5. Document actions for audit trail

#### **Account Cleanup**
1. Use role management to remove user from unnecessary accounts
2. Verify remaining permissions are appropriate
3. Consider account deactivation for inactive users

## Integration Points

### With Permission System
- **Real-time permission calculation** - Changes immediately affect user access
- **Role template integration** - Uses centralized role definitions
- **Scope-aware permissions** - Proper handling of global vs account-scoped access

### With Account Hierarchy
- **Parent-child relationships** - User access flows through account hierarchy
- **Subsidiary management** - Users can be moved between related accounts
- **Domain-based assignment** - Email domains can auto-assign users to accounts

### With Audit System
- **Change logging** - All modifications tracked with user, timestamp, and reason
- **Security events** - Authentication and authorization events logged
- **Compliance reporting** - Data structured for regulatory compliance

## Best Practices

### For Administrators
1. **Use least privilege principle** - Assign minimum necessary permissions
2. **Regular access reviews** - Periodically audit user permissions and account access
3. **Document role changes** - Maintain clear records of permission changes
4. **Monitor security events** - Watch for unusual login patterns or failures

### For Developers
1. **Always check permissions** - Every user management operation must validate access
2. **Use confirmation dialogs** - Destructive actions require user confirmation
3. **Provide clear feedback** - Users should understand the impact of their actions
4. **Handle errors gracefully** - Provide meaningful error messages and recovery options

### For Security
1. **Implement session timeout** - Active sessions should have reasonable limits
2. **Monitor failed attempts** - Track and respond to suspicious activity
3. **Regular permission audits** - Ensure permissions align with business needs
4. **Incident response planning** - Have procedures for account compromise scenarios

## Future Enhancements

### Planned Features
- **Bulk user operations** - Manage multiple users simultaneously
- **Advanced filtering** - Search and filter users by various criteria
- **Permission templates** - Quick-assign common permission sets
- **Integration with external identity providers** - SSO and directory integration

### Security Improvements
- **Multi-factor authentication** - Enhanced authentication requirements
- **Device management** - Track and manage user devices
- **Advanced session analytics** - Detailed session behavior analysis
- **Risk-based authentication** - Adaptive security based on user behavior

The user management system provides a solid foundation for enterprise-level user administration while maintaining security, usability, and audit compliance.