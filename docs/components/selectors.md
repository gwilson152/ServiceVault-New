# Selector Components

This document describes the hierarchical selector components and user management dialogs available in the Service Vault application, including their usage patterns, configuration options, and best practices.

## Overview

The selector components provide enhanced user interfaces for selecting items from hierarchical data structures. They offer features like search, filtering, grouping, and visual hierarchy representation that go beyond basic HTML select elements.

## Component Hierarchy

```
/components/ui/hierarchical-selector.tsx     # Generic base component
/components/selectors/
  ├── account-selector.tsx                   # Account-specific implementation
  ├── billing-rate-selector.tsx             # Billing rate selection with account overrides
  └── simple-account-selector.tsx           # Basic account dropdown (deprecated)
/components/users/                           # User management dialogs
  ├── UserRoleManagementDialog.tsx          # Role management interface
  ├── UserStatusManagementDialog.tsx        # Security and status management
  └── AssignAccountDialog.tsx               # Account assignment dialog
```

## HierarchicalSelector (Generic Base)

The `HierarchicalSelector<T>` is a generic TypeScript component that can work with any hierarchical data structure.

### Features

- **Search**: Real-time search across configurable text fields
- **Filtering**: Multi-select filters based on item properties
- **Grouping**: Group items by configurable criteria
- **Hierarchy**: Visual representation of parent-child relationships
- **Icons & Badges**: Customizable icons and status badges
- **Keyboard Navigation**: Full keyboard accessibility
- **Responsive**: Works on desktop and mobile devices

### Basic Usage

```typescript
import { HierarchicalSelector, HierarchicalItem } from "@/components/ui/hierarchical-selector";

interface MyItem extends HierarchicalItem {
  name: string;
  type: string;
  // ... other properties
}

<HierarchicalSelector<MyItem>
  items={myItems}
  value={selectedValue}
  onValueChange={handleChange}
  placeholder="Select an item"
  displayConfig={displayConfig}
  enableSearch={true}
/>
```

## AccountSelector (Account-Specific Implementation)

The `AccountSelector` is a specialized implementation of `HierarchicalSelector` designed specifically for account selection throughout the application.

### Features

- **Account Type Icons**: 
  - Organization: Building icon
  - Subsidiary: Building2 icon  
  - Individual: User icon
- **Type-Based Grouping**: Groups accounts by type (Organizations, Subsidiaries, Individuals)
- **Type Filtering**: Filter accounts by account type
- **Hierarchy Support**: Shows parent-child account relationships
- **Multi-Field Search**: Searches both account name and company name
- **Type Badges**: Color-coded badges for account types

### Usage

```typescript
import { AccountSelector, Account } from "@/components/selectors/account-selector";

const [accounts, setAccounts] = useState<Account[]>([]);
const [selectedAccountId, setSelectedAccountId] = useState<string>("");

<AccountSelector
  accounts={accounts}
  value={selectedAccountId}
  onValueChange={setSelectedAccountId}
  placeholder="Select an account"
  enableFilters={true}
  enableGrouping={true}
  allowClear={true}
  className="w-full"
/>
```

### Clear Functionality

When `allowClear={true}` is enabled, a clear button (X) appears next to the filter button when an account is selected. This allows users to clear their selection and return to the default state.

