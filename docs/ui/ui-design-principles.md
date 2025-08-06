# UI Design Principles

This document outlines the design principles, patterns, and standards used throughout the Service Vault application to ensure consistency, usability, and maintainability.

## Core Design Philosophy

Service Vault follows a **function-first, consistency-second** approach to UI design:

1. **Functionality drives design** - UI serves the user's needs first
2. **Consistency across contexts** - Similar actions look and behave similarly
3. **Progressive disclosure** - Show what users need when they need it
4. **Defensive design** - Prevent errors and make recovery easy

## Layout Principles

### Container Structure

All main pages follow a consistent container pattern:

```tsx
<main className="max-w-7xl mx-auto p-6">
  <div className="space-y-6">
    {/* Page content */}
  </div>
</main>
```

**Key Components:**
- `max-w-7xl` - Maximum container width for readability
- `mx-auto` - Center alignment with auto margins
- `p-6` - Consistent padding (24px) on all sides
- `space-y-6` - Consistent vertical spacing between sections

### Page Header Pattern

Standard page headers provide clear context and primary actions:

```tsx
<div className="flex justify-between items-center">
  <div>
    <h1 className="text-3xl font-bold flex items-center gap-2">
      <Icon className="h-8 w-8" />
      Page Title
    </h1>
    <p className="text-gray-600 mt-1">
      Page description explaining purpose and context
    </p>
  </div>
  <div className="flex gap-2">
    {/* Primary action buttons */}
  </div>
</div>
```

### Card-Based Layout

Content is organized using card components for clear visual hierarchy:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Section content */}
  </CardContent>
</Card>
```

## Navigation Patterns

### List to Detail Flow

The application follows a consistent **list → detail** navigation pattern:

1. **List Pages**: Browse, search, filter items with minimal actions
2. **Detail Pages**: Complete information, editing, and management actions
3. **Clear Navigation**: Easy movement between list and detail views

**Implementation:**
- List pages show summary information with "View" actions
- Edit/Delete actions are in detail pages for safety and context
- Breadcrumbs or back buttons provide clear navigation paths

### Action Placement

Actions are placed consistently across the application:

**Primary Actions**: Top-right of page headers
```tsx
<div className="flex gap-2">
  <Button><Mail className="h-4 w-4 mr-2" />Invite User</Button>
  <Button variant="outline"><UserPlus className="h-4 w-4 mr-2" />Create User</Button>
</div>
```

**Row Actions**: Right-aligned in table rows
```tsx
<TableCell className="text-right">
  <Button variant="ghost" size="sm" onClick={() => router.push(`/item/${id}`)}>
    <Eye className="h-4 w-4" />
  </Button>
</TableCell>
```

## Component Patterns

### Hierarchical Data Selection

For hierarchical data (accounts, categories, etc.), use specialized selectors:

**✅ Preferred:**
```tsx
<AccountSelector
  accounts={accounts}
  value={selectedAccount}
  onValueChange={setSelectedAccount}
  enableFilters={true}
  enableGrouping={true}
/>
```

**❌ Avoid:**
```tsx
<Select>
  {accounts.map(account => (
    <SelectItem key={account.id} value={account.id}>
      {account.name}
    </SelectItem>
  ))}
</Select>
```

### Form Patterns

Forms follow consistent patterns for usability and accessibility:

**Dialog Forms:**
```tsx
<form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
  <div className="space-y-4">
    <div>
      <Label htmlFor="field-id">Field Label</Label>
      <Input
        id="field-id"
        type="email"
        autoComplete="email"
        value={value}
        onChange={onChange}
      />
    </div>
  </div>
  <DialogFooter className="mt-6">
    <Button type="button" variant="outline" onClick={onCancel}>
      Cancel
    </Button>
    <Button type="submit">
      Submit Action
    </Button>
  </DialogFooter>
</form>
```

**Key Requirements:**
- Proper `<form>` elements with `onSubmit` handlers
- Correct `autoComplete` attributes for all inputs
- Consistent button types (`submit` vs `button`)
- Proper labeling with `htmlFor` attributes

### Filter Patterns

Filtering interfaces use consistent patterns:

```tsx
<Card>
  <CardContent className="pt-6">
    <div className="flex gap-4 items-center">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <div className="w-48">
        <AccountSelector
          accounts={accounts}
          value={selectedAccount === "all" ? "" : selectedAccount}
          onValueChange={(value) => setSelectedAccount(value || "all")}
          placeholder="All Accounts"
          allowClear={true}
        />
      </div>
    </div>
  </CardContent>
</Card>
```

## Color and Visual Hierarchy

### Status Indicators

Consistent color coding for status information:

```tsx
// Account types
<Badge variant="default">ORGANIZATION</Badge>      // Blue
<Badge variant="secondary">SUBSIDIARY</Badge>      // Gray
<Badge variant="outline">INDIVIDUAL</Badge>        // White with border

// User roles
<Badge variant="secondary">User</Badge>
<Badge variant="default">System Admin</Badge>

// Status indicators
<Badge variant="destructive">Error</Badge>         // Red
<Badge variant="outline">Pending</Badge>           // Gray border
<Badge variant="default">Active</Badge>            // Blue
```

### Icon Usage

Icons provide visual context and improve scanability:

```tsx
// Entity type indicators
<Building className="h-4 w-4" />     // Organizations
<Building2 className="h-4 w-4" />    // Subsidiaries  
<User className="h-4 w-4" />         // Individuals
<Shield className="h-4 w-4" />       // System Admins

