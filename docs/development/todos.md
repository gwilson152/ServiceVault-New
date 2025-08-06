# TODOs - Permission System Implementation

## Overview

This document tracks the progress of the major permission system overhaul completed on 2025-08-05. The system has been migrated from a fragmented User/AccountUser structure to a clean ABAC (Attribute-Based Access Control) system with PostgreSQL.

### Previous System Issues

- Fragmented User/AccountUser dual structure causing data inconsistency
- Hard-coded admin roles without flexibility
- No server-side permission filtering (client-side only)
- N+1 query problems with permission checks
- Role-based access control (RBAC) was too rigid
- React Hook violations causing infinite re-renders
- SQLite limitations for complex relationships

### Current System Architecture

The new system implements a clean ABAC (Attribute-Based Access Control) pattern with:

**Core Tables:**

- `User` - Primary user entity with email, name, profile
- `Account` - Business accounts with hierarchy support and CSV domains field
- `RoleTemplate` - Permission templates with `inheritAllPermissions` super-admin flag
- `AccountMembership` - Junction table for User ↔ Account relationships with role assignment
- `Permission` - Granular permissions (resource, action, accountId scope)

**Key Services:**

- `PermissionService` (`/src/lib/permissions/permissionService.ts`) - Core permission logic with caching
- `withPermissions` middleware (`/src/lib/permissions/withPermissions.ts`) - API route protection
- `usePermissions` hook (`/src/hooks/usePermissions.ts`) - React integration with TanStack Query

**Permission Model:**

```typescript
// Example permission check
await permissionService.hasPermission({
  userId: "user-id",
  resource: "time-entries",
  action: "create",
  accountId: "account-id", // Optional scope
});
```

## ✅ Completed Tasks

### Infrastructure & Database Migration

- [x] Fixed React Hook Rules violations in billing page by properly ordering useCallback hooks
- [x] Fixed infinite query loops in time page by reordering function definitions and fixing useEffect dependencies
- [x] Migrated to clean PostgreSQL schema with optimized relationships
- [x] Removed fragmented User/AccountUser structure
- [x] Created clean schema with RoleTemplate and AccountMembership tables
- [x] Deleted legacy migrations folder as requested
- [x] Successfully ran schema migration and seed data
- [x] Fixed TimeEntryApprovalWizard component to use synchronous permission values instead of async functions
- [x] Fixed infinite query loop on /time page by removing unstable dependencies and fixing user preferences
- [x] Removed old permission API endpoints (/api/permissions/check, /api/permissions/check-batch)
- [x] Migrated remaining hooks (useTimeEntryPermissions, useCanApproveTimeEntries) to new permission system
- [x] Fixed invoices API schema mismatch - changed ticketAddon to addon field
- [x] Added missing ticket permissions (canCreateTickets, canEditTickets, canDeleteTickets) to usePermissions hook
- [x] Fixed all stableFetchTimeEntries references in /time page
- [x] Fixed permission service format inconsistencies - standardized all API endpoints to use object format
- [x] Fixed users API schema mismatch - permissions field is String[] not relation
- [x] Fixed Next.js 15 async params warnings - updated API routes and client components
- [x] Implemented complete role template management system with super-admin controls

### Permission System Implementation

- [x] Implemented comprehensive PermissionService class with:
  - Super-admin support via `inheritAllPermissions` flag
  - 5-minute permission caching to prevent N+1 queries
  - Server-side filtering capabilities
- [x] Created `withPermissions` middleware for API route protection
- [x] Updated `usePermissions` hook to use TanStack Query with caching
- [x] Removed hard-coded admin role system

### API Endpoints Migration

- [x] Updated `/api/time-entries` - Server-side filtering and new permission checks
- [x] Updated `/api/accounts` - Permission-based filtering with hierarchy support
- [x] Updated `/api/tickets` - Removed role-based logic, added permission filtering
- [x] Updated `/api/invoices` - Server-side filtering and account-specific permissions
- [x] Updated `/api/users` - Updated for new schema without Role enum
- [x] Updated `/api/billing/rates` - Already had new permission system
- [x] Completely rewrote `/api/account-users` for AccountMembership schema
- [x] Updated `/api/dashboard/stats` - Permission filtering for all dashboard data
- [x] Fixed variable naming conventions (canViewUsers → canView)

### Database & Seeding

- [x] Generated Prisma client successfully
- [x] Database schema pushed and synchronized
- [x] Seeded database with default role templates and system settings
- [x] Updated default billing rates to new structure (Standard $90, Critical $130, Travel $50, Development $65)

### Core System Updates

- [x] Fixed SystemSettings schema mismatch - removed jsonValue field references
- [x] Fixed NextAuth login after setup - updated to work with new User/SystemRole schema
- [x] Built unified user management interface with AccountMembership model
- [x] Updated navigation system to use permission-based access instead of hard-coded roles
- [x] Created comprehensive user detail page with view/edit/delete functionality at `/users/[id]`
- [x] Added account parent assignment/reassignment functionality to `/accounts` page with circular reference prevention

