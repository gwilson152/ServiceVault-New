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

### Recent Updates and Fixes

#### Setup Detection Logic Refinement
- **Fixed setup trigger condition**: Setup wizard now only appears when **no users exist** in database
- Previously checked for admin users and settings; now uses simple user count check
- Ensures setup wizard only runs on completely fresh installations
- Updated both `/api/setup/status` endpoint and `settingsService.isSetupRequired()` for consistency

#### SMTP Configuration Improvements  
- **Made SMTP credentials optional** (username/password not required)
- Updated validation to support unauthenticated SMTP servers
- Enhanced UI with clear guidance about when authentication is needed
- Updated configuration tips to include local/internal server examples

#### Enhanced Error Handling
- **Duplicate email detection** prevents setup conflicts
- Added pre-flight check for existing users before account creation
- User-friendly error messages with actionable resolution guidance
- Improved form validation with proper browser autocomplete attributes

#### Security and UX Enhancements
- Fixed infinite re-render issues with proper React memoization
- Added proper form elements for password fields (browser compliance)
- Enhanced error handling throughout setup flow
- Comprehensive input validation with helpful user feedback

This implementation provides a professional, secure first-run experience that properly initializes Service Vault installations with all necessary configuration while maintaining security best practices and handling edge cases gracefully.

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

## Multi-Timer System Implementation (2025-08-01)

### Overview
Complete implementation of a multi-timer system with real-time time tracking, persistent cross-device synchronization, and coordinated UI components. Users can now run multiple concurrent timers with proper state management and seamless coordination between different UI components.

### Core Features Implemented

#### Multi-Timer Architecture
- **Horizontal Timer Stack**: Persistent timer widget at bottom of screen with horizontal scrolling
- **Multiple Concurrent Timers**: Support for multiple active timers (one per ticket per user)
- **Auto-Expansion Logic**: Timer cards automatically expand when actions occur from external sources
- **Real-Time Synchronization**: Timer state synchronized across all UI components

#### Timer Lifecycle Management
- **Start Timer**: Creates new database timer with `isRunning: true`
- **Pause Timer**: Accumulates elapsed time in `pausedTime` field, sets `isRunning: false`
- **Resume Timer**: Continues from previous `pausedTime`, sets `isRunning: true`
- **Stop Timer**: Calculates total time, triggers time entry modal, deletes timer after logging

#### Cross-Component Coordination
- **Global Event System**: Components register callbacks for timer state changes
- **Pending Stop Result**: Global coordination for stop-and-log workflow
- **Auto-Refresh**: All timer-related UI updates automatically across the application
- **Modal Coordination**: Time entry modals appear correctly regardless of where timer is stopped

### Technical Implementation

#### Database Schema
```sql
Timer {
  id: string (UUID primary key)
  userId: string (foreign key to User)
  ticketId: string (foreign key to Ticket)
  startTime: DateTime
  pausedTime: number (accumulated seconds)
  isRunning: boolean
  createdAt: DateTime
  updatedAt: DateTime
}

-- Constraint: One timer per user per ticket
UNIQUE(userId, ticketId)
```

#### Component Architecture
- **TimeTrackingProvider**: Global state management with React Context
- **MultiTimerWidget**: Horizontal stack of active timers at screen bottom
- **TimerCard**: Individual timer display with minimized/expanded states
- **QuickTimeEntry**: Timer controls integrated into ticket lists

#### API Endpoints
- `GET /api/timers/active/all`: Returns all active timers (running or paused with time > 0)
- `POST /api/timers`: Creates and starts new timer for a ticket
- `PUT /api/timers/[id]`: Updates timer state (pause, resume, stop)
- `DELETE /api/timers/[id]`: Deletes timer (cleanup after time logging)

### User Experience Features

#### Smart Button States
- **No Timer**: Shows Play button (▶️)
- **Running Timer**: Shows Pause (⏸️) and Stop (⏹️) buttons
- **Paused Timer**: Shows Resume (▶️) and Stop (⏹️) buttons

