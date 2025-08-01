"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface TimeTrackingContextType {
  // Timer state
  isTimerRunning: boolean;
  timerSeconds: number;
  currentTicketId: string | null;
  currentTicketTitle: string | null;
  
  // Timer actions
  startTimer: (ticketId: string, ticketTitle: string) => void;
  pauseTimer: () => void;
  stopTimer: () => { hours: number; ticketId: string } | null;
  
  // Utility
  formatTime: (seconds: number) => string;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | null>(null);

interface TimeTrackingProviderProps {
  children: ReactNode;
}

export function TimeTrackingProvider({ children }: TimeTrackingProviderProps) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [currentTicketTitle, setCurrentTicketTitle] = useState<string | null>(null);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = (ticketId: string, ticketTitle: string) => {
    // Stop any existing timer first
    if (isTimerRunning) {
      setIsTimerRunning(false);
    }
    
    setCurrentTicketId(ticketId);
    setCurrentTicketTitle(ticketTitle);
    setTimerSeconds(0);
    setIsTimerRunning(true);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    
    let result = null;
    if (timerSeconds > 0 && currentTicketId) {
      const hours = timerSeconds / 3600;
      result = {
        hours,
        ticketId: currentTicketId,
      };
    }
    
    // Reset timer state
    setTimerSeconds(0);
    setCurrentTicketId(null);
    setCurrentTicketTitle(null);
    
    return result;
  };

  const value: TimeTrackingContextType = {
    isTimerRunning,
    timerSeconds,
    currentTicketId,
    currentTicketTitle,
    startTimer,
    pauseTimer,
    stopTimer,
    formatTime,
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