**Filter Usage Pattern:**
```typescript
// For filtering scenarios where "no selection" means "all items"
const [selectedAccount, setSelectedAccount] = useState<string>("all");

<AccountSelector
  accounts={accounts}
  value={selectedAccount === "all" ? "" : selectedAccount}
  onValueChange={(value) => setSelectedAccount(value || "all")}
  placeholder="All Accounts"
  allowClear={true}
  enableFilters={true}
  enableGrouping={true}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `accounts` | `Account[]` | Required | Array of account objects |
| `value` | `string` | Required | Currently selected account ID |
| `onValueChange` | `(value: string) => void` | Required | Callback when selection changes |
| `placeholder` | `string` | "Select an account" | Placeholder text |
| `enableFilters` | `boolean` | `true` | Enable account type filtering |
| `enableGrouping` | `boolean` | `true` | Enable grouping by account type |
| `allowClear` | `boolean` | `false` | Show clear button to remove selection |
| `className` | `string` | `""` | Additional CSS classes |

### Account Interface

```typescript
interface Account extends HierarchicalItem {
  id: string;
  name: string;
  accountType: 'ORGANIZATION' | 'SUBSIDIARY' | 'INDIVIDUAL';
  companyName?: string;
  parentAccountId?: string | null;
  parentAccount?: {
    id: string;
    name: string;
    accountType: string;
  } | null;
  childAccounts?: {
    id: string;
    name: string;
    accountType: string;
  }[];
}
```

## BillingRateSelector (Billing Rate Selection)

The `BillingRateSelector` is a specialized selector component designed for choosing billing rates with account-specific overrides. It provides a comprehensive interface for displaying effective rates, inheritance information, and visual indicators for different rate types.

### Features

- **Account-Specific Overrides**: Shows rates with account-level customizations
- **Rate Inheritance**: Displays rates inherited from parent accounts  
- **Visual Indicators**:
  - Green $ icon: Account-specific override
  - Blue arrow: Inherited from parent account
  - Gray building: System default rate
- **Rate Type Badges**: 
  - "Account Override": Custom rate for this account
  - "Inherited": Rate from parent account
  - "Default": System default rate
- **Effective Rate Display**: Shows final rate with context
- **Optional "No Charge"**: Configurable $0.00 option
- **Loading & Error States**: Proper feedback during data fetching
- **Permission-Based Loading**: Respects user permissions
- **Auto-Selection**: Automatically selects default billing rate (configurable)

### Usage

```typescript
import { BillingRateSelector } from "@/components/selectors/billing-rate-selector";

const [selectedRateId, setSelectedRateId] = useState<string>("");

<BillingRateSelector
  accountId={accountId}
  value={selectedRateId}
  onValueChange={setSelectedRateId}
  showNoChargeOption={true}
  required={true}
  placeholder="Choose billing rate"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `accountId` | `string` | Required | Account ID to load billing rates for |
| `value` | `string` | `undefined` | Currently selected billing rate ID |
| `onValueChange` | `(value: string) => void` | Required | Callback when selection changes |
| `disabled` | `boolean` | `false` | Whether the selector is disabled |
| `required` | `boolean` | `false` | Whether selection is required |
| `showNoChargeOption` | `boolean` | `true` | Whether to show "No Charge" option |
| `placeholder` | `string` | `"Select billing rate"` | Placeholder text |
| `className` | `string` | `""` | Additional CSS classes |
| `label` | `string` | `"Billing Rate"` | Custom label text |
| `autoSelectDefault` | `boolean` | `true` | Auto-select default billing rate when data loads |

### BillingRate Interface

```typescript
interface BillingRate {
  id: string;                           // Unique billing rate ID
  name: string;                         // Display name (e.g., "Standard", "Premium")
  description?: string;                 // Optional description
  systemRate: number;                   // Base system rate
  accountRate?: number;                 // Account-specific override rate
  effectiveRate: number;                // Final rate (override or system)
  hasOverride: boolean;                 // Has account-specific rate
  overrideId?: string;                  // ID of account override record
  isDefault: boolean;                   // Is system default rate
  inheritedFromAccountId?: string;      // Parent account ID (if inherited)
  inheritedAccountName?: string;        // Parent account name
}
```

### Rate Display Logic

The component displays rates with contextual information:

```typescript
// Account Override Example
"$150.00/hour (Account Override - System: $90.00)"

// Inherited Rate Example  
"$120.00/hour (Inherited from parent account)"

// System Default Example
"$90.00/hour (System Default)"
```

### Visual Indicators

