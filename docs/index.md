# Service Vault Documentation Index

Welcome to the Service Vault documentation. This directory contains comprehensive documentation for the application's architecture, features, components, and development practices.

## 📋 Documentation Overview

This documentation serves as the **single source of truth** for understanding, developing, and maintaining the Service Vault application. All information here should be kept current and accurate to ensure effective team collaboration and system maintenance.

## 🗂️ Documentation Structure

### Architecture Documentation

#### [`architecture/`](./architecture/) - System Architecture and Overview
Core system documentation covering the application's structure and design:

- **[`app-overview.md`](./architecture/app-overview.md)** - **Start Here!** Complete application overview covering technology stack, architecture, core features, and business logic
- **[`api-overview.md`](./architecture/api-overview.md)** - API architecture, endpoints, authentication, and integration patterns
- **[`page-overview.md`](./architecture/page-overview.md)** - Page-by-page functionality overview and navigation structure

### Feature Documentation

#### [`features/`](./features/) - Business Feature Documentation
Detailed documentation for major application features:

- **[`accounts.md`](./features/accounts.md)** - Hierarchical account management system
- **[`billing.md`](./features/billing.md)** - Billing rates system with enable/disable functionality and settings integration
- **[`invoicing.md`](./features/invoicing.md)** - **New!** Complete invoice management system with permission patterns, API usage, and troubleshooting guide
- **[`import-system.md`](./features/import-system.md)** - **Enhanced!** Comprehensive data import system with dynamic field mapping, joined table configuration, real-time database joins, field selection UI, and multi-source support
- **[`time-entries.md`](./features/time-entries.md)** - Time tracking, approval workflows, and billing integration
- **[`tickets.md`](./features/tickets.md)** - **Updated!** Ticket system with explicit assignment permissions (assignable-to/assignable-for) and account user integration
- **[`role-templates.md`](./features/role-templates.md)** - Role template management with ABAC permission system
- **[`user-management.md`](./features/user-management.md)** - **Enhanced!** Comprehensive user administration with system role management, account role management, security controls, and domain assignment

### Component Documentation

#### [`components/`](./components/) - UI Component Library
Technical documentation for reusable UI components:

- **[`selectors.md`](./components/selectors.md)** - **Enhanced!** Hierarchical selector components (AccountSelector, BillingRateSelector, TicketSelector with advanced filtering, etc.)
- **[`action-bar.md`](./components/action-bar.md)** - Global action bar implementation
- **[`ui/`](./components/ui/)** - Base UI component documentation  
- **[`providers/`](./components/providers/)** - React context provider documentation
- **[`dialogs.md`](./components/dialogs.md)** - **Enhanced!** User management dialogs including system role management and modal patterns

### UI/UX Documentation

#### [`ui/`](./ui/) - Design Standards and Patterns
User interface and user experience documentation:

- **[`ui-design-principles.md`](./ui/ui-design-principles.md)** - **Essential Reading!** UI/UX design standards and implementation guidelines
  - Core design philosophy and principles
  - Layout patterns and container structures
  - Component usage standards
  - Accessibility requirements
  - Safety patterns for destructive actions

### System Documentation

#### [`system/`](./system/) - System Implementation and Configuration
Technical system documentation:

- **[`permissions.md`](./system/permissions.md)** - **Essential!** ABAC permissions system with PermissionService usage patterns and troubleshooting
- **[`settings-architecture.md`](./system/settings-architecture.md)** - **New!** Unified settings architecture with SystemSettings and permission controls  
- **[`database-schema.md`](./system/database-schema.md)** - **Updated!** Complete database schema documentation with recent Invoice and BillingRate enhancements
- **[`user-preferences.md`](./system/user-preferences.md)** - Database-backed user preferences system
- **[`deployment.md`](./system/deployment.md)** - Production deployment guide with Docker, security, and monitoring
- **[`setup-wizard.md`](./system/setup-wizard.md)** - Initial system setup and configuration process
- **[`timer-system.md`](./system/timer-system.md)** - Cross-device timer synchronization architecture
- **[`toast-system.md`](./system/toast-system.md)** - Notification system implementation and usage patterns

### Development Documentation

#### [`development/`](./development/) - Development Process and Status
Development workflow and project status documentation:

- **[`workflow.md`](./development/workflow.md)** - **Essential!** Development workflow, standards, and database migration management
- **[`todos.md`](./development/todos.md)** - Current development tasks and project status (updated 2025-08-06)
  - Completed implementation tasks including billing/invoice system fixes
  - Pending development work including AccountUserSelector standardization
  - Priority assignments and dependencies
- **[`change-tracking.md`](./development/change-tracking.md)** - **Updated!** Recent fixes and changes made to the system
  - Billing/invoice functionality fixes with permission service parameter format corrections
  - Database schema alignment for Invoice model (addon vs ticketAddon relationships)
  - Migration regeneration process for schema drift resolution
  - Permission service PermissionContext object format enforcement
  - BillingRate isEnabled field addition and database schema synchronization

## 🎯 Documentation Purpose

Each document serves specific audiences and use cases:

### For New Developers
1. Start with [`architecture/app-overview.md`](./architecture/app-overview.md) for system understanding
2. Read [`development/workflow.md`](./development/workflow.md) for development standards and practices
3. Review [`ui/ui-design-principles.md`](./ui/ui-design-principles.md) for implementation standards
4. Study [`system/permissions.md`](./system/permissions.md) for permission system understanding
5. Check [`development/todos.md`](./development/todos.md) for current development priorities

