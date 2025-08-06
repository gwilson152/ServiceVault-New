# Service Vault - Application Overview

## Project Description

Service Vault is a comprehensive **time management and invoicing system** built for self-hosting and internal business use. It enables organizations to track time against tickets, manage client relationships, and generate invoices for internal record-keeping (not external distribution).

## Core Purpose

The application serves as a centralized platform for:
- **Time Tracking**: Precise time logging with cross-device synchronization
- **Client Management**: Hierarchical account structures with flexible relationships
- **Project Management**: Ticket-based work organization with custom fields
- **Billing & Invoicing**: Rate management with account-specific overrides
- **Team Collaboration**: Multi-user support with role-based permissions

## Technology Stack

### Backend
- **Framework**: Next.js 15 (App Router)
- **Database**: SQLite (production-ready, with options for PostgreSQL/MySQL via Prisma)
- **ORM**: Prisma with comprehensive type safety
- **Authentication**: NextAuth.js with credential-based login
- **API**: RESTful API routes with TypeScript

### Frontend
- **Framework**: React 18 with Next.js 15
- **Styling**: Tailwind CSS with responsive design
- **UI Components**: Shadcn/UI component library
- **State Management**: React hooks with server state synchronization
- **Real-time Updates**: Server-sent events for timer synchronization

### Infrastructure
- **Deployment**: Self-hosted with Docker support
- **File Storage**: Local filesystem with configurable paths
- **Environment**: Environment-based configuration (`.env`)
- **Build System**: Next.js optimized builds with static optimization

## Application Architecture

### Directory Structure

```
/src
  /app                    # Next.js 15 App Router
    /dashboard            # Admin dashboard and management
    /portal               # Customer portal for ticket viewing
    /settings             # System configuration interface
    /api                  # Backend API routes
      /auth               # Authentication endpoints
      /role-templates     # Role template management (super-admin)
      /accounts           # Account management
      /users              # User management
      /tickets            # Ticket operations
      /time-entries       # Time tracking
      /billing            # Rate and invoice management
      /timers             # Real-time timer system
  /components
    /ui                   # Shadcn/UI base components
    /selectors            # Hierarchical data selectors
    /accounts             # Account management components
    /time                 # Time tracking interfaces
    /settings             # Modular settings sections
  /hooks                  # Custom React hooks for business logic
  /lib                    # Core business logic and utilities
    /permissions          # ABAC permission system
    /auth                 # Authentication configuration
    /licensing            # License validation
  /utils                  # Helper functions and utilities
/prisma
  schema.prisma           # Database schema definition
/docs                     # Comprehensive documentation
  /features               # Feature-specific documentation
  /pages                  # Page-specific documentation
  /components             # Component documentation
```

## Core Features

### 1. Hierarchical Account Management
- **Multi-level Organizations**: Support for parent-child account relationships
- **Account Types**: Individual, Organization, and Subsidiary classifications
- **Custom Fields**: Flexible JSONB-based field definitions per account
- **Domain-based Auto-assignment**: Automatic user assignment via email domains
- **Billing Rate Overrides**: Account-specific rate customizations

### 2. Advanced Time Tracking
- **Dual Entry Methods**: Ticket-based and direct account time entries
- **Cross-device Timers**: Persistent timer state with real-time synchronization
- **Approval Workflow**: Multi-stage approval process with permission controls
- **Billing Integration**: Automatic rate application with historical snapshots
- **Flexible Time Input**: Support for multiple time formats and bulk operations

### 3. Comprehensive User Management
- **Unified User Interface**: Single page for browsing, searching, and filtering all users
- **Account Memberships**: Users can belong to multiple accounts with different roles
- **Role-based Access Control**: ABAC permission system with resource-level controls
- **Invitation System**: Email-based user onboarding with activation tracking
- **User Detail Pages**: Comprehensive user management with edit, settings, and safe delete operations
- **Advanced Account Selection**: Hierarchical account selectors with search, filtering, and grouping
- **Permission Inheritance**: Hierarchical permission propagation across account structures

### 4. Intelligent Billing System
- **Two-tier Rate Structure**: System defaults with account-specific overrides
- **Rate Snapshotting**: Historical rate preservation for audit integrity
- **Flexible Invoicing**: Time-based and addon-based billing with filtering
- **Internal Focus**: Invoices for record-keeping, not external distribution