## 🔄 Remaining Tasks

### 1. Frontend Page Updates (COMPLETED)

**Priority**: High - COMPLETED ✅
**Description**: All frontend pages updated to work with new permission system

**Completed Page Updates**:

#### Core Application Pages:

- [x] `/dashboard` - Updated to use new permission checks and user context
- [x] `/time` - Removed old role-based logic, uses PermissionService
- [x] `/accounts` and `/accounts/[id]` - Updated account management with new schema + parent assignment
- [x] `/users` and `/users/[id]` - Complete user management with detail pages
- [x] `/tickets` - Updated ticket management with new permission model
- [x] `/billing` - Updated billing pages with new permission checks
- [x] `/invoices/[id]` - Updated invoice pages with new user relationships
- [x] `/reports` - Updated reporting with new permission filtering
- [x] `/settings` - Updated settings access with new permission model
- [x] `/permissions` - Updated permission management page for new ABAC system

#### Portal Pages:

- [x] `/portal` (dashboard) - Updated customer portal with new schema
- [x] `/portal/tickets` - Updated portal ticket view with new permissions
- [x] `/portal/accept-invitation` - Updated invitation acceptance with new schema

#### Authentication:

- [x] `/` (main login page) - Ensured compatibility with new auth system
- [x] `/setup` - Updated setup wizard for new permissions and user conventions

**Completed Updates**:

- [x] Replaced hard-coded role checks (`user.role === 'ADMIN'`) with permission checks
- [x] Updated user context usage to new session structure (`user.systemRoles`, `user.memberships`)
- [x] Replaced old API endpoints with updated ones
- [x] Updated components to use new permission hooks
- [x] Fixed database field references that changed in the schema migration
- [x] Created comprehensive documentation structure in `/docs/` with maintenance requirements
- [x] Added AccountSelector with clear functionality for hierarchical data selection
- [x] Fixed padding and layout consistency across all pages

### 1. Role Template Management UI

**Priority**: Medium
**Description**: Create interface for managing role templates with super-admin controls

**Current State**: RoleTemplate system exists in database with seeded default templates. No management UI exists.

**Seeded Role Templates** (from `prisma/seed.ts`):

- Super Admin (`inheritAllPermissions: true`)
- Account Admin (full account-level permissions)
- Manager (time tracking + user management)
- Employee (basic time tracking)tt
- Customer (view-only access)

**Implementation Details**:

- Create `/src/app/roles/page.tsx` for role template management
- Implement role template CRUD operations using new PermissionService
- Add permission assignment interface with logical grouping (time-entries, accounts, etc.)
- Include super-admin controls for `inheritAllPermissions` flag
- Add role assignment preview/validation before saving
- Support for role template duplication and customization

**Database Schema Context**:

```sql
-- RoleTemplate table structure:
id SERIAL PRIMARY KEY,
name VARCHAR(100) NOT NULL,
description TEXT,
inheritAllPermissions BOOLEAN DEFAULT false, -- Super-admin flag
createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP

-- Permission table structure:
id SERIAL PRIMARY KEY,
roleTemplateId INT REFERENCES RoleTemplate(id),
resource VARCHAR(50) NOT NULL, -- 'time-entries', 'accounts', etc.
action VARCHAR(50) NOT NULL,   -- 'create', 'read', 'update', 'delete'
accountId VARCHAR(50),         -- Optional scope to specific account
```

**Key Features Needed**:

- Role template list with search and filtering
- Permission matrix interface for easy permission assignment
- Super-admin toggle with appropriate warnings
- Role usage tracking (which users have which roles)
- Permission conflict detection and resolution

### 2. Domain-Based User Assignment

**Priority**: Medium  
**Description**: Implement automatic user assignment based on email domains

**Current State**: Account table has `domains` CSV field ready for implementation. No UI or logic exists yet.

**Implementation Details**:

- Utilize the `domains` CSV field on Account table (format: "company.com,subsidiary.org")
- Create domain matching algorithm for user registration/invitation
- Add domain management UI in account settings page
- Implement fallback logic for unmatched domains (default account or manual assignment)
- Add validation for domain format and conflicts between accounts

**Database Schema Context**:

```sql
-- Account table already has:
domains TEXT, -- CSV format: "domain1.com,domain2.org"
```

**Implementation Steps**:

1. Create domain matching service in `/src/lib/services/domainService.ts`
2. Update user invitation/registration to automatically assign accounts
3. Add domain management section to `/src/app/dashboard/accounts/[id]/page.tsx`
4. Implement conflict resolution for overlapping domains
5. Add domain validation and normalization

**Integration Points**:

- User registration/invitation flows
- Account settings page
- User creation APIs (`/api/account-users/invite`, `/api/account-users/create-manual`)

### 3. API Schema Migration Completion

