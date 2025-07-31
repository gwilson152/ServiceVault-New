# Change Tracking

This document tracks significant changes and refactoring work done to the Service Vault application.

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

*Last updated: 2025-01-31*
*Author: Claude Code Assistant*