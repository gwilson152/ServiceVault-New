# Settings Page Documentation

## Overview

The Settings Page (`/settings`) provides a comprehensive administrative interface for configuring system-wide settings, billing rates, custom fields, customer permissions, and licensing integration. The page features a modular, tabbed design with real-time change tracking and bulk save functionality.

## Authentication & Authorization

### Access Control
- **Admin-Only Access**: Only users with `ADMIN` role can access settings
- **Route Protection**: Automatic redirect for non-admin users to dashboard
- **Session Validation**: Continuous authentication state monitoring

### Role Enforcement
```typescript
if (session.user?.role !== "ADMIN") {
  router.push("/dashboard");
}
```

## Architecture

### Main Settings Page (`/settings/page.tsx`)
**Centralized Configuration Hub**

#### Header Components
- **Navigation**: Back button to dashboard with breadcrumb-style navigation
- **Title**: "System Settings" with settings icon
- **Change Indicator**: Visual warning for unsaved changes with orange alert icon
- **Action Buttons**: Save All and Reset buttons (only visible when changes exist)
- **User Info**: Admin badge and logout functionality

#### Tabbed Interface
- **Five Main Sections**: General, Billing Rates, Ticket Fields, Customers, License
- **Responsive Tabs**: Horizontal scrolling on mobile, grid layout on desktop
- **State Management**: Active tab persistence and navigation

#### Change Tracking System
- **Unsaved Changes Detection**: Visual indicators and browser warning
- **Bulk Operations**: Save All and Reset All functionality
- **Individual Section Saves**: Each section can save independently

### Settings Sections

## 1. General Settings Section

**Application & Company Configuration**

### Features
- **Application Information**
  - App name and description
  - Support email configuration
  - Branding customization

- **Company Information**
  - Company name and address
  - Contact details for invoices
  - Legal information display

- **Regional Settings**
  - Timezone configuration with dropdown
  - Date format selection
  - Default tax rate setting

- **Notification Settings**
  - Email notification toggle
  - SMS notification toggle (with provider requirement note)
  - System-wide notification preferences

- **System Settings**
  - Maintenance mode toggle with warning display
  - System-level operational controls

### UI Components
- Text inputs for basic information
- Textarea for longer descriptions
- Select dropdowns for timezone and date formats
- Number input for tax rates
- Switch toggles for boolean settings
- Warning cards for maintenance mode

## 2. Billing Rates Section

**Hourly Rate Management**

### Features
- **System Billing Rates**
  - Multiple rate configuration
  - Default rate designation
  - Rate descriptions and naming

- **Rate Management**
  - Add new rates dynamically
  - Remove rates (with minimum one rate requirement)
  - Edit existing rates inline

- **Default Rate System**
  - Single default rate enforcement
  - Automatic default switching
  - Visual default indicators

- **Customer-Specific Rates**
  - Placeholder for customer overrides
  - Integration point documentation

### Data Structure
```typescript
interface BillingRate {
  id: string;
  name: string;
  description: string;
  rate: number;
  isDefault: boolean;
}
```

### Validation
- Minimum one rate requirement
- Single default rate enforcement
- Positive rate values only
- Required name fields

## 3. Ticket Fields Section

**Custom Field Configuration** (Placeholder)

### Planned Features
- Custom field type creation (text, select, checkbox, etc.)
- Field validation rules
- Required field configuration
- Field display order management
- Customer-specific field visibility

### Current State
- Coming soon placeholder with feature roadmap
- UI prepared for future implementation
- Integration points documented

## 4. Customer Settings Section

**Customer Permission Management** (Placeholder)

### Planned Features
- Default customer permissions
- Portal access controls
- Time entry visibility settings
- Ticket creation permissions
- Custom field access controls

### Current State
- Coming soon placeholder with feature roadmap
- Permission system architecture planned
- Integration with customer portal ready

## 5. License Section

**Licensing Platform Integration**

