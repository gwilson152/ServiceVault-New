# Change Tracking

This document tracks significant changes and refactoring work done to the Service Vault application.

## Initial Configuration Wizard (2025-01-31)

### Overview
Implemented a comprehensive initial configuration wizard that appears when no admin users exist in the system. The wizard guides users through setting up their Service Vault installation with admin account creation, system configuration, email settings, and company information.

### Core Implementation

#### TypeScript Type System
- **`src/types/setup.ts`**: Complete type definitions for setup wizard
  - `SetupData`, `AdminAccountData`, `SystemConfigData`, `EmailConfigData`, `CompanyInfoData`
  - `SetupStatus` for setup requirement detection
  - `DEFAULT_SETUP_DATA` with sensible defaults
  - Validation functions with detailed error reporting

#### Settings Service Layer
- **`src/lib/settings.ts`**: Type-safe settings management service
  - CRUD operations for individual and bulk settings
  - Category-based organization (SYSTEM, EMAIL, COMPANY, SECURITY, FEATURES)
  - Setup completion detection via `isSetupRequired()`
  - Planned encryption support for sensitive values

#### API Endpoints
- **`/api/setup/status`**: Setup requirement detection
- **`/api/setup/complete`**: Complete setup process with validation and cleanup
- **`/api/settings`**: Full CRUD operations for settings management
- Admin-only access control with comprehensive error handling

#### UI Components
- **Setup Wizard** (`src/components/setup/SetupWizard.tsx`): Multi-step wizard with progress tracking
- **Setup Steps**: 6 individual step components with validation
  - Welcome step with feature overview
  - Admin account creation with security validation
  - System configuration (app name, URL, timezone, language)
  - Email configuration with SMTP settings and testing
  - Company information for invoicing
  - Review step with comprehensive data display

#### Custom UI Components
- **Checkbox Component** (`src/components/ui/checkbox.tsx`): Custom implementation without Radix UI dependency
- Form validation with real-time error display
- Progress indicators and step navigation

#### Login Page Integration
- **Setup Detection** (`src/app/page.tsx`): Automatic setup status checking
- Redirect to setup wizard when required
- Setup completion success messaging
- Loading states during status checks

### Database Schema
Settings stored in flexible key-value structure supporting:
- JSON values (strings, numbers, booleans, objects, arrays)
- Category organization for better management
- Encryption flag for future security enhancements

### Configuration Categories
- **System**: App name, URL, timezone, language, date format
- **Email**: SMTP configuration and notification settings
- **Company**: Business information for invoicing
- **Security**: Session timeout, password requirements, login limits
- **Features**: Time tracking, invoicing, API access toggles

### Security Features
- Password hashing with bcrypt (10 rounds)
- Admin-only API access for setup and settings
- Setup completion prevention of re-runs
- Input validation and sanitization
- Cleanup of partial data on setup failures

### User Experience
- Professional 6-step wizard with progress tracking
- Comprehensive form validation with helpful error messages
- Setup completion success messaging on login page
- Responsive design with dark mode support
- Loading states and error handling throughout

### Testing Considerations
- Manual testing checklist for all wizard functionality
- Error handling for network failures and validation errors
- Setup status detection accuracy
- Settings CRUD operations verification

This implementation provides a professional, secure first-run experience that properly initializes Service Vault installations with all necessary configuration while maintaining security best practices.

## Customer to Account Refactoring (2025-01-31)

### Overview
Major refactoring from "Customer" model to "Account" model with hierarchical support. This change enables both individual accounts and organizational accounts with multiple sub-users, improving flexibility for business use cases.

### Database Schema Changes

#### New Models Added
- **Account**: Replaces Customer model with hierarchical support
  - `accountType`: INDIVIDUAL | ORGANIZATION | SUBSIDIARY
  - `parentAccountId`: For hierarchical relationships
  - Self-referencing parent-child relationships

- **AccountUser**: Users associated with accounts
  - Can exist with or without login credentials
  - `userId`: Optional link to User table (null if no login)
  - `invitationToken` & `invitationExpiry`: For invitation system
  - `permissions`: JSONB for granular permissions

- **AccountPermission**: Fine-grained ABAC permissions
  - `scope`: "own" | "account" | "subsidiary" for visibility control
  - Links to AccountUser for user-specific permissions