### 5. Ticket Management
- **Custom Field System**: Configurable fields with account-specific overrides
- **Status Tracking**: Comprehensive ticket lifecycle management
- **Time Integration**: Seamless time tracking against tickets
- **Assignment System**: User assignment with permission validation

## User Roles & Workflows

### System Administrator
- **Setup & Configuration**: Initial system setup and licensing
- **User Management**: Create users, manage permissions, assign roles
- **System Settings**: Configure global settings and custom fields
- **Billing Rate Management**: Define system-wide billing rates
- **Data Management**: Backup, restore, and system maintenance

### Account Manager
- **Account Setup**: Create and configure client accounts
- **User Assignment**: Manage account memberships and permissions
- **Rate Customization**: Set account-specific billing rate overrides
- **Reporting**: Generate account-specific reports and analytics
- **Invoice Generation**: Create invoices from time entries and addons

### Team Member/Employee
- **Time Tracking**: Log time against tickets and accounts
- **Ticket Management**: Create, update, and resolve tickets
- **Timer Usage**: Start/stop/pause timers with cross-device sync
- **Time Approval**: Submit time entries for approval
- **Dashboard Usage**: View assigned work and time summaries

### Customer/Client (Portal Access)
- **Ticket Viewing**: View tickets and their progress
- **Time Visibility**: See time spent on tickets (if permitted)
- **Ticket Creation**: Create new tickets with addons (if permitted)
- **Account Information**: View account details and settings

## UI Design & User Experience

Service Vault follows consistent design principles to ensure usability and maintainability:

### Design Philosophy
- **Function-first Approach**: UI serves user needs with clear, purposeful interfaces
- **Consistent Patterns**: Similar actions look and behave consistently across pages
- **Progressive Disclosure**: Information revealed as needed, preventing cognitive overload
- **Defensive Design**: Error prevention and easy recovery paths

### Layout Standards
- **Container Structure**: Consistent `max-w-7xl mx-auto p-6` layout across all pages
- **Card-based Organization**: Clear visual hierarchy using Shadcn/UI Card components  
- **List-to-Detail Flow**: Browse on list pages, manage on detail pages
- **Responsive Design**: Mobile-first approach with Tailwind CSS breakpoints

### Component Patterns
- **Hierarchical Selectors**: Specialized components for account and category selection
- **Form Consistency**: Proper HTML forms with accessibility attributes
- **Action Placement**: Primary actions in headers, row actions right-aligned
- **Status Indicators**: Color-coded badges and icons for quick recognition

### Safety Features
- **Destructive Actions**: Delete/disable operations require detail page navigation
- **Confirmation Patterns**: Text verification ("DELETE") for dangerous operations
- **Clear Navigation**: Breadcrumbs and back buttons for easy orientation

For detailed implementation guidelines, see `/docs/ui-design-principles.md`.

## Key Business Logic

### Permission System (ABAC) - Updated 2025-08-06
- **Role Template Based**: All permissions managed through reusable role templates
- **No Manual Assignment**: Direct permission assignment removed for simplicity
- **Attribute-Based Access Control**: Permissions based on user, resource, action, and context
- **Resource-level Security**: Granular control over data access through role templates
- **Hierarchical Inheritance**: Child accounts inherit parent permissions
- **Dynamic Evaluation**: Real-time permission checking with 5-minute caching
- **Management Interface**: Super-admin role template management at `/dashboard/roles`

### Time Entry Lifecycle
1. **Creation**: User creates entry with billing rate selection
2. **Rate Resolution**: System applies account overrides or defaults
3. **Snapshotting**: Rate information preserved at point-in-time
4. **Approval**: Manager/admin approves entry for billing
5. **Invoicing**: Approved entries included in invoice generation

### Account Hierarchy
- **Tree Structure**: Unlimited depth organizational hierarchies
- **Data Aggregation**: Parent accounts can view child account data
- **Permission Inheritance**: Settings and permissions flow down hierarchy
- **Flexible Relationships**: Support for complex business structures

## Data Models Overview

### Core Entities
- **User**: System users with authentication and profile information
- **Account**: Organizations/clients with hierarchical relationships
- **AccountMembership**: Many-to-many user-account relationships with roles
- **Ticket**: Work items with custom fields and time tracking
- **TimeEntry**: Time records with billing information and approval status
- **Timer**: Persistent cross-device timer state