#### Visual States
- **Running Timers**: Green border, real-time incrementing display
- **Paused Timers**: Yellow border, shows accumulated time
- **Expanded Timers**: Blue border, full controls and information

#### Automatic UI Updates
- **Global Refresh System**: All components auto-refresh when timers change
- **Modal Dismissal Handling**: UI updates properly when time entry modals are canceled
- **Cross-Page Synchronization**: Timer changes on one page immediately reflect on other pages

### Real-Time Features

#### Client-Side Timer Display
- **Live Incrementing**: Running timers increment every second in UI
- **Persistent State**: Timer state maintained across browser sessions
- **Cross-Device Sync**: Timer state synchronized via database across devices

#### Global Event Coordination
```javascript
// Components register for timer events
const unregister = registerTimerLoggedCallback(() => {
  refreshTickets(); // Auto-refresh when any timer is logged
});
```

### Security & Data Integrity

#### Database Constraints
- **One Timer Per User Per Ticket**: Prevents timer conflicts
- **Automatic Cleanup**: Timers deleted after successful time logging
- **Transaction Safety**: Prisma transactions ensure data consistency

#### Permission Checks
- **User Ownership**: Users can only control their own timers
- **Ticket Access**: Timer creation respects ticket access permissions
- **Role-Based Access**: Admin/Employee roles required for timer operations

### Performance Optimizations

#### Efficient State Management
- **Batched Updates**: Timer refreshes are batched to avoid excessive API calls
- **Memoized Computations**: Heavy operations cached with React useMemo
- **Optimized Re-renders**: Components only re-render when necessary

#### Database Optimizations
- **Indexed Queries**: Proper indexing on userId and ticketId combinations
- **Efficient Queries**: Single query fetches all timer data with relationships
- **JSONB Fields**: Flexible data storage for future enhancements

### Error Handling & Edge Cases

#### Timer Conflicts
- **Duplicate Prevention**: Cannot start timer if one already exists for ticket
- **Clear Error Messages**: User-friendly feedback for conflicts
- **Graceful Degradation**: Failed operations don't break UI state

#### Network & Database Issues
- **Retry Logic**: Failed timer operations can be retried
- **Consistent State**: Database transactions prevent inconsistent states
- **Error Recovery**: UI recovers gracefully from API failures

### Integration Points

#### Time Entry System
- **Seamless Integration**: Timers integrate with existing time entry workflow
- **Billing Rate Support**: Timer-logged entries support billing rates
- **Custom Fields**: Time entries include all standard fields (description, date, etc.)

#### Notification System
- **Global Events**: Timer actions trigger application-wide refresh events
- **Component Callbacks**: Direct callbacks for immediate UI updates
- **Debug Logging**: Comprehensive logging for troubleshooting

### Files Created/Modified

#### Core Components
- `src/components/time/MultiTimerWidget.tsx`: Main horizontal timer stack component
- `src/components/time/TimerCard.tsx`: Individual timer display with states
- `src/components/time/TimeTrackingProvider.tsx`: Enhanced global state management
- `src/components/time/QuickTimeEntry.tsx`: Updated with proper button states

#### API Routes
- `src/app/api/timers/route.ts`: Timer creation endpoint
- `src/app/api/timers/[id]/route.ts`: Timer state management (pause/resume/stop)
- `src/app/api/timers/active/all/route.ts`: Fetch all active timers
- `src/app/api/time-entries/route.ts`: Enhanced with timer cleanup

#### Application Integration
- `src/app/providers.tsx`: Updated to use MultiTimerWidget
- `src/app/tickets/page.tsx`: Added global timer event listeners
- `src/app/time/page.tsx`: Added global timer event listeners

#### Database Updates
- `prisma/schema.prisma`: Timer model with proper constraints
- Database migrations for Timer table creation

### Documentation
- **Comprehensive Guide**: `/docs/timer-system.md` with usage, API, and integration patterns
- **Component Documentation**: Detailed prop interfaces and usage examples
- **Troubleshooting Guide**: Common issues and debugging techniques

### Testing & Validation

