"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingRateSelector, BillingRate } from "@/components/selectors/billing-rate-selector";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { useTimeTracking } from "./TimeTrackingProvider";
import { LogTimeEntryDialog, TimeEntryData } from "./LogTimeEntryDialog";
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Minimize2,
  DollarSign,
  Settings,
  FileText,
  Trash2,
  Edit3,
  Check,
  X
} from "lucide-react";

export function GlobalTimerWidget() {
  const router = useRouter();
  const {
    isTimerRunning,
    timerSeconds,
    currentTicketId,
    currentTicketTitle,
    activeTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    formatTime,
    refreshAllActiveTimers
  } = useTimeTracking();
  
  const handleDeleteTimer = async () => {
    if (!activeTimer) return;
    
    try {
      const response = await fetch(`/api/timers/${activeTimer.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Clear persisted data for this timer
        if (currentTicketId) {
          localStorage.removeItem(`timer-billing-rate-${currentTicketId}`);
          localStorage.removeItem(`timer-description-${currentTicketId}`);
        }
        // Close the dialog and refresh the timer list
        setShowDeleteDialog(false);
        await refreshAllActiveTimers();
      } else {
        const errorData = await response.json();
        console.error("Failed to delete timer:", errorData.error);
        alert("Failed to delete timer: " + errorData.error);
        setShowDeleteDialog(false);
      }
    } catch (error) {
      console.error("Error deleting timer:", error);
      alert("Failed to delete timer");
      setShowDeleteDialog(false);
    }
  };


  const [isMinimized, setIsMinimized] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [timerData, setTimerData] = useState<{ minutes: number; ticketId: string; timerId: string } | null>(null);
  
  // Billing rate state
  const [selectedBillingRateId, setSelectedBillingRateId] = useState<string>("");
  const [billingRateData, setBillingRateData] = useState<BillingRate | null>(null);
  const [showBillingSettings, setShowBillingSettings] = useState(false);
  
  // Description pre-entry state
  const [preEnteredDescription, setPreEnteredDescription] = useState<string>("");
  
  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Manual time adjustment state
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState("");
  
  // Load persisted billing rate and description for this timer
  useEffect(() => {
    if (currentTicketId) {
      const persistedRate = localStorage.getItem(`timer-billing-rate-${currentTicketId}`);
      if (persistedRate) {
        setSelectedBillingRateId(persistedRate);
      }
      
      const persistedDescription = localStorage.getItem(`timer-description-${currentTicketId}`);
      if (persistedDescription) {
        setPreEnteredDescription(persistedDescription);
      } else {
        setPreEnteredDescription("");
      }
    }
  }, [currentTicketId]);

  // Persist billing rate selection
  const handleBillingRateChange = (rateId: string) => {
    setSelectedBillingRateId(rateId);
    if (currentTicketId) {
      if (rateId) {
        localStorage.setItem(`timer-billing-rate-${currentTicketId}`, rateId);
      } else {
        localStorage.removeItem(`timer-billing-rate-${currentTicketId}`);
      }
    }
  };

  // Persist description changes
  const handleDescriptionChange = (description: string) => {
    setPreEnteredDescription(description);
    if (currentTicketId) {
      if (description.trim()) {
        localStorage.setItem(`timer-description-${currentTicketId}`, description);
      } else {
        localStorage.removeItem(`timer-description-${currentTicketId}`);
      }
    }
  };
  
  // Fetch billing rate data when rate is selected
  useEffect(() => {
    const fetchBillingRateData = async () => {
      if (selectedBillingRateId && activeTimer?.ticket?.account?.id) {
        try {
          const response = await fetch(`/api/accounts/${activeTimer.ticket.account.id}/billing-rates`);
          if (response.ok) {
            const data = await response.json();
            const rates = data.billingRates || [];
            const selectedRate = rates.find((rate: BillingRate) => rate.id === selectedBillingRateId);
            setBillingRateData(selectedRate || null);
          }
        } catch (error) {
          console.error('Error fetching billing rate data:', error);
        }
      } else {
        setBillingRateData(null);
      }
    };
    
    fetchBillingRateData();
  }, [selectedBillingRateId, activeTimer?.ticket?.account?.id]);
  
  // Calculate running dollar amount
  const calculateRunningAmount = () => {
    if (!billingRateData || !timerSeconds) return 0;
    const hours = timerSeconds / 3600; // Convert seconds to hours
    return hours * billingRateData.effectiveRate;
  };

  // Convert seconds to HH:MM:SS format for editing
  const formatTimeForEdit = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse HH:MM:SS format to seconds
  const parseTimeToSeconds = (timeString: string) => {
    const parts = timeString.split(':');
    if (parts.length !== 3) return null;
    
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseInt(parts[2]);
    
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || 
        hours < 0 || minutes < 0 || minutes >= 60 || 
        seconds < 0 || seconds >= 60) {
      return null;
    }
    
    return hours * 3600 + minutes * 60 + seconds;
  };

  const handleStartTimeEdit = () => {
    setEditTimeValue(formatTimeForEdit(timerSeconds));
    setIsEditingTime(true);
  };

  const handleSaveTimeEdit = async () => {
    const newSeconds = parseTimeToSeconds(editTimeValue);
    if (newSeconds === null) {
      alert("Invalid time format. Please use HH:MM:SS format.");
      return;
    }

    try {
      const response = await fetch(`/api/timers/${activeTimer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pausedTime: newSeconds
        }),
      });

      if (response.ok) {
        // Refresh the timer data
        await refreshAllActiveTimers();
        setIsEditingTime(false);
      } else {
        const errorData = await response.json();
        alert("Failed to update timer: " + errorData.error);
      }
    } catch (error) {
      console.error("Error updating timer:", error);
      alert("Failed to update timer");
    }
  };

  const handleCancelTimeEdit = () => {
    setIsEditingTime(false);
    setEditTimeValue("");
  };

  // Don't show widget if no timer is active
  if (!currentTicketId || !activeTimer) {
    return null;
  }

  const handleStopTimer = async () => {
    console.log("🔴 [GlobalTimerWidget] handleStopTimer called");
    try {
      console.log("🔴 [GlobalTimerWidget] Calling stopTimer()...");
      const result = await stopTimer();
      console.log("🔴 [GlobalTimerWidget] stopTimer result:", result);
      
      if (result) {
        console.log("🔴 [GlobalTimerWidget] Setting timer data and opening modal");
        setTimerData(result);
        setIsLogModalOpen(true);
        console.log("🔴 [GlobalTimerWidget] Modal state set to true");
      } else {
        console.log("🔴 [GlobalTimerWidget] No result from stopTimer");
      }
    } catch (error) {
      console.error("🔴 [GlobalTimerWidget] Error stopping timer:", error);
      alert("Failed to stop timer");
    }
  };

  const handleLogTime = async (data: TimeEntryData) => {
    if (!timerData) return;

    setIsLoggingTime(true);
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: data.ticketId,
          minutes: data.minutes,
          description: data.description,
          date: data.date,
          time: data.time,
          noCharge: data.noCharge,
          billingRateId: data.billingRateId || null,
          timerId: timerData.timerId // Include timer ID for deletion after logging
        }),
      });

      if (response.ok) {
        // Close modal and reset state
        setTimerData(null);
        setIsLogModalOpen(false);
        // Refresh timers after successful time entry logging
        await refreshAllActiveTimers();
      } else {
        const errorData = await response.json();
        console.error("Failed to log time:", errorData.error);
        alert("Failed to log time: " + errorData.error);
      }
    } catch (error) {
      console.error("Error logging time:", error);
      alert("Failed to log time");
    } finally {
      setIsLoggingTime(false);
    }
  };

  const handleCloseModal = async () => {
    setIsLogModalOpen(false);
    setTimerData(null);
    // Refresh timers when modal is closed (in case user canceled)
    await refreshAllActiveTimers();
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="bg-background shadow-lg border-2"
        >
          <Clock className="h-4 w-4 mr-2" />
          <div className="flex items-center gap-2">
            <span>{formatTime(timerSeconds)}</span>
            {billingRateData && (
              <span className="text-green-600 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {calculateRunningAmount().toFixed(2)}
              </span>
            )}
          </div>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80 shadow-lg border-2">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Active Timer</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Timer Display */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="text-2xl font-mono font-bold text-blue-600">
                    {formatTime(timerSeconds)}
                  </div>
                  {/* Running Dollar Amount */}
                  {billingRateData && (
                    <div className="text-2xl font-semibold text-green-600 flex items-center gap-1">
                      <DollarSign className="h-5 w-5" />
                      {calculateRunningAmount().toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {currentTicketTitle}
                </div>
                <Badge 
                  variant="outline" 
                  className="text-xs mt-1 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors" 
                  onClick={() => {
                    if (currentTicketId) {
                      router.push(`/tickets?search=${encodeURIComponent(currentTicketId)}`);
                    }
                  }}
                  title="Click to view ticket"
                >
                  {currentTicketId}
                </Badge>
                {billingRateData && (
                  <div className="text-xs text-muted-foreground mt-1">
                    @ ${billingRateData.effectiveRate}/hr ({billingRateData.name})
                  </div>
                )}
              </div>

              {/* Timer Settings */}
              {showBillingSettings && (
                <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="space-y-2">
                    <BillingRateSelector
                      accountId={activeTimer?.ticket?.account?.id || ""}
                      value={selectedBillingRateId}
                      onValueChange={handleBillingRateChange}
                      showNoChargeOption={true}
                      autoSelectDefault={!selectedBillingRateId}
                      placeholder="Select billing rate"
                      label="Billing Rate"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Timer Duration
                    </Label>
                    {isEditingTime ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editTimeValue}
                          onChange={(e) => setEditTimeValue(e.target.value)}
                          placeholder="HH:MM:SS"
                          className="text-sm font-mono"
                        />
                        <Button size="sm" onClick={handleSaveTimeEdit} title="Save">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelTimeEdit} title="Cancel">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-2 border rounded text-sm font-mono bg-background">
                          {formatTime(timerSeconds)}
                        </div>
                        <Button size="sm" variant="outline" onClick={handleStartTimeEdit} title="Edit time">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Click edit to manually adjust the timer duration
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timer-description" className="text-sm font-medium">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="timer-description"
                      value={preEnteredDescription}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      placeholder="Pre-enter work description..."
                      className="text-sm"
                      rows={2}
                    />
                    <div className="text-xs text-muted-foreground">
                      This will pre-fill when you stop and log time
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Timer
                    </Button>
                  </div>
                </div>
              )}

              {/* Timer Controls */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBillingSettings(!showBillingSettings)}
                  className="flex-shrink-0"
                  title="Billing settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                {isTimerRunning ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pauseTimer}
                    className="flex-1"
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resumeTimer}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStopTimer}
                  className="flex-1"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop & Log
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Entry Modal */}
      {timerData && activeTimer && (
        <LogTimeEntryDialog
          open={isLogModalOpen}
          onOpenChange={setIsLogModalOpen}
          ticketId={timerData.ticketId}
          ticketTitle={currentTicketTitle}
          ticketNumber={currentTicketId}
          accountId={activeTimer.ticket?.account?.id || ""}
          initialMinutes={timerData.minutes}
          initialDescription={preEnteredDescription}
          initialBillingRateId={selectedBillingRateId}
          mode="timer"
          showDateTimePicker={true}
          allowMinuteEdit={true}
          onSubmit={handleLogTime}
          onCancel={handleCloseModal}
          isLoading={isLoggingTime}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Timer?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this timer? All tracked time will be lost. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTimer}>
              Delete Timer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}