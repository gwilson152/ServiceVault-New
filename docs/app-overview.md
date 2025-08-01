# Detailed Workflow: Time Management and Invoicing App

## Overview
The app is a self-hosted time management and invoicing system for internal business use. It enables time tracking against tickets, generates invoices for internal records (not sent externally), and allows customers to view time spent on their tickets if permitted. Ticket fields are customizable at system-wide and customer-specific levels. Tickets include addons (parts or other additions with price and quantity) for additional billing items. The app integrates with a licensing platform for access and feature control. The settings area is a single page with modular sections for manageability.

## Admin Workflow

### Login and Dashboard
- **Login**:
  - Admin logs in via `/login` using NextAuth (email/password or OAuth).
  - License validation: Queries licensing platform API to verify license status and user limits.
  - Redirect: To `/dashboard`.
- **Dashboard** (`/dashboard`):
  - **UI Components**: Shadcn/UI `<Card>` for summary widgets (e.g., total tickets, hours tracked, pending invoices), `<Table>` for recent tickets/invoices.
  - **Features**:
    - View metrics (total time tracked, open tickets).
    - Quick actions: Create ticket, enter time, generate invoice.
    - Navigation to: Tickets, Time Entries, Invoices, Users, Settings.

### Time Tracking System
- **Access**: From `/dashboard` or direct to `/time`.
- **Features**:
  - **Real-Time Timer**:
    - Interactive timer with start/pause/stop functionality.
    - Ticket selection for tracking time against specific tickets.
    - Automatic conversion to manual entry when stopped.
    - Second-by-second updates with large timer display.
  - **Manual Time Entry**:
    - Form: Shadcn/UI `<Form>`, `<Select>` for ticket, `<Input>` for minutes (integer), date picker, `<Textarea>` for description.
    - Validation: Ensure ticket exists, minutes are valid, description provided.
    - No-charge toggle for non-billable entries.
    - Store in `TimeEntries` with proper billing rate application.
  - **Time Entry Management**:
    - Comprehensive list of all time entries with filtering.
    - Filter by period (today, week, month, all time) and specific tickets.
    - Edit and delete functionality for existing entries.
    - Summary statistics showing total time, billable time, and revenue.
  - **Statistics Dashboard**:
    - Real-time metrics: today's time, weekly time, monthly time, billable time.
    - Color-coded cards with icons for quick visual reference.
- **Permissions**: Admins and employees can access; customers cannot.
- **UI**: Three-tab interface with responsive design and comprehensive documentation.

### Billing Rates Management
- **Access**: Via `/settings` (Billing Rates section).
- **Features**:
  - **Set Billing Rates**:
    - Table: `BillingRates` (id, name, rate, createdAt, updatedAt).
    - UI: Shadcn/UI `<Table>` to list rates, `<Dialog>` with `<Form>` to add/edit (e.g., name: "Standard", rate: $100/hr).
  - **Customer Overrides**:
    - Table: `CustomerBillingRates` (customerId, billingRateId, customRate, createdAt, updatedAt).
    - UI: `<Form>` in customer settings section to override rates (e.g., Customer A: $120/hr for "Standard").
    - Fallback to default rate if no override.
  - **Usage**: Rates applied to `TimeEntries` for invoices.
- **Permissions**: Admin-only.
- **UI**: Table with edit buttons, modal forms.

### Settings Page
- **Access**: `/settings` (single page, admin-only).
- **Structure**:
  - Single page with sections rendered as tabs or collapsible panels (Shadcn/UI `<Tabs>` or `<Accordion>`).
  - Each section in a separate file in `/components/settings/` for manageability:
    - `BillingRatesSection.tsx`: Manage billing rates and customer overrides.
    - `TicketFieldsSection.tsx`: Define system-wide custom ticket fields.
    - `CustomerSettingsSection.tsx`: Manage customer-specific settings (e.g., custom fields, time visibility).
    - `LicenseSection.tsx`: Input and validate license key.
    - `GeneralSettingsSection.tsx`: Miscellaneous settings (e.g., default timezone).
  - **UI Layout**:
    - Shadcn/UI `<Tabs>` for navigation between sections (e.g., "Billing Rates", "Ticket Fields").
    - Each section uses `<Card>`, `<Form>`, `<Table>`, `<Input>`, `<Select>` for configuration.
    - Example: `TicketFieldsSection` renders a `<Table>` of fields (name, type, options), with `<Dialog>` for adding/editing (e.g., JSON: `[{name: "priority", type: "select", options: ["low", "high"]}]`).
  - **Data Storage**:
    - System-wide settings in `SystemSettings` table (e.g., `customTicketFields` as JSONB).
    - Customer-specific settings in `CustomerSettings` table (e.g., `customFields`, `allowTimeVisibility`).
    - Billing rates in `BillingRates` and `CustomerBillingRates`.
  - **Features**:
    - **Billing Rates**: Add/edit/delete rates; set customer overrides.
    - **Ticket Fields**: Define custom fields (e.g., name, type: text/select, options for select); stored as JSONB.
    - **Customer Settings**: Override ticket fields per customer, toggle time visibility.
    - **License**: Input license key, validate via licensing API, display status.
    - **General**: Configure app-wide settings (e.g., currency, time format).
  - **Permissions**: Admin-only; license tier may restrict settings (e.g., custom fields).
  - **UI**: Clean, modular design with Tailwind CSS for responsiveness.