#### Manual Testing Scenarios
- ✅ Multiple concurrent timers on different tickets
- ✅ Timer state persistence across page navigation
- ✅ Button states correctly reflect timer states in ticket lists
- ✅ Stop button from ticket list shows time entry modal
- ✅ Modal dismissal properly updates UI state
- ✅ Global refresh system updates all components
- ✅ Real-time timer display increments correctly
- ✅ Pause/resume functionality works correctly

#### Edge Cases Handled
- ✅ Timer conflicts (one per user per ticket)
- ✅ Network failures during timer operations
- ✅ Modal dismissal without logging time
- ✅ Browser refresh with active timers
- ✅ Cross-device timer synchronization

### Impact Assessment

#### Benefits Achieved
- **Enhanced Productivity**: Users can track time on multiple tickets simultaneously
- **Improved UX**: Consistent timer controls across all pages
- **Data Accuracy**: Real-time tracking reduces manual time entry errors
- **Professional Feel**: Smooth, coordinated UI interactions

#### Performance Impact
- **Minimal Overhead**: Efficient state management with optimized queries
- **Real-Time Updates**: Client-side timer increments don't impact server
- **Scalable Architecture**: Supports many concurrent users with multiple timers

#### Future Enhancements Ready
- **WebSocket Integration**: Real-time cross-device updates
- **Timer Analytics**: Detailed time tracking reports
- **Mobile App Support**: API-ready for mobile timer applications
- **Advanced Features**: Timer goals, reminders, and productivity metrics

## ABAC Time Entry Management System Implementation (2025-08-01)

### Overview
Complete implementation of a comprehensive time entry management system with ABAC (Attribute-Based Access Control) permissions, invoice protection, approval workflows, and a global action bar system. This replaces crude role-based checks with granular permission-based access control.

### Core Features Implemented

#### ABAC Permission System
- **Granular Permissions**: Replaced `role === 'ADMIN'` checks with specific permissions
- **Permission Hierarchy**: TIME_ENTRIES.VIEW, CREATE, UPDATE, DELETE, APPROVE + BILLING.VIEW
- **Client-Side Hooks**: `usePermissions()` and `useTimeEntryPermissions()` for UI components
- **API Protection**: All endpoints use `hasPermission()` instead of role checks
- **Permission Caching**: Client-side permission caching to minimize API calls

#### Invoice Protection & Rate Locking
- **Invoice Association Checks**: Time entries linked to invoices become permanently locked
- **Rate Locking on Approval**: Billing rate values are saved when entries are approved
- **Visual Indicators**: Clear lock icons and status messages for protected entries
- **API Enforcement**: Comprehensive protection at database level

#### Time Entry Management
- **Edit Dialog**: Full-featured editing with permission validation and invoice protection
- **Approval Wizard**: Step-by-step workflow with skip functionality and inline editing
- **Permission-Based UI**: Actions only visible when user has appropriate permissions
- **Real-Time Updates**: Changes reflected immediately across all components

#### Global Action Bar System
- **ActionBarProvider**: React Context for managing global page actions
- **Dynamic Actions**: Pages can add/remove actions that appear in the app header
- **Permission-Aware**: Actions conditionally shown based on user permissions
- **Responsive Design**: Actions adapt to screen size with tooltips

### Technical Implementation

#### New Components Created
- **`usePermissions` Hook** (`src/hooks/usePermissions.ts`)
  - Client-side ABAC permission checking with caching
  - Specialized `useTimeEntryPermissions` for context-aware checks
  - Batch permission checking for performance

- **TimeEntryEditDialog** (`src/components/time/TimeEntryEditDialog.tsx`)
  - Full CRUD functionality with ABAC validation
  - Invoice protection and lock status display
  - Field-level permissions (billing rates, etc.)
  - Real-time permission checks

- **TimeEntryApprovalWizard** (`src/components/time/TimeEntryApprovalWizard.tsx`)
  - Step-by-step approval workflow
  - Skip functionality for incomplete entries
  - Inline editing with permission validation
  - Bulk approval operations
  - Rate locking on approval

