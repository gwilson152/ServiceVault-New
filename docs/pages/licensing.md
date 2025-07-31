# Licensing Integration System

The licensing integration system provides comprehensive license validation, feature control, and user limit enforcement for the Service Vault application, supporting both online validation and offline operation.

## Overview

The licensing system enables flexible deployment with tier-based feature control. It supports three tiers (Free, Professional, Enterprise) with automatic license validation, cached status for offline operation, and integration with external licensing APIs.

## Architecture

### Licensing Service

The core `LicensingService` class provides centralized license management:

```typescript
class LicensingService {
  private static instance: LicensingService;
  private cachedStatus: LicenseStatus | null = null;
  private lastCheck: number = 0;
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour
}
```

### License Tiers

1. **Free Tier**
   - 5 user limit
   - Basic features: time tracking, basic reporting
   - No license key required

2. **Professional Tier**
   - 25 user limit (default)
   - Enhanced features: billing, advanced reporting
   - Requires valid license key

3. **Enterprise Tier**
   - 100 user limit (default)
   - Full features: API access, custom fields
   - Requires enterprise license key (ENT- prefix)

## License Validation

### Online Validation

When configured with a licensing API, the system performs real-time validation:

```typescript
async validateLicense(licenseKey: string): Promise<LicenseStatus> {
  const response = await fetch(`${apiUrl}/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.LICENSING_API_KEY}`,
    },
    body: JSON.stringify({
      license_key: licenseKey,
      current_users: currentUsers,
    }),
  });
}
```

### Offline Validation

For deployments without internet access, the system includes offline validation:

```typescript
private async getOfflineValidation(licenseKey: string, currentUsers: number): Promise<LicenseStatus> {
  // Simple offline validation - in production, use cryptographic validation
  const isValidFormat = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseKey);
  
  if (licenseKey.startsWith("ENT-")) {
    tier = "enterprise";
    userLimit = 100;
    features = ["enterprise_support", "api_access", "custom_fields"];
  }
}
```

## Configuration

### Environment Variables

```bash
# Licensing API Configuration
LICENSING_API_URL=https://api.licensing.example.com
LICENSING_API_KEY=your_api_key_here

# Database Configuration
DATABASE_URL=file:./dev.db
```

### License Storage

License keys and status are stored in the SystemSettings table:

```typescript
// License key storage
await prisma.systemSettings.upsert({
  where: { key: "license_key" },
  update: { value: licenseKey },
  create: {
    key: "license_key",
    description: "Software license key",
    value: licenseKey,
  },
});

// Cached license status
await prisma.systemSettings.upsert({
  where: { key: "license_status" },
  update: { jsonValue: status },
  create: {
    key: "license_status",
    description: "Cached license validation status",
    jsonValue: status,
  },
});
```

## API Endpoints

### License Management

#### GET /api/license
Retrieve current license status (Admin only).

**Response:**
```json
{
  "isValid": true,
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "companyName": "Example Corp",
  "userLimit": 25,
  "currentUsers": 8,
  "features": ["professional_support", "time_tracking", "billing"],
  "expiresAt": "2024-12-31T23:59:59Z",
  "tier": "professional"
}
```

#### POST /api/license
Update license key and validate (Admin only).

**Request Body:**
```json
{
  "licenseKey": "XXXX-XXXX-XXXX-XXXX"
}
```

### Feature Access

#### GET /api/license/features
Check feature access for current license.

**Query Parameters:**
- `feature` - Specific feature to check

**Response:**
```json
{
  "hasAccess": true,
  "userLimit": {
    "allowed": true,
    "current": 8,
    "limit": 25
  }
}
```

#### POST /api/license/features
Check multiple features at once.

**Request Body:**
```json
{
  "features": ["billing", "api_access", "custom_fields"]
}
```

**Response:**
```json
{
  "features": {
    "billing": true,
    "api_access": false,
    "custom_fields": false
  },
  "userLimit": {
    "allowed": true,
    "current": 8,
    "limit": 25
  }
}
```

## Feature Control

### Feature Constants

```typescript
export const FEATURES = {
  BASIC_SUPPORT: "basic_support",
  PROFESSIONAL_SUPPORT: "professional_support",
  ENTERPRISE_SUPPORT: "enterprise_support",
  TIME_TRACKING: "time_tracking",
  BASIC_REPORTING: "basic_reporting",
  ADVANCED_REPORTING: "advanced_reporting",
  BILLING: "billing",
  CUSTOM_FIELDS: "custom_fields",
  API_ACCESS: "api_access",
  MULTIPLE_ACCOUNTS: "multiple_accounts",
  ADVANCED_PERMISSIONS: "advanced_permissions",
} as const;
```

### Feature Checking

```typescript
// Check single feature
const hasBilling = await licensingService.checkFeatureAccess("billing");

// Check user limits
const userLimitCheck = await licensingService.checkUserLimit();
if (!userLimitCheck.allowed) {
  throw new Error(`User limit exceeded: ${userLimitCheck.current}/${userLimitCheck.limit}`);
}
```

## User Interface Integration

### Settings Page Integration

The license section in settings provides comprehensive license management:

#### License Status Display
- **License Validity**: Active/Invalid status with visual indicators
- **License Information**: Company name, tier, user count, expiration
- **Feature Availability**: Real-time feature status based on license
- **Error Reporting**: Clear error messages for license issues

