# Database Schema Documentation

## Overview

The Service Vault application uses SQLite as the primary database with Prisma as the ORM. The schema is designed to support time tracking, ticket management, invoicing, and user management with role-based access control.

## Core Entities

### Users & Authentication

#### User
- **Purpose**: Core user accounts for admin, employees, and customers
- **Key Fields**: 
  - `email` (unique identifier)
  - `role` (ADMIN, EMPLOYEE, CUSTOMER)
  - `password` (hashed)
- **Relations**: Links to Customer profiles, TimeEntries, Tickets, and Invoices

#### Account, Session, VerificationToken
- **Purpose**: NextAuth.js authentication tables
- **Usage**: Handles OAuth providers and session management

### Customer Management

#### Customer
- **Purpose**: Extended profile for customer users
- **Key Fields**:
  - `companyName`, `address`, `phone` (basic info)
  - `customFields` (JSONB for flexible custom data)
- **Relations**: One-to-one with User, has many Tickets and Invoices

#### CustomerSettings
- **Purpose**: Customer-specific permissions and configurations
- **Key Fields**:
  - `canViewTimeEntries` - Controls time visibility
  - `canCreateTickets` - Ticket creation permission
  - `canAddTicketAddons` - Addon permission
  - `customFields` (JSONB for custom field definitions)

### Ticket System

#### Ticket
- **Purpose**: Core support/work requests
- **Key Fields**:
  - `title`, `description` (basic ticket info)
  - `status`, `priority` (workflow states)
  - `customFields` (JSONB for flexible ticket data)
- **Relations**: Belongs to Customer, has Creator/Assignee (Users), has many TimeEntries and TicketAddons

#### TicketAddon
- **Purpose**: Additional items/parts that can be added to tickets
- **Key Fields**:
  - `name`, `description` (addon details)
  - `price`, `quantity` (billing info)
- **Usage**: For parts, additional services, etc.

### Time Tracking

#### TimeEntry
- **Purpose**: Track time spent on tickets
- **Key Fields**:
  - `hours` (decimal for precise tracking)
  - `description` (work performed)
  - `noCharge` (exclude from billing)
  - `date` (when work was performed)
- **Relations**: Belongs to Ticket and User

### Billing & Invoicing

#### BillingRate
- **Purpose**: System-wide hourly rates
- **Key Fields**:
  - `name`, `description` (rate identification)
  - `rate` (hourly price)
  - `isDefault` (system default rate)

#### CustomerBillingRate
- **Purpose**: Customer-specific rate overrides
- **Usage**: Allows different rates per customer per user
- **Constraint**: Unique combination of customer and user

#### Invoice
- **Purpose**: Generated billing documents
- **Key Fields**:
  - `invoiceNumber` (unique identifier)
  - `status` (DRAFT, SENT, PAID, etc.)
  - `subtotal`, `tax`, `total` (calculated amounts)
  - `issueDate`, `dueDate` (billing timeline)

#### InvoiceItem
- **Purpose**: Line items within invoices
- **Relations**: Can link to TimeEntry, TicketAddon, or general Ticket items
- **Usage**: Flexible billing line items from various sources

### System Configuration

#### SystemSettings
- **Purpose**: Application-wide configuration
- **Key Fields**:
  - `key` (unique setting identifier)
  - `value` (simple string values)
  - `jsonValue` (complex JSON configurations)
- **Usage**: Custom fields, tax rates, app settings

#### Permission
- **Purpose**: Granular permission definitions
- **Structure**: Resource + Action based (e.g., "tickets.create")
- **Usage**: Foundation for role-based access control

## Data Types & Patterns

### Custom Fields (JSONB)
Custom fields are stored as JSON in several tables:
- **SystemSettings**: Global field definitions
- **CustomerSettings**: Customer-specific field definitions
- **Customer**: Customer profile data
- **Ticket**: Ticket-specific data

Example custom field structure:
```json
{
  "ticketFields": [
    {
      "name": "urgency",
      "type": "select",
      "options": ["Low", "Medium", "High"]
    }
  ]
}
```

### Role-Based Access
- **ADMIN**: Full system access
- **EMPLOYEE**: Can manage tickets, time entries, create invoices
- **CUSTOMER**: Limited to own tickets and data (based on CustomerSettings)

## Indexes & Performance

Key indexes for performance:
- `User.email` (unique, for authentication)
- `Ticket.customerId` (customer ticket queries)
- `TimeEntry.ticketId` (time rollups)
- `InvoiceItem.invoiceId` (invoice details)

## Seed Data

The database includes seed data for testing:
- Admin user: `admin@example.com` / `admin`
- Employee user: `employee@example.com` / `employee`
- Customer user: `customer@example.com` / `customer`
- Sample ticket with time entries and addons
- Basic billing rates and system settings

## Migration Commands

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Seed database with test data
npm run db:seed

# Open Prisma Studio for data inspection
npx prisma studio
```

## Security Considerations

- Passwords are hashed using bcryptjs
- User roles control data access
- Customer data isolation through foreign key constraints
- JSONB fields allow flexibility while maintaining type safety through TypeScript