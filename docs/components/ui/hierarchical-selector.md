# HierarchicalSelector Component

> ⚠️ **IMPORTANT**: Update when modifying component interfaces, behavior, or adding new features.

## Purpose

The `HierarchicalSelector` is a generic, reusable component for selecting items from hierarchical data structures. It provides a foundation for all domain-specific selectors in the application (AccountSelector, TicketSelector, etc.) with built-in search, filtering, and grouping capabilities.

## Location
`/src/components/ui/hierarchical-selector.tsx`

## Usage

### Basic Usage
```tsx
import { HierarchicalSelector } from "@/components/ui/hierarchical-selector";

<HierarchicalSelector
  items={hierarchicalItems}
  value={selectedId}
  onValueChange={setSelectedId}
  placeholder="Select an item"
/>
```

### Advanced Usage with Configuration
```tsx
<HierarchicalSelector
  items={accounts}
  value={selectedAccount}
  onValueChange={setSelectedAccount}
  placeholder="Select an account"
  displayConfig={{
    getIcon: (item) => <Building className="h-4 w-4" />,
    getBadge: (item) => ({ text: item.type, variant: "secondary" }),
    getGroup: (item) => item.accountType,
    getSearchableText: (item) => [item.name, item.companyName]
  }}
  filterConfigs={[
    {
      key: "accountType",
      label: "Account Type",
      getValue: (item) => item.accountType
    }
  ]}
  enableGrouping={true}
  enableSearch={true}
  enableFilters={true}
/>
```

## Props Interface

```typescript
interface HierarchicalSelectorProps<T extends HierarchicalItem> {
  items: T[];                           // Array of hierarchical items
  value: string;                        // Currently selected item ID
  onValueChange: (value: string) => void; // Selection change handler
  placeholder?: string;                 // Placeholder text
  displayConfig?: ItemDisplayConfig<T>; // Display customization
  filterConfigs?: FilterConfig[];       // Filter configuration
  enableGrouping?: boolean;            // Enable grouping by category
  enableSearch?: boolean;              // Enable search functionality
  enableFilters?: boolean;             // Enable advanced filtering
  searchPlaceholder?: string;          // Search input placeholder
  emptyMessage?: string;               // Message when no items found
  className?: string;                  // Additional CSS classes
}
```

### Base Item Interface
```typescript
interface HierarchicalItem {
  id: string;                          // Unique identifier
  name: string;                       // Display name
  parentId?: string | null;           // Parent item ID for hierarchy
}
```

### Display Configuration
```typescript
interface ItemDisplayConfig<T extends HierarchicalItem> {
  getIcon?: (item: T) => ReactNode;    // Icon for each item
  getBadge?: (item: T) => {            // Badge configuration
    text: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  };
  getGroup?: (item: T) => string;      // Grouping function
  getSearchableText?: (item: T) => string[]; // Fields to search
}
```

### Filter Configuration
```typescript
interface FilterConfig {
  key: string;                         // Unique filter key
  label: string;                       // Display label
  icon?: ReactNode;                   // Optional filter icon
  getValue: (item: HierarchicalItem) => string; // Value extraction
}
```

## Key Features

### 1. **Hierarchical Structure Processing**
- Automatically builds tree structure from flat arrays
- Calculates depth levels for visual indentation
- Supports unlimited nesting levels
- Maintains parent-child relationships

### 2. **Search Functionality**
- Real-time search across configurable fields
- Case-insensitive matching
- Searches through item names and custom fields
- Highlights matching results

### 3. **Advanced Filtering**
- Multiple filter categories
- Toggle-based filter selection
- Combines with search for refined results
- Visual filter indicators

### 4. **Grouping & Organization**
- Groups items by configurable categories
- Maintains hierarchy within groups
- Collapsible group sections
- Custom group ordering

### 5. **Visual Customization**
- Custom icons per item type
- Configurable badges for status/type
- Hierarchical indentation
- Theme-consistent styling

