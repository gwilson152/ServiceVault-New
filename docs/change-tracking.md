# Service Vault - Change Tracking

This document tracks major feature implementations and system enhancements.

## Enhanced Time Tracking System with User Preferences (2025-08-04)

### Overview
Complete overhaul of the time tracking page with advanced filtering, user preference persistence, and improved date logic. Enhanced user experience with comprehensive filter options and personalized settings.

### Key Features
- **Advanced Filtering System**: 8 different filter types with smart combinations
- **User Preferences Persistence**: Filter settings saved per user with database storage
- **Enhanced Date Logic**: Improved week calculations with Monday-first business weeks
- **Last 7 Days Filter**: Rolling window filter for more intuitive recent time viewing
- **Smart Filter Management**: Auto-save, clear all, and individual filter removal
- **Filter Results Summary**: Live statistics showing filtered vs total entries

### Database Schema Updates
- **User Preferences**: Added `preferences Json?` field to User model for storing user-specific settings
- **API Layer**: Complete preferences management system with GET/PUT/PATCH endpoints

### Filtering Capabilities
- **Period Filters**: Today, Last 7 Days, This Week (Mon-Sun), This Month, Custom Range, All Time
- **Status Filters**: Billing Status (Billable/Non-Billable), Approval Status, Invoice Status
- **Entity Filters**: Account, User, Ticket, Billing Rate selection
- **Advanced Options**: Collapsible section with detailed filtering options
- **Active Filter Display**: Visual badges showing all active filters with individual clear buttons

### Technical Improvements
- **Performance Optimization**: Fixed infinite re-render issues with proper useEffect dependency management
- **Smart Date Calculations**: Proper start-of-week logic with time normalization
- **Debounced Preferences**: 500ms debounce for preference saving to reduce API calls
- **Type Safety**: Full TypeScript support for all filter preferences
- **Memory Management**: Proper cleanup and memoization to prevent memory leaks

### Components Enhanced
- **TimeTrackingPage**: Complete filter system overhaul with preference integration
- **useUserPreferences**: New custom hook for managing user-specific settings
- **Filter UI**: Advanced filter interface with responsive design and smart interactions

### API Endpoints Created
- `GET /api/user/preferences`: Fetch user preferences with fallback defaults
- `PUT /api/user/preferences`: Update entire preferences object
- `PATCH /api/user/preferences`: Update specific preference keys

---

## Enhanced Invoice Management System (2025-08-02)

### Overview
Complete invoice lifecycle management system with status tracking, PDF export, item management, and comprehensive ABAC permission integration.

### Key Features
- **Invoice Status Workflow**: Full DRAFT → SENT → PAID lifecycle with business rule enforcement
- **Professional PDF Export**: Server-side PDF generation with jsPDF and automatic download
- **Dynamic Item Management**: Add/remove time entries and addons from draft invoices
- **ABAC Permission Integration**: Status-specific actions with granular permission control
- **ActionBar Integration**: Context-sensitive actions in shared navigation header
- **Shared Navigation**: Removed duplicate headers across all authenticated pages

### Components Enhanced
- `InvoiceDetailPage`: Complete overhaul with status management and ActionBar integration
- `useInvoicePermissions`: Enhanced hook with status-specific permission methods
- `ActionBarProvider`: Fixed infinite re-render issues with proper memoization
- `AppNavigation`: Consistent navigation system across all pages

### API Endpoints Created
- `POST /api/invoices/[id]/items`: Add time entries and addons to invoices
- `GET /api/invoices/[id]/available-items`: Fetch unbilled items for account
- `GET /api/invoices/[id]/pdf`: Generate and download professional invoice PDFs
- Enhanced `PUT /api/invoices/[id]`: Status management with transition validation
- Enhanced `DELETE /api/invoices/[id]`: Draft invoice deletion with cleanup

### Permission System Enhancements
- **New Invoice Permissions**: `MARK_SENT`, `MARK_PAID`, `UNMARK_PAID`, `EXPORT_PDF`
- **Enhanced Permission Registry**: Updated role-based permission templates
- **Status-Based Validation**: Server-side status transition enforcement
- **Account Scoping**: Proper account-based permission enforcement

### UI/UX Improvements
- **Status Indicators**: Clear status descriptions with color-coded badges
- **Empty States**: Helpful messages for invoices without items
- **Edit Mode**: Visual indicators for adding/removing items
- **ActionBar Actions**: Dynamic buttons based on invoice status and permissions
- **Error Handling**: Comprehensive error messages and loading states

### Documentation Updates
- **Invoice Workflow**: Documented status transitions and business rules
- **API Documentation**: Complete endpoint specifications with examples
- **Permission Guide**: Enhanced ABAC documentation with invoice-specific examples

---

## Hierarchical Account Management System (2025-08-02)

### Overview
Complete hierarchical account management system with visual parent-child relationships, dual view modes, and enhanced navigation capabilities.

