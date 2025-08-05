# TimeTrackingProvider System

> ⚠️ **IMPORTANT**: Update when modifying timer interfaces, synchronization logic, or cross-device functionality.

## Purpose

The TimeTrackingProvider system manages persistent, cross-device timer state for time tracking across the application. It provides real-time timer functionality with database synchronization, multiple concurrent timers, and global timer events for seamless time tracking workflows.

## Components

### Core Files
- **Provider**: `/src/components/time/TimeTrackingProvider.tsx`
- **Timer Widgets**: `/src/components/time/MultiTimerWidget.tsx`, `/src/components/time/GlobalTimerWidget.tsx`
- **Timer Cards**: `/src/components/time/TimerCard.tsx`

## Architecture Overview

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│     Components      │───▶│ TimeTrackingProvider │───▶│     Database        │
│                     │    │                      │    │                     │
│ - Timer Widgets     │    │ - Timer State        │    │ - Timer Records     │
│ - Time Entry Forms  │    │ - Cross-Device Sync  │    │ - Persistence       │
│ - Global Timer      │    │ - Event System       │    │ - Constraints       │
│ - Action Buttons    │    │ - API Integration    │    │                     │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
                                       │
                                       ▼
                           ┌──────────────────────┐
                           │    Timer Events      │
                           │                      │
                           │ - Timer Logged       │
                           │ - State Changes      │
                           │ - Cross-Component    │
                           │   Notifications      │
                           └──────────────────────┘
```

## Core Concepts

### Timer State Management
- **Multiple Timers**: Users can have multiple timers running simultaneously
- **Primary Timer**: One timer designated as "primary" for backward compatibility
- **Cross-Device Sync**: Timer state synchronized across browser sessions
- **Database Persistence**: All timer state stored in database for reliability

### Timer Lifecycle
1. **Start**: Create timer record in database
2. **Pause/Resume**: Update running state and accumulated paused time
3. **Stop**: Calculate total time and delete timer record
4. **Auto-Recovery**: Restore timer state on page load/refresh

## Usage

### Provider Setup
```tsx
// In app layout or root component
import { TimeTrackingProvider } from "@/components/time/TimeTrackingProvider";

function AppLayout({ children }) {
  return (
    <TimeTrackingProvider>
      {children}
    </TimeTrackingProvider>
  );
}
```

### Basic Timer Operations
```tsx
import { useTimeTracking } from "@/components/time/TimeTrackingProvider";

