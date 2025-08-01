# Initial Configuration Wizard

The Service Vault application includes a comprehensive initial configuration wizard that appears when no users exist in the system. The wizard guides users through setting up their administrator account, system configuration, email settings, and company information.

## Overview

The setup wizard is automatically triggered when:
- **No users exist in the database** (primary condition)
- This ensures the wizard only appears on completely fresh installations

## Architecture

### Core Components

#### TypeScript Types (`src/types/setup.ts`)
- `SetupData` - Complete setup data structure
- `AdminAccountData` - Admin user creation data
- `SystemConfigData` - Basic system configuration
- `EmailConfigData` - SMTP and email settings  
- `CompanyInfoData` - Company details for invoicing
- `SetupStatus` - Setup requirement status
- Validation functions for each data type

#### Settings Service (`src/lib/settings.ts`)
- `SettingsService` class with type-safe operations
- CRUD operations for individual and bulk settings
- Setup completion detection via `isSetupRequired()`
- Support for different setting categories (SYSTEM, EMAIL, COMPANY, SECURITY, FEATURES)
- Planned encryption support for sensitive settings

#### API Endpoints

**Setup Status Detection** (`src/app/api/setup/status/route.ts`)
- `GET /api/setup/status` - Returns setup requirement status
- Checks for existing users in the database (any users, not just admins)
- Returns `SetupStatus` object with `isSetupRequired` boolean
- Setup required only when no users exist in the database

**Setup Completion** (`src/app/api/setup/complete/route.ts`)  
- `POST /api/setup/complete` - Completes the initial setup process
- Validates all setup data using type-safe validation functions
- Checks for existing users before creating admin account (prevents duplicates)
- Creates admin user with encrypted password
- Saves all configuration settings to database
- Sets default security and feature settings
- Marks setup as completed
- Includes cleanup on failure with user-friendly error messages

**Settings Management** (`src/app/api/settings/route.ts`)
- `GET /api/settings` - Retrieve settings (with optional category filter)
- `POST /api/settings` - Create/update multiple settings
- `PUT /api/settings` - Bulk update settings
- `DELETE /api/settings` - Delete settings by keys
- Admin-only access control

### UI Components

#### Main Setup Components

**Setup Page** (`src/app/setup/page.tsx`)
- Entry point for setup wizard
- Checks setup status and redirects if not required
- Renders `SetupWizard` component
- Handles completion redirect to login page

**Setup Wizard** (`src/components/setup/SetupWizard.tsx`)
- Multi-step wizard with progress tracking
- Custom progress bar implementation
- State management for all setup data
- Step validation and navigation
- Error handling and success states
- Calls setup completion API

#### Setup Steps

**Welcome Step** (`src/components/setup/steps/WelcomeStep.tsx`)
- Introduction and feature overview
- Estimated setup time
- Always valid - serves as entry point

**Admin Account Step** (`src/components/setup/steps/AdminAccountStep.tsx`)
- Admin user creation form
- Name, email, password, and confirmation fields
- Password visibility toggles
- Real-time validation with error display
- Security tips and requirements

**System Configuration Step** (`src/components/setup/steps/SystemConfigStep.tsx`)
- Application name and description
- Base URL configuration
- Timezone selection (11 common timezones)
- Date format options (US, European, ISO)
- Language selection (6 languages)
- Form validation with helpful hints

**Email Configuration Step** (`src/components/setup/steps/EmailConfigStep.tsx`)
- Toggle for enabling email notifications
- Complete SMTP configuration (host, port, security)
- **Optional SMTP credentials** (username/password not required for all servers)
- From address and name settings
- Connection testing functionality (planned)
- Common provider examples with authentication requirements
- Support for both authenticated and unauthenticated SMTP servers

**Company Information Step** (`src/components/setup/steps/CompanyInfoStep.tsx`)
- Company name and address (required)
- Contact information (phone, email, website)  
- Billing defaults (currency, tax rate)
- 10 currency options with symbols
- Multi-line address support

**Review Step** (`src/components/setup/steps/ReviewStep.tsx`)
- Comprehensive configuration review
- Organized display of all entered data
- Status indicators for email notifications
- Final setup confirmation
- Security notices about next steps

### Login Page Integration

**Setup Detection** (`src/app/page.tsx`)
- Automatic setup status checking on page load
- Redirect to setup wizard if required
- Setup completion success message
- Loading states during status check

## Configuration Settings

The wizard configures the following setting categories:

