# Toast Notification System

The Toast system provides app-wide user feedback through non-intrusive notification messages. Built on Radix UI primitives with comprehensive error handling integration.

## Overview

The Toast system consists of:
- **Toast UI Component**: Radix UI-based toast with multiple variants
- **Toast Provider**: React Context provider for app-wide toast management
- **useToast Hook**: Easy-to-use hook for displaying toasts from any component
- **Toaster Component**: Renders active toasts with proper positioning

## Quick Start

### Basic Usage

```tsx
import { useToast } from '@/hooks/useToast';

function MyComponent() {
  const { success, error, warning, info } = useToast();

  const handleSuccess = () => {
    success('Operation completed!', 'Your changes have been saved successfully.');
  };

  const handleError = () => {
    error('Operation failed', 'Please try again or contact support.');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Success</button>
      <button onClick={handleError}>Error</button>
    </div>
  );
}
```

### Custom Toast

```tsx
import { useToast } from '@/hooks/useToast';

function MyComponent() {
  const { toast } = useToast();

  const handleCustomToast = () => {
    toast({
      title: 'Custom Toast',
      description: 'This is a custom toast message',
      variant: 'info',
      duration: 5000,
    });
  };

  return <button onClick={handleCustomToast}>Custom Toast</button>;
}
```

## Toast Variants

### Success
- **Color**: Green theme
- **Icon**: CheckCircle
- **Default Duration**: 4 seconds
- **Usage**: Successful operations, confirmations

```tsx
success('User created!', 'The user account has been set up successfully.');
```

### Error (Destructive)
- **Color**: Red theme
- **Icon**: AlertCircle
- **Default Duration**: 6 seconds
- **Usage**: Errors, failures, critical issues

```tsx
error('Failed to save', 'Please check your internet connection and try again.');
```

### Warning
- **Color**: Yellow theme
- **Icon**: AlertTriangle
- **Default Duration**: 4 seconds
- **Usage**: Warnings, cautions, validation issues

```tsx
warning('Unsaved changes', 'You have unsaved changes that will be lost.');
```

### Info
- **Color**: Blue theme
- **Icon**: Info
- **Default Duration**: 4 seconds
- **Usage**: Information, tips, general notifications

```tsx
info('New feature available', 'Check out the new time tracking widget!');
```

## API Reference

### useToast Hook

```tsx
const {
  toast,     // Core toast function
  success,   // Success toast shortcut
  error,     // Error toast shortcut
  warning,   // Warning toast shortcut
  info,      // Info toast shortcut
  dismiss,   // Dismiss specific toast
  toasts     // Current active toasts
} = useToast();
```

#### toast(options)

Core function for creating toasts with full customization:

```tsx
toast({
  title: string,              // Required: Toast title
  description?: string,       // Optional: Toast description
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info',
  duration?: number,          // Optional: Auto-dismiss duration (ms)
  action?: ToastActionElement // Optional: Custom action button
})
```

#### Convenience Methods

```tsx
success(title: string, description?: string, options?: ToastOptions)
error(title: string, description?: string, options?: ToastOptions)
warning(title: string, description?: string, options?: ToastOptions)
info(title: string, description?: string, options?: ToastOptions)
```

#### dismiss(toastId?)

```tsx
dismiss()        // Dismiss all toasts
dismiss(toastId) // Dismiss specific toast
```

### ToastOptions

```tsx
interface ToastOptions {
  duration?: number; // Custom duration in milliseconds
}
```

## Integration with Error Handling

The Toast system is integrated with the EmailService error handling:

### EmailServiceError Integration

```tsx
// In API routes or services
import { EmailServiceError } from '@/lib/email/EmailService';

try {
  await emailService.sendTemplateEmail('USER_INVITATION', emailData, variables);
  success('Invitation sent!', 'The user will receive an email invitation.');
} catch (error) {
  if (error instanceof EmailServiceError) {
    error(error.userMessage, error.details);
  } else {
    error('Operation failed', 'Please try again.');
  }
}
```

### API Error Responses

API routes return structured error responses:

```tsx
// API Route
return NextResponse.json({
  error: 'User-friendly error message',
  code: 'ERROR_CODE',
  details: 'Additional context for admins'
}, { status: 500 });

// Frontend handling
const response = await fetch('/api/endpoint');
const data = await response.json();

if (!response.ok) {
  error(data.error, data.details);
  return;
}

success('Operation completed!');
```

## Configuration

### Toast Limits

```tsx
// src/hooks/useToast.ts
const TOAST_LIMIT = 1;           // Maximum simultaneous toasts
const TOAST_REMOVE_DELAY = 1000000; // Delay before removing from DOM
```

### Default Durations

- Success: 4000ms (4 seconds)
- Error: 6000ms (6 seconds)  
- Warning: 4000ms (4 seconds)
- Info: 4000ms (4 seconds)

### Positioning

Toasts appear in the top-right corner on desktop and bottom on mobile, managed by the ToastViewport component.

## Styling

The Toast system uses Tailwind CSS with CSS variables for theming:

```css
/* Custom toast styles in globals.css */
.toast-success {
  @apply border-green-200 bg-green-50 text-green-900;
}

.toast-error {
  @apply border-red-200 bg-red-50 text-red-900;  
}
```

## Architecture

### Components

1. **Toast Component** (`src/components/ui/toast.tsx`)
   - Radix UI primitive wrapper
   - Variant styling with class-variance-authority
   - Icon integration for each variant

2. **Toaster Component** (`src/components/ui/toaster.tsx`)
   - Renders active toasts from useToast hook
   - Handles toast positioning and viewport

3. **ToastProvider** (`src/components/providers/ToastProvider.tsx`)
   - Simple wrapper around Radix ToastProvider
   - Integrated into app providers

### State Management

- **Global State**: Managed in `useToast` hook using React state and listeners
- **Memory State**: Persists toasts across component unmounts
- **Queue Management**: Automatic queuing and dismissal of toasts

### Integration Points

1. **App Providers** (`src/app/providers.tsx`)
   - Toaster component included at app level
   - Available to all components

2. **Email Service** (`src/lib/email/EmailService.ts`)
   - EmailServiceError class with user-friendly messages
   - Structured error handling

3. **API Routes**
   - Consistent error response format
   - Integration with EmailServiceError

## Best Practices

### When to Use Each Variant

- **Success**: Confirmations, completed actions, saved data
- **Error**: Failed operations, validation errors, system errors
- **Warning**: Unsaved changes, destructive actions, cautions
- **Info**: Tips, new features, general information

### Message Guidelines

- **Title**: Brief, action-oriented (e.g., "User created", "Failed to save")
- **Description**: Specific, actionable (e.g., "Check your connection and try again")
- **Length**: Keep titles under 50 characters, descriptions under 100

### Error Handling Pattern

```tsx
// Consistent pattern for error handling
try {
  const result = await apiCall();
  success('Operation completed!', 'Data has been saved successfully.');
  return result;
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  error('Operation failed', message);
  throw error;
}
```

### Accessibility

- Toasts are announced by screen readers
- Focus management handled by Radix UI
- Keyboard navigation supported (Escape to dismiss)
- Proper ARIA labels and roles

## Troubleshooting

### Common Issues

1. **Toasts not appearing**
   - Verify Toaster component is included in app providers
   - Check browser console for JavaScript errors

2. **Styling issues**
   - Ensure Tailwind CSS classes are properly compiled
   - Check for CSS conflicts with existing styles

3. **Long toast queues**
   - Adjust TOAST_LIMIT in useToast.ts
   - Consider debouncing frequent toast triggers

### Debug Mode

```tsx
// Enable debug logging
const { toasts } = useToast();
console.log('Active toasts:', toasts);
```

## Migration Guide

### From Console Errors

Replace console.error calls with user-facing toasts:

```tsx
// Before
console.error('Failed to save user');

// After  
error('Failed to save user', 'Please check your connection and try again.');
```

### From Alert/Confirm

Replace browser alerts with toasts:

```tsx
// Before
alert('User saved successfully!');

// After
success('User saved!', 'The user account has been created successfully.');
```

This Toast system provides a robust, accessible, and user-friendly way to communicate with users throughout the application.