### Features
- **License Status Display**
  - Current license status with visual indicators
  - License type and user limits
  - Expiration date tracking
  - Last verification timestamp

- **License Configuration**
  - License key management with masked input
  - API endpoint configuration
  - Manual license verification

- **Feature Availability Matrix**
  - Current license feature display
  - Pro and Enterprise feature indicators
  - Feature gate documentation

### Security
- Masked license key input
- Secure API endpoint validation
- License verification with external API
- Feature gate enforcement points

## Technical Implementation

### State Management
```typescript
// Change tracking
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// Tab navigation
const [activeTab, setActiveTab] = useState("general");

// Individual section state
const [settings, setSettings] = useState<SettingsType>(defaultValues);
```

### Component Architecture
- **Modular Sections**: Each section as separate component
- **Prop Drilling**: `onSettingsChange` callback for change tracking
- **Individual Saves**: Section-level save functionality
- **Bulk Operations**: Cross-section save and reset

### Form Handling
- **Real-time Updates**: Settings change immediately on input
- **Validation**: Input validation and error handling
- **Save Status**: Success/error feedback for operations
- **Loading States**: Visual feedback during save operations

## User Experience Features

### Visual Design
- **Consistent Styling**: Matches admin dashboard theme
- **Card-Based Layout**: Logical grouping of related settings
- **Progressive Disclosure**: Expandable sections for complex settings
- **Status Indicators**: Visual feedback for all state changes

### Interaction Patterns
- **Unsaved Changes Warning**: Browser beforeunload event prevention
- **Bulk Actions**: Save All and Reset All with confirmation
- **Individual Controls**: Section-specific save buttons
- **Tab Navigation**: Keyboard and mouse navigation support

### Responsive Design
- **Mobile Optimization**: Tab scrolling and form adaptation
- **Touch-Friendly**: Appropriate touch targets and spacing
- **Flexible Layout**: Grid system adaptation for screen sizes

## Integration Points

### Database Integration (Future)
```typescript
// Settings API endpoints
PUT /api/settings/general
PUT /api/settings/billing-rates
PUT /api/settings/custom-fields
PUT /api/settings/customer-defaults
PUT /api/settings/license

// Bulk operations
PUT /api/settings/bulk-save
POST /api/settings/reset
```

### External Services
- **License Validation**: External API integration for license verification
- **Email Service**: SMTP configuration for notifications
- **SMS Service**: Integration with SMS providers
- **File Storage**: Configuration for file attachments

## Security Considerations

### Access Control
- Admin-only access enforcement
- Session validation and timeout
- CSRF protection on form submissions
- Input sanitization and validation

### Data Protection
- Sensitive data masking (license keys)
- Secure API endpoint validation
- Audit logging for setting changes
- Change history tracking

## Performance Optimization

### Loading Strategies
- Lazy loading of section components
- Cached settings with revalidation
- Optimistic updates for user experience
- Background save operations

### State Management
- Minimal re-renders with proper memoization
- Efficient change detection
- Batched state updates
- Debounced save operations

## Testing Strategy

### Unit Testing
- Component rendering tests
- Form validation tests
- State management tests
- Integration tests for sections

### User Experience Testing
- Tab navigation flows
- Save/reset functionality
- Change tracking accuracy
- Mobile responsive behavior

### Integration Testing
- API endpoint testing
- License validation testing
- Cross-section interaction testing
- Error handling validation

## Future Enhancements

### Advanced Features
- **Settings Import/Export**: Backup and restore configurations
- **Environment-Specific Settings**: Development/staging/production configs
- **Settings Templates**: Pre-configured setting packages
- **Change History**: Track and revert setting changes
- **Role-Based Settings**: Different settings access per admin role

### User Experience
- **Settings Search**: Find specific settings quickly
- **Guided Setup**: First-time configuration wizard
- **Setting Dependencies**: Automatic related setting updates
- **Preview Mode**: Test settings before applying