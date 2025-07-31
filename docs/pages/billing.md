# Billing System Documentation

## Overview

The Billing System (`/billing`) provides comprehensive invoice generation and billing rate management for administrators. It integrates with the time tracking system and ticket addons to create accurate invoices for customers. The system supports multiple billing rates, customer-specific rate overrides, and automated invoice generation from unbilled items.

## Authentication & Authorization

### Access Control
- **Admin Only**: Only users with `ADMIN` role can access billing functionality
- **Route Protection**: Automatic redirect for unauthorized users to dashboard
- **Session Validation**: Continuous authentication state monitoring

### Role-Based Features
- **Admins**: Full access to all billing features including invoice generation, rate management, and revenue tracking
- **Employees**: No direct access to billing system (handled through time tracking)
- **Customers**: No access to billing administration

```typescript
const role = session.user?.role;
if (role !== "ADMIN") {
  router.push("/dashboard");
}
```

## Architecture

### Main Billing Page (`/billing/page.tsx`)
**Comprehensive Billing Management Interface**

#### Header Components
- **Navigation**: Back button to dashboard with breadcrumb navigation
- **Title**: "Billing & Invoicing" with dollar sign icon
- **User Info**: Role badge and logout functionality
- **Settings Access**: Quick access to system settings

#### Statistics Dashboard
Four key metric cards showing billing overview:

1. **Total Invoices**
   - Count of all invoices in system
   - Icon: FileText (Blue)
   - All-time metric

2. **Draft Invoices**
   - Count of invoices awaiting review
   - Icon: Calendar (Yellow)
   - Actionable items

3. **Total Revenue**
   - Sum of all paid invoices
   - Icon: DollarSign (Green)
   - Revenue tracking

4. **Pending Amount**
   - Sum of sent but unpaid invoices
   - Icon: Users (Orange)
   - Cash flow tracking

### Tabbed Interface

## 1. Invoices Tab - Invoice Management

**Complete Invoice List and Management**

### Features
- **Invoice Cards**: Detailed information display for each invoice
- **Status Tracking**: Visual status badges for invoice states
- **Action Buttons**: View, download, edit, and delete functionality
- **Summary Information**: Quick overview of invoice details
- **Empty States**: Helpful messaging when no invoices exist

### Invoice Card Information
Each invoice displays:
- **Invoice Number**: Formatted invoice identifier (INV-YYYY-###)
- **Status Badge**: Color-coded status (DRAFT, SENT, PAID, OVERDUE)
- **Customer Name**: Associated customer information
- **Creation Date**: When invoice was generated
- **Due Date**: Payment due date
- **Item Counts**: Number of time entries and addons included
- **Total Amount**: Invoice total in large, prominent display
- **Action Buttons**: View, download, edit, delete operations

### Status Color Coding
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case "DRAFT": return "secondary";    // Gray
    case "SENT": return "default";       // Blue
    case "PAID": return "outline";       // Green outline
    case "OVERDUE": return "destructive"; // Red
    default: return "secondary";
  }
};
```

## 2. Generate Invoice Tab - Invoice Creation

**Automated Invoice Generation System**

### Features
- **Customer Selection**: Dropdown to select customer for invoice
- **Date Range Filtering**: Optional start/end date constraints
- **Unbilled Items Filter**: Option to include only unbilled items
- **Smart Generation**: Automatic calculation of totals and tax
- **Validation**: Required field validation before generation

### Invoice Generation Form
```typescript
interface InvoiceGenerationForm {
  customerId: string;           // Selected customer
  startDate?: string;          // Optional start date filter
  endDate?: string;            // Optional end date filter
  includeUnbilledOnly: boolean; // Filter for unbilled items only
}
```

### Generation Process
1. **Customer Selection**: Choose target customer from dropdown
2. **Date Range**: Optionally specify period for items to include
3. **Filter Options**: Choose between all items or unbilled only
4. **Generate**: System creates invoice with all matching items
5. **Review**: Generated invoice appears in Draft status

### Automatic Calculations
- **Time Entry Totals**: Hours × billing rate for each entry
- **Addon Totals**: Price × quantity for each addon
- **Subtotal**: Sum of time and addon totals
- **Tax Amount**: Calculated based on system tax rate (currently 0%)
- **Final Total**: Subtotal + tax amount

## 3. Billing Rates Tab - Rate Management

**Billing Rate Configuration and Management**

### Features
- **Rate Cards**: Display of all configured billing rates
- **Rate Information**: Name, description, and hourly rate
- **Add New Rates**: Create additional billing rate categories
- **Edit Rates**: Modify existing rate information
- **Delete Rates**: Remove unused billing rates

### Billing Rate Structure
Each rate includes:
- **Rate Name**: Descriptive name (e.g., "Senior Development")
- **Hourly Rate**: Dollar amount per hour
- **Description**: Detailed explanation of rate usage
- **Usage Tracking**: Integration with time entries

### Standard Rate Examples
- **Standard Development**: $75/hr - General development work
- **Senior Development**: $95/hr - Senior level development
- **Consultation**: $125/hr - Technical consultation

## API Integration

### Billing Rates Endpoints
```typescript
// Billing rate management
GET    /api/billing/rates              // List all billing rates
POST   /api/billing/rates              // Create new billing rate
PUT    /api/billing/rates/[id]         // Update billing rate
DELETE /api/billing/rates/[id]         // Delete billing rate