- **Icons**: Convey rate type at a glance
  - 💲 Green: Account has custom rate
  - ⬇️ Blue: Rate inherited from parent
  - 🏢 Gray: Using system default

- **Badges**: Show rate classification
  - "Account Override": This account has a custom rate
  - "Inherited": Using parent account's rate
  - "Default": Using system default rate

- **Info Text**: Detailed rate information below selector
  - Shows effective rate vs system rate comparison
  - Explains inheritance source
  - Identifies default rates

### Auto-Selection Behavior

By default, the component automatically selects the default billing rate when data loads:

1. **Default Selection Priority**:
   - First: Rate marked with `isDefault: true`
   - Fallback: First available rate if no default exists
   - None: If `autoSelectDefault={false}` is set

2. **When Auto-Selection Occurs**:
   - Only when `value` is empty/undefined
   - Only when `autoSelectDefault={true}` (default)
   - Only after billing rates load successfully

3. **Disabling Auto-Selection**:
   ```typescript
   <BillingRateSelector
     accountId={accountId}
     autoSelectDefault={false}  // Disable auto-selection
     placeholder="Choose billing rate"
   />
   ```

### Usage Patterns

#### Time Entry Creation (Standard Pattern - Auto-Select Default)

```typescript
// QuickTimeEntry component - Standard time logging with auto-selection
<BillingRateSelector
  accountId={accountId}
  value={billingRateId}
  onValueChange={setBillingRateId}
  showNoChargeOption={false}    // Hide if noCharge switch handles it
  autoSelectDefault={true}      // Auto-select default rate (recommended)
  placeholder="Select billing rate (optional)"
/>
```

#### Time Entry Creation (Manual Selection Only)

```typescript
// Special cases where user must explicitly choose rate
<BillingRateSelector
  accountId={accountId}
  value={billingRateId}
  onValueChange={setBillingRateId}
  showNoChargeOption={false}    
  autoSelectDefault={false}     // Force user to make explicit choice
  placeholder="Choose billing rate"
  required={true}               // Make selection required
/>
```

#### Invoice Generation (Auto-Select Default)

```typescript
// Invoice creation with required rate - auto-selects default
<BillingRateSelector
  accountId={invoice.accountId}
  value={defaultBillingRate}
  onValueChange={setDefaultBillingRate}
  required={true}
  showNoChargeOption={false}
  autoSelectDefault={true}        // Auto-select default (default behavior)
  label="Default Billing Rate"
/>
```

#### Account Settings Override

```typescript
// Account billing rate management
<BillingRateSelector
  accountId={account.id}
  value={overrideRateId}
  onValueChange={setOverrideRateId}
  showNoChargeOption={false}
  label="Override Rate"
  placeholder="Select rate to override"
/>
```

### Integration with No Charge Logic

When combined with a "No Charge" toggle:

```typescript
const [noCharge, setNoCharge] = useState(false);
const [billingRateId, setBillingRateId] = useState("");

// Hide billing rate selector when no charge is enabled
{!noCharge && (
  <BillingRateSelector
    accountId={accountId}
    value={billingRateId}
    onValueChange={setBillingRateId}
    showNoChargeOption={false}
  />
)}

<Switch
  checked={noCharge}
  onCheckedChange={(checked) => {
    setNoCharge(checked);
    if (checked) setBillingRateId(""); // Clear rate selection
  }}
/>
```

### API Integration

The component integrates with the account billing rates API:

#### Endpoint
- **`GET /api/accounts/[id]/billing-rates`**

#### Response Format
```typescript
{
  account: {
    id: string;
    name: string;
  };
  billingRates: BillingRate[];
}
```

#### Error Handling
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: No permission to view billing rates for account  
- **404 Not Found**: Account doesn't exist
- **500 Server Error**: Database or processing error

### Permission Requirements

Users must have `billing:view` permission for the specific account to load billing rates. The component will show an error state if permission is denied.

### Loading States

