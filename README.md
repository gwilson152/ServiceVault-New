# Service Vault - Time Management & Invoicing System

A comprehensive **time tracking and invoicing system** built with Next.js 15, designed for self-hosting and internal business use.

## 🌟 Key Features

### 📊 Advanced Time Tracking
- **Smart Filtering**: 8 different filter types with persistent user preferences
- **Real-time Statistics**: Dashboard with Today, Last 7 Days, This Month metrics
- **Cross-device Timers**: Synchronized timer state across all devices
- **Manual Entry**: Comprehensive time entry with approval workflows
- **Date Intelligence**: Monday-first business weeks with proper date calculations

### 📄 Complete Invoice Management
- **Status Workflow**: Full DRAFT → SENT → PAID lifecycle management
- **PDF Export**: Professional invoice PDFs with automatic download
- **Dynamic Items**: Add/remove time entries and addons from draft invoices
- **Date Management**: Inline editing for issue dates and due dates
- **ABAC Permissions**: Granular permission control for all invoice operations

### 👥 User & Account Management
- **Hierarchical Accounts**: Multi-level account structure with tree visualization
- **Role-Based Access**: ADMIN/EMPLOYEE/ACCOUNT_USER with granular permissions
- **User Preferences**: Persistent settings for filters and UI preferences
- **Invitation System**: Email-based user invitations with status tracking

### 🎫 Ticket System
- **Custom Fields**: Configurable ticket and account fields (JSONB)
- **Assignment Workflow**: Employee assignment with tracking
- **Account Integration**: Account-scoped ticket access and permissions
- **Time Integration**: Direct time tracking against tickets

### ⚙️ Configuration & Settings
- **Modular Settings**: Tabbed interface for all system configurations
- **Billing Rates**: System-wide rates with account-specific overrides
- **Email Templates**: Complete template management with 60+ variables
- **License Integration**: External API integration with tier controls

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth with role-based access
- **UI Components**: Shadcn/UI with Tailwind CSS
- **Email Service**: Professional SMTP integration
- **PDF Generation**: Server-side PDF creation
- **TypeScript**: Full type safety throughout

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm
- SQLite (included)

### Installation
```bash
# Clone the repository
git clone [repository-url]
cd service-vault

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Initialize database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Database management UI
npx prisma db push   # Push schema changes
```

## 📁 Project Structure

```
/src
  /app                    # Next.js 15 app directory
    /dashboard            # Admin dashboard
    /time                 # Time tracking with advanced filters
    /billing              # Invoice management
    /settings             # System configuration
    /api                  # API routes
  /components
    /settings/            # Modular settings components
    /selectors/           # Reusable selector components
    /invoices/            # Invoice management components
    /time/                # Time tracking components
    /ui/                  # Shadcn/UI components
  /hooks
    useUserPreferences.ts # User preferences management
    usePermissions.ts     # ABAC permission checking
    useInvoicePermissions.ts # Invoice-specific permissions
  /lib
    /licensing            # External licensing integration
/prisma
  schema.prisma           # Database schema
/docs
  *.md                    # Comprehensive documentation
```

## 🔑 Key Concepts

### ABAC Permission System
Attribute-Based Access Control with scope enforcement:
- **Resource-based**: Permissions tied to specific resources
- **Action-specific**: Granular control over what users can do
- **Account-scoped**: Permissions can be limited to specific accounts
- **Role templates**: Pre-defined permission sets for each role

### User Preferences System
Persistent, user-specific settings:
- **Filter Persistence**: Time page filters saved per user
- **Auto-save**: Debounced saving (500ms) for optimal performance
- **Type Safety**: Full TypeScript support for all preferences
- **Extensible**: Easy to add new preference types

### Hierarchical Account System
Multi-level account structure:
- **Tree Visualization**: Visual hierarchy representation
- **Nested Permissions**: Inherited access control
- **Custom Fields**: Account-specific field definitions
- **Smart Selectors**: Hierarchical selection components

## 📚 Documentation

- **[Change Tracking](docs/change-tracking.md)** - Recent feature implementations
- **[Time Tracking](docs/pages/time.md)** - Complete time page documentation
- **[User Preferences](docs/user-preferences.md)** - Preferences system guide
- **[Permissions](docs/permissions.md)** - ABAC system documentation
- **[API Documentation](docs/api/)** - Complete API reference

## 🔧 Configuration

### Environment Variables
```bash
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
# Add other environment variables as needed
```

### Database Schema
The system uses Prisma with SQLite for development and supports other databases for production. Key models include:
- **User**: Authentication with preferences and roles
- **Account**: Hierarchical customer/client structure
- **Ticket**: Work items with custom fields
- **TimeEntry**: Time tracking with billing integration
- **Invoice**: Complete billing lifecycle management

## 🏗️ Architecture Highlights

### Performance Optimizations
- **Client-side Filtering**: Instant filter updates without API calls
- **Debounced Preferences**: Reduced API overhead for settings
- **Memoized Components**: Prevented unnecessary re-renders
- **Efficient Dependencies**: Optimized useEffect dependency management

### Security Features
- **Session Management**: Secure NextAuth integration
- **Permission Validation**: Server-side permission checking
- **Input Sanitization**: XSS and injection prevention
- **Account Scoping**: Proper data isolation

### Self-Hosting Ready
- **SQLite Default**: No external database required
- **Environment-based**: Easy configuration management
- **Docker Support**: Container deployment ready
- **Reverse Proxy**: HTTPS termination via Caddy/nginx

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Docker Deployment
```dockerfile
# Example Dockerfile structure
FROM node:18-alpine
# ... build steps
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Considerations
- **Database**: Configure production database URL
- **Licensing**: Set up external licensing API if needed
- **Email**: Configure SMTP for production email sending
- **HTTPS**: Use reverse proxy for SSL termination

## 🤝 Contributing

1. **Development Setup**: Follow installation instructions
2. **Code Standards**: Use TypeScript, follow ESLint rules
3. **Documentation**: Update docs for new features
4. **Testing**: Ensure all features work correctly
5. **Permissions**: Test ABAC permission integration

## 📄 License

[Add your license information here]

## 🆘 Support

For support and questions:
- **Documentation**: Check `/docs` directory
- **Issues**: [Create an issue if repository is public]
- **API Reference**: Available in `/docs/api/`

---

**Service Vault** - Comprehensive time tracking and invoicing for modern businesses.