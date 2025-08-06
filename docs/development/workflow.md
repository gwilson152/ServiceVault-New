# Development Workflow

This document outlines the development workflow, standards, and practices for the Service Vault application.

## Development Environment Setup

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Git

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd service-vault

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database and API keys

# Set up database
npx prisma generate
npx prisma db push

# Start development server (user starts manually)  
npm run dev
```

### Environment Variables

Required variables in `.env`:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/servicevault"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Licensing (optional)
LICENSING_API_URL="https://api.licensing-service.com"
LICENSING_API_KEY="your-license-key"
```

## Development Commands

### Core Commands

```bash
# Development server (user starts manually)
npm run dev

# Production build
npm run build
npm run start

# Code quality
npm run lint
npm run type-check

# Database operations
npx prisma generate    # Generate Prisma client
npx prisma db push     # Push schema changes
npx prisma studio      # Open database browser
npx prisma db seed     # Seed database (if seeding script exists)
```

### Useful Development Commands

```bash
# Reset database (development only)
npx prisma db push --force-reset

# View database schema
npx prisma db pull

# Generate migration
npx prisma migrate dev --name your-migration-name
```

## Code Standards

### TypeScript Configuration

The project uses strict TypeScript with the following key settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Code Style

**ESLint Configuration:**
- Next.js recommended rules
- TypeScript strict rules
- React hooks rules
- Tailwind CSS class sorting

**Prettier Configuration:**
- 2-space indentation
- Single quotes
- Trailing commas
- Semicolons required

### Naming Conventions

**Files and Directories:**
```
/components/ComponentName.tsx      # PascalCase for components
/hooks/useHookName.ts             # camelCase with 'use' prefix
/utils/utilityName.ts             # camelCase for utilities
/pages/page-name.tsx              # kebab-case for pages
```

**Code:**
```typescript
// Components: PascalCase
export function UserManagementPage() { }

// Functions: camelCase  
function calculateBillingRate() { }

// Variables: camelCase
const userPreferences = {};

// Constants: SCREAMING_SNAKE_CASE
const DEFAULT_BILLING_RATE = 90;

// Types/Interfaces: PascalCase
interface UserPermissions { }
type AccountType = 'ORGANIZATION' | 'SUBSIDIARY';
```

## Git Workflow

### Branch Strategy

**Main Branches:**
- `main` - Production-ready code
- `develop` - Integration branch for features

**Feature Branches:**
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes  
- `refactor/component-name` - Code refactoring
- `docs/section-name` - Documentation updates

### Commit Standards

**Commit Message Format:**
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
git commit -m "feat(users): add unified user management interface"
git commit -m "fix(permissions): resolve AccountHierarchyCard schema mismatch"
git commit -m "docs(api): update permissions system documentation"
```

### Pull Request Process

1. **Create feature branch** from `develop`
2. **Implement changes** following code standards
3. **Update documentation** if needed
4. **Run tests and linting** before committing
5. **Create pull request** with descriptive title and body
6. **Request review** from team members
7. **Address feedback** and update PR
8. **Merge** after approval and CI passes

## Testing Strategy

### Test Types

**Unit Tests:**
- Individual function testing
- Component testing with React Testing Library
- Hook testing with `@testing-library/react-hooks`

**Integration Tests:**
- API endpoint testing
- Database integration testing
- Permission system testing

**E2E Tests:**
- Critical user flows
- Authentication workflows
- Permission scenarios

### Test Structure

```
/src
  /components
    ComponentName.tsx
    ComponentName.test.tsx
  /hooks
    useHookName.ts
    useHookName.test.ts
  /lib
    utilityName.ts
    utilityName.test.ts
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode  
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Code Quality

### Pre-commit Hooks

The project uses Husky for pre-commit hooks:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run type-check"
    }
  }
}
```

### Lint-staged Configuration

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ],
    "*.{md,json}": [
      "prettier --write",
      "git add"
    ]
  }
}
```

### Code Review Checklist

**Before Submitting PR:**
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Documentation updated if needed
- [ ] No console.log statements in production code
- [ ] Error handling implemented
- [ ] Performance considerations addressed

**During Code Review:**
- [ ] Code is readable and maintainable
- [ ] Logic is correct and efficient
- [ ] Security considerations addressed
- [ ] Accessibility requirements met
- [ ] Responsive design implemented
- [ ] Permission checks properly implemented

## Development Patterns

### Component Development

**Standard Component Structure:**
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/useToast';

interface ComponentProps {
  // Props interface
}