### System Settings
- `system.appName` - Application display name
- `system.appDescription` - Application description
- `system.baseUrl` - Public URL for the application
- `system.timezone` - Default system timezone
- `system.dateFormat` - Date display format
- `system.language` - UI language
- `system.setupCompleted` - Setup completion flag

### Email Settings  
- `email.smtpHost` - SMTP server hostname
- `email.smtpPort` - SMTP server port
- `email.smtpSecure` - TLS/SSL encryption flag
- `email.smtpUser` - SMTP authentication username
- `email.smtpPassword` - SMTP authentication password (to be encrypted)
- `email.fromAddress` - Default sender email address
- `email.fromName` - Default sender name
- `email.enableEmailNotifications` - Master email toggle

### Company Settings
- `company.companyName` - Legal company name
- `company.companyAddress` - Full company address
- `company.companyPhone` - Primary phone number
- `company.companyEmail` - Primary company email
- `company.companyWebsite` - Company website URL
- `company.defaultTaxRate` - Default tax percentage
- `company.defaultCurrency` - Default billing currency

### Default Security Settings
- `security.sessionTimeout` - Session timeout (8 hours)
- `security.passwordMinLength` - Minimum password length (8)
- `security.loginAttemptLimit` - Failed login limit (5)

### Default Feature Settings
- `features.enableTimeTracking` - Time tracking feature (true)
- `features.enableInvoicing` - Invoicing feature (true)  
- `features.enableApiAccess` - API access feature (false)

## Database Schema

Settings are stored in a flexible key-value structure:

```sql
-- Settings table structure (via Prisma)
model Setting {
  key       String  @id
  value     Json    // Supports strings, numbers, booleans, objects, arrays
  category  String  // SYSTEM, EMAIL, COMPANY, SECURITY, FEATURES
  encrypted Boolean @default(false) // For future encryption support
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Security Considerations

### Current Security Features
- Admin password hashing with bcrypt (10 rounds)
- Admin-only API access for settings and setup
- **Duplicate email detection** prevents setup conflicts
- Setup only available on fresh installations (no users exist)
- Input validation on all setup data with user-friendly error messages
- Cleanup of partial data on setup failure
- Browser-compliant password fields with proper autocomplete attributes

### Planned Security Enhancements
- Encryption of sensitive settings (SMTP passwords, API keys)
- Rate limiting on setup attempts
- Enhanced password requirements
- Audit logging of setup and settings changes

## Usage Flow

1. **User visits login page** (`/`)
2. **System checks setup status** via `/api/setup/status`
3. **If no users exist in database**: Redirect to `/setup`
4. **If users exist**: Show normal login page
5. **Setup wizard guides through 6 steps**:
   - Welcome and overview
   - Admin account creation (with duplicate email detection)
   - System configuration  
   - Email settings (SMTP credentials optional)
   - Company information
   - Review and confirmation
6. **Setup completion** via `/api/setup/complete`
7. **Redirect to login** with success message
8. **User can sign in** with created admin account

## Error Handling

### Setup Wizard Errors
- Form validation errors shown inline with icons
- **Duplicate email detection** with clear resolution guidance
- Network errors displayed with retry options
- Setup completion errors with detailed messages
- Cleanup of partial data on critical failures
- User-friendly error messages for all failure scenarios

### API Error Responses
- Structured error responses with details
- HTTP status codes for different error types
- Validation error details for debugging
- Cleanup procedures for transaction failures

## Testing Considerations

### Manual Testing Checklist
- [ ] Setup wizard appears on fresh installation
- [ ] All form fields validate correctly
- [ ] Step navigation works forward and backward
- [ ] Setup completion creates admin user and settings
- [ ] Login page shows setup complete message
- [ ] Setup wizard is not accessible after completion
- [ ] Error handling works for network failures
- [ ] Settings are correctly saved and retrievable

### Integration Testing
- Database transactions for setup completion
- API endpoint validation and error handling
- Settings service CRUD operations
- Setup status detection accuracy

## Future Enhancements

### Planned Features
- Email configuration testing with actual SMTP connection
- Import/export of setup configurations
- Setup wizard themes and customization
- Multi-language setup wizard support
- Advanced security settings in setup
- Integration with external authentication providers

### Performance Optimizations
- Lazy loading of setup wizard steps
- Optimistic UI updates for better UX
- Caching of setup status checks
- Background validation of settings

This setup wizard provides a professional, secure, and user-friendly way to initialize Service Vault installations while maintaining flexibility for future enhancements and customizations.