#### Models Renamed/Updated
- **AuthAccount**: Renamed from Account (NextAuth model) to avoid conflicts
- **User**: Added `accountUserId` reference and `ACCOUNT_USER` role
- **Ticket**: Updated to reference `accountId` instead of `customerId`
- **Invoice**: Updated to reference `accountId` instead of `customerId`
- **AccountBillingRate**: Renamed from CustomerBillingRate
- **AccountSettings**: Renamed from CustomerSettings

#### Relationships Updated
- All foreign key relationships changed from `customerId` to `accountId`
- Added hierarchical account relationships (parent/child)
- AccountUser can optionally link to User for login capability

### Authentication System Changes

#### NextAuth Updates
- Enhanced session to include full account context
- Added account hierarchy data to JWT tokens
- Support for ACCOUNT_USER role alongside existing roles

#### Type Definitions
- Updated TypeScript definitions for better type safety
- Added AccountUser interface with proper typing
- Removed `any` types in favor of specific interfaces

#### Role Management
- Added ACCOUNT_USER role to existing ADMIN/EMPLOYEE roles
- Updated role-based access control throughout application
- Portal access now supports both CUSTOMER (legacy) and ACCOUNT_USER

### Invitation System Implementation

#### API Endpoints Created
- `POST /api/account-users/invite`: Create invitation for new account user
- `POST /api/account-users/accept-invitation`: Accept invitation and set password
- `GET /api/account-users/verify-invitation/[token]`: Verify invitation validity

#### Invitation Workflow
1. Admin creates AccountUser with email (no login initially)
2. System generates secure invitation token with expiration
3. Email invitation sent (ready for email integration)
4. User visits invitation link to set up credentials
5. User record created and linked to AccountUser
6. Account user can now login and access portal

#### Security Features
- Secure UUID-based invitation tokens
- Token expiration (7 days default)
- Password validation and hashing
- Prevention of duplicate activations

### User Interface Updates

#### Portal Changes
- Rebranded from "Customer Portal" to "Account Portal"
- Support for both legacy CUSTOMER and new ACCOUNT_USER roles
- Account context displayed in user interface
- Shows account name/type in user badge

#### Admin Dashboard Updates
- Updated statistics from "Total Customers" to "Total Accounts"
- Navigation updated to use "Accounts" instead of "Customers"
- Quick actions updated for account management
- Recent activity reflects account-based terminology

#### Settings Page Refactoring
- Created new `AccountSettingsSection` replacing `CustomerSettingsSection`
- Updated tab navigation and descriptions
- Added account type indicators and management features

#### New Account Management Page
- Created `/accounts` page for account overview
- Visual distinction between account types (Individual, Organization, Subsidiary)
- Account user status tracking (active, invited, pending)
- Search and filtering capabilities
- Account statistics and user previews

### Permission System (ABAC)

#### Granular Permissions
- **Own scope**: User can only see their own tickets
- **Account scope**: User can see all tickets for their account
- **Subsidiary scope**: User can see tickets from child accounts

#### Permission Storage
- Stored in `AccountUser.permissions` as JSONB
- Additional `AccountPermission` table for fine-grained control
- Default permission sets for new account users

### Data Migration & Testing

#### Seed Data Updates
- Created comprehensive test data with all account types
- Organization account (TechCorp Solutions) with multiple users
- Subsidiary account (TechCorp Europe) demonstrating hierarchy
- Individual account (Sarah Wilson) for freelancer use case
- Mixed user states: active logins and pending invitations

#### Test Scenarios Supported
- Hierarchical account relationships
- Users with and without login credentials
- Invitation acceptance workflow
- Permission-based ticket visibility
- Legacy role compatibility

### Backward Compatibility

#### Legacy Support
- Existing CUSTOMER role still supported
- Gradual migration path available
- No breaking changes to existing authentication flows

#### Migration Strategy
- Database schema reset for development (clean slate)
- Production migration script ready (pending implementation)
- Seed data demonstrates both old and new patterns

### Performance Considerations

#### Database Optimizations
- Proper indexing on new foreign key relationships
- JSONB fields for flexible permission storage
- Efficient queries for hierarchical data

#### Session Management
- Account context loaded once during authentication
- Cached hierarchy data to reduce database calls
- Optimized session payload size

### Security Enhancements

#### Invitation Security
- Cryptographically secure token generation
- Time-limited invitation tokens
- Secure password requirements and hashing

