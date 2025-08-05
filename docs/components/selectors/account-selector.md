# AccountSelector Component

> ⚠️ **IMPORTANT**: Update when modifying account selection logic, hierarchy display, or integration patterns.

## Purpose

The `AccountSelector` is a domain-specific implementation of the `HierarchicalSelector` that provides account selection with company hierarchy visualization, account type filtering, and search capabilities. It serves as the primary example of how to extend the generic hierarchical selector for specific business domains.

## Location
`/src/components/selectors/account-selector.tsx`

## Usage

### Basic Usage
```tsx
import { AccountSelector } from "@/components/selectors/account-selector";

<AccountSelector
  accounts={accounts}
  value={selectedAccountId}
  onValueChange={setSelectedAccountId}
  placeholder="Select an account"
/>
```

### Advanced Usage with Features
```tsx
<AccountSelector
  accounts={accounts}
  value={selectedAccountId}
  onValueChange={setSelectedAccountId}
  placeholder="Choose an account"
  enableFilters={true}
  enableGrouping={true}
  className="w-full"
/>
```

### Form Integration
```tsx
import { useForm } from "react-hook-form";

const form = useForm();

<FormField
  control={form.control}
  name="accountId"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Account</FormLabel>
      <FormControl>
        <AccountSelector
          accounts={accounts}
          value={field.value}
          onValueChange={field.onChange}
          placeholder="Select an account"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Props Interface

```typescript
interface AccountSelectorProps {
  accounts: Account[];                    // Array of account objects
  value: string;                         // Selected account ID
  onValueChange: (value: string) => void; // Selection change handler
  placeholder?: string;                  // Placeholder text
  enableFilters?: boolean;               // Enable account type filtering
  enableGrouping?: boolean;              // Group by account type
  className?: string;                    // Additional CSS classes
}
```

### Account Interface
```typescript
interface Account extends HierarchicalItem {
  id: string;                           // Account ID
  name: string;                         // Account name
  accountType: string;                  // INDIVIDUAL | ORGANIZATION | SUBSIDIARY
  companyName?: string;                 // Company name (optional)
  parentAccountId?: string | null;      // Parent account for hierarchy
  parentAccount?: {                     // Parent account object
    id: string;
    name: string;
    accountType: string;
  } | null;
  childAccounts?: {                     // Child accounts array
    id: string;
    name: string;
    accountType: string;
  }[];
}
```

## Key Features

### 1. **Account Hierarchy Visualization**
- **Visual Indentation**: Shows parent-child relationships with indented display
- **Account Path**: Displays full hierarchy path for context
- **Nested Navigation**: Easy navigation through account levels
- **Hierarchy Icons**: Different icons for organization levels

### 2. **Account Type Differentiation**
```tsx
// Icon mapping based on account type
const getIcon = (account: Account) => {
  switch (account.accountType) {
    case 'ORGANIZATION':
      return <Building2 className="h-4 w-4 text-blue-600" />;
    case 'SUBSIDIARY':
      return <Building className="h-4 w-4 text-green-600" />;
    case 'INDIVIDUAL':
      return <User className="h-4 w-4 text-gray-600" />;
    default:
      return <Building className="h-4 w-4" />;
  }
};