### 6. **Performance Optimizations**
- Memoized hierarchy processing
- Efficient search algorithms
- Virtual scrolling for large datasets
- Debounced search input

## Internal Structure

### Hierarchy Processing
```typescript
const itemHierarchy = useMemo(() => {
  const rootItems = items.filter(item => !item.parentId);
  
  const buildTree = (item: T, depth = 0): HierarchicalItemWithMeta<T> => {
    const children = items.filter(child => child.parentId === item.id);
    return {
      ...item,
      depth,
      children: children.map(child => buildTree(child, depth + 1)),
      path: buildPath(item),
      displayName: formatDisplayName(item, depth)
    };
  };
  
  return rootItems.map(item => buildTree(item));
}, [items]);
```

### Search & Filter Logic
```typescript
const filteredItems = useMemo(() => {
  let filtered = flatHierarchy;
  
  // Apply search
  if (searchQuery) {
    filtered = filtered.filter(item => {
      const searchableText = getSearchableText(item);
      return searchableText.some(text => 
        text.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }
  
  // Apply filters
  if (activeFilters.size > 0) {
    filtered = filtered.filter(item => {
      return filterConfigs.every(config => {
        if (!activeFilters.has(config.key)) return true;
        return config.getValue(item) === selectedFilterValue;
      });
    });
  }
  
  return filtered;
}, [flatHierarchy, searchQuery, activeFilters, filterConfigs]);
```

## Integration Points

### Used By
- **AccountSelector** - Account selection with company hierarchy
- **TicketSelector** - Ticket selection with account grouping
- **UserSelector** - User selection with role grouping
- **Custom selectors** - Any hierarchical data selection

### Dependencies
- **Shadcn/UI Components**: Select, Input, Badge, Button
- **Lucide Icons**: Search, Filter, ChevronRight, X, TreePine
- **React**: useState, useMemo, ReactNode

### API Integration
```typescript
// Typically receives data from API endpoints
const { data: accounts } = useAccountsQuery();

<HierarchicalSelector
  items={accounts} // API data
  value={selectedAccountId}
  onValueChange={(id) => {
    setSelectedAccountId(id);
    // Trigger dependent API calls or state updates
  }}
/>
```

## State Management

### Internal State
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [isOpen, setIsOpen] = useState(false);
const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
const [showFilters, setShowFilters] = useState(false);
```

### External State Integration
- **Parent Component**: Manages selected value and provides items
- **API State**: Receives data from TanStack Query or manual fetching
- **Form State**: Integrates with form libraries for validation
- **URL State**: Can sync selection with URL parameters

## Styling & Variants

### CSS Classes
```css
/* Container styling */
.hierarchical-selector {
  @apply relative w-full;
}

/* Item styling with depth indication */
.hierarchical-item {
  @apply flex items-center gap-2 p-2 hover:bg-accent rounded-sm;
  padding-left: calc(0.5rem + (var(--depth) * 1rem));
}

/* Search and filter controls */
.search-controls {
  @apply flex items-center gap-2 p-2 border-b;
}

/* Group headers */
.group-header {
  @apply sticky top-0 bg-background border-b px-2 py-1 text-sm font-medium;
}
```

### Theme Integration
- Uses Shadcn/UI design tokens
- Respects dark/light mode
- Consistent with application theme
- Accessible color contrasts

### Responsive Behavior
- Mobile-friendly touch targets
- Scrollable dropdown on small screens
- Collapsible filters on mobile
- Appropriate sizing for different viewports

## Examples

### Account Selector Implementation
```tsx
// Domain-specific wrapper
export function AccountSelector({
  accounts,
  value,
  onValueChange,
  placeholder = "Select an account"
}: AccountSelectorProps) {
  
  return (
    <HierarchicalSelector
      items={accounts}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      displayConfig={{
        getIcon: (account) => {
          switch (account.accountType) {
            case 'ORGANIZATION': return <Building2 className="h-4 w-4" />;
            case 'SUBSIDIARY': return <Building className="h-4 w-4" />;
            default: return <User className="h-4 w-4" />;
          }
        },
        getBadge: (account) => ({
          text: account.accountType,
          variant: account.accountType === 'ORGANIZATION' ? 'default' : 'secondary'
        }),
        getGroup: (account) => account.accountType,
        getSearchableText: (account) => [
          account.name,
          account.companyName || '',
          account.accountType
        ]
      }}
      filterConfigs={[
        {
          key: 'accountType',
          label: 'Account Type',
          getValue: (account) => account.accountType
        }
      ]}
      enableGrouping={true}
      enableSearch={true}
      enableFilters={true}
    />
  );
}
```

### Simple Usage (No Customization)
```tsx
<HierarchicalSelector
  items={categories}
  value={selectedCategory}
  onValueChange={setSelectedCategory}
  placeholder="Select a category"
