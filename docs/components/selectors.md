# Selector Components

This document describes the hierarchical selector components available in the Service Vault application, including their usage patterns, configuration options, and best practices.

## Overview

The selector components provide enhanced user interfaces for selecting items from hierarchical data structures. They offer features like search, filtering, grouping, and visual hierarchy representation that go beyond basic HTML select elements.

## Component Hierarchy

```
/components/ui/hierarchical-selector.tsx     # Generic base component
/components/selectors/
  ├── account-selector.tsx                   # Account-specific implementation
  └── simple-account-selector.tsx           # Basic account dropdown (deprecated)
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

### Migration from Basic Select

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

### Response Format

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

1. **Consistent Usage**: Always use AccountSelector for account selection  
2. **Clear Button Usage**: Enable `allowClear={true}` for filter scenarios
3. **Error Handling**: Implement proper loading and error states
4. **Data Validation**: Validate selected account exists and user has access
5. **Performance**: Use appropriate API endpoints for data loading
6. **Accessibility**: Test with keyboard navigation and screen readers
7. **User Experience**: Provide clear placeholders and empty states

## Troubleshooting

### Common Issues

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