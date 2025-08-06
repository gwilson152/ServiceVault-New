# Settings Architecture

## Overview

Service Vault uses a unified settings architecture based on SystemSettings that provides type-safe, permission-aware configuration management across the entire application.

## Architecture Principles

### Single Source of Truth
All application settings flow through the **SystemSettings** table and **SettingsService** class, eliminating data duplication and ensuring consistency.

### Permission-Aware Access
Settings include RBAC controls with read/write permissions, ensuring users can only access settings appropriate for their role.

### Type-Safe Operations
Settings are defined with validation, type checking, and default values through the `SETTING_DEFINITIONS` configuration.

## Settings Organization

### Key Structure
Settings use a hierarchical key structure:
- `system.*` - Application-level settings
- `email.*` - Email configuration  
- `company.*` - Company information
- `security.*` - Security policies
- `features.*` - Feature toggles

### Examples
```typescript
'system.appName'           // Application name
'email.smtpHost'          // Email server configuration  
'company.companyName'     // Company details
'security.sessionTimeout' // Security policies
'features.enableTimeTracking' // Feature controls
```

## Settings UI Architecture

### Individual Section Management
Each settings section manages its own state independently:

- **GeneralSettingsSection** - Application configuration
- **CompanyInfoSection** - Company details (dedicated tab)
- **EmailSettingsSection** - Email/SMTP configuration
- **TicketFieldsSection** - Ticket customization
- **LicenseSection** - License management
- **DangerZoneSection** - System administration

### Save Pattern
Each section has individual save buttons with:
- Real-time validation
- Clear feedback on success/failure
- No global save dependencies
- Independent error handling

## Setup Integration

### Unified Approach
The setup wizard and settings pages use identical patterns:
- Same SettingsService for all operations
- Identical key structures and validation
- Consistent permission checking
- Seamless data migration between setup and settings

### Re-run Setup
Users can reset setup status and reconfigure system settings without losing data through the Danger Zone section.

## API Patterns

### Individual Setting Access
```typescript
// GET /api/settings/system.appName
// PUT /api/settings/system.appName { "value": "New Name" }
```

### Permission Checking
```typescript
const canRead = await settingsService.checkReadPermission(userId, key);
const canWrite = await settingsService.checkWritePermission(userId, key);
```

### Validation and Type Safety
```typescript
const definition = SETTING_DEFINITIONS[key];
const isValid = settingsService.validateValue(value, definition);
const typedValue = settingsService.parseValue(stringValue, definition.type);
```

## Benefits

### For Developers
- Single API for all settings operations
- Type-safe access with validation
- Clear permission model
- Consistent patterns across all settings

### for Users
- Intuitive settings organization
- Clear feedback on save operations
- No risk of losing partial changes
- Ability to reconfigure system when needed

### For System Administration
- Permission-controlled access to sensitive settings
- Audit trail for all setting changes
- Consistent data storage and retrieval
- Safe system reconfiguration options

## Best Practices

### Adding New Settings
1. Define setting in `SETTING_DEFINITIONS` with proper validation
2. Set appropriate read/write permissions
3. Use hierarchical key naming convention
4. Provide sensible default values
5. Update UI components to use individual save pattern

### Security Considerations
- Always check permissions before reading/writing settings
- Use encrypted type for sensitive data
- Validate all user input against setting definitions
- Audit critical system setting changes

### UI/UX Guidelines
- Group related settings in dedicated sections/tabs
- Provide clear save/reset actions per section
- Show real-time validation feedback
- Use consistent styling across all settings interfaces

## Recent Improvements

- ✅ Unified setup and settings approaches
- ✅ Individual save pattern implementation
- ✅ Company information moved to dedicated tab
- ✅ Email settings consolidated to SystemSettings
- ✅ Permission-aware settings access
- ✅ Re-run setup functionality

This architecture provides a solid foundation for scalable, maintainable settings management across the Service Vault application.