### Billing and Invoicing System
- **Access**: From `/dashboard` or direct to `/billing` (admin-only).
- **Features**:
  - **Invoice Management**:
    - Comprehensive invoice list with status tracking (Draft, Sent, Paid, Overdue).
    - View, edit, delete, and download functionality for all invoices.
    - Color-coded status badges and detailed invoice information.
    - Statistics dashboard showing total invoices, drafts, revenue, and pending amounts.
  - **Automated Invoice Generation**:
    - Generate invoices from unbilled time entries and ticket addons.
    - Customer selection with date range filtering options.
    - Automatic calculation of totals including time (rates applied) and addon costs.
    - Smart detection of billable vs non-billable items.
  - **Billing Rates Management**:
    - Create, edit, and delete system-wide billing rates.
    - Customer-specific rate overrides for customized pricing.
    - Integration with time tracking for automatic rate application.
  - **Revenue Tracking**:
    - Real-time revenue statistics and payment tracking.
    - Pending payment monitoring and overdue invoice alerts.
- **API Integration**:
  - Full REST API for billing rates, customer rates, and invoice operations.
  - Automated invoice generation endpoint with comprehensive filtering.
- **UI**: Three-tab interface with comprehensive billing management and documentation.

### Additional Admin Actions
- **Ticket Management**:
  - Create/edit/close tickets at `/tickets` (Shadcn/UI `<Form>`, `<Select>`).
  - Use custom fields from `SystemSettings` or `CustomerSettings`.
  - **Addons Management**:
    - Section in ticket form for addons (e.g., Shadcn/UI `<Table>` to list addons, `<Dialog>` with `<Form>` to add/edit).
    - Form fields: Name/description, price, quantity, total (computed as price * quantity).
    - Multiple addons per ticket; store in `TicketAddons` table.
    - Update ticket total cost (aggregate from time + addons) if needed.
- **User Management**:
  - At `/users`, manage users (Shadcn/UI `<Table>`, `<Form>`).
  - Sync with licensing platform for user limits.

## Customer Workflow

### Login and Dashboard
- **Login**:
  - Customer logs in via `/login` (NextAuth).
  - License validation: Check customer's licenseId and permissions.
  - Redirect: To `/portal/dashboard`.
- **Dashboard** (`/portal/dashboard`):
  - **UI Components**: Shadcn/UI `<Card>` for ticket summaries, `<Table>` for ticket list.
  - **Features**:
    - View open/closed tickets for their account.
    - Quick actions: Open ticket, view details.
    - Metrics: Total tickets, time spent (if permitted).
    - Navigation to: Tickets, Ticket Creation.

### Ticket Management
- **Access**: `/portal/tickets`.
- **Features**:
  - **Open Tickets**:
    - Form: `<Form>` with `<Input>` for title/description, `<Select>` for custom fields (from `CustomerSettings` or `SystemSettings`).
    - **Addons**: Optional section to add addons (if permitted via `Permissions`), using `<Table>` and `<Form>` for name, price, quantity.
    - Store in `Tickets` and `TicketAddons`, linked to customerId.
  - **View Own Tickets**:
    - `<Table>` lists tickets where `customerId` matches.
    - Columns: Title, status, createdAt, timeSpent (if permitted), addon totals (if permitted).
  - **View Other Users' Tickets (Within Client Account)**:
    - Permission: `canViewOtherTickets` in `Permissions` table.
    - Filter by customerId, exclude restricted tickets; show addons if visible.
  - **Update Others' Tickets**:
    - Permission: `canEditOtherTickets` in `Permissions`.
    - UI: `<Dialog>` with `<Form>` to edit fields, including addons.
