# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **time management and invoicing system** built with Next.js 15, Prisma, NextAuth, and SQLite. The app is designed for self-hosting and internal business use, enabling time tracking against tickets and generating invoices for internal records (not sent externally).

### Key Features

- Admin dashboard for time tracking, ticket management, and invoice generation
- Account portal for viewing tickets and time spent (permission-based)
- **Hierarchical account management** with visual parent-child relationships and dual view modes
- Comprehensive email template management with preview/edit/delete functionality
- Account-scoped role system with hierarchical permissions
- Manual and invitation-based user creation with status tracking
- Account user transfer between parent and child accounts
- Customizable ticket fields (system-wide and account-specific)
- Billing rates with account-specific overrides
- Cross-device timer synchronization
- Professional email service with template testing

## Technology Stack

- **Framework**: Next.js 15
- **Database**: SQLite (with options for other databases via Prisma)
- **ORM**: Prisma
- **Authentication**: NextAuth
- **UI Components**: Shadcn/UI
- **Styling**: Tailwind CSS
- **Environment**: Use `.env` (not `.env.local`)

## Development Commands

- `npm run dev` - Start development server - **NEVER START THIS COMMAND**. User will always start it manually, and the server is generally running with HMR already.
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema changes to database
- `npx prisma studio` - Open Prisma Studio

## Architecture Overview

### Directory Structure

```
/src
  /app                  # Next.js 15 app directory
    /dashboard          # Admin dashboard
    /portal             # Customer portal
    /settings           # Single-page settings with modular sections
    /api                # API routes
  /components
    /settings/          # Modular settings components
      BillingRatesSection.tsx
      TicketFieldsSection.tsx
      CustomerSettingsSection.tsx
      LicenseSection.tsx
      GeneralSettingsSection.tsx
    /selectors/         # Reusable selector components
      account-selector.tsx        # Account-specific hierarchical selector
      simple-account-selector.tsx # Simple account dropdown
    /ui/                # Shadcn/UI components & reusable UI patterns
      hierarchical-selector.tsx   # Generic hierarchical selector
    /accounts/          # Account management components
      AccountTreeView.tsx         # Tree-style hierarchical account display
      AccountHierarchyCard.tsx    # Enhanced cards with hierarchy indicators
      AccountViewToggle.tsx       # Grid/Tree view switcher
  /hooks
    useUserPreferences.ts    # User preferences management hook
    usePermissions.ts        # ABAC permission checking hooks
    useTimeEntryPermissions.ts # Time entry specific permissions
    useInvoicePermissions.ts   # Invoice-specific permission hooks
  /lib
    /licensing          # Licensing platform integration
  /utils
    hierarchy.ts        # Account hierarchy processing utilities
/prisma
  schema.prisma         # Database schema
/docs                   # Project documentation
```

### Core Database Entities

**Primary Tables:**

- `Users` - Admin, employee, and customer accounts with role-based access
- `Customers` - Customer information with custom fields (JSONB)
- `Tickets` - Support tickets with customizable fields and time tracking
- `TimeEntries` - Time tracking against tickets with no-charge option and billing rate integration
- `TicketAddons` - Parts/additions with price and quantity for billing
- `Invoices` - Generated invoices for internal records
- `BillingRates` - System-wide billing rates with time entry snapshots
- `CustomerBillingRates` - Customer-specific rate overrides
- `Timer` - Persistent cross-device timer state for real-time time tracking

**Settings Tables:**

- `SystemSettings` - App-wide configuration (custom fields as JSONB)
- `CustomerSettings` - Customer-specific settings and permissions
- `Permissions` - Granular permission control for customers

### Key Workflows

**Admin Workflow:**

1. Login → Dashboard → Time entry/ticket management
2. **Accounts page** → Hierarchical account management with Grid/Tree views
3. Settings page with modular sections (tabs/accordion layout)
4. Invoice generation from time entries and addons
5. User and customer management with account transfers

**Customer Workflow:**

1. Login → Portal dashboard → View own tickets
2. Create tickets with optional addons (if permitted)
3. View time spent on tickets (if permitted)
4. Limited access based on permissions

## Important Implementation Notes

### Settings Page Architecture

- Single page at `/settings` with modular sections
- Each section is a separate component in `/components/settings/`
- Use Shadcn/UI `<Tabs>` or `<Accordion>` for navigation
- Sections handle their own data fetching and mutations

### Custom Fields System

- Stored as JSONB in `SystemSettings` and `CustomerSettings`
- Supports text, select, and other field types
- Dynamic form generation based on field definitions
- Customer-specific field overrides

### Billing and Invoicing

- Time entries use billing rates (with customer overrides)
- Addons have price × quantity calculations
- No-charge time entries excluded from invoices
- Invoices are internal-only (not sent to customers)

### Permissions System