export function ComponentName({ }: ComponentProps) {
  // Hooks
  const router = useRouter();
  const { canEdit } = usePermissions();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(false);

  // Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // Handlers
  const handleAction = async () => {
    // Handler logic
  };

  // Render guards
  if (!canEdit) {
    return <div>Access denied</div>;
  }

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

### API Route Development

**Standard API Route Structure:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'resource',
      action: 'view'
    });
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Business logic
    const data = await prisma.model.findMany({
      // Query logic
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Permission Integration (Updated 2025-08-06)

**IMPORTANT**: The permission system has been simplified. Manual permission assignment has been removed in favor of role template-based permissions.

**Component Permission Checks:**
```typescript
const { 
  canViewUsers,
  canCreateUsers,
  canEditUsers,
  isLoading 
} = usePermissions();

// Loading state
if (isLoading) {
  return <LoadingSpinner />;
}

// Conditional rendering
return (
  <div>
    {canViewUsers && <UsersList />}
    {canCreateUsers && (
      <Button onClick={handleCreateUser}>
        Create User
      </Button>
    )}
  </div>
);
```

**API Permission Checks:**
```typescript
// Always check permissions in API routes
const canEdit = await permissionService.hasPermission({
  userId: session.user.id,
  resource: 'users',
  action: 'edit',
  accountId: user.accountId // Include context when relevant
});

if (!canEdit) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**Permission Management Workflow:**
1. **Role Templates**: Create/edit at `/dashboard/roles` (super-admin only)
2. **Role Assignment**: Assign roles through account management pages
3. **No Manual Permissions**: All permissions come through role templates
4. **API Format**: Always use object format: `{userId, resource, action, accountId?}`

**Common Mistakes to Avoid:**
- ❌ `permissionService.hasPermission(userId, resource, action)` (old format)
- ✅ `permissionService.hasPermission({userId, resource, action})`
- ❌ Direct permission assignment (removed in 2025-08-06 update)
- ✅ Role template assignment only
```

## Database Development

### Schema Changes

1. **Update Prisma schema** in `prisma/schema.prisma`
2. **Generate client** with `npx prisma generate`
3. **Push changes** with `npx prisma db push` (development)
4. **Create migration** with `npx prisma migrate dev` (production)
5. **Update TypeScript types** if needed

### Database Best Practices

**Query Optimization:**
```typescript
// ✅ Include only needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true
  }
});

// ✅ Use proper indexing
// Add indexes in schema.prisma:
// @@index([userId, accountId])

// ✅ Use transactions for multiple operations
await prisma.$transaction([
  prisma.user.create(userData),
  prisma.accountMembership.create(membershipData)
]);
```

**Security Practices:**
```typescript
// ✅ Always validate input
const { email, name } = z.object({
  email: z.string().email(),
  name: z.string().min(1)
}).parse(request.body);

// ✅ Use parameterized queries (Prisma handles this)
const user = await prisma.user.findUnique({
  where: { email } // Safe from SQL injection
});
```

## Performance Optimization

### React Performance

```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return performExpensiveCalculation(data);
}, [data]);

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // Handler logic
}, [dependency]);
```

### Database Performance

```typescript
// Batch queries instead of N+1
const usersWithAccounts = await prisma.user.findMany({
  include: {
    memberships: {
      include: {
        account: true
      }
    }
  }
});

// Use connection pooling (configured in DATABASE_URL)
// Use appropriate indexes in schema
```

## Documentation Standards

### Code Documentation

```typescript
/**
 * Calculates billing rate for time entry based on account overrides
 * 
 * @param baseRate - System default rate
 * @param accountId - Account for override lookup
 * @param entryType - Type of time entry (STANDARD, CRITICAL, etc.)
 * @returns Promise<number> - Final billing rate
 */
async function calculateBillingRate(
  baseRate: number,
  accountId: string,
  entryType: string
): Promise<number> {
  // Implementation
}
```

### API Documentation

```typescript
/**
 * GET /api/users
 * 
 * Retrieves list of users with permission filtering
 * 
 * Query Parameters:
 * - page: number (optional) - Page number for pagination
 * - limit: number (optional) - Items per page
 * - search: string (optional) - Search term for name/email
 * 
 * Returns:
 * - 200: Array of user objects
 * - 401: Unauthorized
 * - 403: Forbidden
 */
```

## Debugging

### Development Tools

**Browser DevTools:**
- React Developer Tools
- Redux DevTools (if using Redux)
- Network tab for API debugging

**VS Code Extensions:**
- TypeScript Hero
- Prisma
- ESLint
- Prettier

### Logging

```typescript
// Use console.error for errors (remove in production)
console.error('Permission check failed:', error);

// Use proper logging in production
import { logger } from '@/lib/logger';
logger.error('Permission check failed', { userId, resource, error });
```

### Common Issues

**Permission Errors:**
1. Check user role assignments
2. Verify permission service implementation  
3. Check API route permission middleware

**Database Errors:**
1. Verify schema matches Prisma model
2. Check foreign key constraints
3. Ensure proper data types

**Performance Issues:**
1. Check for N+1 queries
2. Verify proper indexing
3. Monitor React render cycles

## Deployment

### Production Build

```bash
# Build application
npm run build

# Test production build locally
npm run start

# Run in production environment
NODE_ENV=production npm run start
```

### Environment Configuration

**Production Environment Variables:**
```env
NODE_ENV=production
DATABASE_URL="postgresql://prod-user:password@prod-host:5432/servicevault"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="production-secret-key"
```

### Database Migration

```bash
# Run migrations in production
npx prisma migrate deploy

# Verify schema
npx prisma db pull
```

This workflow ensures consistent, high-quality development practices across the Service Vault application.