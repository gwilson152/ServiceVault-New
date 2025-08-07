# Import System Components

## ManualRelationshipEditor.tsx

### Overview
The ManualRelationshipEditor component provides a comprehensive interface for configuring joined tables in the import system, including field selection, join configuration, and real-time preview capabilities.

### Key Features

#### Field Selection Interface
- **Collapsible Sections**: All field selection sections start collapsed by default for clean UI
- **Interactive Headers**: Click to expand/collapse field lists with hover effects
- **Selection Counters**: Shows "X / Y" selected fields format in section headers
- **Primary Table Styling**: Special styling with "Primary" badge and primary color
- **Join Key Indicators**: Fields used in join conditions marked with "JOIN KEY" badge
- **Bulk Actions**: "Select All" and "Clear All" buttons for quick management

#### Components Used
- `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` from shadcn/ui
- `ChevronDown` icon for expand/collapse indicator
- `Card`, `CardHeader`, `CardTitle`, `CardContent` for section structure
- `Badge` components for status indicators
- Standard form controls for field selection

#### Field Selection Structure
```tsx
<Collapsible defaultOpen={false}>
  <Card>
    <CollapsibleTrigger asChild>
      <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
        <CardTitle className="text-sm flex items-center gap-2">
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
          <Database className="h-4 w-4 text-primary" />
          {tableName} (Primary)
          <Badge variant="secondary" className="text-xs ml-auto">
            {selectedCount} / {totalCount}
          </Badge>
        </CardTitle>
      </CardHeader>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <CardContent className="space-y-2 pt-0">
        {/* Field checkboxes */}
      </CardContent>
    </CollapsibleContent>
  </Card>
</Collapsible>
```

### Usage Patterns

#### Default State
- All field sections collapsed to reduce visual clutter
- Selection counters visible to show progress
- Primary table clearly marked for identification

#### User Interaction
- Click headers to expand needed sections
- Check/uncheck individual fields
- Use bulk actions for quick selection
- Visual feedback through badges and counters

### Integration Points

#### Database Integration
- Uses `ConnectionManager.executeJoinQuery()` for real database joins
- Supports field selection in SQL generation
- Handles multiple database types (MySQL, PostgreSQL, SQLite)

#### API Integration
- `/api/import/join-preview` endpoint for real-time join execution
- Field selection included in join configuration payload
- Search and filtering capabilities

### Performance Considerations
- Collapsed sections reduce initial render load
- Real-time updates only on user interaction
- Debounced search for preview functionality
- Efficient field selection state management

### Accessibility
- Clickable headers with proper cursor indicators
- Clear visual hierarchy with badges and icons
- Consistent keyboard navigation support
- Screen reader friendly content structure