- **ActionBarProvider** (`src/components/providers/ActionBarProvider.tsx`)
  - Global action management with React Context
  - Dynamic action registration and cleanup
  - Type-safe action definitions

- **ActionBar & TimeEntryCard** Components
  - Reusable UI components with permission integration
  - Visual status indicators and lock information

#### API Enhancements
- **Invoice Association Checks**: All time entry endpoints check for invoice relationships
- **Rate Locking**: Approval actions save billing rate snapshots
- **Permission Validation**: Comprehensive ABAC checks throughout
- **Error Messages**: Clear feedback about why operations are blocked

#### UI/UX Improvements
- **Tab Reordering**: Time Entries tab is now default, appears first
- **Permission-Based Display**: UI elements only show when user has access
- **Visual Status Indicators**: Clear badges for approved, locked, invoiced entries
- **Global Actions**: Approval wizard moved to header action bar

### Database & API Changes

#### Enhanced API Endpoints
```typescript
// Enhanced with invoice protection
PUT /api/time-entries/[id]     // Invoice association blocks modifications
DELETE /api/time-entries/[id]  // Cannot delete invoiced entries
GET /api/time-entries          // Includes invoice information

// New permission checking endpoints
POST /api/permissions/check       // Single permission check
POST /api/permissions/check-batch // Batch permission checking
```

#### Database Schema Considerations
- Time entries include `invoiceItems` relationship for protection checks
- Billing rate snapshots (`billingRateName`, `billingRateValue`) for rate locking
- Approval tracking (`isApproved`, `approvedBy`, `approvedAt`) for workflow

### Security Enhancements

#### Permission Architecture
```typescript
// ABAC Permission Structure
const PERMISSIONS = {
  TIME_ENTRIES: {
    VIEW: { resource: "time-entries", action: "view" },
    CREATE: { resource: "time-entries", action: "create" },
    UPDATE: { resource: "time-entries", action: "update" },
    DELETE: { resource: "time-entries", action: "delete" },
    APPROVE: { resource: "time-entries", action: "approve" }
  },
  BILLING: {
    VIEW: { resource: "billing", action: "view" }
  }
};
```

#### Business Rule Enforcement
- **Invoice Protection**: Once invoiced, entries become permanently locked
- **Ownership Rules**: Users can edit their own unapproved entries
- **Approval Workflow**: Only approved entries can be invoiced
- **Rate Preservation**: Approved entries maintain original billing rates

### User Experience Improvements

#### Permission-Based Interface
- **Conditional Rendering**: UI elements only appear when user has permissions
- **Clear Feedback**: Informative messages about why actions are blocked
- **Visual Hierarchy**: Different colors and icons for different entry states

#### Workflow Optimization
- **Streamlined Approval**: Step-by-step wizard with progress tracking
- **Bulk Operations**: Approve multiple entries efficiently
- **Skip Functionality**: Handle entries that aren't ready for approval

#### Responsive Action Bar
- **Context-Aware**: Actions change based on current page
- **Mobile Friendly**: Labels hide on small screens, tooltips provide context
- **Permission Aware**: Actions only show when user has access

### Documentation Created

#### Component Documentation
- **ActionBar System Guide** (`docs/components/action-bar.md`)
  - Complete usage guide with examples
  - API reference and best practices
  - Integration patterns for different page types

#### Updated Time Tracking Docs
- **Enhanced Documentation** (`docs/pages/time-tracking.md`)
  - ABAC permission system explanation
  - New approval workflow documentation
  - Updated architecture and component descriptions

### Performance Optimizations

#### Permission Caching
- **Client-Side Caching**: Avoid repeated permission API calls
- **Batch Checking**: Check multiple permissions in single request
- **React Optimization**: Proper memoization and dependency management

#### State Management
- **Efficient Updates**: Targeted re-renders for permission changes
- **Action Cleanup**: Automatic action removal on page unmount
- **Real-Time Sync**: Changes reflected across all components

### Files Created/Modified

