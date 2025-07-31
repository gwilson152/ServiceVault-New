# Service Vault Documentation

## Project Overview

Service Vault is a comprehensive time management and invoicing system built with Next.js 15, designed for self-hosting and internal business use. The application enables time tracking against tickets, generates invoices for internal records, and provides customer portals for ticket visibility when permitted.

## Key Features

- **Admin Dashboard**: Comprehensive management interface with statistics and navigation
- **Time Tracking System**: Real-time timer, manual entry, and comprehensive reporting
- **Billing & Invoicing**: Automated invoice generation with billing rate management
- **Customer Portal**: Self-service portal for ticket viewing and management
- **Settings Management**: Modular configuration system with role-based access
- **Role-Based Access Control**: Admin, Employee, and Customer roles with appropriate permissions

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth v4 with database sessions
- **UI Components**: Shadcn/UI with Tailwind CSS v4
- **Styling**: Tailwind CSS with custom properties
- **TypeScript**: Full TypeScript implementation

## Architecture

### Core Components

1. **Authentication System** (`/`)
   - NextAuth integration with database authentication
   - Role-based redirects (Admin → Dashboard, Customer → Portal)
   - Secure session management

2. **Admin Dashboard** (`/dashboard`)
   - Statistics overview with key metrics
   - Role-based navigation and feature access
   - Quick actions for common tasks

3. **Time Tracking** (`/time`)
   - Real-time timer with start/pause/stop functionality
   - Manual time entry with form validation
   - Comprehensive time entry management and filtering

4. **Billing System** (`/billing`)
   - Invoice generation from time entries and ticket addons
   - Billing rate management with customer overrides
   - Revenue tracking and payment monitoring

5. **Customer Portal** (`/portal`)
   - Customer-specific ticket viewing
   - Time visibility based on permissions
   - Self-service ticket creation (when permitted)

6. **Settings Management** (`/settings`)
   - Modular configuration system
   - Billing rates, custom fields, and licensing
   - Change tracking with unsaved warnings

### Database Schema

The application uses a comprehensive Prisma schema with the following key entities:

- **Users**: Authentication and role management
- **Customers**: Customer information with custom fields
- **Tickets**: Support tickets with customizable fields
- **TimeEntries**: Time tracking with billing integration
- **Invoices**: Generated invoices with status tracking
- **BillingRates**: System-wide and customer-specific rates

## Documentation Structure

### Page-Specific Documentation

- **[Dashboard](./pages/dashboard.md)**: Admin dashboard features and navigation
- **[Time Tracking](./pages/time-tracking.md)**: Complete time management system
- **[Billing](./pages/billing.md)**: Invoicing and billing rate management
- **[Customer Portal](./pages/customer-portal.md)**: Customer-facing features
- **[Settings](./pages/settings.md)**: Configuration management system

### Technical Documentation

- **[App Overview](./app-overview.md)**: Detailed workflow and system architecture
- **[Database Schema](./database-schema.md)**: Complete database design and relationships
- **[Development Todos](./todos.md)**: Implementation progress and future tasks

## Getting Started

### Development Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd service-vault
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   npm run seed
   ```

4. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Configure database and NextAuth settings
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

### Test Credentials

After running the seed script, use these test accounts:

- **Admin**: admin@example.com / admin
- **Employee**: employee@example.com / employee  
- **Customer**: customer@example.com / customer

### Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open database management interface

## Deployment

### Self-Hosting Requirements

- **Node.js**: Version 18 or higher
- **Database**: SQLite (included) or PostgreSQL/MySQL via Prisma
- **Reverse Proxy**: Recommended for HTTPS (Caddy, Nginx)
- **Storage**: Persistent volume for SQLite database

### Docker Deployment

The application is designed for containerized deployment with:

- **Docker Image**: Includes all dependencies and static assets
- **Persistent Storage**: SQLite database on mounted volume
- **Environment Variables**: Configuration via environment
- **Health Checks**: Built-in health monitoring

## Security Considerations

- **Authentication**: Database-backed sessions with bcrypt password hashing
- **Authorization**: Role-based access control throughout application
- **Input Validation**: Server-side validation for all user inputs
- **XSS Protection**: Sanitized outputs and CSP headers
- **SQL Injection**: Prisma ORM with parameterized queries

## Performance Optimization

- **Database Indexing**: Optimized indexes for common queries
- **Client-Side Caching**: Efficient state management and caching
- **Code Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js image optimization
- **Bundle Analysis**: Regular bundle size monitoring

## Contributing

1. **Code Style**: Follow existing patterns and ESLint configuration
2. **Documentation**: Update relevant documentation for changes
3. **Testing**: Ensure all features work across roles and permissions
4. **Security**: Follow security best practices for all changes

## License

This project is designed for internal business use and self-hosting. Please review licensing requirements for commercial deployment.

## Support

For technical support and feature requests:

1. **Documentation**: Review relevant page-specific documentation
2. **Issues**: Check existing issues and create new ones as needed
3. **Development**: Follow development guidelines for contributions

---

*Service Vault - Comprehensive Time Management and Invoicing System*