- **UI**: Restricted, Tailwind-styled interface.

### Time Visibility
- **Access**: `/portal/tickets/[id]`.
- **Features**:
  - **Conditional Visibility**:
    - Controlled by `Permissions` or `CustomerSettings.allowTimeVisibility`.
    - Show `timeSpent` from `Tickets` or aggregated `TimeEntries` if permitted.
    - Optionally show addon details if permission extends to costs.
  - **UI**: Display in `<Card>` or `<Table>` (e.g., "Total Time: 2.5 hours", "Addons Total: $150").
- **Restrictions**: No access to invoices or other customers' data.

## Licensing Integration
- **Startup Check**: Validate license on boot via API; cache status.
- **User Limits**: Restrict user creation based on license.
- **Feature Gating**: Enable/disable features (e.g., custom fields, addons) per license tier.
- **UI**: License section in `/settings` (Shadcn/UI `<Card>`, `<Form>` for key input).
- **Security**: API keys in environment variables.

## Database Schema
- **Users**: id, email, passwordHash, role (ADMIN, EMPLOYEE, CUSTOMER), name, createdAt, updatedAt, licenseId.
- **Customers**: id, name, contactEmail, billingAddress, customFields (JSONB), licenseId.
- **Tickets**: id, title, description, status, assignedTo, customerId, timeSpent, createdAt, updatedAt, customFields (JSONB).
- **TimeEntries**: id, ticketId, userId, startTime, endTime, duration, notes, isNoCharge.
- **Invoices**: id, ticketId/customerId, totalAmount, generatedAt, status, pdfPath.
- **BillingRates**: id, name, rate, createdAt, updatedAt.
- **CustomerBillingRates**: customerId, billingRateId, customRate, createdAt, updatedAt.
- **TicketAddons**: id, ticketId, name, description (optional), price, quantity, total (computed: price * quantity), createdAt, updatedAt.
- **Settings**:
  - `SystemSettings`: id, customTicketFields (JSONB), generalSettings (JSONB, e.g., timezone).
  - `CustomerSettings`: customerId, customFields (JSONB), allowTimeVisibility (boolean).
- **Permissions**: id, customerId, ticketId (optional), canViewTime, canViewOtherTickets, canEditOtherTickets, canViewAddons (boolean for addon visibility).

**Relationships**:
- One-to-Many: Ticket to TicketAddons.
- Prisma handles cascading deletes and indexes.

## Self-Hosting Considerations
- **Docker**:
  - Bundle Shadcn/UI CSS and app code in Docker image.
  - SQLite on persistent volume.
- **Offline Support**:
  - Cache license status for offline use.
  - Static assets included in build.
- **Security**:
  - HTTPS via reverse proxy (e.g., Caddy).
  - Sanitize inputs for XSS/SQL injection.

## Implementation Notes
- **Shadcn/UI**:
  - Sections in `/components/settings/` (e.g., `BillingRatesSection.tsx`).
  - Use `<Tabs>` or `<Accordion>` for single-page settings.
  - Dynamic forms for custom fields and addons via JSON schema or form repeaters.
- **Prisma**:
  - Index JSONB fields for performance.
  - Transactions for time entry/ticket updates, including addon calculations.
- **NextAuth**:
  - Middleware for role-based access (e.g., restrict `/settings` to admins).
  - Session includes role, licenseId.
- **LLM-Friendly**:
  - Simple Shadcn/UI components (minimal props).
  - Document patterns for LLM code generation.

## Potential Challenges and Mitigations
- **Addon Calculations**: Compute totals on save or query; use Prisma computed fields.
- **Permission Complexity**: Clear `Permissions` table; fallback to defaults.
- **Dynamic Fields**: Validate JSON schemas for custom fields and addon inputs.
- **Licensing Downtime**: Cache license status; grace period for offline use.

## Next Steps
1. Set up Next.js with Shadcn/UI, Tailwind CSS, Prisma, NextAuth.
2. Create `/settings` page with modular sections in `/components/settings/`.
3. Define Prisma schema with `BillingRates`, `CustomerBillingRates`, `Permissions`, `TicketAddons`.
4. Implement admin workflow: Login, dashboard, time entry, settings, addon management in tickets.
5. Build customer portal: Login, dashboard, ticket management with addons, time visibility.
6. Integrate licensing API in `/lib/licensing`.
7. Create Docker setup with SQLite; test self-hosting.
8. Plan sprints: Week 1-2 for setup and settings, Week 3-4 for admin/customer workflows including addons.
9. Document: Self-hosting guide, UI patterns, licensing setup.