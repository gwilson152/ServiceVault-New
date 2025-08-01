"use client";

import { useState, useEffect } from "react";
import { useTimeTracking } from "./TimeTrackingProvider";
import { TimerCard } from "./TimerCard";

interface MultiTimerWidgetProps {
  onTimeLogged?: () => void;
}

export function MultiTimerWidget({ onTimeLogged }: MultiTimerWidgetProps = {}) {
  const {
    activeTimers,
    pauseTimer,
    resumeTimer,
    stopTimer,
    formatTime,
    refreshAllActiveTimers,
    notifyTimerLogged,
    pendingStopResult,
    clearPendingStopResult
  } = useTimeTracking();

  const [expandedTimerId, setExpandedTimerId] = useState<string | null>(null);

  // Auto-expand timer when there's a pending stop result
  useEffect(() => {
    if (pendingStopResult) {
      console.log("🟠 [MultiTimerWidget] Pending stop result detected, expanding timer:", pendingStopResult.timerId);
      setExpandedTimerId(pendingStopResult.timerId);
    }
  }, [pendingStopResult]);

  // Don't show widget if no timers are active
  if (!activeTimers || activeTimers.length === 0) {
    return null;
  }

  const handleToggleExpanded = (timerId: string) => {
    setExpandedTimerId(expandedTimerId === timerId ? null : timerId);
  };

  const handleStopTimer = async (timerId: string) => {
    console.log("🟠 [MultiTimerWidget] handleStopTimer called for timer:", timerId);
    const result = await stopTimer(timerId);
    console.log("🟠 [MultiTimerWidget] stopTimer result:", result);
    
    // The pending stop result is now handled globally in TimeTrackingProvider
    // and the useEffect above will auto-expand the timer
    
    // After stopping and potentially logging time, refresh all timers
    await refreshAllActiveTimers();
    return result;
  };

  const handleTimeLogged = async () => {
    console.log("🟠 [MultiTimerWidget] handleTimeLogged called - refreshing timers and notifying global listeners");
    // First refresh our own timer state to remove the logged timer
    await refreshAllActiveTimers();
    console.log("🟠 [MultiTimerWidget] Timer state refreshed, now notifying external components");
    // Then notify all registered components that a timer was logged
    notifyTimerLogged();
    // Also notify direct parent if provided
    onTimeLogged?.();
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none">
      <div className="max-w-7xl mx-auto pointer-events-auto">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {activeTimers.map((timer) => (
            <div
              key={timer.id}
              className={`flex-shrink-0 ${
                expandedTimerId === timer.id ? 'w-80' : 'w-64'
              } transition-all duration-200`}
            >
              <TimerCard
                timer={timer}
                isExpanded={expandedTimerId === timer.id}
                onToggleExpanded={() => handleToggleExpanded(timer.id)}
                onPause={pauseTimer}
                onResume={resumeTimer}
                onStop={handleStopTimer}
                formatTime={formatTime}
                onTimeLogged={handleTimeLogged}
                pendingStopResult={pendingStopResult?.timerId === timer.id ? pendingStopResult : null}
                onStopResultConsumed={clearPendingStopResult}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}