The component provides feedback during data fetching:

```typescript
// Loading State
<div className="flex items-center gap-2 p-2 border rounded">
  <Loader2 className="h-4 w-4 animate-spin" />
  <span>Loading billing rates...</span>
</div>

// Error State  
<Alert variant="destructive">
  <AlertDescription>Failed to load billing rates</AlertDescription>
</Alert>
```

## Usage Guidelines

### When to Use AccountSelector

✅ **Use AccountSelector for:**
- Account selection in forms (user creation, ticket assignment, etc.)
- Account filtering in lists and tables
- Any UI where users need to select from accounts with hierarchy
- Scenarios requiring account type filtering or grouping

### When NOT to Use AccountSelector

❌ **Don't use AccountSelector for:**
- Simple dropdowns with non-hierarchical data
- When you need a basic account list without advanced features
- Performance-critical scenarios with very large datasets (>1000 items)

### When to Use BillingRateSelector

✅ **Use BillingRateSelector for:**
- Time entry creation and editing forms
- Invoice generation with billing rate selection
- Account settings for billing rate overrides
- Any scenario requiring billing rate selection with account context
- Forms where effective rate visibility is important

### When NOT to Use BillingRateSelector

❌ **Don't use BillingRateSelector for:**
- Global billing rate management (use dedicated admin interface)
- Simple rate selection without account context
- Read-only rate display (use simple text or badge)
- Cases where "No Charge" option conflicts with form logic

### Migration from Basic Select

#### AccountSelector Migration

**Before (Basic Select):**
```typescript
<Select value={accountId} onValueChange={setAccountId}>
  <SelectTrigger>
    <SelectValue placeholder="Select account" />
  </SelectTrigger>
  <SelectContent>
    {accounts.map(account => (
      <SelectItem key={account.id} value={account.id}>
        {account.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**After (AccountSelector):**
```typescript
<AccountSelector
  accounts={accounts}
  value={accountId}
  onValueChange={setAccountId}
  placeholder="Select account"
  enableFilters={true}
  enableGrouping={true}
/>
```

#### BillingRateSelector Migration

**Before (Basic Select with Manual Rate Loading):**
```typescript
const [billingRates, setBillingRates] = useState([]);

useEffect(() => {
  fetch(`/api/billing-rates?accountId=${accountId}`)
    .then(res => res.json())
    .then(setBillingRates);
}, [accountId]);