// Badge configuration for account types
const getBadge = (account: Account) => ({
  text: account.accountType,
  variant: account.accountType === 'ORGANIZATION' ? 'default' : 'secondary'
});
```

### 3. **Enhanced Search Capabilities**
```tsx
// Multi-field search configuration
const getSearchableText = (account: Account) => [
  account.name,                    // Primary account name
  account.companyName || '',       // Company name if available
  account.accountType              // Account type for type-based search
];
```

### 4. **Account Type Filtering**
```tsx
// Filter configuration for account types
const filterConfigs = [
  {
    key: 'accountType',
    label: 'Account Type',
    icon: <Filter className="h-4 w-4" />,
    getValue: (account: Account) => account.accountType
  }
];
```

### 5. **Grouping and Organization**
```tsx
// Group accounts by type for better organization
const getGroup = (account: Account) => {
  switch (account.accountType) {
    case 'ORGANIZATION':
      return 'Organizations';
    case 'SUBSIDIARY':
      return 'Subsidiaries';
    case 'INDIVIDUAL':
      return 'Individual Accounts';
    default:
      return 'Other';
  }
};
```

## Implementation Details

### Core Component Structure
```tsx
export function AccountSelector({
  accounts,
  value,
  onValueChange,
  placeholder = "Select an account",
  enableFilters = true,
  enableGrouping = true,
  className = ""
}: AccountSelectorProps) {
  
  // Convert accounts to hierarchical items
  const hierarchicalAccounts = useMemo(() => {
    return accounts.map(account => ({
      ...account,
      parentId: account.parentAccountId
    }));
  }, [accounts]);

  return (
    <HierarchicalSelector
      items={hierarchicalAccounts}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      displayConfig={{
        getIcon,
        getBadge,
        getGroup,
        getSearchableText
      }}
      filterConfigs={enableFilters ? filterConfigs : []}
      enableGrouping={enableGrouping}
      enableSearch={true}
      enableFilters={enableFilters}
      searchPlaceholder="Search accounts..."
      emptyMessage="No accounts found"
      className={className}
    />
  );
}
```

### Display Configuration Implementation
```tsx
// Icon configuration with business logic
const getIcon = (account: Account): ReactNode => {
  const baseClasses = "h-4 w-4";
  
  switch (account.accountType) {
    case 'ORGANIZATION':
      return <Building2 className={`${baseClasses} text-blue-600`} />;
    case 'SUBSIDIARY':
      return <Building className={`${baseClasses} text-green-600`} />;
    case 'INDIVIDUAL':
      return <User className={`${baseClasses} text-gray-600`} />;
    default:
      return <Building className={baseClasses} />;
  }
};

// Badge configuration with color coding
const getBadge = (account: Account) => {
  const badgeConfig = {
    text: account.accountType.toLowerCase(),
    variant: 'secondary' as const
  };

  // Special styling for organizations
  if (account.accountType === 'ORGANIZATION') {
    badgeConfig.variant = 'default';
  }

  return badgeConfig;
};

// Enhanced search including hierarchy context
const getSearchableText = (account: Account): string[] => {
  const searchFields = [
    account.name,
    account.accountType
  ];

  // Add company name if different from account name
  if (account.companyName && account.companyName !== account.name) {
    searchFields.push(account.companyName);
  }

  // Add parent account name for context
  if (account.parentAccount) {
    searchFields.push(account.parentAccount.name);
  }

  return searchFields.filter(Boolean);
};
```

## Integration Patterns

### API Data Integration
```tsx
// Typical usage with API data
export default function SomeFormComponent() {
  const { data: accounts, isLoading } = useAccountsQuery();
  const [selectedAccountId, setSelectedAccountId] = useState("");

  if (isLoading) {
    return <div>Loading accounts...</div>;
  }

  return (
    <AccountSelector
      accounts={accounts || []}
      value={selectedAccountId}
      onValueChange={(accountId) => {
        setSelectedAccountId(accountId);
        // Trigger dependent actions
        onAccountChange(accountId);
      }}
      placeholder="Select an account"
    />
  );
}
```

### Form Validation Integration
```tsx
// Integration with form libraries
const accountSchema = z.object({
  accountId: z.string().min(1, "Please select an account")
});

const form = useForm({
  resolver: zodResolver(accountSchema)
});

<FormField
  control={form.control}
  name="accountId"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Account *</FormLabel>
      <FormControl>
        <AccountSelector
          accounts={accounts}
          value={field.value}
          onValueChange={field.onChange}
        />
      </FormControl>
      <FormDescription>
        Select the account for this item
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Dependent Field Updates
```tsx
// Update other fields when account changes
const [selectedAccount, setSelectedAccount] = useState(null);
const [availableUsers, setAvailableUsers] = useState([]);

const handleAccountChange = useCallback(async (accountId: string) => {
  setSelectedAccountId(accountId);
  
  // Find the selected account object
  const account = accounts.find(a => a.id === accountId);
  setSelectedAccount(account);
  
  // Load account-specific data
  if (accountId) {
    try {
      const users = await fetchAccountUsers(accountId);
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load account users:', error);
    }
  } else {
    setAvailableUsers([]);
  }
}, [accounts]);

return (
  <div className="space-y-4">
    <AccountSelector
      accounts={accounts}
      value={selectedAccountId}
      onValueChange={handleAccountChange}
    />
    
    {selectedAccount && (
      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-medium">{selectedAccount.name}</h4>
        <p className="text-sm text-muted-foreground">
          {selectedAccount.accountType} • {availableUsers.length} users
        </p>
      </div>
    )}
  </div>
);
```

## Advanced Features