#### New Files
- `src/hooks/usePermissions.ts` - ABAC permission hooks
- `src/components/time/TimeEntryEditDialog.tsx` - Entry editing interface
- `src/components/time/TimeEntryApprovalWizard.tsx` - Approval workflow
- `src/components/time/TimeEntryCard.tsx` - Reusable entry display
- `src/components/providers/ActionBarProvider.tsx` - Global action management
- `src/components/ui/ActionBar.tsx` - Action bar UI component
- `src/components/ui/tooltip.tsx` - Tooltip component for actions
- `src/app/api/permissions/check/route.ts` - Permission checking API
- `src/app/api/permissions/check-batch/route.ts` - Batch permission API
- `docs/components/action-bar.md` - ActionBar documentation

#### Modified Files
- `src/app/time/page.tsx` - Complete ABAC refactoring, action bar integration
- `src/app/api/time-entries/[id]/route.ts` - Invoice protection, rate locking
- `src/app/api/time-entries/route.ts` - Enhanced with invoice information
- `src/app/providers.tsx` - Added ActionBarProvider to app context
- `docs/pages/time-tracking.md` - Updated with ABAC and new features

### Testing & Validation

#### Manual Testing Scenarios
- ✅ Permission-based page access (only users with TIME_ENTRIES.VIEW)
- ✅ Entry editing blocked for invoiced entries with clear messaging
- ✅ Approval wizard only visible to users with APPROVE permission
- ✅ Rate locking preserves billing amounts on approval
- ✅ Action bar shows contextual actions based on permissions
- ✅ Visual indicators clearly show entry status (approved, locked, invoiced)

#### Business Rule Validation
- ✅ Invoice protection prevents all modifications to invoiced entries
- ✅ Users can only edit their own unapproved entries
- ✅ Billing rate values locked when entries are approved
- ✅ Permission checks consistent between UI and API
- ✅ Action bar actions only appear for authorized users

### Impact Assessment

#### Benefits Achieved
- **Enhanced Security**: Granular permission control instead of crude role checks
- **Data Integrity**: Invoice protection prevents billing inconsistencies
- **Improved UX**: Clear status indicators and contextual actions
- **Maintainability**: Centralized permission logic and reusable components
- **Flexibility**: Easy to add new permissions or modify access patterns

#### Breaking Changes
- Time page now requires TIME_ENTRIES.VIEW permission (not just ADMIN/EMPLOYEE role)
- API endpoints enforce invoice protection (previously might have allowed changes)
- Billing information now requires BILLING.VIEW permission

#### Performance Impact
- **Positive**: Permission caching reduces API calls
- **Minimal**: Additional permission checks have negligible overhead
- **Improved**: More targeted re-renders with proper React optimization

### Future Enhancements Ready
- **WebSocket Integration**: Real-time permission updates across sessions
- **Advanced Approval Workflows**: Multi-step approval with routing
- **Audit Trail**: Comprehensive logging of permission-based actions
- **Mobile App Support**: API-ready for mobile time tracking applications

## Comprehensive Permissions Management System (2025-08-01)

### Overview
Complete overhaul of the permissions management system to provide comprehensive, role-based, and user-friendly permission assignment and management. This replaces the basic permissions interface with a full-featured management system supporting both system users and account users with bulk operations, auto-seeding, and enhanced UX.

### Core Features Implemented

#### Multi-User Type Support
- **System User Permissions**: Direct permission assignment to ADMIN and EMPLOYEE users
- **Account User Permissions**: Granular permissions for account-based users (existing)
- **Role-Based Templates**: Predefined permission sets for different user roles
- **Unified Management**: Single interface for managing all permission types

#### Database Schema Enhancements
```sql
-- New UserPermission model for system users
UserPermission {
  id: string (UUID primary key)
  userId: string (foreign key to User)
  permissionName: string
  resource: string
  action: string
  scope: string (own, account, subsidiary, global)
  createdAt: DateTime
  updatedAt: DateTime
}

-- Constraint: One permission per user
UNIQUE(userId, permissionName)

-- Enhanced User model with permissions relationship
User {
  userPermissions: UserPermission[]
}
```

