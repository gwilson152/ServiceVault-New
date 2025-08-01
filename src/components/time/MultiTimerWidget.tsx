"use client";

import { useState } from "react";
import { useTimeTracking } from "./TimeTrackingProvider";
import { TimerCard } from "./TimerCard";

export function MultiTimerWidget() {
  const {
    activeTimers,
    pauseTimer,
    resumeTimer,
    stopTimer,
    formatTime,
    refreshAllActiveTimers
  } = useTimeTracking();

  const [expandedTimerId, setExpandedTimerId] = useState<string | null>(null);

  // Don't show widget if no timers are active
  if (!activeTimers || activeTimers.length === 0) {
    return null;
  }

  const handleToggleExpanded = (timerId: string) => {
    setExpandedTimerId(expandedTimerId === timerId ? null : timerId);
  };

  const handleStopTimer = async (timerId: string) => {
    const result = await stopTimer(timerId);
    // After stopping and potentially logging time, refresh all timers
    await refreshAllActiveTimers();
    return result;
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
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}