**Priority**: Low
**Description**: Complete migration from AccountUser to User/AccountMembership schema

**Current State**: Most API endpoints updated, only minor legacy references may remain

**Remaining Work**:

- Audit remaining API endpoints for any legacy AccountUser references
- Update any remaining hard-coded references to old schema fields
- Comprehensive testing of all API endpoints with new schema

### 4. Account Billing Rate Override Logic

**Priority**: Medium
**Description**: Implement account-specific billing rate overrides in time entry creation

**Current State**: Account billing rate tables exist but logic not implemented in time entry workflows

**Implementation Details**:

- Add billing rate override selection in time entry forms
- Implement fallback logic (account override → default rate)
- Update time entry API to handle account-specific rates
- Add billing rate management UI for account administrators

### 5. Performance Optimizations

**Priority**: Low
**Description**: Add additional caching and performance improvements
**Implementation Details**:

- Implement Redis caching for frequently accessed permissions
- Add database query optimization and indexing
- Implement lazy loading for large permission sets
- Add performance monitoring and metrics
- Optimize TanStack Query cache strategies

### 6. File Documentation

**Priority**: Low
**Description**: Add comprehensive file overviews to all created/edited files
**Implementation Details**:

- Add header comments explaining file purpose
- Document integration points and dependencies
- Include usage examples where appropriate
- Document API contract for service classes
- Add JSDoc comments for public methods

## Key Technical Improvements Implemented

### Architecture Changes

- **Clean M:M Relationships**: AccountMembership junction table replaces fragmented structure
- **ABAC Permission System**: Role templates with granular permissions
- **Server-Side Filtering**: Reduces data transfer and improves security
- **Domain Infrastructure**: CSV domains field ready for auto-assignment

### Performance Improvements

- **Permission Caching**: 5-minute cache prevents N+1 queries
- **Optimized Queries**: Proper indexing and relationship management
- **Type-Safe Management**: TanStack Query integration with TypeScript

### Security Enhancements

- **No Hard-Coded Roles**: Uses RoleTemplate with `inheritAllPermissions`
- **Consistent Error Handling**: Proper validation across all endpoints
- **Server-Side Permission Checks**: Data filtering at API level

## Next Phase Planning

The core infrastructure is now solid and ready for the next development phase. The remaining tasks can be built incrementally on top of this foundation without requiring additional major architectural changes.

## Current System Status

### Files Modified in Permission Overhaul

**Key Service Files:**

- `/src/lib/permissions/permissionService.ts` - Core permission logic with caching
- `/src/lib/permissions/withPermissions.ts` - API middleware for route protection
- `/src/hooks/usePermissions.ts` - React hook for permission checks
- `/src/hooks/useTimeEntryPermissions.ts` - Specialized time entry permissions

**Updated API Routes:**

- `/src/app/api/time-entries/route.ts` - Complete rewrite with server-side filtering
- `/src/app/api/accounts/route.ts` - Permission-based account access
- `/src/app/api/tickets/route.ts` - Removed role-based logic
- `/src/app/api/invoices/route.ts` - Server-side filtering by account access
- `/src/app/api/users/route.ts` - Updated for new schema
- `/src/app/api/account-users/route.ts` - Complete rewrite for AccountMembership
- `/src/app/api/dashboard/stats/route.ts` - Permission filtering for all stats

**Database Schema:**

- PostgreSQL with clean relationships
- No legacy User/AccountUser fragmentation
- RoleTemplate with super-admin support
- AccountMembership junction table for M:M relationships

### Testing & Validation Status

- ✅ Database schema migration successful
- ✅ Prisma client generation working
- ✅ Default role templates seeded
- ✅ API endpoints returning expected data
- ✅ Frontend integration completed and tested
- ✅ All major pages migrated to new permission system
- ✅ User management system fully functional
- ✅ Account hierarchy management with parent assignment
- ❓ Permission caching performance validation needed
- ❓ Load testing with large datasets needed

**Recommended Implementation Order for Remaining Tasks**:

1. **Role Template Management UI** (provides admin flexibility)
   - Priority: MEDIUM - Admins need way to customize roles beyond seeded defaults
   - Dependencies: Current permission system is sufficient foundation
2. **Domain-Based User Assignment** (improves user onboarding)
   - Priority: MEDIUM - Quality of life improvement for large organizations
   - Dependencies: Current user management system
3. **API Schema Migration Completion** (technical debt cleanup)
   - Priority: MEDIUM - Remove remaining legacy references
   - Dependencies: Testing and validation of existing endpoints
4. **Account Billing Rate Override Logic** (business feature enhancement)
   - Priority: MEDIUM - Adds billing flexibility for different account types
   - Dependencies: Current billing system and account management
5. **Performance Optimizations** (scales with usage)
   - Priority: LOW - Current caching is sufficient for most use cases
6. **Documentation Updates** (maintains code quality)
   - Priority: LOW - Can be done incrementally as features are added