#### Advanced API Endpoints
- **`/api/user-permissions`**: CRUD operations for system user permissions
- **`/api/user-permissions/bulk`**: Bulk assignment and deletion operations
- **`/api/permissions/seed`**: Auto-seed permissions from registry
- **`/api/users`**: Enhanced user listing with role filtering

### Technical Implementation

#### Enhanced Permission Management UI
- **4-Tab Structure**:
  1. **System Permissions**: Registry-based permissions with auto-seeding
  2. **User Permissions**: ADMIN/EMPLOYEE permission management
  3. **Account Permissions**: Account user permission management (enhanced)
  4. **Create Permission**: System permission creation (existing)

#### UserSelector Component
- **Advanced Search**: Real-time filtering by name and email
- **Role-Based Filtering**: Filter users by role (ADMIN, EMPLOYEE, etc.)
- **Visual Indicators**: Role badges and user status indicators
- **Exclude Account Users**: Option to filter out account users when needed

#### Bulk Operations Support
```typescript
// Bulk permission assignment types
interface BulkPermissionAssignment {
  userId: string;
  permissions: PermissionDefinition[];
}

interface BulkUserAssignment {
  permissionName: string;
  resource: string;
  action: string;
  userIds: string[];
}
```

#### Permission Seeding System
- **Registry Integration**: Auto-populate from `permissions-registry.ts`
- **Conflict Handling**: Smart detection of existing vs. new permissions
- **Force Update**: Option to update existing permissions from registry
- **Detailed Reporting**: Comprehensive feedback on seeding operations

### User Experience Enhancements

#### Enhanced Statistics Dashboard
- **System Permissions**: Count of available permissions
- **User Permissions**: Count of system user permissions
- **Account Permissions**: Count of account user permissions
- **Account Users**: Count of users with accounts

#### Improved Permission Assignment
- **User Search**: Find users quickly with real-time search
- **Permission Templates**: Pre-defined sets for quick assignment
- **Visual Feedback**: Clear status indicators and badges
- **Role-Aware Display**: Different colors/icons for different roles

#### Registry Integration
- **Seed Button**: One-click population from permissions registry
- **Status Analysis**: Compare registry vs. database permissions
- **Smart Updates**: Only create missing permissions by default
- **Force Sync**: Option to update all permissions from registry

### Security & Business Logic

#### Enhanced Permission Validation
- **User Type Checking**: Prevent account users from getting system permissions
- **Duplicate Prevention**: Cannot assign same permission twice to same user
- **Role-Based Access**: Only ADMINs can manage permissions
- **Scope Validation**: Proper scope assignment (own, account, subsidiary, global)

#### Data Integrity
- **Atomic Operations**: Bulk operations use database transactions
- **Conflict Resolution**: Proper handling of permission conflicts
- **Cleanup Logic**: Failed operations don't leave partial data
- **Cascade Deletion**: User deletion properly removes permissions

### API Architecture

#### RESTful Design
```typescript
// User Permissions CRUD
GET    /api/user-permissions?userId=&role=    // List with filtering
POST   /api/user-permissions                  // Create single permission
DELETE /api/user-permissions                  // Delete single permission

// Bulk Operations
POST   /api/user-permissions/bulk            // Bulk create/update
DELETE /api/user-permissions/bulk            // Bulk delete

// Permission Seeding
POST   /api/permissions/seed                 // Seed from registry
GET    /api/permissions/seed                 // Analyze registry vs DB

// User Management
GET    /api/users?role=&excludeAccountUsers= // List users with filtering
```

#### Response Formats
- **Consistent Error Handling**: Standardized error responses
- **Detailed Results**: Bulk operation results with success/failure counts
- **Comprehensive Data**: Include user context in permission responses
- **Status Reporting**: Clear feedback for all operations

### Performance Optimizations

#### Database Efficiency
- **Indexed Queries**: Proper indexing on userId and permissionName
- **Batch Processing**: Bulk operations use efficient batch queries
- **Relationship Loading**: Include necessary relationships in single queries
- **Transaction Management**: Atomic operations prevent partial states

