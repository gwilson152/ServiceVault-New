# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **time management and invoicing system** built with Next.js 15, Prisma, NextAuth, and SQLite. The app is designed for self-hosting and internal business use, enabling time tracking against tickets and generating invoices for internal records (not sent externally).

### Key Features

- Admin dashboard for time tracking, ticket management, and invoice generation
- Customer portal for viewing own tickets and time spent (if permitted)
- Customizable ticket fields (system-wide and customer-specific)
- Billing rates with customer-specific overrides
- Ticket addons (parts/additions with price and quantity)
- Licensing platform integration for access control
- Role-based permissions (ADMIN, EMPLOYEE, CUSTOMER)

## Technology Stack

- **Framework**: Next.js 15
- **Database**: SQLite (with options for other databases via Prisma)
- **ORM**: Prisma
- **Authentication**: NextAuth
- **UI Components**: Shadcn/UI
- **Styling**: Tailwind CSS
- **Environment**: Use `.env` (not `.env.local`)

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema changes to database
- `npx prisma studio` - Open Prisma Studio

## Architecture Overview

### Directory Structure

```
/src
  /app                  # Next.js 15 app directory
    /dashboard          # Admin dashboard
    /portal             # Customer portal
    /settings           # Single-page settings with modular sections
    /api                # API routes
  /components
    /settings/          # Modular settings components
      BillingRatesSection.tsx
      TicketFieldsSection.tsx
      CustomerSettingsSection.tsx
      LicenseSection.tsx
      GeneralSettingsSection.tsx
    /ui/                # Shadcn/UI components
  /lib
    /licensing          # Licensing platform integration
/prisma
  schema.prisma         # Database schema
/docs                   # Project documentation
```

### Core Database Entities

**Primary Tables:**

- `Users` - Admin, employee, and customer accounts with role-based access
- `Customers` - Customer information with custom fields (JSONB)
- `Tickets` - Support tickets with customizable fields and time tracking
- `TimeEntries` - Time tracking against tickets with no-charge option
- `TicketAddons` - Parts/additions with price and quantity for billing
- `Invoices` - Generated invoices for internal records
- `BillingRates` - System-wide billing rates
- `CustomerBillingRates` - Customer-specific rate overrides

**Settings Tables:**

- `SystemSettings` - App-wide configuration (custom fields as JSONB)
- `CustomerSettings` - Customer-specific settings and permissions
- `Permissions` - Granular permission control for customers

### Key Workflows

**Admin Workflow:**

1. Login → Dashboard → Time entry/ticket management
2. Settings page with modular sections (tabs/accordion layout)
3. Invoice generation from time entries and addons
4. User and customer management

**Customer Workflow:**

1. Login → Portal dashboard → View own tickets
2. Create tickets with optional addons (if permitted)
3. View time spent on tickets (if permitted)
4. Limited access based on permissions

## Important Implementation Notes

### Settings Page Architecture

- Single page at `/settings` with modular sections
- Each section is a separate component in `/components/settings/`
- Use Shadcn/UI `<Tabs>` or `<Accordion>` for navigation
- Sections handle their own data fetching and mutations

### Custom Fields System

- Stored as JSONB in `SystemSettings` and `CustomerSettings`
- Supports text, select, and other field types
- Dynamic form generation based on field definitions
- Customer-specific field overrides

### Billing and Invoicing

- Time entries use billing rates (with customer overrides)
- Addons have price × quantity calculations
- No-charge time entries excluded from invoices
- Invoices are internal-only (not sent to customers)

### Permissions System

- Role-based access (ADMIN/EMPLOYEE/CUSTOMER)
- Granular permissions in `Permissions` table
- Customer time visibility controlled by settings
- License tier may restrict certain features

### Licensing Integration

- Validate license on startup via external API
- Cache license status for offline use
- Enforce user limits and feature gates
- License section in settings for key management

## Security Considerations

- NextAuth middleware for role-based route protection
- Input sanitization for XSS/SQL injection prevention
- HTTPS required for production (via reverse proxy)
- API keys stored in environment variables
- Prisma transactions for data consistency

## Self-Hosting Setup

- Docker deployment with persistent SQLite volume
- Environment variables for database and licensing API
- Static asset bundling for offline operation
- Reverse proxy (e.g., Caddy) for HTTPS termination

## Development Guidelines

- Use Shadcn/UI components consistently
- Follow existing patterns for forms and tables
- Implement proper error handling and validation
- Use Prisma transactions for complex operations
- Index JSONB fields for custom field performance
- Document UI patterns for maintainability

### Documentation

- Create page-specific docs if appropriate in /docs/pages/{pageName.md}
- Create/update/refactor /docs/change-tracking.md as changes are implemented
