# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Service Vault is a **time management and invoicing system** built with Next.js 15, Prisma, NextAuth, and PostgreSQL. Designed for self-hosting and internal business use.

### Key Features

- **ABAC Permission System** with role templates and super-admin capabilities
- **Hierarchical account management** with parent-child relationships  
- **Comprehensive user management** with role administration and security controls
- **Advanced role management** with effective permissions viewer and assignment interface
- Time tracking with cross-device timer synchronization
- Invoice generation with billing rate overrides
- Customizable ticket fields and email templates

📖 **Complete overview**: [`/docs/architecture/app-overview.md`](./docs/architecture/app-overview.md)

## Technology Stack

- **Framework**: Next.js 15
- **Database**: PostgreSQL (Prisma ORM)
- **Authentication**: NextAuth with ABAC integration
- **UI**: Shadcn/UI + Tailwind CSS
- **Environment**: `.env` (not `.env.local`)

## Development Commands

```bash
# NEVER START - User controls dev server
npm run dev        # Development server (user starts manually)

# Standard commands
npm run build      # Production build
npm run lint       # ESLint
npx prisma generate # Generate Prisma client
npx prisma db push  # Push schema changes
```

📖 **Complete workflow**: [`/docs/development/workflow.md`](./docs/development/workflow.md)

## Core Architecture

### Key Database Entities

- `User` + `AccountMembership` - Clean user-account relationships
- `RoleTemplate` + `SystemRole/MembershipRole` - ABAC permission system
- `Account` - Hierarchical business accounts with CSV domains
- `TimeEntry` + `Ticket` - Time tracking and work management
- `BillingRate` + `AccountBillingRate` - Two-tier billing system

### Directory Structure

```
/src
  /app                 # Next.js app directory
  /components
    /selectors/        # AccountSelector, etc.
    /accounts/         # Hierarchy display components
    /users/            # User management dialogs
    /layout/           # Navigation with permissions
  /hooks
    usePermissions.ts  # ABAC permission hooks
    useUserPreferences.ts # Database-backed preferences
  /lib/permissions/    # Permission service & middleware
/docs                  # Comprehensive documentation
```

## Critical Implementation Guidelines

### Permission System (ABAC)

**✅ Always Use:**
```typescript
const { canViewUsers, canEditAccounts } = usePermissions();
const canEdit = await permissionService.hasPermission({
  userId, resource: 'accounts', action: 'edit'
});
```

**❌ Never Use:**
```typescript
if (user.role === 'ADMIN') { } // Hard-coded roles forbidden
```

📖 **Complete guide**: [`/docs/system/permissions.md`](./docs/system/permissions.md)

### UI Component Guidelines

**✅ Use Specialized Selectors:**
```typescript
<AccountSelector 
  accounts={accounts}
  value={selected}
  onValueChange={setSelected}
  allowClear={true}
/>
```

**❌ Don't Use Basic Select for Hierarchical Data:**
```typescript
<Select>{accounts.map(...)}</Select> // Use AccountSelector instead
```

📖 **Complete guide**: [`/docs/ui/ui-design-principles.md`](./docs/ui/ui-design-principles.md)

### Layout Standards

All pages must use consistent container structure:
```typescript
<main className="max-w-7xl mx-auto p-6">
  <div className="space-y-6">
    {/* Page content */}
  </div>
</main>
```

### API Route Pattern

```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const canView = await permissionService.hasPermission({
    userId: session.user.id, resource: 'resource', action: 'view'
  });
  if (!canView) return NextResponse.json({error: 'Forbidden'}, {status: 403});

  // Business logic with permission filtering
  const data = await applyPermissionFilter(userId, 'resource', query, 'id');
  return NextResponse.json(data);
}
```

## Key Systems

### Settings Architecture
Unified SystemSettings with permission controls and type safety
📖 [`/docs/system/settings-architecture.md`](./docs/system/settings-architecture.md)

### User Preferences
Database-backed with 500ms debounced auto-save
📖 [`/docs/system/user-preferences.md`](./docs/system/user-preferences.md)

### Timer System  
Cross-device synchronization with persistent state
📖 [`/docs/system/timer-system.md`](./docs/system/timer-system.md)

### Billing System
Two-tier rates: system defaults + account overrides
📖 [`/docs/features/billing.md`](./docs/features/billing.md)

## Documentation

**📚 Start here**: [`/docs/index.md`](./docs/index.md) - Complete documentation index

**Essential reads for development:**
- [`/docs/development/workflow.md`](./docs/development/workflow.md) - Development standards
- [`/docs/system/permissions.md`](./docs/system/permissions.md) - Permission system  
- [`/docs/ui/ui-design-principles.md`](./docs/ui/ui-design-principles.md) - UI standards

## Current Status

**✅ COMPLETED (Major RBAC → ABAC Migration + User Management):**
- Permission system overhaul with RoleTemplate architecture
- Database migration to PostgreSQL with clean schema
- Comprehensive user management system with role administration
- Advanced user management dialogs (UserRoleManagementDialog, UserStatusManagementDialog)
- Complete user security controls (enable/disable, password reset, session management)
- Effective permissions viewer with human-readable displays
- All critical API endpoints updated with permission filtering
- Navigation and page layouts updated for new system

**📋 Current Tasks:** [`/docs/development/todos.md`](./docs/development/todos.md)

## Important Reminders

- **Documentation is required** - Always update `/docs/` when making changes
- **Never hard-code roles** - Always use PermissionService
- **Use specialized components** - AccountSelector for accounts, etc.
- **Follow layout patterns** - Consistent container structure
- **Permission-first development** - Check permissions before any operation

---

**Complete documentation available at** [`/docs/index.md`](./docs/index.md)
