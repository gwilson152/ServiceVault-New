# Component Documentation

This directory contains comprehensive documentation for all reusable components in the Service Vault application. The components are organized by category and functionality to make it easy to find and understand how to use each component effectively.

## Documentation Structure

### Core Categories

#### UI Components (`/ui/`)
Base components built on Shadcn/UI and custom UI patterns that provide the foundation for the entire application.

- **[hierarchical-selector.md](ui/hierarchical-selector.md)** - Generic hierarchical data selector (foundation for all selectors)
- **[action-bar.md](ui/action-bar.md)** - Global action bar component for contextual actions

#### Selectors (`/selectors/`)
Domain-specific selector components that extend the hierarchical selector for business entities.

- **[account-selector.md](selectors/account-selector.md)** - Account selection with hierarchy and filtering
- **ticket-selector.md** - Ticket selection with account grouping
- **user-selectors.md** - User selection components with role grouping

#### Providers (`/providers/`)
Context providers that manage global state and cross-component communication.

- **[action-bar-provider.md](providers/action-bar-provider.md)** - Global action bar state management
- **[time-tracking-provider.md](providers/time-tracking-provider.md)** - Timer state and cross-device synchronization
- **toast-provider.md** - Notification system provider
- **query-provider.md** - TanStack Query configuration

#### Time Tracking (`/time/`)
Components related to time tracking, timer widgets, and time entry management.

- **timer-widgets.md** - Timer display and control components
- **time-entry-components.md** - Time entry forms and management dialogs

#### Account Management (`/accounts/`)
Components for account hierarchy display and user management.

- **hierarchy-components.md** - Account tree view and hierarchy cards
- **user-management.md** - Account user creation and management

#### Settings (`/settings/`)
Modular settings components that compose the settings page.

- **section-components.md** - Individual settings sections (billing, company, etc.)
- **email-components.md** - Email template and settings management

#### Import System (`/import/`)
Components for the comprehensive data import system with joined tables and field selection.

- **[import.md](import.md)** - Import system components including ManualRelationshipEditor with field selection UI, collapsible sections, and join configuration

## Component Architecture Patterns

### 1. Generic + Specific Pattern
```
HierarchicalSelector<T>     (Generic base)
    ├── AccountSelector     (Domain-specific)
    ├── TicketSelector      (Domain-specific)
    └── UserSelector        (Domain-specific)
```

The application uses a pattern where generic, reusable components provide the foundation, and domain-specific components extend them with business logic and styling.

### 2. Provider + Hook Pattern
```
Provider Component          Hook
├── ActionBarProvider   →   useActionBar()
├── TimeTrackingProvider→   useTimeTracking()
└── ToastProvider       →   useToast()
```

Global state is managed through React Context providers with corresponding hooks for consumption.

### 3. Composition Pattern
```
Page Component
├── Provider Wrappers
├── Layout Components
├── Business Components
└── UI Components
```

Pages compose functionality by combining providers, layout components, business logic components, and base UI components.

## Documentation Standards

### Component Documentation Format
Each component should be documented with:

1. **Purpose** - What the component does and why it exists
2. **Usage** - Basic and advanced usage examples
3. **Props Interface** - Complete TypeScript interfaces
4. **Key Features** - Important functionality and capabilities
5. **Integration Points** - How it connects with other components
6. **State Management** - Internal and external state handling
7. **Examples** - Real-world usage examples from the codebase
8. **Related Components** - Links to related documentation

### Update Requirements
> ⚠️ **IMPORTANT**: Component documentation must be updated when:
> - Props interfaces change
> - New features are added
> - Integration patterns change
> - Performance optimizations are implemented
> - Breaking changes are made

## Usage Guidelines

### For Developers

#### Finding Components
1. **Check existing components** before creating new ones
2. **Use generic components** when possible (e.g., HierarchicalSelector)
3. **Follow established patterns** for consistency
4. **Reference documentation** for proper usage