/>
```

## Performance Considerations

### Optimization Techniques
1. **useMemo** for hierarchy processing and filtering
2. **useCallback** for event handlers
3. **Virtual scrolling** for large datasets (>1000 items)
4. **Debounced search** to reduce re-renders
5. **Lazy loading** for deeply nested structures

### Large Dataset Handling
```typescript
// For datasets >1000 items, consider virtualization
const virtualizedItems = useMemo(() => {
  if (filteredItems.length > 1000) {
    return filteredItems.slice(0, 100); // Show first 100, implement virtual scrolling
  }
  return filteredItems;
}, [filteredItems]);
```

## Accessibility

### ARIA Support
- `role="combobox"` for main selector
- `aria-expanded` for dropdown state
- `aria-selected` for selected items
- `aria-label` for search input
- `aria-describedby` for helper text

### Keyboard Navigation
- **Arrow keys**: Navigate through options
- **Enter**: Select highlighted option
- **Escape**: Close dropdown
- **Type-ahead**: Quick search by typing
- **Tab**: Proper focus management

### Screen Reader Support
- Announces hierarchy levels
- Reads item badges and icons
- Provides context for filtered results
- Clear instructions for interaction

## Related Components

### Direct Extensions
- **[AccountSelector](../selectors/account-selector.md)** - Account-specific implementation
- **[TicketSelector](../selectors/ticket-selector.md)** - Ticket selection with account grouping
- **[UserSelector](../selectors/user-selector.md)** - User selection with role grouping

### Related UI Components
- **[Select](./select.md)** - Simple dropdown for non-hierarchical data
- **[Input](./input.md)** - Search input component
- **[Badge](./badge.md)** - Status and type indicators

### Provider Components
- **[ActionBarProvider](../providers/action-bar-provider.md)** - May trigger selector dialogs
- **[QueryProvider](../providers/query-provider.md)** - Provides data for selectors

## Testing Patterns

### Unit Tests
```typescript
describe('HierarchicalSelector', () => {
  it('builds hierarchy correctly', () => {
    const items = [
      { id: '1', name: 'Parent', parentId: null },
      { id: '2', name: 'Child', parentId: '1' }
    ];
    
    render(<HierarchicalSelector items={items} value="" onValueChange={() => {}} />);
    
    // Test hierarchy structure
    expect(getByText('Parent')).toBeInTheDocument();
    expect(getByText('Child')).toHaveStyle('padding-left: 1.5rem');
  });
  
  it('filters items correctly', () => {
    // Test search and filter functionality
  });
  
  it('handles selection changes', () => {
    // Test selection callbacks
  });
});
```

### Integration Tests
```typescript
describe('HierarchicalSelector Integration', () => {
  it('works with AccountSelector', () => {
    // Test domain-specific implementation
  });
  
  it('integrates with forms', () => {
    // Test form integration
  });
});
```

---

## Maintenance Notes

Update this documentation when:
- Props interface changes
- New display configuration options are added
- Performance optimizations are implemented
- New integration patterns are established
- Accessibility features are enhanced

The component should remain generic and reusable. Domain-specific functionality should be implemented in wrapper components rather than adding to this base component.

Last updated: [Current Date]