### Supporting Entities
- **BillingRate**: System-wide default billing rates
- **AccountBillingRate**: Account-specific rate overrides
- **Invoice/InvoiceItem**: Billing and invoice management
- **RoleTemplate**: Permission templates for user roles
- **SystemSettings**: Application-wide configuration
- **AccountSettings**: Account-specific customizations

## Security Considerations

### Authentication & Authorization
- **Secure Authentication**: Credential-based login with session management
- **Permission Validation**: Every API call validates user permissions
- **Data Isolation**: Strict account-based data separation
- **Audit Trails**: Comprehensive logging of user actions

### Data Protection
- **Input Validation**: Server-side validation of all user inputs
- **SQL Injection Prevention**: Parameterized queries via Prisma
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: Built-in Next.js CSRF protection

### Self-hosting Security
- **Environment Variables**: Sensitive configuration externalized
- **Database Security**: Local SQLite with file-system permissions
- **Network Security**: Reverse proxy recommendations for HTTPS
- **Update Management**: Self-contained updates with migration scripts

## Performance Features

### Database Optimization
- **Strategic Indexing**: Optimized queries for common operations
- **Efficient Relations**: Careful use of Prisma includes and selects
- **Query Batching**: Bulk operations for large datasets
- **Connection Pooling**: Optimized database connection management

### Frontend Performance
- **Server-side Rendering**: Next.js SSR for faster initial loads
- **Static Optimization**: Build-time optimization for static content
- **Code Splitting**: Automatic code splitting for smaller bundles
- **Caching Strategy**: Intelligent caching of user preferences and permissions

### Real-time Features
- **Timer Synchronization**: Cross-device state synchronization
- **Optimistic Updates**: Immediate UI feedback with server confirmation
- **Background Sync**: Automatic data synchronization when online

## Deployment & Operations

### Self-hosting Setup
- **Docker Support**: Containerized deployment with persistent volumes
- **Environment Configuration**: Comprehensive environment variable setup
- **Database Migrations**: Automatic schema migrations with Prisma
- **Static Asset Handling**: Optimized asset serving with Next.js

### Monitoring & Maintenance
- **Error Logging**: Comprehensive error tracking and reporting
- **Performance Monitoring**: Built-in performance metrics
- **Backup Strategies**: Database backup and restore procedures
- **Update Procedures**: Safe application update workflows

## Integration Capabilities

### External Systems
- **Email Integration**: SMTP configuration for notifications and invitations
- **License Validation**: External licensing server integration
- **Import/Export**: CSV and JSON data import/export capabilities
- **API Extensibility**: RESTful API for custom integrations

### Workflow Integration
- **Timer APIs**: Integration with external time tracking tools
- **Reporting APIs**: Custom report generation and data extraction
- **User Management**: Bulk user import and management capabilities
- **Billing Integration**: Export capabilities for external accounting systems

## Future Roadmap

### Planned Enhancements
- **Mobile Application**: Native mobile app for time tracking
- **Advanced Reporting**: Custom report builder with analytics
- **API Webhooks**: Real-time event notifications for integrations
- **Multi-tenancy**: Support for multiple organizations in single instance
- **Advanced Permissions**: More granular permission controls

### Integration Opportunities
- **Accounting Software**: Direct integration with QuickBooks, Xero
- **Project Management**: Integration with Jira, Asana, Trello
- **Communication**: Slack, Teams notifications and commands
- **Time Tracking**: Integration with external time tracking tools

## Success Metrics

The application measures success through:
- **Time Tracking Accuracy**: Precise time capture with minimal user friction
- **Billing Efficiency**: Streamlined invoice generation from time records
- **User Adoption**: High engagement with time tracking and approval workflows
- **Data Integrity**: Accurate historical records with comprehensive audit trails
- **System Reliability**: High uptime and performance for critical business operations

## Conclusion

Service Vault represents a comprehensive solution for organizations needing precise time tracking, flexible client management, and reliable invoicing capabilities. Its self-hosted architecture ensures data privacy and control, while its modular design allows for customization and extension based on specific organizational needs.

The application's strength lies in its careful balance of functionality and simplicity, providing powerful features without overwhelming complexity. Its focus on internal business use allows for streamlined workflows optimized for productivity rather than external client-facing polish.