### Account Hierarchy Context
```tsx
// Show account hierarchy path in selection
const AccountWithContext = ({ account }: { account: Account }) => {
  const buildAccountPath = (acc: Account): string => {
    if (!acc.parentAccount) {
      return acc.name;
    }
    return `${buildAccountPath(acc.parentAccount)} > ${acc.name}`;
  };

  return (
    <div className="flex flex-col">
      <span className="font-medium">{account.name}</span>
      {account.parentAccount && (
        <span className="text-xs text-muted-foreground">
          {buildAccountPath(account.parentAccount)}
        </span>
      )}
    </div>
  );
};
```

### Permission-Based Filtering
```tsx
// Filter accounts based on user permissions
export function useFilteredAccounts(accounts: Account[]) {
  const { session } = useSession();
  const { hasPermission } = usePermissions();

  return useMemo(async () => {
    if (!accounts) return [];

    // Admin sees all accounts
    if (session?.user?.role === 'ADMIN') {
      return accounts;
    }

    // Filter based on user permissions
    const accessibleAccounts = [];
    for (const account of accounts) {
      const canAccess = await hasPermission({
        resource: 'accounts',
        action: 'view',
        accountId: account.id
      });
      
      if (canAccess) {
        accessibleAccounts.push(account);
      }
    }

    return accessibleAccounts;
  }, [accounts, session?.user?.role, hasPermission]);
}

// Usage with permission filtering
export function PermissionAwareAccountSelector(props: AccountSelectorProps) {
  const filteredAccounts = useFilteredAccounts(props.accounts);

  return (
    <AccountSelector
      {...props}
      accounts={filteredAccounts}
    />
  );
}
```

### Account Type Restrictions
```tsx
// Restrict selection to specific account types
interface RestrictedAccountSelectorProps extends AccountSelectorProps {
  allowedTypes?: string[];
  excludeTypes?: string[];
}

export function RestrictedAccountSelector({
  accounts,
  allowedTypes,
  excludeTypes,
  ...props
}: RestrictedAccountSelectorProps) {
  
  const filteredAccounts = useMemo(() => {
    let filtered = accounts;

    if (allowedTypes?.length) {
      filtered = filtered.filter(account => 
        allowedTypes.includes(account.accountType)
      );
    }

    if (excludeTypes?.length) {
      filtered = filtered.filter(account => 
        !excludeTypes.includes(account.accountType)
      );
    }

    return filtered;
  }, [accounts, allowedTypes, excludeTypes]);

  return (
    <AccountSelector
      {...props}
      accounts={filteredAccounts}
    />
  );
}

// Usage examples
<RestrictedAccountSelector
  accounts={accounts}
  allowedTypes={['ORGANIZATION', 'SUBSIDIARY']}
  value={selectedAccount}
  onValueChange={setSelectedAccount}
/>

<RestrictedAccountSelector
  accounts={accounts}
  excludeTypes={['INDIVIDUAL']}
  value={selectedAccount}
  onValueChange={setSelectedAccount}
/>
```

## Styling and Customization

### Theme Integration
```css
/* Account-specific styling overrides */
.account-selector .hierarchical-item[data-account-type="ORGANIZATION"] {
  @apply bg-blue-50 border-l-2 border-l-blue-500;
}

.account-selector .hierarchical-item[data-account-type="SUBSIDIARY"] {
  @apply bg-green-50 border-l-2 border-l-green-500;
}

.account-selector .hierarchical-item[data-account-type="INDIVIDUAL"] {
  @apply bg-gray-50 border-l-2 border-l-gray-400;
}
```

### Custom Display Components
```tsx
// Custom account display with additional information
const CustomAccountDisplay = ({ account }: { account: Account }) => (
  <div className="flex items-center justify-between w-full">
    <div className="flex items-center gap-2">
      {getIcon(account)}
      <div>
        <span className="font-medium">{account.name}</span>
        {account.companyName && account.companyName !== account.name && (
          <span className="text-xs text-muted-foreground ml-2">
            ({account.companyName})
          </span>
        )}
      </div>
    </div>
    <Badge variant="outline" className="text-xs">
      {account.accountType}
    </Badge>
  </div>
);
```

## Performance Considerations

### Large Account Lists
```tsx
// Virtualization for large account lists
const VirtualizedAccountSelector = ({ accounts, ...props }: AccountSelectorProps) => {
  const memoizedAccounts = useMemo(() => {
    // Pre-process accounts for better performance
    return accounts.map(account => ({
      ...account,
      searchableText: getSearchableText(account).join(' ').toLowerCase()
    }));
  }, [accounts]);

  return (
    <AccountSelector
      {...props}
      accounts={memoizedAccounts}
    />
  );
};
```