// Action indicators
<Eye className="h-4 w-4" />          // View
<Edit className="h-4 w-4" />         // Edit
<Settings className="h-4 w-4" />     // Settings
<Trash2 className="h-4 w-4" />       // Delete
```

## Responsive Design

### Breakpoint Strategy

The application uses Tailwind's responsive prefixes:

- **Mobile-first**: Base styles target mobile
- **sm**: Small tablets (640px+)
- **md**: Tablets (768px+)
- **lg**: Desktop (1024px+)
- **xl**: Large desktop (1280px+)

### Mobile Adaptations

**Navigation:**
- Collapsible sidebar on mobile
- Full-width buttons in mobile forms
- Stacked layouts replace side-by-side content

**Tables:**
- Horizontal scroll for data tables
- Simplified layouts for mobile views
- Essential information prioritized

## Accessibility Standards

### Keyboard Navigation

All interactive elements must be keyboard accessible:

```tsx
<Button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleAction();
    }
  }}
>
  Action
</Button>
```

### Screen Reader Support

Proper ARIA labels and semantic HTML:

```tsx
<Button
  aria-label="View user details"
  title="View user details"
  onClick={() => router.push(`/users/${userId}`)}
>
  <Eye className="h-4 w-4" />
</Button>
```

### Focus Management

Visible focus indicators and logical tab order:

```tsx
// Focus styles are handled by Tailwind's focus: variants
<Button className="focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
  Action
</Button>
```

## Error Handling and Feedback

### Loading States

Consistent loading indicators throughout the application:

```tsx
{loading ? (
  <div className="flex items-center justify-center min-h-96">
    <Loader2 className="h-8 w-8 animate-spin" />
    <span className="ml-2">Loading items...</span>
  </div>
) : (
  <Content />
)}
```

### Empty States

Informative empty states with clear next actions:

```tsx
<div className="text-center py-8">
  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
  <p className="text-gray-600">No users found</p>
  <p className="text-sm text-gray-500 mt-1">
    Try adjusting your search or filters
  </p>
</div>
```

### Error Messages

Toast notifications provide immediate feedback:

```tsx
toast({
  title: "Success",
  description: "User created successfully"
});

toast({
  title: "Error",
  description: "Failed to create user",
  variant: "destructive"
});
```

## Data Display Patterns

### Table Design

Consistent table patterns for data display:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Primary Column</TableHead>
      <TableHead>Secondary Info</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>
          <div className="font-medium">{item.primaryInfo}</div>
          {item.secondaryInfo && (
            <div className="text-sm text-gray-500">{item.secondaryInfo}</div>
          )}
        </TableCell>
        <TableCell>
          <Badge variant="outline">{item.status}</Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Hierarchical Display

For hierarchical data, use visual indicators:

```tsx
<div className="flex items-center gap-2">
  <div className="flex items-center">
    {/* Hierarchy indicators */}
    <ChevronRight className="h-4 w-4 text-gray-400" />
  </div>
  <Icon className="h-4 w-4" />
  <span>{item.name}</span>
  <Badge variant="secondary">{item.type}</Badge>
</div>
```

## Security and Safety Patterns

### Destructive Actions

Dangerous actions require confirmation and context:

**❌ Avoid:**
```tsx
<Button onClick={deleteUser} className="text-red-600">
  <Trash2 className="h-4 w-4" />
</Button>
```

**✅ Preferred:**
```tsx
// Move destructive actions to detail pages with proper confirmation
<ConfirmationDialog
  title="Delete User"
  description="This action cannot be undone. Please type DELETE to confirm."
  confirmText="DELETE"
  onConfirm={handleDelete}
>
  <Button variant="destructive">Delete User</Button>
</ConfirmationDialog>
```

### Form Validation

Client-side validation with clear error messages:

```tsx
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    value={email}
    onChange={setEmail}
    className={errors.email ? "border-red-500" : ""}
  />
  {errors.email && (
    <p className="text-sm text-red-500 mt-1">{errors.email}</p>
  )}
</div>
```

## Performance Considerations

### Image and Asset Loading

Optimize images and assets for performance:

```tsx
// Use Next.js Image component for optimized loading
<Image
  src={userAvatar}
  alt={`${user.name} avatar`}
  width={40}
  height={40}
  className="rounded-full"
/>
```

### Component Optimization

Use React optimization patterns:

```tsx
// Memoize expensive calculations
const filteredItems = useMemo(() => {
  return items.filter(item => item.name.includes(searchTerm));
}, [items, searchTerm]);

// Memoize components that don't need frequent re-renders
const MemoizedCard = React.memo(({ item }) => (
  <Card>{/* Card content */}</Card>
));
```

## Development Guidelines

### Component Structure

Organize components with clear separation of concerns:

```
/components
  /ui/              # Generic, reusable UI components
  /forms/           # Form-specific components
  /layout/          # Layout and navigation components
  /selectors/       # Specialized selector components
  /[feature]/       # Feature-specific components
```

### Styling Conventions

Follow consistent CSS class patterns:

```tsx
// Layout utilities
"flex items-center justify-between"
"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
"space-y-4"

// Component sizing
"h-4 w-4"    // Icons
"h-8 w-8"    // Larger icons/avatars
"min-h-96"   // Content areas

// Spacing scale
"gap-1"      // Tight spacing
"gap-2"      // Default spacing
"gap-4"      // Loose spacing
"gap-6"      // Section spacing
```

### Documentation Requirements

All components should include:

1. **Purpose**: What the component does
2. **Props**: Interface documentation
3. **Usage Examples**: Common implementation patterns
4. **Best Practices**: When to use vs alternatives

## Conclusion

These design principles ensure Service Vault provides a consistent, accessible, and maintainable user experience. When adding new features:

1. **Follow established patterns** before creating new ones
2. **Consider accessibility** from the beginning
3. **Test across devices** and user scenarios
4. **Document deviations** and the reasoning behind them

For questions about implementing these principles or proposing changes, refer to the component documentation in `/docs/components/` or create discussion issues in the project repository.