#### Creating New Components
1. **Follow naming conventions** (PascalCase for components)
2. **Use TypeScript interfaces** for all props
3. **Implement proper accessibility** (ARIA, keyboard nav)
4. **Include comprehensive documentation**
5. **Add to appropriate category** in this documentation

#### Extending Components
1. **Prefer composition over inheritance**
2. **Use generic base components** when available
3. **Keep domain logic separate** from generic components
4. **Maintain backward compatibility** when possible

### Component Integration

#### With Forms
```tsx
// Use with react-hook-form
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <ComponentName
      value={field.value}
      onValueChange={field.onChange}
    />
  )}
/>
```

#### With State Management
```tsx
// Local state
const [value, setValue] = useState(initialValue);

// Global state via providers
const { addAction } = useActionBar();
const { startTimer } = useTimeTracking();
```

#### With APIs
```tsx
// TanStack Query (preferred)
const { data: items } = useItemsQuery();

// Manual fetching (legacy)
useEffect(() => {
  fetchItems().then(setItems);
}, []);
```

## Performance Guidelines

### Component Optimization
1. **Use React.memo** for expensive components
2. **Implement useCallback** for event handlers
3. **Memoize expensive computations** with useMemo
4. **Avoid inline objects** in render methods
5. **Use proper dependency arrays** in hooks

### State Management
1. **Keep state local** when possible
2. **Use context sparingly** for truly global state
3. **Implement proper cleanup** in useEffect
4. **Debounce expensive operations** (search, API calls)

### Rendering Performance
1. **Implement virtual scrolling** for large lists
2. **Use lazy loading** for heavy components
3. **Optimize re-render triggers** with stable references
4. **Profile performance** in development

## Testing Guidelines

### Component Testing
1. **Unit tests** for individual components
2. **Integration tests** for component interactions
3. **Accessibility tests** for proper ARIA support
4. **Visual regression tests** for UI consistency

### Testing Patterns
```tsx
// Basic component test
describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName {...props} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles interactions', () => {
    const handleChange = jest.fn();
    render(<ComponentName onChange={handleChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleChange).toHaveBeenCalled();
  });
});
```

## Accessibility Standards

### Requirements
1. **Semantic HTML** elements
2. **ARIA labels** and descriptions
3. **Keyboard navigation** support
4. **Screen reader** compatibility
5. **Color contrast** compliance
6. **Focus management** for dynamic content

### Implementation
```tsx
// Proper accessibility implementation
<button
  aria-label="Close dialog"
  aria-describedby="dialog-description"
  onClick={handleClose}
  onKeyDown={handleKeyDown}
>
  <X className="h-4 w-4" />
</button>
```

## Migration Guidelines

### From Legacy Components
1. **Identify migration candidates** (outdated components)
2. **Plan migration strategy** (gradual vs. complete replacement)
3. **Maintain backward compatibility** during transition
4. **Update documentation** after migration
5. **Remove deprecated components** after full migration

### API Changes
1. **Use feature flags** for gradual rollout
2. **Provide migration guides** for breaking changes
3. **Support old APIs** during transition period
4. **Communicate changes** to development team

---

## Quick Reference

### Most Used Components
- **HierarchicalSelector** - For any hierarchical data selection
- **ActionBarProvider** - Add contextual actions to pages
- **TimeTrackingProvider** - Timer functionality
- **AccountSelector** - Account selection with hierarchy

### Common Patterns
- **Form Integration** - Use with react-hook-form
- **Permission Gating** - Check permissions before rendering
- **Loading States** - Show loading indicators for async operations
- **Error Handling** - Graceful error display and recovery

### Best Practices
- **Read existing documentation** before implementing
- **Follow established patterns** for consistency
- **Update documentation** with changes
- **Test accessibility** with keyboard navigation
- **Profile performance** for large datasets

For specific component usage, refer to the individual documentation files in each category directory.

Last updated: [Current Date]