### For Feature Development
1. Review relevant feature documentation in [`features/`](./features/)
2. Understand [`system/permissions.md`](./system/permissions.md) for proper permission integration
3. Check component documentation for reusable UI patterns
4. Follow [`development/workflow.md`](./development/workflow.md) for coding standards
5. Update documentation as part of development process

### For System Maintenance
1. Use [`architecture/api-overview.md`](./architecture/api-overview.md) for backend understanding
2. Reference [`system/deployment.md`](./system/deployment.md) for production deployment and monitoring
3. Check [`system/`](./system/) docs for system architecture and troubleshooting
4. Review [`development/todos.md`](./development/todos.md) for known issues and planned improvements

### For UI/UX Work
1. Follow [`ui/ui-design-principles.md`](./ui/ui-design-principles.md) strictly
2. Understand [`system/user-preferences.md`](./system/user-preferences.md) for preference persistence
3. Reference [`components/`](./components/) for existing patterns
4. Update design documentation when creating new patterns

### For DevOps/Deployment
1. Use [`system/deployment.md`](./system/deployment.md) for comprehensive deployment guide
2. Reference [`system/setup-wizard.md`](./system/setup-wizard.md) for initial configuration
3. Check [`development/workflow.md`](./development/workflow.md) for build and testing processes

## 📝 Documentation Maintenance

### Critical Requirement: Always Update Documentation

**When making changes to the codebase, updating documentation is NOT optional - it is required.**

#### Update Requirements

**For Code Changes:**
- Update relevant feature documentation when modifying business logic
- Update component documentation when changing UI components
- Update API documentation when modifying endpoints
- Update design principles when introducing new patterns

**For New Features:**
- Create new feature documentation in [`features/`](./features/)
- Document new components in [`components/`](./components/)
- Update [`app-overview.md`](./app-overview.md) with new capabilities
- Add todos to [`todos.md`](./todos.md) for follow-up work

**For Bug Fixes:**
- Update relevant documentation if the fix changes behavior
- Document new patterns or approaches used
- Update troubleshooting sections with solutions

#### Documentation Standards

**File Naming:**
- Use kebab-case for file names (`user-management.md`)
- Place feature docs in appropriate subdirectories
- Use descriptive names that match the feature/component

**Content Standards:**
- Include purpose and scope at the top of each document
- Provide code examples for implementation guidance
- Document both what to do AND what not to do
- Include troubleshooting sections for complex topics
- Use consistent formatting and markdown standards

**Linking:**
- Link between related documents using relative paths
- Reference specific sections when relevant
- Maintain bi-directional links where appropriate

#### Documentation Review Process

1. **Self-Review**: Check that documentation matches implementation
2. **Accuracy**: Verify all code examples work correctly  
3. **Completeness**: Ensure all aspects of changes are documented
4. **Clarity**: Write for future developers who weren't involved in the implementation
5. **Cross-References**: Update any other docs that reference changed behavior

### Documentation Tools

- **Markdown**: All documentation uses GitHub-flavored Markdown
- **Code Examples**: Include TypeScript/TSX examples with proper syntax highlighting
- **Diagrams**: Use Mermaid diagrams for complex relationships when needed
- **Screenshots**: Include UI screenshots for visual components when helpful

## 🔍 Finding Information

### Quick Reference
- **Architecture**: [`architecture/app-overview.md`](./architecture/app-overview.md)
- **Development**: [`development/workflow.md`](./development/workflow.md) - **includes database migration patterns**
- **Permissions**: [`system/permissions.md`](./system/permissions.md) - **critical PermissionService usage**
- **UI Standards**: [`ui/ui-design-principles.md`](./ui/ui-design-principles.md)
- **Invoicing**: [`features/invoicing.md`](./features/invoicing.md) - **complete billing system guide**
- **Import System**: [`features/import-system.md`](./features/import-system.md) - **data import with joined tables and field selection**
- **Deployment**: [`system/deployment.md`](./system/deployment.md)
- **Current Work**: [`development/todos.md`](./development/todos.md)
- **Components**: [`components/selectors.md`](./components/selectors.md) - **includes BillingRateSelector**

### Search Tips
- Use your editor's search functionality across all `.md` files
- Component names are typically documented in their respective files
- Business logic is documented in feature files
- Implementation patterns are in design principles

### Getting Help
- Check existing documentation first
- Reference similar implementations in the codebase
- Follow established patterns rather than creating new ones
- Ask for clarification when documentation is unclear

## ⚡ Quick Start for Contributors

1. **Read** [`architecture/app-overview.md`](./architecture/app-overview.md) for system understanding
2. **Study** [`development/workflow.md`](./development/workflow.md) for development standards
3. **Understand** [`system/permissions.md`](./system/permissions.md) for permission system
4. **Follow** [`ui/ui-design-principles.md`](./ui/ui-design-principles.md) for all UI work
5. **Check** [`development/todos.md`](./development/todos.md) for current priorities
6. **Update** relevant documentation with every code change

---

**Remember: Documentation is not just helpful - it's essential for maintaining a high-quality, maintainable codebase. Always update docs as part of your development workflow.**