#### Access Control
- Fine-grained permission checking
- Hierarchical access validation
- Proper role-based route protection

### Future Enhancements

#### Email Integration
- SMTP configuration for invitation emails
- Email templates for professional invitations
- Notification system for account activities

#### Advanced Features
- Account billing aggregation across hierarchy
- Bulk user management operations
- Advanced reporting by account structure
- API endpoints for external integrations

### Files Modified

#### Database & Schema
- `prisma/schema.prisma`: Complete model refactoring
- `prisma/seed.ts`: Updated with new account structure

#### Authentication
- `src/lib/auth.ts`: Enhanced with account context
- `src/types/next-auth.d.ts`: Improved type definitions

#### API Routes
- `src/app/api/account-users/invite/route.ts`: New invitation endpoint
- `src/app/api/account-users/accept-invitation/route.ts`: New acceptance endpoint
- `src/app/api/account-users/verify-invitation/[token]/route.ts`: New verification endpoint

#### UI Components
- `src/app/dashboard/page.tsx`: Updated terminology and navigation
- `src/app/portal/page.tsx`: Enhanced for account users
- `src/app/portal/accept-invitation/page.tsx`: New invitation acceptance page
- `src/app/accounts/page.tsx`: New account management interface
- `src/app/settings/page.tsx`: Updated settings navigation
- `src/components/settings/AccountSettingsSection.tsx`: New account settings component

### Testing & Validation

#### Test Credentials
- Admin: admin@example.com / admin
- Employee: employee@example.com / employee
- Account Users:
  - john.doe@techcorp.com / john123 (Organization user)
  - sarah@freelance.com / sarah123 (Individual user)
- Pending Invitation: Token `invite_token_jane_123456`

#### Verification Steps
1. ✅ Database schema migration successful
2. ✅ Authentication system working with new roles
3. ✅ Portal access for account users
4. ✅ Admin dashboard reflects account terminology
5. ✅ Invitation workflow functional
6. ✅ Hierarchical account relationships working
7. ✅ Permission system operational
8. ✅ Legacy compatibility maintained

### Impact Assessment

#### Benefits Achieved
- **Flexibility**: Supports both individual and organizational accounts
- **Scalability**: Hierarchical structure accommodates complex business relationships
- **User Experience**: Streamlined invitation and onboarding process
- **Security**: Granular permission control with ABAC model
- **Maintainability**: Cleaner data model with proper relationships

#### Breaking Changes
- Database schema completely restructured (development reset required)
- Some API endpoints will need updates for production systems
- Legacy "Customer" terminology deprecated (but still functional)

#### Migration Considerations
- Production systems will need careful migration planning
- User communication about terminology changes
- Staff training on new account management features

---

## Hierarchical Selector Refactoring (2025-01-31)

### Overview
Major refactoring of the hierarchical account selector into a reusable, generic component architecture. This change enables consistent hierarchical data selection across the entire application while maintaining type safety and backward compatibility.

### Component Architecture Redesign

#### New Generic Components Created
- **HierarchicalSelector<T>** (`src/components/ui/hierarchical-selector.tsx`)
  - Generic TypeScript component for any hierarchical data type
  - Configurable display, filtering, and grouping options
  - Full-featured: search, type filtering, hierarchy visualization
  - Type-safe with TypeScript generics

#### Domain-Specific Implementations
- **AccountSelector** (`src/components/selectors/account-selector.tsx`)
  - Account-specific implementation of HierarchicalSelector
  - Pre-configured with account icons, badges, and filtering
  - Supports all account types (ORGANIZATION, SUBSIDIARY, INDIVIDUAL)
  - Enhanced UX with grouping and advanced search

- **SimpleAccountSelector** (`src/components/selectors/simple-account-selector.tsx`)  
  - Lightweight version for basic account selection needs
  - Customizable icons, hierarchy display, and type filtering
  - Perfect for simple dropdowns without advanced features

#### Backward Compatibility
- **HierarchicalAccountSelector** (refactored)
  - Maintained as deprecated wrapper around new AccountSelector
  - Ensures existing code continues to work without changes
  - Clear migration path documented

### User Experience Enhancements

#### Advanced Filtering & Search
- **Real-time search** across account names, company names, and hierarchy paths
- **Type-based filtering** with visual toggle buttons
- **Clear filters** functionality with result counts
- **Empty state handling** with helpful clear filter actions