### Key Features
- **Hierarchical Data Processing**: Tree structure building from flat account data with depth calculation
- **Dual View Modes**: Switchable Grid and Tree views with persistent user preferences
- **Visual Hierarchy Indicators**: Connecting lines, indentation, and hierarchy badges
- **Enhanced Search**: Search functionality across entire account hierarchy
- **Account Transfer**: Move account users between parent and child accounts
- **Functional Action Buttons**: Working settings and email actions for all accounts

### Components Created
- `AccountTreeView.tsx`: Tree-style list view with expand/collapse functionality
- `AccountHierarchyCard.tsx`: Enhanced cards showing parent-child relationships
- `AccountViewToggle.tsx`: View mode switcher with localStorage persistence
- `hierarchy.ts`: Utility functions for tree processing and statistics

### UI/UX Enhancements
- **Tree View**: Traditional tree structure with proper indentation and visual connectors
- **Hierarchical Grid**: Nested cards with connecting lines and hierarchy badges
- **Statistics Dashboard**: Account type breakdown and active user counts in header
- **Action Integration**: Settings button navigates to account details settings tab
- **Email Functionality**: Email button opens mailto with active account users

### API Enhancements
- Enhanced `/api/accounts/route.ts`: Added totalHours and billableHours calculations
- Updated `/api/accounts/[id]/route.ts`: Fixed Prisma query structure for child accounts
- Enhanced account user transfer endpoint with hierarchy validation

### Bug Fixes
- Fixed Prisma validation error: removed conflicting select/include clauses
- Fixed runtime TypeError in Move to Account functionality with proper null checking
- Added missing Badge import causing ReferenceError

---

## Email Template Management System (2025-08-01)

### Overview
Complete email template management system with creation, preview, editing, deletion, and comprehensive testing capabilities.

### Key Features
- **Template Creation**: Wizard with 4 pre-built suggestions and 60+ documented variables
- **Template Management**: Full CRUD operations with preview, edit, and delete functionality
- **Enhanced Testing**: Template selection in test emails with variable substitution
- **Professional Templates**: USER_INVITATION, ACCOUNT_WELCOME, TICKET_STATUS_CHANGE, PASSWORD_RESET

### Components Created
- `CreateEmailTemplateDialog.tsx`: Template creation wizard with suggestions
- `EmailTemplatePreviewDialog.tsx`: 4-tab preview system with live rendering
- `EditEmailTemplateDialog.tsx`: Full template editor with validation
- Enhanced `EmailSettingsSection.tsx`: Integration of all template functionality

### API Enhancements
- `POST /api/email/templates`: Create new templates
- `GET /api/email/templates/[id]`: Fetch individual template
- `PUT /api/email/templates/[id]`: Update templates with validation
- `DELETE /api/email/templates/[id]`: Delete with protection rules
- Enhanced `POST /api/email/test`: Template testing with variable substitution

### Bug Fixes
- Fixed `nodemailer.createTransporter` → `nodemailer.createTransport` method name
- Fixed Select component empty string value error with special `__basic_test__` value

---

## Enhanced Account User Management (2025-08-01)

### Overview
Added manual user creation and enhanced invitation management with proper RBAC controls and status tracking.

### Key Features
- **Manual User Creation**: Create users instantly with temporary passwords and welcome emails
- **Enhanced Invitations**: Re-send invitations with status tracking (Active, Invited, Expired)
- **RBAC Integration**: New permissions `users:create-manual` and `users:resend-invitation`
- **Status Management**: Visual indicators and contextual actions based on user status

### API Enhancements
- `POST /api/account-users/create-manual`: Manual user creation with email integration
- `POST /api/account-users/[id]/resend-invitation`: Re-send invitation functionality

### Components Enhanced
- `CreateAccountUserDialog.tsx`: Added manual creation mode toggle
- Enhanced account user list: Status indicators and action dropdowns

---

## Account-Scoped Role System (2025-01-31)

### Overview
Extended role management to support flexible account-scoped roles with granular permission scoping.

### Key Features
- **AccountUserRole Model**: Junction table for user-role assignments with scope information
- **Scope Hierarchy**: "subsidiary" > "account" > "own" permission resolution
- **Account Context**: Permission checking with account hierarchy navigation
- **Role Templates**: Account Manager, Subsidiary Manager, Account Viewer roles

### API Enhancements
- `GET/POST/DELETE /api/account-user-roles`: Complete CRUD for role assignments
- Enhanced permission checking with account context throughout system

### Components Created
- `AccountUserRoleManager.tsx`: Comprehensive role assignment interface
- Enhanced permissions page with account roles tab
- Account details integration with user roles management

---

## Previous Major Features

### Timer System Enhancement
- Cross-device timer synchronization with database persistence
- Real-time timer state management with pause/resume functionality
- Global timer widget with stop-and-log workflow

### RBAC Permission System
- Comprehensive role-based access control implementation
- Permission registry with granular action controls
- User permission management with bulk assignment capabilities

### Email Service Infrastructure
- Complete email service with SMTP configuration
- Email queue system with retry logic and status tracking
- Professional email templates with variable substitution

### Billing & Invoicing System
- Time entry billing with customer-specific rate overrides
- Invoice generation with addon support
- Account billing rate management

### Customer Portal
- Self-service portal for account users
- Ticket viewing and creation capabilities
- Time entry visibility controls