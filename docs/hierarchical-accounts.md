# Hierarchical Account Management System

## Overview

The Service Vault system now includes a comprehensive hierarchical account management system that provides intuitive visual representation of parent-child account relationships with multiple view modes and enhanced navigation capabilities.

## Key Components

### 1. Hierarchy Processing (`src/utils/hierarchy.ts`)

Core utilities for processing account hierarchy data:

- **`buildAccountHierarchy()`**: Converts flat account array into tree structure
- **`flattenAccountHierarchy()`**: Flattens hierarchical data while preserving hierarchy info
- **`searchAccountsInHierarchy()`**: Searches across entire hierarchy with path matching
- **`toggleAccountExpansion()`**: Manages expand/collapse state
- **`getHierarchyStats()`**: Calculates hierarchy statistics

### 2. Account Tree View (`src/components/accounts/AccountTreeView.tsx`)

Tree-style list view component featuring:

- **Visual Tree Structure**: Proper parent-child relationships with connecting lines
- **Expand/Collapse**: Interactive nodes for navigating hierarchy
- **Quick Stats**: Inline display of users, tickets, and hours
- **Action Buttons**: View, Settings, and Email functionality
- **Search Integration**: Real-time filtering across hierarchy

### 3. Account Hierarchy Cards (`src/components/accounts/AccountHierarchyCard.tsx`)

Enhanced card view with hierarchy indicators:

- **Nested Display**: Child accounts shown under parents
- **Visual Connectors**: Connecting lines and indentation
- **Hierarchy Badges**: Clear indicators for account types
- **Collapsible Groups**: Expand/collapse for large hierarchies

### 4. View Toggle (`src/components/accounts/AccountViewToggle.tsx`)

Simple switcher between view modes:

- **Grid/Tree Toggle**: Switch between hierarchical grid and tree views
- **Persistent Preferences**: User choice saved to localStorage
- **Intuitive Icons**: Grid and Tree icons for clear visual distinction

## View Modes

### Hierarchical Grid View

- **Layout**: Card-based layout with visual hierarchy
- **Features**: 
  - Subsidiary accounts nested under parent organizations
  - Connecting lines showing parent-child relationships
  - Hierarchy badges (Organization, Subsidiary, Individual)
  - Expand/collapse for large account groups
  - Full account details with stats and user previews

### Tree List View

- **Layout**: Compact tree structure with indentation
- **Features**:
  - Traditional tree view with expand/collapse nodes
  - Connecting lines and proper indentation levels
  - Inline statistics (users, tickets, hours)
  - Quick action buttons on hover
  - Efficient space usage for large hierarchies

## Account Management Features

### User Transfer Between Accounts

- **Functionality**: Move account users between parent and child accounts
- **Validation**: Ensures moves only occur within same hierarchy
- **UI Integration**: Available via dropdown menu in account details
- **Status Preservation**: Maintains user activation and assignment status

### Enhanced Account Details

- **Parent Account Display**: Shows parent organization with navigation link
- **Child Account Listing**: Displays all subsidiaries with navigation
- **User Aggregation**: Shows users from current account and all subsidiaries
- **Source Indicators**: Clear badges showing which account users belong to

## Action Button Functionality

### Settings Button
- **Navigation**: Direct link to account settings tab
- **Implementation**: Uses query parameters (`?tab=settings`)
- **Availability**: Present in both tree and grid views

### Email Button
- **Functionality**: Opens email client with account users
- **Behavior**: 
  - Filters to active users only (those with login accounts)
  - Pre-fills subject with account name
  - Uses `mailto:` protocol for compatibility
  - Disabled state when no active users exist

### View Button
- **Navigation**: Direct link to account details page
- **Consistent**: Available across all views and components

## Search and Filtering

### Hierarchical Search
- **Scope**: Searches across entire account hierarchy
- **Matching**: Account names, company names, and hierarchy paths
- **Real-time**: Instant filtering as user types
- **Context Preservation**: Maintains parent-child relationships in results

### Statistics Dashboard
- **Overview**: Header displays breakdown by account type
- **Metrics**: Organization, Subsidiary, Individual counts
- **User Stats**: Total active users across all accounts
- **Dynamic**: Updates based on search and filter results

## Technical Implementation

### Data Structure
```typescript
interface AccountWithHierarchy {
  // Base account properties
  id: string;
  name: string;
  accountType: string;
  
  // Hierarchy properties
  depth?: number;
  children?: AccountWithHierarchy[];
  path?: string;
  isExpanded?: boolean;
  
  // Enhanced stats
  stats: {
    activeUsers: number;
    totalUsers: number;
    totalTickets: number;
    totalHours: number;
  };
}
```

### API Enhancements
- **Hierarchy Data**: Includes parent and child account relationships
- **Hours Calculation**: Converts minutes to hours with proper rounding
- **User Status**: Computed fields for assignment and login status

### Performance Considerations
- **Efficient Tree Building**: O(n) complexity for hierarchy construction
- **Memoized Calculations**: Cached hierarchy stats and filtered results
- **Optimized Rendering**: Virtual scrolling considerations for large datasets

## Usage Patterns

### For Organizations with Subsidiaries
1. **Overview**: Use Grid view to see full account details
2. **Navigation**: Use Tree view for quick hierarchy navigation
3. **Management**: Transfer users between accounts as needed
4. **Communication**: Email all users in account hierarchy

### For Large Account Hierarchies
1. **Search**: Use hierarchical search to find specific accounts
2. **Expansion**: Collapse unnecessary branches in Tree view
3. **Statistics**: Monitor user distribution via header stats
4. **Quick Actions**: Use hover actions for common tasks

## Integration Points

### Existing Systems
- **User Management**: Enhanced with hierarchy-aware user display
- **Permission System**: Respects account-scoped permissions
- **Email System**: Integrated with account user communication
- **Settings Management**: Direct navigation to account settings

### Future Enhancements
- **Bulk Operations**: Multi-select accounts for bulk actions
- **Drag & Drop**: Visual account restructuring
- **Advanced Filtering**: Filter by account type, user count, etc.
- **Export Functionality**: Export hierarchy data and reports