<Select value={rateId} onValueChange={setRateId}>
  <SelectTrigger>
    <SelectValue placeholder="Select rate" />
  </SelectTrigger>
  <SelectContent>
    {billingRates.map(rate => (
      <SelectItem key={rate.id} value={rate.id}>
        {rate.name} - ${rate.rate}/hour
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**After (BillingRateSelector):**
```typescript
<BillingRateSelector
  accountId={accountId}
  value={rateId}
  onValueChange={setRateId}
  placeholder="Select billing rate"
  showNoChargeOption={true}
/>
```

## Data Loading Patterns

### Standard Pattern

```typescript
const [accounts, setAccounts] = useState<Account[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadAccounts = async () => {
    try {
      // Use /api/accounts/all for simple list
      const response = await fetch('/api/accounts/all');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  loadAccounts();
}, []);

if (loading) {
  return <div>Loading accounts...</div>;
}

return (
  <AccountSelector
    accounts={accounts}
    value={selectedAccount}
    onValueChange={setSelectedAccount}
  />
);
```

## API Endpoints

### For AccountSelector

- **`/api/accounts/all`** - Returns simple account array suitable for AccountSelector
- **`/api/accounts`** - Returns paginated account data (not suitable for selector)

#### Response Format

```typescript
// /api/accounts/all response
Account[] = [
  {
    id: "account-1",
    name: "Acme Corporation",
    accountType: "ORGANIZATION",
    companyName: "Acme Corporation",
    parentId: null,
    // ... other fields
  },
  // ... more accounts
]
```

### For BillingRateSelector

- **`GET /api/accounts/[id]/billing-rates`** - Returns billing rates for specific account with overrides

#### Response Format

```typescript
// /api/accounts/[id]/billing-rates response
{
  account: {
    id: string;
    name: string;
  };
  billingRates: BillingRate[];
}

// BillingRate structure
{
  id: "rate-1",
  name: "Standard Rate",
  description: "Standard hourly billing rate",
  systemRate: 90.00,
  accountRate: 150.00,           // Account-specific override
  effectiveRate: 150.00,         // Final rate used
  hasOverride: true,
  overrideId: "override-1",
  isDefault: false,
  inheritedFromAccountId: null,
  inheritedAccountName: null
}
```

#### Permission Requirements

- **AccountSelector**: Requires permission to view accounts
- **BillingRateSelector**: Requires `billing:view` permission for the specific account

## Accessibility

The selector components include proper accessibility features:

- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support (Arrow keys, Enter, Escape)
- **Focus Management**: Proper focus handling and visual indicators
- **Screen Reader Support**: Announces selections and state changes

## Performance Considerations

- **Large Datasets**: For >500 accounts, consider implementing server-side filtering
- **Memoization**: Use `useMemo` for expensive data transformations
- **Debounced Search**: Built-in search debouncing prevents excessive API calls
- **Virtual Scrolling**: Consider virtualization for very large lists

## Examples in Codebase

### User Management Page

Location: `/src/app/users/page.tsx`

```typescript
// Invite User Dialog
<AccountSelector
  accounts={accounts}
  value={inviteForm.accountId}
  onValueChange={(value) => setInviteForm({...inviteForm, accountId: value})}
  placeholder="Select account"
  enableFilters={true}
  enableGrouping={true}
/>

// Create User Dialog  
<AccountSelector
  accounts={accounts}
  value={createForm.accountId}
  onValueChange={(value) => setCreateForm({...createForm, accountId: value})}
  placeholder="Select account"
  enableFilters={true}
  enableGrouping={true}
/>
```

## Future Enhancements

Planned improvements to the selector components:

1. **Multi-Select Support**: Allow selection of multiple accounts
2. **Custom Filters**: User-defined filter criteria
3. **Saved Selections**: Remember frequently selected accounts
4. **Batch Operations**: Support for bulk account operations
5. **Enhanced Hierarchy**: Visual tree lines and expansion/collapse
6. **Performance**: Virtual scrolling for large datasets

## Recent Updates

### RBAC Agent Selector Enhancement (August 6, 2025)

The `AgentSelector` component has been completely refactored to use permission-based filtering instead of hard-coded role checking:

#### Key Changes:
- **Permission-Based Filtering**: Now uses `tickets:assignable-to` permission instead of hard-coded `ADMIN`/`EMPLOYEE` role checks
- **Dynamic Data Fetching**: Fetches assignable agents from `/api/users/assignable` endpoint based on permissions
- **Account Context Support**: Optional `accountId` prop for account-scoped agent selection
- **Automatic Updates**: Refetches agents when account context changes
- **Loading States**: Provides visual feedback during agent loading

#### Updated Interface:
```typescript
interface AgentSelectorProps {
  selectedAgentId: string;
  onAgentChange: (agentId: string) => void;
  accountId?: string; // Optional account context for scoped permissions
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}
```

#### Usage Example:
```typescript
<AgentSelector
  selectedAgentId={selectedAgent}
  onAgentChange={setSelectedAgent}
  accountId={accountId} // Optional for account-scoped filtering
  label="Assigned Agent"
  placeholder="Select agent to work on this"
/>
```

### Account User Assignment Selector Fix (August 6, 2025)

The `AccountUserAssignmentSelector` component has been fixed to properly handle the API response format:

#### Bug Fixed:
- **API Response Handling**: Now properly handles `{ accountUsers: [...] }` response format
- **Child Account Support**: Includes users from child accounts for hierarchical assignment
- **Improved Error Handling**: Better error handling for failed API calls

### Clear Functionality (v2024.1)

The AccountSelector now includes an `allowClear` prop that adds a clear button for filter scenarios:

```typescript
// Enable clear functionality for filters
<AccountSelector
  accounts={accounts}
  value={selectedAccount === "all" ? "" : selectedAccount}
  onValueChange={(value) => setSelectedAccount(value || "all")}
  placeholder="All Accounts"
  allowClear={true}  // Enables the clear button
  enableFilters={true}
  enableGrouping={true}
/>
```

**Features:**
- Clear button appears next to filter button when an account is selected
- Clicking clear button calls `onValueChange("")` 
- Perfect for filter scenarios where "no selection" means "show all"
- Tooltip distinguishes between "Clear selection" and "Clear filters"

**Implementation Example (Users Page):**
```typescript
// Handle filter logic where "all" represents no filter
const [selectedAccount, setSelectedAccount] = useState<string>("all");

// Convert between filter state and selector state
<AccountSelector
  value={selectedAccount === "all" ? "" : selectedAccount}
  onValueChange={(value) => setSelectedAccount(value || "all")}
  allowClear={true}
/>
```

## Best Practices

### General Selector Guidelines

1. **Consistent Usage**: Always use standardized selectors (AccountSelector, BillingRateSelector) instead of basic Select components
2. **Error Handling**: Implement proper loading and error states for all selectors
3. **Data Validation**: Validate selected values exist and user has access
4. **Performance**: Use appropriate API endpoints and avoid unnecessary data fetching
5. **Accessibility**: Test with keyboard navigation and screen readers
6. **User Experience**: Provide clear placeholders and empty states

### AccountSelector Best Practices

1. **Clear Button Usage**: Enable `allowClear={true}` for filter scenarios where "no selection" means "show all"
2. **Hierarchy Display**: Use grouping and filtering to help users navigate complex account structures
3. **API Usage**: Always use `/api/accounts/all` for selector data, not the paginated `/api/accounts`
4. **Permission Validation**: Ensure selected accounts are accessible to the current user

### BillingRateSelector Best Practices

1. **Account Context**: Always provide `accountId` to show relevant rates with proper overrides
2. **Auto-Selection Strategy**:
   - **Recommended Default**: Use `autoSelectDefault={true}` for most time entry scenarios
   - Use `autoSelectDefault={true}` for required fields (invoices, billing forms, standard time logging)
   - Use `autoSelectDefault={false}` only for special cases where explicit user choice is required
   - Consider user workflow - auto-selection improves UX for routine operations
3. **No Charge Integration**: Use `showNoChargeOption={false}` when handling no-charge logic separately
4. **Required Fields**: Set `required={true}` for forms where billing rate is mandatory
5. **State Management**: Clear billing rate selection when switching to no-charge mode
6. **Permission Validation**: Handle cases where user lacks `billing:view` permission gracefully
7. **Loading States**: Show loading feedback since billing rates load asynchronously

### Integration Patterns

#### Form State Management
```typescript
// Proper state management for time entry forms
const [accountId, setAccountId] = useState("");
const [billingRateId, setBillingRateId] = useState("");
const [noCharge, setNoCharge] = useState(false);

// Clear billing rate when account changes (allows auto-selection to work)
useEffect(() => {
  setBillingRateId("");
}, [accountId]);

// Clear billing rate when no-charge enabled
const handleNoChargeChange = (checked: boolean) => {
  setNoCharge(checked);
  if (checked) setBillingRateId("");
};

// Examples of different auto-selection strategies:

// Standard time entry - auto-select default rate (recommended)
<BillingRateSelector
  accountId={accountId}
  value={billingRateId}
  onValueChange={setBillingRateId}
  autoSelectDefault={true}      // Auto-select for better UX
  placeholder="Select billing rate (optional)"
/>

// Required billing form - auto-select default rate
<BillingRateSelector
  accountId={accountId}
  value={billingRateId}
  onValueChange={setBillingRateId}
  autoSelectDefault={true}      // Will auto-select when accountId changes
  required={true}
/>

// Special case - force explicit user choice
<BillingRateSelector
  accountId={accountId}
  value={billingRateId}
  onValueChange={setBillingRateId}
  autoSelectDefault={false}     // Only when user must explicitly choose
  required={true}
  placeholder="Choose billing rate"
/>
```

#### Error Boundary Integration
```typescript
// Wrap selectors in error boundaries for production
<ErrorBoundary fallback={<SimpleSelect />}>
  <BillingRateSelector {...props} />
</ErrorBoundary>
```

## Troubleshooting

### Common Issues

#### AccountSelector Issues

**"accounts.map is not a function"**
- Ensure you're using `/api/accounts/all` which returns an array
- Check that accounts state is initialized as an empty array

**Account not showing in selector**
- Verify account has required fields (id, name, accountType)
- Check that user has permission to view the account
- Ensure parentId references are correct for hierarchy

**Performance issues with large datasets**
- Consider server-side filtering and pagination
- Implement search debouncing
- Use React.memo for expensive list items

#### BillingRateSelector Issues

**"Failed to load billing rates" error**
- Check that `accountId` prop is provided and valid
- Verify user has `billing:view` permission for the account
- Ensure `/api/accounts/[id]/billing-rates` endpoint is accessible

**No billing rates showing**
- Verify account exists and has at least system default rates
- Check that BillingRate records exist in database with `isDefault: true`
- Ensure account billing rate overrides are properly configured

**Effective rates not calculating correctly**
- Verify AccountBillingRate relationships are set up correctly
- Check that `effectiveRate` calculation in API includes account overrides
- Ensure inheritance logic works for child accounts

**Component stuck in loading state**
- Check for network errors in browser console
- Verify API endpoint returns proper response format
- Ensure `accountId` is not changing rapidly (causing infinite re-fetches)

#### General Selector Issues

**Selector not responding to value changes**
- Ensure `value` and `onValueChange` props are correctly connected
- Check that parent component state is updating properly
- Verify `value` matches actual item IDs from API

**Accessibility concerns**
- Test with keyboard navigation (Tab, Arrow keys, Enter, Escape)
- Verify screen reader announcements are working
- Ensure proper ARIA labels and focus management

## User Management Dialogs

The user management dialogs provide comprehensive interfaces for administering user accounts, roles, and security settings. These components integrate with the RBAC permission system and follow enterprise security best practices.

### UserRoleManagementDialog

**Purpose**: Comprehensive role management interface for individual users
**Location**: `/src/components/users/UserRoleManagementDialog.tsx`

#### Features

- **Role Assignment Management**:
  - Add roles to existing account memberships
  - Remove roles from memberships
  - Remove users from accounts entirely
  - Real-time role availability filtering
- **Effective Permissions Viewer**:
  - Visual permission display grouped by resource
  - Human-readable permission labels with account names
  - Special handling for wildcard permissions
  - Global vs account-scoped permission distinction

#### Usage

```typescript
import { UserRoleManagementDialog } from "@/components/users/UserRoleManagementDialog";

<UserRoleManagementDialog
  open={showRoleDialog}
  onOpenChange={setShowRoleDialog}
  userId={user.id}
  userName={user.name || user.email}
  memberships={user.memberships}
  onRoleChanged={refreshUserData}
/>
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Dialog visibility state |
| `onOpenChange` | `(open: boolean) => void` | Dialog state change callback |
| `userId` | `string` | Target user ID |
| `userName` | `string` | User display name |
| `memberships` | `AccountMembership[]` | User's current memberships |
| `onRoleChanged` | `() => void` | Callback after role changes |

### UserStatusManagementDialog

**Purpose**: User security and status management interface
**Location**: `/src/components/users/UserStatusManagementDialog.tsx`

#### Features

- **Account Status Management**:
  - Enable/disable user accounts
  - View current security flags and login attempts
  - Force password reset with confirmation
  - Unlock locked accounts
- **Session Management**:
  - View all active user sessions with device details
  - Revoke individual or all sessions
  - Current session protection

#### Usage

```typescript
import { UserStatusManagementDialog } from "@/components/users/UserStatusManagementDialog";

<UserStatusManagementDialog
  open={showStatusDialog}
  onOpenChange={setShowStatusDialog}
  userId={user.id}
  userName={user.name || user.email}
  userEmail={user.email}
  onStatusChanged={refreshUserData}
/>
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Dialog visibility state |
| `onOpenChange` | `(open: boolean) => void` | Dialog state change callback |
| `userId` | `string` | Target user ID |
| `userName` | `string` | User display name |
| `userEmail` | `string` | User email address |
| `onStatusChanged` | `() => void` | Callback after status changes |

### Integration Example

Complete integration on user detail page:

```typescript
// User Detail Page (/users/[id])
const [showRoleManagement, setShowRoleManagement] = useState(false);
const [showStatusManagement, setShowStatusManagement] = useState(false);

return (
  <div>
    {/* User action buttons */}
    <Button onClick={() => setShowRoleManagement(true)}>
      <Shield className="h-4 w-4 mr-2" />
      Manage Roles
    </Button>
    
    <Button onClick={() => setShowStatusManagement(true)}>
      <UserCheck className="h-4 w-4 mr-2" />
      Manage Status
    </Button>

    {/* Management dialogs */}
    <UserRoleManagementDialog
      open={showRoleManagement}
      onOpenChange={setShowRoleManagement}
      userId={user.id}
      userName={user.name || user.email}
      memberships={user.memberships}
      onRoleChanged={loadUser}
    />

    <UserStatusManagementDialog
      open={showStatusManagement}
      onOpenChange={setShowStatusManagement}
      userId={user.id}
      userName={user.name || user.email}
      userEmail={user.email}
      onStatusChanged={loadUser}
    />
  </div>
);
```

### Security Features

#### Permission-Based Access
- All dialogs check `canEditUsers` permission before rendering
- API operations validate user permissions server-side
- Self-protection prevents users from modifying their own accounts

#### Confirmation Patterns
- Destructive actions require typed confirmations
- Critical actions show detailed impact warnings
- Session revocation excludes current admin session

#### Data Validation
- Role assignments validate against available templates
- Status changes verify current user state
- Account associations validate membership permissions

### API Integration

The user management dialogs integrate with comprehensive API endpoints:

#### Role Management APIs
- `POST /api/users/[id]/membership-roles` - Add role to membership
- `DELETE /api/users/[id]/membership-roles` - Remove role from membership
- `DELETE /api/users/[id]/memberships/[membershipId]` - Remove from account
- `GET /api/users/[id]/effective-permissions` - View computed permissions

#### Status Management APIs
- `GET /api/users/[id]/status` - Get user status and sessions
- `POST /api/users/[id]/disable|enable|unlock` - Status control
- `POST /api/users/[id]/force-password-reset` - Security actions
- `POST /api/users/[id]/revoke-sessions` - Session management

### Best Practices

#### For Developers
1. **Always validate permissions** before showing management dialogs
2. **Use confirmation dialogs** for destructive actions
3. **Refresh data after changes** using provided callbacks
4. **Handle loading states** during API operations
5. **Provide clear error messages** for failed operations

#### For Administrators
1. **Review effective permissions** before making role changes
2. **Use least privilege principle** when assigning roles
3. **Document security actions** for audit compliance
4. **Monitor failed attempts** and locked accounts
5. **Regular permission audits** to ensure appropriate access

The user management dialogs provide enterprise-level user administration capabilities while maintaining security, usability, and proper integration with the application's permission system.