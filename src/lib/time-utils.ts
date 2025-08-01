/**
 * Time utility functions for converting between different time units
 * and formatting time displays
 */

/**
 * Convert minutes to a readable format
 * @param minutes - Number of minutes
 * @returns Formatted string like "2h 30m" or "45m"
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 0) return "0m";
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Convert minutes to decimal hours for billing calculations
 * @param minutes - Number of minutes
 * @returns Decimal hours (e.g., 150 minutes = 2.5 hours)
 */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert decimal hours to minutes
 * @param hours - Decimal hours
 * @returns Number of minutes
 */
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

/**
 * Convert seconds to minutes (for timer integration)
 * @param seconds - Number of seconds
 * @returns Number of minutes (rounded)
 */
export function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

/**
 * Convert minutes to seconds (for timer integration)
 * @param minutes - Number of minutes
 * @returns Number of seconds
 */
export function minutesToSeconds(minutes: number): number {
  return minutes * 60;
}

/**
 * Format time for timer display (HH:MM:SS)
 * @param seconds - Number of seconds
 * @returns Formatted string like "02:30:45"
 */
export function formatTimerSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse user input for minutes (supports various formats)
 * @param input - User input string (e.g., "2h 30m", "150", "2.5h")
 * @returns Number of minutes, or null if invalid
 */
export function parseTimeInput(input: string): number | null {
  if (!input || typeof input !== 'string') return null;
  
  const trimmed = input.trim().toLowerCase();
  
  // Handle pure number (assume minutes)
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const minutes = parseFloat(trimmed);
    return minutes > 0 ? Math.round(minutes) : null;
  }
  
  // Handle "2h 30m" format
  const hourMinuteMatch = trimmed.match(/^(\d+(?:\.\d+)?)h\s*(\d+(?:\.\d+)?)m$/);
  if (hourMinuteMatch) {
    const hours = parseFloat(hourMinuteMatch[1]);
    const mins = parseFloat(hourMinuteMatch[2]);
    return Math.round(hours * 60 + mins);
  }
  
  // Handle "2h" format (hours only)
  const hoursOnlyMatch = trimmed.match(/^(\d+(?:\.\d+)?)h$/);
  if (hoursOnlyMatch) {
    const hours = parseFloat(hoursOnlyMatch[1]);
    return Math.round(hours * 60);
  }
  
  // Handle "30m" format (minutes only)
  const minutesOnlyMatch = trimmed.match(/^(\d+(?:\.\d+)?)m$/);
  if (minutesOnlyMatch) {
    const minutes = parseFloat(minutesOnlyMatch[1]);
    return Math.round(minutes);
  }
  
  // Handle decimal hours (e.g., "2.5")
  const decimalHours = parseFloat(trimmed);
  if (!isNaN(decimalHours) && decimalHours > 0) {
    return Math.round(decimalHours * 60);
  }
  
  return null;
}

/**
 * Validate minutes input
 * @param minutes - Number of minutes
 * @returns True if valid, false otherwise
 */
export function isValidMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes > 0 && minutes <= 1440; // Max 24 hours
}

/**
 * Get common time increments in minutes
 * @returns Array of common time values for quick selection
 */
export function getCommonTimeIncrements(): Array<{ value: number; label: string }> {
  return [
    { value: 15, label: "15m" },
    { value: 30, label: "30m" },
    { value: 45, label: "45m" },
    { value: 60, label: "1h" },
    { value: 90, label: "1h 30m" },
    { value: 120, label: "2h" },
    { value: 150, label: "2h 30m" },
    { value: 180, label: "3h" },
    { value: 240, label: "4h" },
    { value: 480, label: "8h" }
  ];
}

/**
 * Calculate total time for multiple time entries
 * @param timeEntries - Array of objects with minutes property
 * @returns Total minutes
 */
export function calculateTotalMinutes(timeEntries: Array<{ minutes: number }>): number {
  return timeEntries.reduce((total, entry) => total + entry.minutes, 0);
}

/**
 * Group time entries by date and calculate daily totals
 * @param timeEntries - Array of time entries with date and minutes
 * @returns Object with date keys and total minutes values
 */
export function groupTimeByDate(timeEntries: Array<{ date: string | Date; minutes: number }>): Record<string, number> {
  return timeEntries.reduce((groups, entry) => {
    const dateKey = typeof entry.date === 'string' 
      ? entry.date.split('T')[0] 
      : entry.date.toISOString().split('T')[0];
    
    groups[dateKey] = (groups[dateKey] || 0) + entry.minutes;
    return groups;
  }, {} as Record<string, number>);
}