export default function SomeComponent() {
  const {
    activeTimers,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    isLoading
  } = useTimeTracking();

  const handleStartTimer = async () => {
    try {
      await startTimer(ticketId, ticketTitle);
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleStopTimer = async (timerId) => {
    try {
      const result = await stopTimer(timerId);
      if (result) {
        console.log(`Logged ${result.minutes} minutes for ticket ${result.ticketId}`);
      }
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  return (
    <div>
      {activeTimers.map(timer => (
        <TimerCard
          key={timer.id}
          timer={timer}
          onPause={() => pauseTimer(timer.id)}
          onResume={() => resumeTimer(timer.id)}
          onStop={() => handleStopTimer(timer.id)}
        />
      ))}
    </div>
  );
}
```

### Timer Event Listening
```tsx
// Listen for timer events (e.g., in time entry pages)
const { registerTimerLoggedCallback } = useTimeTracking();

useEffect(() => {
  const unregister = registerTimerLoggedCallback(() => {
    // Refresh time entries when timer is logged
    refreshTimeEntries();
  });

  return unregister; // Cleanup
}, [refreshTimeEntries]);
```

## Interface Definitions

### Timer Interface
```typescript
interface Timer {
  id: string;                    // Unique timer ID
  userId: string;               // Owner user ID
  ticketId: string;             // Associated ticket ID
  startTime: string;            // ISO timestamp when started
  pausedTime: number;           // Accumulated paused seconds
  isRunning: boolean;           // Current running state
  ticket: {                     // Associated ticket info
    id: string;
    title: string;
    account: {
      id: string;
      name: string;
    };
  };
  totalSeconds?: number;        // Computed total elapsed time
  currentElapsed?: number;      // Current session elapsed time
}
```

### Context Interface
```typescript
interface TimeTrackingContextType {
  // Backward compatibility (primary timer)
  isTimerRunning: boolean;           // Primary timer running state
  timerSeconds: number;              // Primary timer elapsed seconds
  currentTicketId: string | null;    // Primary timer ticket ID
  currentTicketTitle: string | null; // Primary timer ticket title
  activeTimer: Timer | null;         // Primary timer object
  isLoading: boolean;                // Loading state for operations

  // Multiple timers
  activeTimers: Timer[];             // All active timers
  primaryTimerId: string | null;     // ID of primary timer

  // Timer operations
  startTimer: (ticketId: string, ticketTitle: string) => Promise<void>;
  pauseTimer: (timerId?: string) => Promise<void>;
  resumeTimer: (timerId?: string) => Promise<void>;
  stopTimer: (timerId?: string) => Promise<StopResult | null>;
  deleteTimer: (timerId: string) => Promise<void>;
  switchToPrimaryTimer: (timerId: string) => void;

  // Data refresh
  refreshActiveTimer: () => Promise<void>;
  refreshAllActiveTimers: () => Promise<void>;

  // Event system
  registerTimerLoggedCallback: (callback: () => void) => (() => void);
  notifyTimerLogged: () => void;

  // Pending results (for modals)
  pendingStopResult: StopResult | null;
  clearPendingStopResult: () => void;

  // Utilities
  formatTime: (seconds: number) => string;
  getTimerForTicket: (ticketId: string) => Timer | null;
}

interface StopResult {
  minutes: number;
  ticketId: string;
  timerId: string;
}
```

## Key Features

### 1. **Cross-Device Synchronization**
```typescript
// Timer state is persisted in database and synchronized across devices
const refreshAllActiveTimers = useCallback(async () => {
  if (!session?.user?.id) return;

  try {
    const response = await fetch('/api/timers/active');
    if (response.ok) {
      const timers = await response.json();
      setActiveTimers(timers);
      
      // Update primary timer reference
      if (primaryTimerId) {
        const primaryTimer = timers.find(t => t.id === primaryTimerId);
        setActiveTimer(primaryTimer || null);
      }
    }
  } catch (error) {
    console.error('Failed to refresh timers:', error);
  }
}, [session?.user?.id, primaryTimerId]);

// Auto-refresh on window focus (detect device switching)
useEffect(() => {
  const handleFocus = () => {
    refreshAllActiveTimers();
  };

  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [refreshAllActiveTimers]);
```

### 2. **Real-Time Timer Updates**
```typescript
// Update timer display every second
useEffect(() => {
  const interval = setInterval(() => {
    setActiveTimers(prevTimers => 
      prevTimers.map(timer => {
        if (!timer.isRunning) return timer;

        const now = new Date();
        const startTime = new Date(timer.startTime);
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const totalSeconds = elapsed - timer.pausedTime;

        return {
          ...timer,
          totalSeconds,
          currentElapsed: totalSeconds
        };
      })
    );
  }, 1000);

  return () => clearInterval(interval);
}, []);
```

### 3. **Multiple Timer Management**
```typescript
// Start new timer with constraint checking
const startTimer = useCallback(async (ticketId: string, ticketTitle: string) => {
  if (!session?.user?.id) return;

  setIsLoading(true);
  try {
    // Check if timer already exists for this ticket
    const existingTimer = activeTimers.find(timer => timer.ticketId === ticketId);
    if (existingTimer) {
      // Resume existing timer instead of creating new one
      await resumeTimer(existingTimer.id);
      return;
    }

    const response = await fetch('/api/timers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, ticketTitle })
    });

    if (response.ok) {
      const newTimer = await response.json();
      setActiveTimers(prev => [...prev, newTimer]);
      
      // Set as primary timer if no primary exists
      if (!primaryTimerId) {
        switchToPrimaryTimer(newTimer.id);
      }
    }
  } catch (error) {
    console.error('Failed to start timer:', error);
    throw error;
  } finally {
    setIsLoading(false);
  }
}, [session?.user?.id, activeTimers, primaryTimerId]);
```

### 4. **Event System for Components**
```typescript
// Global event system for timer logging notifications
const [timerLoggedCallbacks, setTimerLoggedCallbacks] = useState<Set<() => void>>(new Set());

const registerTimerLoggedCallback = useCallback((callback: () => void) => {
  setTimerLoggedCallbacks(prev => new Set([...prev, callback]));
  
  // Return unregister function
  return () => {
    setTimerLoggedCallbacks(prev => {
      const newSet = new Set(prev);
      newSet.delete(callback);
      return newSet;
    });
  };
}, []);

const notifyTimerLogged = useCallback(() => {
  timerLoggedCallbacks.forEach(callback => callback());
}, [timerLoggedCallbacks]);

// Call when timer is stopped and logged
const stopTimer = useCallback(async (timerId?: string) => {
  // ... stop timer logic ...
  
  if (result) {
    // Notify all listeners that time was logged
    notifyTimerLogged();
  }
  
  return result;
}, [notifyTimerLogged]);
```

### 5. **Pending Results Management**
```typescript
// Handle timer stop results for modal display
const [pendingStopResult, setPendingStopResult] = useState<StopResult | null>(null);

const stopTimer = useCallback(async (timerId?: string) => {
  // ... timer stopping logic ...
  
  const result = {
    minutes: Math.round(totalSeconds / 60),
    ticketId: timer.ticketId,
    timerId: timer.id
  };

  // Store result for potential modal display
  setPendingStopResult(result);
  
  return result;
}, []);

const clearPendingStopResult = useCallback(() => {
  setPendingStopResult(null);
}, []);
```

## API Integration

### Timer Endpoints
```typescript
// Start timer: POST /api/timers
const startTimerAPI = async (ticketId: string) => {
  const response = await fetch('/api/timers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId })
  });
  return response.json();
};

// Pause timer: PATCH /api/timers/[id]
const pauseTimerAPI = async (timerId: string) => {
  const response = await fetch(`/api/timers/${timerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'pause' })
  });
  return response.json();
};

// Stop timer: DELETE /api/timers/[id]
const stopTimerAPI = async (timerId: string) => {
  const response = await fetch(`/api/timers/${timerId}`, {
    method: 'DELETE'
  });
  return response.json();
};

// Get active timers: GET /api/timers/active
const getActiveTimersAPI = async () => {
  const response = await fetch('/api/timers/active');
  return response.json();
};
```

### Database Constraints
```sql
-- One timer per ticket per user constraint
model Timer {
  id        String @id @default(cuid())
  userId    String
  ticketId  String
  -- ... other fields
  
  @@unique([userId, ticketId])
}
```

## Widget Integration

### MultiTimerWidget
```tsx
// Display all active timers
export function MultiTimerWidget() {
  const { activeTimers, pauseTimer, resumeTimer, stopTimer } = useTimeTracking();

  return (
    <div className="space-y-2">
      {activeTimers.map(timer => (
        <TimerCard
          key={timer.id}
          timer={timer}
          onPause={() => pauseTimer(timer.id)}
          onResume={() => resumeTimer(timer.id)}
          onStop={() => stopTimer(timer.id)}
        />
      ))}
    </div>
  );
}
```

### GlobalTimerWidget
```tsx
// Show primary timer in global header
export function GlobalTimerWidget() {
  const { activeTimer, isTimerRunning, timerSeconds, pauseTimer, resumeTimer, stopTimer } = useTimeTracking();

  if (!activeTimer || !isTimerRunning) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-md">
      <Clock className="h-4 w-4 text-blue-600" />
      <span className="text-sm font-medium">
        {formatTime(timerSeconds)}
      </span>
      <span className="text-xs text-muted-foreground">
        {activeTimer.ticket.title}
      </span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => pauseTimer()}
      >
        <Pause className="h-3 w-3" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => stopTimer()}
      >
        <Square className="h-3 w-3" />
      </Button>
    </div>
  );
}
```

## Common Usage Patterns

### Page Integration
```tsx
export default function TicketsPage() {
  const { startTimer, getTimerForTicket } = useTimeTracking();
  const [tickets, setTickets] = useState([]);

  const handleStartTimer = async (ticket) => {
    try {
      await startTimer(ticket.id, ticket.title);
    } catch (error) {
      error('Failed to start timer');
    }
  };

  return (
    <div>
      {tickets.map(ticket => {
        const existingTimer = getTimerForTicket(ticket.id);
        
        return (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            timer={existingTimer}
            onStartTimer={() => handleStartTimer(ticket)}
          />
        );
      })}
    </div>
  );
}
```

### Time Entry Integration
```tsx
export default function TimeTrackingPage() {
  const { registerTimerLoggedCallback } = useTimeTracking();
  const [timeEntries, setTimeEntries] = useState([]);

  // Refresh time entries when timer is logged
  useEffect(() => {
    const unregister = registerTimerLoggedCallback(() => {
      fetchTimeEntries(); // Refresh the list
    });

    return unregister;
  }, [fetchTimeEntries]);

  return (
    <div>
      {/* Time entries list */}
    </div>
  );
}
```

### Action Bar Integration
```tsx
export default function SomePage() {
  const { activeTimer, stopTimer } = useTimeTracking();
  const { addAction, clearActions } = useActionBar();

  useEffect(() => {
    if (activeTimer) {
      addAction({
        id: "stop-timer",
        label: "Stop Timer",
        icon: <Square className="h-4 w-4" />,
        onClick: () => stopTimer(),
        variant: "destructive",
        tooltip: `Stop timer for ${activeTimer.ticket.title}`
      });
    }

    return () => clearActions();
  }, [activeTimer, stopTimer, addAction, clearActions]);
}
```

## Performance Considerations

### Optimization Techniques
1. **Memoized callbacks** to prevent unnecessary re-renders
2. **Debounced API calls** for timer updates
3. **Local state updates** for real-time display
4. **Background sync** for cross-device consistency
5. **Lazy loading** of timer history

### Memory Management
```typescript
// Cleanup timers on component unmount
useEffect(() => {
  return () => {
    // Clear intervals and event listeners
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  };
}, []);

// Limit timer history to prevent memory leaks
const [timerHistory, setTimerHistory] = useState([]);

useEffect(() => {
  // Keep only last 50 timer records
  if (timerHistory.length > 50) {
    setTimerHistory(prev => prev.slice(-50));
  }
}, [timerHistory]);
```

## Error Handling

### Network Failures
```typescript
const startTimer = useCallback(async (ticketId: string, ticketTitle: string) => {
  setIsLoading(true);
  
  try {
    const response = await fetch('/api/timers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const timer = await response.json();
    setActiveTimers(prev => [...prev, timer]);
    
  } catch (error) {
    console.error('Failed to start timer:', error);
    
    // Show user-friendly error
    if (error.message.includes('409')) {
      throw new Error('Timer already exists for this ticket');
    } else if (error.message.includes('network')) {
      throw new Error('Network error. Please check your connection.');
    } else {
      throw new Error('Failed to start timer. Please try again.');
    }
  } finally {
    setIsLoading(false);
  }
}, []);
```

### State Synchronization Issues
```typescript
// Recover from desync by refreshing from server
const handleSyncError = useCallback(async () => {
  console.warn('Timer state out of sync, refreshing from server');
  
  try {
    await refreshAllActiveTimers();
  } catch (error) {
    console.error('Failed to sync timer state:', error);
    // Could implement retry logic or offline mode
  }
}, [refreshAllActiveTimers]);
```

## Testing

### Unit Tests
```typescript
describe('TimeTrackingProvider', () => {
  it('starts timer correctly', async () => {
    const { result } = renderHook(() => useTimeTracking(), {
      wrapper: TimeTrackingProvider
    });

    await act(async () => {
      await result.current.startTimer('ticket-1', 'Test Ticket');
    });

    expect(result.current.activeTimers).toHaveLength(1);
    expect(result.current.activeTimers[0].ticketId).toBe('ticket-1');
  });

  it('handles multiple timers', async () => {
    // Test multiple timer functionality
  });

  it('synchronizes across provider instances', async () => {
    // Test cross-device sync simulation
  });
});
```

### Integration Tests
```typescript
describe('Timer Widget Integration', () => {
  it('updates display in real-time', () => {
    // Test timer display updates
  });

  it('handles timer actions', () => {
    // Test pause/resume/stop actions
  });
});
```

## Related Components

### Timer UI Components
- **[MultiTimerWidget](../time/timer-widgets.md)** - Display all active timers
- **[GlobalTimerWidget](../time/timer-widgets.md)** - Global header timer display
- **[TimerCard](../time/timer-widgets.md)** - Individual timer controls

### Integration Components
- **[ActionBarProvider](./action-bar-provider.md)** - Timer-related actions
- **[TimeEntryCard](../time/time-entry-components.md)** - Shows timer data in time entries
- **[TicketCard](../tickets/ticket-components.md)** - Timer controls in ticket lists

### Provider Ecosystem
- **[QueryProvider](./query-provider.md)** - API data fetching
- **[ToastProvider](./toast-provider.md)** - Timer operation feedback

---

## Maintenance Notes

Update this documentation when:
- Timer interface or state structure changes
- New timer operations or features are added
- Cross-device synchronization logic is modified
- Event system functionality changes
- API endpoints for timers are updated
- Performance optimization techniques are implemented

The TimeTrackingProvider should remain focused on timer state management. UI-specific logic should be in timer widget components, and business logic should be in API routes.

Last updated: [Current Date]