#### UI Performance
- **Component Memoization**: Prevent unnecessary re-renders
- **Efficient State Updates**: Targeted updates for permission changes
- **Search Optimization**: Debounced search with client-side filtering
- **Lazy Loading**: Load data only when tabs are accessed

### Files Created/Modified

#### New Components
- `src/components/permissions/UserSelector.tsx` - Advanced user selection component
- `src/app/api/user-permissions/route.ts` - System user permission management
- `src/app/api/user-permissions/bulk/route.ts` - Bulk operations API
- `src/app/api/permissions/seed/route.ts` - Registry seeding API
- `src/app/api/users/route.ts` - Enhanced user listing API

#### Enhanced Files
- `src/app/permissions/page.tsx` - Complete UI overhaul with 4-tab structure
- `prisma/schema.prisma` - Added UserPermission model and relationships

#### Database Migration
- Added UserPermission table with proper constraints
- Enhanced User model with permission relationships
- Maintained backward compatibility with existing AccountPermission system

### Integration with Existing Systems

#### Permission Registry Integration
- **Auto-Seeding**: Populate database from centralized registry
- **Consistency Checking**: Validate database matches registry
- **Easy Updates**: Keep permissions in sync with code changes

#### ABAC System Compatibility
- **Hook Integration**: Works with existing `usePermissions` hooks
- **API Consistency**: Same permission checking logic throughout
- **Role Compatibility**: Maintains existing role-based access patterns

#### User Management Integration
- **Account User Support**: Maintains existing account user functionality
- **Role-Based Filtering**: Clean separation between user types
- **Unified Interface**: Single place to manage all permissions

### Testing & Validation

#### Manual Testing Scenarios
- ✅ System user permission assignment and removal
- ✅ Bulk permission operations with multiple users
- ✅ Registry seeding with conflict detection
- ✅ User search and filtering functionality
- ✅ Permission scope validation and enforcement
- ✅ Error handling for invalid operations
- ✅ UI responsiveness and state management

#### Database Integrity
- ✅ UserPermission table created with proper constraints
- ✅ User relationships established correctly
- ✅ Existing AccountPermission system unchanged
- ✅ Database migration completed successfully

### Impact Assessment

#### Benefits Achieved
- **Comprehensive Management**: Single interface for all permission types
- **Enhanced Productivity**: Bulk operations and templates reduce manual work
- **Better Organization**: Clear separation between user types and permission scopes
- **Improved Scalability**: Efficient bulk operations for large user bases
- **Registry Integration**: Automatic synchronization with permission definitions

#### User Experience Improvements
- **Intuitive Interface**: Clear tabs and visual organization
- **Powerful Search**: Find users and permissions quickly
- **Visual Feedback**: Clear status indicators and operation results
- **Bulk Efficiency**: Assign permissions to multiple users simultaneously

#### Technical Benefits
- **Type Safety**: Full TypeScript support throughout permission system
- **API Consistency**: RESTful design with standardized responses
- **Performance**: Optimized queries and efficient state management
- **Maintainability**: Centralized logic with reusable components

#### Future Enhancement Ready
- **Permission Templates**: Framework ready for role-based templates
- **Advanced Reporting**: API structure supports detailed permission analytics
- **Audit Trail**: Database structure ready for permission change tracking
- **WebSocket Integration**: Real-time permission updates across sessions

### Migration Guide

#### For Existing Installations
1. **Database Migration**: Run `npx prisma db push` to create UserPermission table
2. **Permission Seeding**: Use "Seed from Registry" button to populate permissions
3. **User Assignment**: Assign permissions to existing ADMIN/EMPLOYEE users
4. **Testing**: Verify permission-based access control works correctly

#### For Developers
- **New Permission Definitions**: Add to `permissions-registry.ts`
- **Bulk Operations**: Use new bulk APIs for efficient user management
- **Component Integration**: Use UserSelector for user selection needs
- **Permission Checking**: Leverage enhanced permission hooks

---

*Last updated: 2025-08-01*
*Author: Claude Code Assistant*