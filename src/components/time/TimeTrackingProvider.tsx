"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useSession } from "next-auth/react";

interface Timer {
  id: string;
  userId: string;
  ticketId: string;
  startTime: string;
  pausedTime: number;
  isRunning: boolean;
  ticket: {
    id: string;
    title: string;
    account: {
      id: string;
      name: string;
    };
  };
  totalSeconds?: number;
  currentElapsed?: number;
}

interface TimeTrackingContextType {
  // Timer state (backward compatibility - represents the "primary" timer)
  isTimerRunning: boolean;
  timerSeconds: number;
  currentTicketId: string | null;
  currentTicketTitle: string | null;
  activeTimer: Timer | null;
  isLoading: boolean;
  
  // Multiple timers state
  activeTimers: Timer[];
  primaryTimerId: string | null;
  
  // Timer actions
  startTimer: (ticketId: string, ticketTitle: string) => Promise<void>;
  pauseTimer: (timerId?: string) => Promise<void>;
  resumeTimer: (timerId?: string) => Promise<void>;
  stopTimer: (timerId?: string) => Promise<{ minutes: number; ticketId: string; timerId: string } | null>;
  deleteTimer: (timerId: string) => Promise<void>;
  switchToPrimaryTimer: (timerId: string) => void;
  
  // Data refresh
  refreshActiveTimer: () => Promise<void>;
  refreshAllActiveTimers: () => Promise<void>;
  
  // Utility
  formatTime: (seconds: number) => string;
  getTimerForTicket: (ticketId: string) => Timer | null;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | null>(null);

interface TimeTrackingProviderProps {
  children: ReactNode;
}

export function TimeTrackingProvider({ children }: TimeTrackingProviderProps) {
  const { data: session } = useSession();
  // Single timer state (backward compatibility)
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [currentTicketTitle, setCurrentTicketTitle] = useState<string | null>(null);
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Multiple timers state
  const [activeTimers, setActiveTimers] = useState<Timer[]>([]);
  const [primaryTimerId, setPrimaryTimerId] = useState<string | null>(null);

  // Fetch all active timers from database
  const refreshAllActiveTimers = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      const response = await fetch("/api/timers/active/all");
      if (response.ok) {
        const data = await response.json();
        const timers = data.activeTimers || [];
        
        setActiveTimers(timers);
        
        // Set primary timer (most recently updated or current primary)
        let newPrimaryTimer = null;
        if (timers.length > 0) {
          if (primaryTimerId) {
            newPrimaryTimer = timers.find(t => t.id === primaryTimerId) || timers[0];
          } else {
            newPrimaryTimer = timers[0];
          }
          
          setPrimaryTimerId(newPrimaryTimer.id);
          setActiveTimer(newPrimaryTimer);
          setIsTimerRunning(newPrimaryTimer.isRunning);
          setTimerSeconds(newPrimaryTimer.totalSeconds || 0);
          setCurrentTicketId(newPrimaryTimer.ticketId);
          setCurrentTicketTitle(newPrimaryTimer.ticket.title);
        } else {
          // No active timers
          setPrimaryTimerId(null);
          setActiveTimer(null);
          setIsTimerRunning(false);
          setTimerSeconds(0);
          setCurrentTicketId(null);
          setCurrentTicketTitle(null);
        }
      }
    } catch (error) {
      console.error("Error fetching active timers:", error);
    }
  }, [session, primaryTimerId]);

  // Fetch active timer from database (backward compatibility)
  const refreshActiveTimer = useCallback(async () => {
    await refreshAllActiveTimers();
  }, [refreshAllActiveTimers]);

  // Load active timers on mount and session change
  useEffect(() => {
    if (session?.user) {
      refreshAllActiveTimers();
    }
  }, [session, refreshAllActiveTimers]);

  // Timer effect - updates UI timer every second for running timers
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, activeTimer]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = async (ticketId: string, _ticketTitle: string) => {
    if (!session?.user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/timers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticketId }),
      });

      if (response.ok) {
        const timer = await response.json();
        // Refresh all timers to get updated state
        await refreshAllActiveTimers();
        // Set this new timer as primary
        setPrimaryTimerId(timer.id);
      } else {
        const errorData = await response.json();
        console.error("Failed to start timer:", errorData.error);
        throw new Error(errorData.error);
      }
    } catch (error) {
      console.error("Error starting timer:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const pauseTimer = async (timerId?: string) => {
    const targetTimerId = timerId || primaryTimerId;
    if (!targetTimerId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/timers/${targetTimerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "pause" }),
      });

      if (response.ok) {
        await refreshAllActiveTimers();
      }
    } catch (error) {
      console.error("Error pausing timer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resumeTimer = async (timerId?: string) => {
    const targetTimerId = timerId || primaryTimerId;
    if (!targetTimerId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/timers/${targetTimerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "resume" }),
      });

      if (response.ok) {
        await refreshAllActiveTimers();
      }
    } catch (error) {
      console.error("Error resuming timer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopTimer = async (timerId?: string) => {
    const targetTimerId = timerId || primaryTimerId;
    if (!targetTimerId) return null;
    
    setIsLoading(true);
    let result = null;
    
    try {
      const response = await fetch(`/api/timers/${targetTimerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "stop" }),
      });

      if (response.ok) {
        const stoppedTimer = await response.json();
        const minutes = Math.round((stoppedTimer.pausedTime || 0) / 60);
        
        result = {
          minutes,
          ticketId: stoppedTimer.ticketId,
          timerId: stoppedTimer.id,
        };

        // Refresh all timers to update state
        await refreshAllActiveTimers();
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
    } finally {
      setIsLoading(false);
    }
    
    return result;
  };

  const deleteTimer = async (timerId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/timers/${timerId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh all timers
        await refreshAllActiveTimers();
      }
    } catch (error) {
      console.error("Error deleting timer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchToPrimaryTimer = (timerId: string) => {
    const timer = activeTimers.find(t => t.id === timerId);
    if (timer) {
      setPrimaryTimerId(timerId);
      setActiveTimer(timer);
      setIsTimerRunning(timer.isRunning);
      setTimerSeconds(timer.totalSeconds || 0);
      setCurrentTicketId(timer.ticketId);
      setCurrentTicketTitle(timer.ticket.title);
    }
  };

  const getTimerForTicket = (ticketId: string): Timer | null => {
    return activeTimers.find(timer => timer.ticketId === ticketId) || null;
  };

  const value: TimeTrackingContextType = {
    isTimerRunning,
    timerSeconds,
    currentTicketId,
    currentTicketTitle,
    activeTimer,
    isLoading,
    activeTimers,
    primaryTimerId,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    deleteTimer,
    switchToPrimaryTimer,
    refreshActiveTimer,
    refreshAllActiveTimers,
    formatTime,
    getTimerForTicket,
  };

  return (
    <TimeTrackingContext.Provider value={value}>
      {children}
    </TimeTrackingContext.Provider>
  );
}

export function useTimeTracking() {
  const context = useContext(TimeTrackingContext);
  if (!context) {
    throw new Error("useTimeTracking must be used within a TimeTrackingProvider");
  }
  return context;
}