### Caching and Memoization
```tsx
// Memoize expensive computations
const AccountSelector = memo(function AccountSelector(props: AccountSelectorProps) {
  const { accounts, ...otherProps } = props;

  // Memoize hierarchy processing
  const hierarchicalAccounts = useMemo(() => {
    return buildAccountHierarchy(accounts);
  }, [accounts]);

  // Memoize display configuration
  const displayConfig = useMemo(() => ({
    getIcon,
    getBadge,
    getGroup,
    getSearchableText
  }), []);

  return (
    <HierarchicalSelector
      items={hierarchicalAccounts}
      displayConfig={displayConfig}
      {...otherProps}
    />
  );
});
```

## Testing

### Unit Tests
```typescript
describe('AccountSelector', () => {
  const mockAccounts = [
    {
      id: '1',
      name: 'ACME Corp',
      accountType: 'ORGANIZATION',
      parentAccountId: null
    },
    {
      id: '2',
      name: 'ACME Subsidiary',
      accountType: 'SUBSIDIARY',
      parentAccountId: '1'
    }
  ];

  it('renders accounts with hierarchy', () => {
    render(
      <AccountSelector
        accounts={mockAccounts}
        value=""
        onValueChange={() => {}}
      />
    );

    expect(screen.getByText('ACME Corp')).toBeInTheDocument();
    expect(screen.getByText('ACME Subsidiary')).toBeInTheDocument();
  });

  it('calls onValueChange when account is selected', () => {
    const handleChange = jest.fn();
    
    render(
      <AccountSelector
        accounts={mockAccounts}
        value=""
        onValueChange={handleChange}
      />
    );

    // Simulate account selection
    fireEvent.click(screen.getByText('ACME Corp'));
    expect(handleChange).toHaveBeenCalledWith('1');
  });

  it('filters accounts by type', () => {
    render(
      <AccountSelector
        accounts={mockAccounts}
        value=""
        onValueChange={() => {}}
        enableFilters={true}
      />
    );

    // Test filter functionality
    fireEvent.click(screen.getByText('ORGANIZATION'));
    expect(screen.getByText('ACME Corp')).toBeInTheDocument();
    expect(screen.queryByText('ACME Subsidiary')).not.toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
describe('AccountSelector Integration', () => {
  it('works with form validation', () => {
    // Test form integration
  });

  it('updates dependent fields', () => {
    // Test dependent field updates
  });

  it('handles API data loading', () => {
    // Test with loading states
  });
});
```

## Related Components

### Base Components
- **[HierarchicalSelector](../ui/hierarchical-selector.md)** - Generic foundation component
- **[Select](../ui/select.md)** - Simple dropdown alternative
- **[Input](../ui/input.md)** - Search functionality

### Related Selectors
- **[TicketSelector](./ticket-selector.md)** - Similar pattern for tickets
- **[UserSelector](./user-selector.md)** - User selection with roles
- **[SimpleAccountSelector](./simple-account-selector.md)** - Simplified version

### Integration Components
- **[AccountHierarchyCard](../accounts/hierarchy-components.md)** - Display component
- **[CreateAccountDialog](../accounts/user-management.md)** - Account creation
- **[AccountViewToggle](../accounts/hierarchy-components.md)** - View mode switching

## Common Issues and Solutions

### Hierarchy Display Problems
```tsx
// Issue: Accounts not showing hierarchy
// Solution: Ensure parentAccountId is properly set
const fixedAccounts = accounts.map(account => ({
  ...account,
  parentId: account.parentAccountId // HierarchicalSelector expects parentId
}));
```

### Performance with Large Lists
```tsx
// Issue: Slow rendering with many accounts
// Solution: Implement virtual scrolling or pagination
const [visibleAccounts, setVisibleAccounts] = useState([]);

useMemo(() => {
  // Show only first 100 accounts by default
  setVisibleAccounts(accounts.slice(0, 100));
}, [accounts]);
```

### Search Not Working
```tsx
// Issue: Search not finding accounts
// Solution: Verify searchable text configuration
const debugSearchableText = (account: Account) => {
  const text = getSearchableText(account);
  console.log(`Account ${account.name} searchable text:`, text);
  return text;
};
```

---

## Maintenance Notes

Update this documentation when:
- Account interface changes
- New account types are added
- Hierarchy logic is modified
- Display configuration is updated
- Search or filtering behavior changes
- Integration patterns are established

This component serves as the primary example for implementing domain-specific selectors. Changes to this component may need to be reflected in other selector implementations.

Last updated: [Current Date]