#### Improved Hierarchy Visualization
- **Visual depth indicators** with proper indentation
- **Parent path breadcrumbs** for nested accounts
- **Grouping by account type** with section headers and counts
- **Consistent iconography** across all account types

#### Enhanced Interaction Design
- **Sticky search/filter header** for long lists
- **Keyboard navigation** support
- **Click-to-focus** behavior in search inputs
- **Loading and empty states** with appropriate messaging

### Implementation Updates

#### Pages Updated
1. **Time Tracking Page** (`src/app/time/page.tsx`)
   - Replaced basic Select with full AccountSelector
   - Enhanced account selection with hierarchy and filtering
   - Consistent UX with ticket creation page

2. **Create Account Dialog** (`src/components/accounts/CreateAccountDialog.tsx`)
   - Improved parent account selection with SimpleAccountSelector
   - Better hierarchy visualization for parent selection
   - Enhanced UX with helpful context descriptions

3. **Ticket Creation** (already using hierarchical selector)
   - Benefited from improved architecture
   - Enhanced performance and type safety

### Technical Improvements

#### Type Safety Enhancements
- **Full TypeScript generics** throughout component hierarchy
- **Proper interface definitions** for all data structures
- **Eliminated `any` types** in favor of specific interfaces
- **Type-safe configuration objects** for customization

#### Performance Optimizations
- **useMemo hooks** for expensive computations (hierarchy building, filtering)
- **Efficient search algorithms** with proper memoization
- **Optimized re-renders** with proper dependency tracking
- **Lazy evaluation** of search and filter operations

#### Code Organization
- **Separation of concerns** between generic and specific components
- **Reusable configuration patterns** for easy extension
- **Clean interfaces** for customization and extensibility
- **Consistent naming conventions** across component architecture

### Future Extensibility

#### Ready for New Use Cases
- **User selection** with team hierarchies
- **Category/subcategory** selection for tickets
- **Organization structure** navigation
- **Any tree-like data** selection needs

#### Configuration Examples
```typescript
// For departments/teams
<HierarchicalSelector<Department>
  items={departments}
  displayConfig={{
    getIcon: (dept) => <Users className="h-4 w-4" />,
    getGroup: (dept) => dept.type
  }}
  filterConfigs={[
    { key: 'type', getValue: (dept) => dept.type }
  ]}
/>

// For product categories
<HierarchicalSelector<Category>
  items={categories}
  displayConfig={{
    getIcon: (cat) => <Tag className="h-4 w-4" />,
    getBadge: (cat) => ({ text: cat.level, variant: 'outline' })
  }}
/>
```

### Files Created/Modified

#### New Files Created
- `src/components/ui/hierarchical-selector.tsx`: Generic hierarchical selector
- `src/components/selectors/account-selector.tsx`: Account-specific selector  
- `src/components/selectors/simple-account-selector.tsx`: Simple account selector

#### Files Modified
- `src/components/HierarchicalAccountSelector.tsx`: Refactored to use new architecture
- `src/app/time/page.tsx`: Enhanced account selection
- `src/components/accounts/CreateAccountDialog.tsx`: Improved parent selection
- `src/CLAUDE.md`: Updated architecture documentation

### Benefits Achieved

#### For Developers
- **Reusable components** reduce code duplication
- **Type-safe generics** prevent runtime errors
- **Consistent patterns** across the application
- **Easy to extend** for new hierarchical data types

#### For Users  
- **Consistent UX** across all account selection interfaces
- **Powerful filtering** and search capabilities
- **Clear hierarchy visualization** improves understanding
- **Better performance** with optimized rendering

#### For Maintainability
- **Single source of truth** for hierarchical selection logic
- **Centralized bug fixes** benefit all usage locations
- **Clear migration path** from legacy components
- **Well-documented architecture** for future developers

### Validation & Testing

#### Build & Lint Status
- ✅ Application builds successfully with no errors
- ✅ All TypeScript types compile correctly  
- ✅ ESLint passes with no new warnings
- ✅ Backward compatibility maintained

#### Component Testing
- ✅ AccountSelector works in ticket creation
- ✅ AccountSelector works in time tracking
- ✅ SimpleAccountSelector works in account creation
- ✅ Legacy HierarchicalAccountSelector still functional
- ✅ All filtering and search features operational

---

*Last updated: 2025-01-31*
*Author: Claude Code Assistant*