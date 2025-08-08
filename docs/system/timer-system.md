# Advanced Timer System Documentation

## Overview

The timer system provides comprehensive real-time time tracking capabilities with persistent cross-device synchronization, integrated billing calculations, and advanced management features. Users can start, pause, resume, and stop timers for tickets with automatic billing rate application, manual time adjustments, and persistent session data.

## Architecture

### Core Components

- **TimeTrackingProvider** - Global state management and API coordination with real-time synchronization
- **GlobalTimerWidget** - Floating timer widget with minimize/expand functionality and full feature set
- **TimerCard** - Individual timer display with comprehensive controls and settings panel
- **LogTimeEntryDialog** - Unified dialog for converting timer data to time entries
- **QuickTimeEntry** - Timer controls integrated into ticket lists
- **BillingRateSelector** - Account-specific billing rate selection with override support

### Database Schema

```sql
Timer {
  id: string (UUID)
  userId: string
  ticketId: string
  startTime: DateTime
  pausedTime: number (accumulated seconds)
  isRunning: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

## Enhanced Timer Features

### Integrated Billing System

The timer system includes comprehensive billing integration with real-time calculations:

- **Account-Specific Rates**: Fetches billing rates from `/api/accounts/{id}/billing-rates` with account overrides
- **Real-time Dollar Display**: Running dollar amount shown alongside timer duration (e.g., "01:23:45 $123.45")
- **Effective Rate Calculation**: Uses `effectiveRate` field that includes account-specific overrides
- **Persistent Rate Selection**: Billing rate choices stored per ticket in localStorage
- **Auto-Selection**: Automatically selects default billing rates when available

### Manual Time Adjustment

Advanced time editing capabilities for precise time management:

- **HH:MM:SS Format**: Precise time entry with hours, minutes, and seconds
- **In-place Editing**: Edit timer duration directly within the timer interface
- **Format Validation**: Ensures valid time format with user-friendly error messages
- **API Integration**: Updates timer via `PUT /api/timers/{id}` endpoint
- **Real-time Updates**: Dollar amounts recalculate automatically after time changes

#### Usage Example

```typescript
// Time adjustment interface
const handleSaveTimeEdit = async () => {
  const newSeconds = parseTimeToSeconds(editTimeValue); // "01:30:45" -> 5445
  
  const response = await fetch(`/api/timers/${timerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pausedTime: newSeconds }),
  });
};
```

### Session Persistence

Comprehensive data persistence across browser sessions:

- **Billing Rate Storage**: `localStorage.setItem('timer-billing-rate-{ticketId}', rateId)`
- **Description Storage**: `localStorage.setItem('timer-description-{ticketId}', description)`
- **Auto-Recovery**: Automatically restores settings when timers are restarted
- **Data Cleanup**: Removes localStorage data when timers are deleted

### Interactive Navigation

Enhanced user experience with contextual navigation:

- **Clickable Ticket Numbers**: Navigate to `/tickets?search={ticketNumber}` for instant filtering
- **Hover Effects**: Visual feedback with `hover:bg-blue-50 hover:border-blue-300`
- **Tooltips**: Helpful guidance with `title="Click to view ticket"`
- **Deep Linking**: Direct navigation to relevant ticket views

### Advanced Settings Panel

Comprehensive timer management interface:

```typescript
// Settings panel features
interface TimerSettings {
  billingRate: {
    selection: string;           // Selected billing rate ID
    effectiveRate: number;       // Calculated rate with overrides
    inheritance: boolean;        // Whether rate is inherited
  };
  description: {
    value: string;              // Pre-entered description
    autoSave: boolean;          // Automatic persistence
    multiline: boolean;         // Supports line breaks
  };
  timeAdjustment: {
    format: 'HH:MM:SS';        // Time input format
    validation: boolean;        // Format and range validation
    realTimeUpdate: boolean;    // Immediate UI updates
  };
  deletion: {
    confirmation: boolean;      // Requires user confirmation
    dataCleanup: boolean;       // Removes associated data
  };
}
```

## Component Usage

### TimeTrackingProvider

Wrap your application with the TimeTrackingProvider to enable timer functionality:

```jsx
import { TimeTrackingProvider } from '@/components/time/TimeTrackingProvider';

function App() {
  return (
    <TimeTrackingProvider>
      {/* Your app content */}
    </TimeTrackingProvider>
  );
}
```

#### Available Context Methods

```typescript
const {
  // Timer state
  activeTimers,           // Array of all active timers
  activeTimer,           // Primary timer (backward compatibility)
  isTimerRunning,        // Whether primary timer is running
  timerSeconds,          // Current elapsed seconds for primary timer
  
  // Timer actions
  startTimer,            // (ticketId, ticketTitle) => Promise<void>
  pauseTimer,            // (timerId?) => Promise<void>
  resumeTimer,           // (timerId?) => Promise<void>
  stopTimer,             // (timerId?) => Promise<StopResult | null>
  deleteTimer,           // (timerId) => Promise<void>
  
  // Data refresh
  refreshAllActiveTimers, // () => Promise<void>
  
  // Global events
  registerTimerLoggedCallback, // (callback) => unregisterFunction
  notifyTimerLogged,     // () => void
  
  // Pending stop result coordination
  pendingStopResult,     // StopResult | null
  clearPendingStopResult, // () => void
  
  // Utilities
  formatTime,            // (seconds) => string
  getTimerForTicket,     // (ticketId) => Timer | null
} = useTimeTracking();
```

### MultiTimerWidget

Displays all active timers in a horizontal stack at the bottom of the screen:

```jsx
import { MultiTimerWidget } from '@/components/time/MultiTimerWidget';

function Layout() {
  return (
    <div>
      {/* Your content */}
      <MultiTimerWidget onTimeLogged={handleGlobalRefresh} />
    </div>
  );
}
```

#### Features

- **Horizontal Stack Layout**: Scrollable horizontal list of timer cards
- **Auto-Expansion**: Timer cards automatically expand when stopped from external sources
- **Global Coordination**: Manages pending stop results for modal display
- **Responsive Design**: Adapts to different screen sizes

### TimerCard

Individual timer display with comprehensive controls and advanced features:

#### States

1. **Minimized View**
   - Shows timer duration with dollar amount (when billing rate selected)
   - Ticket title and clickable ticket number
   - Color-coded status badge (green=running, yellow=paused)
   - Click to expand for full controls

2. **Expanded View**
   - Full timer controls (pause/resume, stop & log)
   - Side-by-side timer duration and dollar amount display
   - Complete ticket information with navigation links
   - Advanced settings panel with:
     - Billing rate selection with account overrides
     - Manual time adjustment with HH:MM:SS input
     - Multiline description pre-entry
     - Timer deletion with confirmation

#### Props

```typescript
interface TimerCardProps {
  timer: Timer;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onPause: (timerId: string) => Promise<void>;
  onResume: (timerId: string) => Promise<void>;
  onStop: (timerId: string) => Promise<StopResult | null>;
  formatTime: (seconds: number) => string;
  onTimeLogged?: () => void;
  pendingStopResult?: StopResult | null;
  onStopResultConsumed?: () => void;
}
```

### QuickTimeEntry

Timer controls integrated into ticket lists and detail views:

```jsx
import { QuickTimeEntry } from '@/components/time/QuickTimeEntry';

function TicketRow({ ticket }) {
  return (
    <div className="ticket-row">
      <span>{ticket.title}</span>
      <QuickTimeEntry 
        ticketId={ticket.id}
        ticketTitle={ticket.title}
        onTimeLogged={refreshTickets}
      />
    </div>
  );
}
```

#### Button States

- **No Timer**: Shows Play button (▶️)
- **Running Timer**: Shows Pause (⏸️) and Stop (⏹️) buttons
- **Paused Timer**: Shows Resume (▶️) and Stop (⏹️) buttons

## Timer Lifecycle

### 1. Starting a Timer

```javascript
// Start a new timer for a ticket
await startTimer(ticketId, ticketTitle);
```

**Database Actions:**
- Creates new Timer record with `isRunning: true`
- Sets `startTime` to current timestamp
- Initializes `pausedTime` to 0

**UI Updates:**
- Adds timer to MultiTimerWidget stack
- Updates button states in QuickTimeEntry
- Begins real-time timer display

### 2. Pausing a Timer

```javascript
// Pause a specific timer
await pauseTimer(timerId);

// Pause the primary timer
await pauseTimer();
```

**Database Actions:**
- Calculates elapsed time since start/resume
- Adds elapsed time to `pausedTime`
- Sets `isRunning: false`

**UI Updates:**
- Timer display stops incrementing
- Status badge changes to "Paused"
- Button states update to show Resume option

### 3. Resuming a Timer

```javascript
// Resume a specific timer
await resumeTimer(timerId);
```

**Database Actions:**
- Sets `startTime` to current timestamp
- Sets `isRunning: true`
- Preserves accumulated `pausedTime`

**UI Updates:**
- Timer display resumes incrementing
- Status badge changes to "Running"
- Button states update to show Pause option

### 4. Stopping a Timer

```javascript
// Stop a timer and get result for logging
const result = await stopTimer(timerId);
// Returns: { minutes: number, ticketId: string, timerId: string }
```

**Database Actions:**
- Calculates total elapsed time
- Sets `isRunning: false`
- Timer remains in database until time is logged

**UI Flow:**
1. Timer stops and result is calculated
2. `pendingStopResult` is set in global state
3. Appropriate TimerCard auto-expands
4. Time entry modal automatically appears
5. User can edit minutes and add description
6. On successful logging, timer is deleted from database

### 5. Time Logging

```javascript
// Log time entry (called from modal)
const response = await fetch('/api/time-entries', {
  method: 'POST',
  body: JSON.stringify({
    ticketId,
    minutes,
    description,
    timerId, // Timer will be deleted after successful logging
    // ... other fields
  })
});
```

**Database Actions:**
- Creates TimeEntry record
- Deletes Timer record (cleanup)
- Updates any related billing information

**UI Updates:**
- Modal closes
- Timer removed from MultiTimerWidget
- Global refresh notifications sent
- All timer-related UI updates across the app

## Global Event System

The timer system includes a global event system for coordinating UI updates across components:

### Registering for Timer Events

```javascript
useEffect(() => {
  const unregister = registerTimerLoggedCallback(() => {
    console.log('Timer was logged - refresh data');
    fetchTickets(); // Refresh your component's data
  });
  
  return unregister; // Cleanup on unmount
}, []);
```

### Components That Auto-Refresh

- **Tickets Page** (`/tickets`) - Refreshes ticket list and timer states
- **Time Page** (`/time`) - Refreshes time entries and active timers
- **MultiTimerWidget** - Refreshes active timer list
- **Any component using `registerTimerLoggedCallback`**

## API Endpoints

### GET /api/timers/active/all
Returns all active timers (running or paused with time > 0) for the current user.

```typescript
interface Response {
  activeTimers: Timer[];
}
```

### POST /api/timers
Creates and starts a new timer for a ticket.

```typescript
interface Request {
  ticketId: string;
}

interface Response extends Timer {}
```

### PUT /api/timers/[id]
Updates timer state (pause, resume, stop) or manually adjusts timer duration.

```typescript
interface Request {
  action?: 'pause' | 'resume' | 'stop';
  pausedTime?: number; // Manual time adjustment in seconds
}

interface Response extends Timer {}
```

**Manual Time Adjustment Usage:**
```typescript
// Set timer to 1 hour 30 minutes (5400 seconds)
PUT /api/timers/abc123
{
  "pausedTime": 5400
}
```

### DELETE /api/timers/[id]
Deletes a timer (used for cleanup after time logging).

## Database Constraints

- **One Timer Per User Per Ticket**: Users cannot have multiple timers for the same ticket
- **Automatic Cleanup**: Timers are automatically deleted after successful time logging
- **Persistent State**: Timer state persists across browser sessions and devices

## Real-Time Updates

### Client-Side Timer Display

```javascript
// Timer seconds increment every second for running timers
useEffect(() => {
  let interval;
  if (timer.isRunning) {
    interval = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
  }
  return () => clearInterval(interval);
}, [timer.isRunning]);
```

### Cross-Component Synchronization

- All timer state changes trigger global refresh events
- Components automatically update when timers are modified elsewhere
- Real-time synchronization without WebSocket requirements

## Error Handling

### Timer Conflicts
- Starting a timer when one already exists for the ticket will fail
- Error messages guide users to pause/stop existing timer first

### Network Issues
- Timer actions include proper error handling and user feedback
- Failed operations don't leave timers in inconsistent states
- Retry mechanisms for critical operations

### Data Consistency
- Prisma transactions ensure data consistency
- Timer deletion after time logging is protected against failures
- Graceful handling of timer cleanup errors

## Best Practices

### Component Integration

1. **Always use TimeTrackingProvider context** instead of direct API calls
2. **Register for global timer events** in components that display timer-related data
3. **Use QuickTimeEntry** for ticket-list timer controls
4. **Include MultiTimerWidget** in your main layout for persistent timer access

### Performance Considerations

1. **Timer refreshing is batched** to avoid excessive API calls
2. **Real-time updates use client-side intervals** rather than polling
3. **Global events use callback arrays** for efficient notification

### User Experience

1. **Provide clear visual feedback** for timer states with color-coded badges
2. **Auto-expand timer cards** when actions occur from external sources
3. **Maintain timer state** across page navigation and browser sessions
4. **Allow time editing** in stop-and-log modals for accuracy
5. **Display running dollar amounts** alongside timer duration for billing transparency
6. **Enable billing rate pre-selection** to ensure accurate cost calculations
7. **Support manual time adjustments** for precise time tracking corrections
8. **Provide description pre-entry** for better work documentation
9. **Include clickable navigation** for quick ticket context switching

### Enhanced Features Best Practices

1. **Billing Rate Management**:
   - Select billing rates before significant time accumulation
   - Use account-specific rates for accurate override calculations
   - Verify effective rates include account inheritance

2. **Manual Time Adjustments**:
   - Use HH:MM:SS format for precise entry
   - Validate time ranges (minutes/seconds 0-59)
   - Apply adjustments for breaks, meetings, and offline work

3. **Session Persistence**:
   - Timer settings automatically persist across sessions
   - Billing rates and descriptions stored per ticket
   - Data cleanup occurs when timers are deleted

4. **Navigation Integration**:
   - Use clickable ticket numbers for instant filtering
   - Maintain context when switching between tickets
   - Provide visual feedback for interactive elements

## Troubleshooting

### Common Issues

**Timer not appearing in widget:**
- Check that timer was created successfully (API response)
- Verify `refreshAllActiveTimers()` is called after timer creation

**Dollar amounts not displaying:**
- Ensure billing rate is selected in timer settings
- Check account has enabled billing rates configured
- Verify account-specific overrides are properly set
- Confirm effectiveRate field is populated in API response

**Manual time adjustment not saving:**
- Verify time format is exactly HH:MM:SS (e.g., "01:30:45")
- Check user has timer update permissions
- Ensure timer hasn't been deleted during edit session
- Validate time ranges (minutes/seconds must be 0-59)

**Settings not persisting across sessions:**
- Check localStorage is enabled in browser
- Verify ticket ID is valid and consistent
- Clear browser data if localStorage corruption suspected
- Ensure timer settings are associated with correct ticket ID

**Billing rate calculations incorrect:**
- Confirm using `/api/accounts/{id}/billing-rates` endpoint (not individual rate endpoint)
- Verify effectiveRate field includes account-specific overrides
- Check parent account inheritance in billing rate hierarchy
- Ensure account membership permissions are correct

**Clickable ticket navigation not working:**
- Verify ticket number is properly encoded for URL parameters
- Check user has permissions to view tickets page
- Ensure search functionality works with ticket numbers
- Confirm navigation path `/tickets?search={ticketNumber}` is correct

**Stop button not showing modal:**
- Ensure `pendingStopResult` system is working correctly
- Check that TimerCard is receiving correct props

**UI not updating after timer actions:**
- Verify global event callbacks are registered
- Check that `onTimeLogged` callbacks are properly connected

**Timer display not incrementing:**
- Confirm timer `isRunning` state is true
- Check that useEffect timer interval is active

### Debug Logging

The timer system includes extensive console logging for debugging:

```javascript
// Enable timer debugging in browser console
// Look for logs prefixed with:
// 🔵 [TimeTrackingProvider]
// 🟠 [MultiTimerWidget] 
// 🔴 [TimerCard]
// 🟡 [QuickTimeEntry]
```

### Database Debugging

```sql
-- Check active timers for a user
SELECT * FROM Timer WHERE userId = 'user-id' AND (isRunning = true OR pausedTime > 0);

-- Check recent time entries
SELECT * FROM TimeEntry WHERE userId = 'user-id' ORDER BY createdAt DESC LIMIT 10;
```