#### License Configuration
- **License Key Input**: Secure input for license key entry
- **Validation**: Real-time license validation and status updates
- **Format Guidance**: Clear instructions for license key format
- **Status Feedback**: Visual feedback during validation process

#### Feature Availability Matrix
- **Time Tracking**: Always available (basic feature)
- **Billing & Invoicing**: Professional+ feature
- **Customer Portal**: Always available
- **API Access**: Enterprise feature only
- **Advanced Reporting**: Professional+ feature
- **Custom Fields**: Enterprise feature only

### License Status Component

```typescript
interface LicenseStatus {
  isValid: boolean;
  licenseKey?: string;
  companyName?: string;
  userLimit?: number;
  currentUsers: number;
  features: string[];
  expiresAt?: string;
  tier: "free" | "professional" | "enterprise";
  error?: string;
}
```

### Visual Indicators

The system provides clear visual feedback:

```typescript
const getStatusBadge = () => {
  if (licenseStatus.isValid) {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="mr-1 h-3 w-3" />
        Active
      </Badge>
    );
  } else {
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Invalid
      </Badge>
    );
  }
};
```

## Caching Strategy

### Cache Management
- **Duration**: 1 hour cache for license status
- **Invalidation**: Manual cache clearing on license updates
- **Fallback**: Database cache for offline operation
- **Refresh**: Automatic refresh on API availability

### Offline Operation
- **Cached Status**: Last known license status stored in database
- **Graceful Degradation**: Continue operation with cached data
- **Free Tier Fallback**: Default to free tier if no cached data
- **Error Handling**: Clear messaging about offline status

## User Limit Enforcement

### User Counting
```typescript
private async getCurrentUserCount(): Promise<number> {
  return await prisma.user.count({
    where: {
      role: {
        in: ["ADMIN", "EMPLOYEE", "ACCOUNT_USER"]
      }
    }
  });
}
```

### Enforcement Points
- **User Creation**: Check limits before creating new users
- **License Updates**: Validate current usage against new limits
- **Regular Monitoring**: Periodic checks for compliance
- **Grace Period**: Allow brief overages with warnings

## Error Handling

### Common Scenarios

#### License Validation Errors
- **Invalid Format**: Clear messaging about correct format
- **Expired License**: Grace period with renewal reminders
- **Network Issues**: Fallback to cached validation
- **API Errors**: Graceful degradation with error logging

#### User Limit Violations
- **Soft Limits**: Warnings when approaching limit
- **Hard Limits**: Prevent new user creation when exceeded
- **Grace Period**: Allow temporary overages
- **Upgrade Prompts**: Encourage license upgrades

### Recovery Strategies
- **Automatic Retry**: Retry failed validations with backoff
- **Fallback Modes**: Continue operation with reduced features
- **Admin Notifications**: Alert administrators of license issues
- **User Messaging**: Clear communication about restrictions

## Security Considerations

### License Key Protection
- **Secure Storage**: Encrypted storage of license keys
- **Access Control**: Only admins can view/modify licenses
- **Audit Trail**: Log all license changes and access
- **Transmission Security**: HTTPS for all license API calls

### Feature Enforcement
- **Server-Side Validation**: All feature checks performed server-side
- **Client-Side Hints**: UI hints based on server validation
- **Regular Re-validation**: Periodic license status checks
- **Tampering Protection**: Cryptographic validation (production)

## Integration Examples

### Feature-Gated Components

```typescript
// Component with license-based rendering
export function BillingSection() {
  const [hasAccess, setHasAccess] = useState(false);
  
  useEffect(() => {
    fetch('/api/license/features?feature=billing')
      .then(res => res.json())
      .then(data => setHasAccess(data.hasAccess));
  }, []);
  
  if (!hasAccess) {
    return <UpgradePrompt feature="billing" />;
  }
  
  return <BillingManagement />;
}
```

### User Creation with Limits

```typescript
// Check user limits before creation
const userLimit = await licensingService.checkUserLimit();
if (!userLimit.allowed) {
  return NextResponse.json({
    error: `User limit exceeded. Current: ${userLimit.current}, Limit: ${userLimit.limit}`
  }, { status: 403 });
}

// Continue with user creation
const newUser = await prisma.user.create({ /* ... */ });
```

## Deployment Considerations

### Environment Setup
- **Production**: Configure with real licensing API
- **Development**: Use offline validation for testing
- **Staging**: Test with actual license keys
- **Docker**: Include license validation in health checks

### Monitoring
- **License Expiry**: Monitor upcoming expirations
- **User Usage**: Track user count trends
- **Feature Usage**: Monitor feature utilization
- **API Health**: Monitor licensing API availability

## Future Enhancements

### Advanced Features
- **License Pooling**: Share licenses across multiple instances
- **Feature Analytics**: Track feature usage patterns
- **License Automation**: Automatic license renewal
- **Multi-Tenant**: Per-tenant license management

### Compliance Features
- **Audit Reports**: Comprehensive license usage reports
- **Compliance Dashboard**: Real-time compliance monitoring
- **License Alerts**: Proactive expiration and limit alerts
- **Usage Analytics**: Detailed feature and user analytics

### Integration Improvements
- **SSO Integration**: License-based access control
- **API Rate Limiting**: Feature-based API limits
- **White-label Options**: License-controlled branding
- **Mobile Licensing**: Mobile app license validation

This comprehensive licensing system ensures proper license compliance while providing flexibility for different deployment scenarios and business models.