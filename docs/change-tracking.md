# Service Vault - Change Tracking

This document tracks major feature implementations and system enhancements.

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