// Customer-specific rate overrides
GET    /api/billing/customer-rates     // List customer rate overrides
POST   /api/billing/customer-rates     // Create customer rate override
PUT    /api/billing/customer-rates/[id] // Update customer override
DELETE /api/billing/customer-rates/[id] // Delete customer override
```

### Invoice Management Endpoints
```typescript
// Invoice operations
GET    /api/invoices                   // List invoices with filters
POST   /api/invoices                   // Create manual invoice
GET    /api/invoices/[id]              // Get specific invoice details
PUT    /api/invoices/[id]              // Update invoice status/details
DELETE /api/invoices/[id]              // Delete invoice

// Invoice generation
POST   /api/invoices/generate          // Generate invoice from criteria
```

## Data Structures

### Invoice Model
```typescript
interface Invoice {
  id: string;                    // Unique invoice identifier
  invoiceNumber: string;         // Formatted invoice number
  customerId: string;            // Associated customer
  customer: string;              // Customer name for display
  description?: string;          // Invoice description
  subtotal: number;              // Pre-tax total
  taxAmount: number;             // Tax amount
  total: number;                 // Final total amount
  status: InvoiceStatus;         // Current invoice status
  createdAt: string;             // Creation date
  dueDate: string;               // Payment due date
  timeEntries: number;           // Count of time entries
  addons: number;                // Count of ticket addons
  notes?: string;                // Additional notes
}
```

### Billing Rate Model
```typescript
interface BillingRate {
  id: string;                    // Unique rate identifier
  name: string;                  // Rate name/category
  hourlyRate: number;            // Rate per hour
  description?: string;          // Rate description
  createdAt: Date;               // Creation date
  updatedAt: Date;               // Last update date
}
```

### Customer Rate Override Model
```typescript
interface CustomerBillingRate {
  id: string;                    // Unique override identifier
  customerId: string;            // Associated customer
  billingRateId: string;         // Base billing rate
  overrideRate: number;          // Customer-specific rate
  billingRate: BillingRate;      // Associated rate details
}
```

## Business Logic

### Invoice Number Generation
- **Format**: INV-YYYY-### (e.g., INV-2024-001)
- **Year**: Current year when invoice is created
- **Sequence**: Auto-incrementing number based on invoice count
- **Uniqueness**: Guaranteed unique across all invoices

### Rate Resolution Priority
1. **Customer-Specific Override**: If customer has rate override, use that
2. **Default Billing Rate**: Otherwise use system default rate
3. **Fallback**: If no rate found, prevent time entry creation

### Invoice Status Workflow
- **DRAFT**: Newly created, can be edited
- **SENT**: Sent to customer, limited editing
- **PAID**: Payment received, read-only
- **OVERDUE**: Past due date, requires attention

## User Experience Features

### Visual Design
- **Consistent Styling**: Matches admin dashboard and portal themes
- **Card-Based Layout**: Logical grouping of related functionality
- **Status Indicators**: Color-coded badges and visual feedback
- **Responsive Design**: Mobile-optimized with flexible layouts

### Interactive Elements
- **Real-Time Calculations**: Live updating of totals and amounts
- **Form Validation**: Instant feedback on required fields
- **Status Updates**: Visual confirmation of operations
- **Action Feedback**: Clear success/error messaging

### Navigation Patterns
- **Tab Navigation**: Keyboard and mouse navigation support
- **Breadcrumb Style**: Clear path back to dashboard
- **Deep Linking**: URL-based tab state persistence
- **Quick Actions**: Fast access to common operations

## Integration Points

### Time Tracking Integration
- **Billable Hours**: Automatic inclusion of billable time entries
- **Rate Application**: Uses assigned billing rates for calculations
- **No-Charge Exclusion**: Excludes non-billable time entries
- **User Attribution**: Tracks which user logged the time

### Ticket System Integration
- **Ticket Addons**: Includes ticket addons in invoice generation
- **Customer Association**: Links tickets to proper customer accounts
- **Addon Pricing**: Uses configured price × quantity calculations

### Customer Management Integration
- **Customer Selection**: Live customer data for dropdowns
- **Rate Overrides**: Customer-specific billing rate applications
- **Contact Information**: Customer details for invoice generation

## Security Considerations

### Data Protection
- **Admin Only Access**: Billing data restricted to administrators
- **Input Validation**: Server-side validation of all billing data
- **Rate Protection**: Billing rates secured and validated
- **Invoice Integrity**: Immutable invoice data once finalized

### Audit Trail
- **Creation Tracking**: Log all invoice creation events
- **Modification History**: Track invoice status changes
- **User Attribution**: Record who performed billing operations
- **Financial Audit**: Maintain complete audit trail for accounting

## Performance Optimization

### Data Loading
- **Lazy Loading**: Progressive loading of invoice data
- **Caching Strategy**: Cache frequently accessed billing rates
- **Pagination**: Handle large numbers of invoices efficiently
- **Filter Performance**: Optimized filtering for large datasets

### Calculation Efficiency
- **Batch Calculations**: Efficient totaling of large invoice items
- **Rate Caching**: Cache billing rates to avoid repeated lookups
- **Transaction Management**: Use database transactions for consistency

## Testing Strategy

### Unit Testing
- **Calculation Logic**: Test all billing calculations and totals
- **Rate Resolution**: Test customer rate override logic
- **Validation Rules**: Test all form validation scenarios
- **Status Transitions**: Test invoice status workflow

### Integration Testing
- **API Endpoints**: Test all billing API operations
- **Database Operations**: Test CRUD operations with transactions
- **Time Integration**: Test integration with time tracking system
- **Customer Integration**: Test customer data integration

### User Experience Testing
- **Form Usability**: Test invoice generation workflow
- **Mobile Responsiveness**: Test on various screen sizes
- **Performance**: Test with large datasets and many invoices
- **Error Handling**: Test error scenarios and recovery

## Future Enhancements

### Advanced Features
- **Recurring Invoices**: Automated recurring billing setup
- **Payment Integration**: Integration with payment processors
- **Multi-Currency**: Support for multiple currencies
- **Tax Configuration**: Configurable tax rates and rules
- **Invoice Templates**: Customizable invoice layouts

### Reporting Features
- **Revenue Reports**: Detailed revenue analysis and trends
- **Customer Reports**: Per-customer billing and payment history
- **Rate Analysis**: Billing rate utilization and effectiveness
- **Export Options**: PDF, CSV, Excel export formats

### Workflow Enhancements
- **Approval Process**: Multi-step invoice approval workflow
- **Email Integration**: Automated invoice delivery via email
- **Payment Tracking**: Track partial payments and payment history
- **Dunning Process**: Automated overdue payment reminders

## Error Handling

### Common Scenarios
- **Missing Data**: Handle missing customer or rate information
- **Calculation Errors**: Graceful handling of calculation failures
- **Network Issues**: Retry logic for failed API calls
- **Permission Errors**: Clear messaging for access restrictions

### Recovery Strategies
- **Auto-Save**: Periodic saving of invoice generation state
- **Retry Logic**: Automatic retry for failed operations
- **Error Boundaries**: React error boundaries for graceful failures
- **User Feedback**: Clear error messages and recovery instructions

## Compliance Considerations

### Financial Compliance
- **Audit Trail**: Complete audit trail for financial compliance
- **Data Retention**: Configurable data retention policies
- **Tax Compliance**: Support for tax reporting requirements
- **Backup Strategy**: Regular backup of all billing data

### Privacy Protection
- **Data Encryption**: Encryption of sensitive billing information
- **Access Controls**: Role-based access to billing data
- **Data Minimization**: Only collect necessary billing information
- **GDPR Compliance**: Support for data portability and deletion