- Role-based access (ADMIN/EMPLOYEE/CUSTOMER)
- Granular permissions in `Permissions` table
- Customer time visibility controlled by settings
- ABAC (Attribute-Based Access Control) for time entry editing
- Enhanced permission checks for time tracking operations
- License tier may restrict certain features
- Invoice status management with granular permissions
- Date field editing permissions for invoices

### User Preferences System

- Database-backed user preferences with JSON storage
- Persistent filter settings across sessions
- Type-safe preference management with TypeScript
- Debounced auto-save to reduce API overhead
- Extensible system for adding new preference types
- User-specific defaults with fallback handling

### Timer System

- Persistent database-backed timers for cross-device synchronization
- One active timer per user per ticket constraint
- Real-time timer state with pause/resume functionality
- Global timer widget with stop-and-log workflow
- Automatic timer state recovery across browser sessions

### Licensing Integration

- Validate license on startup via external API
- Cache license status for offline use
- Enforce user limits and feature gates
- License section in settings for key management

## Security Considerations

- NextAuth middleware for role-based route protection
- Input sanitization for XSS/SQL injection prevention
- HTTPS required for production (via reverse proxy)
- API keys stored in environment variables
- Prisma transactions for data consistency

## Self-Hosting Setup

- Docker deployment with persistent SQLite volume
- Environment variables for database and licensing API
- Static asset bundling for offline operation
- Reverse proxy (e.g., Caddy) for HTTPS termination

## Development Guidelines

- Use Shadcn/UI components consistently
- Follow existing patterns for forms and tables
- Implement proper error handling and validation
- Use Prisma transactions for complex operations
- Index JSONB fields for custom field performance
- Document UI patterns for maintainability
- Implement debounced API calls for user preferences (500ms)
- Use proper useEffect dependency management to prevent infinite re-renders
- Leverage TypeScript for type-safe preference and permission systems

### UI Component Guidelines

#### Hierarchical Data Selection

- **Use `AccountSelector`** for account selection with hierarchy and filtering needs
- **Use `SimpleAccountSelector`** for basic account dropdowns without advanced features
- **Use `HierarchicalSelector<T>`** for other hierarchical data types (users, categories, etc.)
- **Avoid basic `<Select>`** components for hierarchical data - use the specialized selectors

#### Component Architecture

- **Generic components** in `/components/ui/` for reusable patterns
- **Specific implementations** in `/components/selectors/` for domain-specific use cases
- **Backward compatibility** maintained with deprecated wrapper components
- **TypeScript generics** used for type-safe reusable components

### Hierarchical Account System

- **Data Processing**: Use `/src/utils/hierarchy.ts` for building tree structures from flat account data
- **View Components**: `AccountTreeView` for tree display, `AccountHierarchyCard` for grid with hierarchy
- **View Management**: `AccountViewToggle` with localStorage persistence for user preferences
- **Account Navigation**: Settings button uses `?tab=settings` query parameter for direct tab access
- **User Transfer**: Move users between accounts within same hierarchy using API endpoints
- **Search Integration**: Use `searchAccountsInHierarchy()` for hierarchy-aware search functionality

### Documentation

- Create page-specific docs if appropriate in /docs/pages/{pageName.md}
- Create/update/refactor /docs/change-tracking.md as changes are implemented

**Core System Documentation:**
- **Timer System**: `/docs/timer-system.md` - Timer usage, API, and integration patterns
- **Hierarchical Accounts**: `/docs/hierarchical-accounts.md` - Account hierarchy system
- **Permissions**: `/docs/permissions.md` - Permission system architecture
- **Database Schema**: `/docs/database-schema.md` - Database structure and relationships
- **User Preferences**: `/docs/user-preferences.md` - User preference management system
- **Toast System**: `/docs/toast-system.md` - Notification system implementation
- **Setup Wizard**: `/docs/setup-wizard.md` - Initial system setup process

**Page-Specific Documentation:**
- **Dashboard**: `/docs/pages/dashboard.md`
- **Time Tracking**: `/docs/pages/time-tracking.md` & `/docs/pages/time.md`
- **Invoices**: `/docs/pages/invoices.md`
- **Billing**: `/docs/pages/billing.md`
- **Tickets**: `/docs/pages/tickets.md`
- **Settings**: `/docs/pages/settings.md`
- **Customer Portal**: `/docs/pages/customer-portal.md`
- **Permissions**: `/docs/pages/permissions.md`
- **Licensing**: `/docs/pages/licensing.md`

**Component Documentation:**
- **Action Bar**: `/docs/components/action-bar.md`

**Development Documentation:**
- **App Overview**: `/docs/app-overview.md` - High-level application structure
- **Change Tracking**: `/docs/change-tracking.md` - Recent changes and modifications
- **TODOs**: `/docs/todos.md` - Outstanding tasks and improvements
