"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  ChevronUp,
  ChevronDown,
  Plus
} from "lucide-react";

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
    ticketNumber: string;
    account: {
      id: string;
      name: string;
    };
  };
  totalSeconds?: number;
  currentElapsed?: number;
}

interface TimerCardProps {
  timer: Timer;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onPause: (timerId: string) => Promise<void>;
  onResume: (timerId: string) => Promise<void>;
  onStop: (timerId: string) => Promise<{ minutes: number; ticketId: string; timerId: string } | null>;
  formatTime: (seconds: number) => string;
  onTimeLogged?: () => void;
  pendingStopResult?: { minutes: number; ticketId: string; timerId: string } | null;
  onStopResultConsumed?: () => void;
}

export function TimerCard({
  timer,
  isExpanded,
  onToggleExpanded,
  onPause,
  onResume,
  onStop,
  formatTime,
  onTimeLogged,
  pendingStopResult,
  onStopResultConsumed
}: TimerCardProps) {
  const [timerSeconds, setTimerSeconds] = useState(timer.totalSeconds || 0);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  
  // Time entry form state
  const [description, setDescription] = useState("");
  const [noCharge, setNoCharge] = useState(false);
  const [selectedBillingRate, setSelectedBillingRate] = useState<string>("none");
  const [billingRates, setBillingRates] = useState<Array<{id: string; name: string; rate: number; description?: string}>>([]);
  const [timerData, setTimerData] = useState<{ minutes: number; ticketId: string; timerId: string } | null>(null);
  const [editableMinutes, setEditableMinutes] = useState<string>("");

  // Update timer seconds when timer data changes
  useEffect(() => {
    setTimerSeconds(timer.totalSeconds || 0);
  }, [timer.totalSeconds]);

  // Handle pending stop result - automatically show log modal
  useEffect(() => {
    if (pendingStopResult) {
      console.log("🔴 [TimerCard] Received pending stop result, showing modal:", pendingStopResult);
      setTimerData(pendingStopResult);
      setEditableMinutes(pendingStopResult.minutes.toString());
      setIsLogModalOpen(true);
      // Consume the pending result
      onStopResultConsumed?.();
    }
  }, [pendingStopResult, onStopResultConsumed]);

  // Timer effect - updates UI timer every second for running timers
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer.isRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer.isRunning]);

  // Fetch billing rates when component mounts
  useEffect(() => {
    const fetchBillingRates = async () => {
      try {
        const response = await fetch('/api/billing/rates');
        if (response.ok) {
          const data = await response.json();
          setBillingRates(data || []);
        }
      } catch (error) {
        console.error('Error fetching billing rates:', error);
      }
    };

    fetchBillingRates();
  }, []);

  const handlePauseResume = () => {
    if (timer.isRunning) {
      onPause(timer.id);
    } else {
      onResume(timer.id);
    }
  };

  const handleStopTimer = async () => {
    try {
      const result = await onStop(timer.id);
      if (result) {
        setTimerData(result);
        setEditableMinutes(result.minutes.toString());
        setIsLogModalOpen(true);
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
      alert("Failed to stop timer");
    }
  };

  const handleLogTime = async () => {
    if (!timerData || !description.trim() || !editableMinutes || parseInt(editableMinutes) <= 0) return;

    setIsLoggingTime(true);
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: timerData.ticketId,
          minutes: parseInt(editableMinutes),
          description: description.trim(),
          date: new Date().toISOString().split('T')[0],
          noCharge,
          billingRateId: selectedBillingRate === "none" ? null : selectedBillingRate,
          timerId: timerData.timerId // Include timer ID for deletion after logging
        }),
      });

      if (response.ok) {
        console.log("🔴 [TimerCard] Time logged successfully - calling onTimeLogged callback");
        // Reset form and close modal
        setDescription("");
        setNoCharge(false);
        setSelectedBillingRate("none");
        setTimerData(null);
        setIsLogModalOpen(false);
        // Add small delay to ensure database transaction is fully committed
        setTimeout(() => {
          console.log("🔴 [TimerCard] Triggering onTimeLogged after delay");
          onTimeLogged?.();
        }, 100);
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

  const handleCloseModal = () => {
    console.log("🔴 [TimerCard] Modal closed without logging - refreshing UI state");
    setIsLogModalOpen(false);
    setTimerData(null);
    setDescription("");
    setNoCharge(false);
    setSelectedBillingRate("none");
    setEditableMinutes("");
    
    // Refresh the timer state when modal is dismissed without logging
    // This ensures the UI reflects that the timer has been stopped
    onTimeLogged?.();
  };

  const getCardBorderColor = () => {
    if (isExpanded) return "border-blue-500";
    if (timer.isRunning) return "border-green-500";
    return "border-yellow-500";
  };

  const getStatusBadgeColor = () => {
    if (timer.isRunning) return "bg-green-100 text-green-800 border-green-300";
    return "bg-yellow-100 text-yellow-800 border-yellow-300";
  };

  // Minimized view
  if (!isExpanded) {
    return (
      <>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${getCardBorderColor()} border-2`}
          onClick={onToggleExpanded}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <div>
                  <div className="text-sm font-mono font-semibold">
                    {formatTime(timerSeconds)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {timer.ticket.title}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className={`text-xs ${getStatusBadgeColor()}`}>
                  {timer.isRunning ? "Running" : "Paused"}
                </Badge>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Entry Modal */}
        <Dialog open={isLogModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Log Time Entry</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg space-y-3">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">
                    Time tracked for {timer.ticket.title}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {timer.ticket.ticketNumber}
                  </Badge>
                  {timerData && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Original tracked: {timerData.minutes}m
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editable-minutes">Minutes to Log *</Label>
                  <Input
                    id="editable-minutes"
                    type="number"
                    step="15"
                    min="1"
                    max="1440"
                    value={editableMinutes}
                    onChange={(e) => setEditableMinutes(e.target.value)}
                    placeholder="120"
                    className="text-center font-mono text-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time-description">Description *</Label>
                <Textarea
                  id="time-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the work performed..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing-rate">Billing Rate</Label>
                <Select value={selectedBillingRate} onValueChange={setSelectedBillingRate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing rate (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No billing rate</SelectItem>
                    {billingRates.map(rate => (
                      <SelectItem key={rate.id} value={rate.id}>
                        {rate.name} - ${rate.rate}/hr
                        {rate.description && (
                          <span className="text-muted-foreground ml-1">
                            ({rate.description})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="no-charge"
                  checked={noCharge}
                  onCheckedChange={setNoCharge}
                />
                <Label htmlFor="no-charge">No Charge</Label>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  className="flex-1"
                  disabled={isLoggingTime}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLogTime}
                  disabled={!description.trim() || !editableMinutes || parseInt(editableMinutes) <= 0 || isLoggingTime}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {isLoggingTime ? "Logging..." : "Log Time"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Expanded view
  return (
    <>
      <Card className={`${getCardBorderColor()} border-2 shadow-lg`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Active Timer</span>
                <Badge variant="outline" className={`text-xs ${getStatusBadgeColor()}`}>
                  {timer.isRunning ? "Running" : "Paused"}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpanded}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Timer Display */}
            <div className="text-center">
              <div className={`text-2xl font-mono font-bold ${timer.isRunning ? 'text-green-600' : 'text-yellow-600'}`}>
                {formatTime(timerSeconds)}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {timer.ticket.title}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                {timer.ticket.ticketNumber}
              </Badge>
            </div>

            {/* Timer Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePauseResume}
                className="flex-1"
              >
                {timer.isRunning ? (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </>
                )}
              </Button>
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

      {/* Time Entry Modal */}
      <Dialog open={isLogModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Time Entry</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg space-y-3">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">
                  Time tracked for {timer.ticket.title}
                </div>
                <Badge variant="outline" className="text-xs mt-1">
                  {timer.ticket.ticketNumber}
                </Badge>
                {timerData && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Original tracked: {timerData.minutes}m
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editable-minutes">Minutes to Log *</Label>
                <Input
                  id="editable-minutes"
                  type="number"
                  step="15"
                  min="1"
                  max="1440"
                  value={editableMinutes}
                  onChange={(e) => setEditableMinutes(e.target.value)}
                  placeholder="120"
                  className="text-center font-mono text-lg"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-description">Description *</Label>
              <Textarea
                id="time-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the work performed..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing-rate">Billing Rate</Label>
              <Select value={selectedBillingRate} onValueChange={setSelectedBillingRate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select billing rate (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No billing rate</SelectItem>
                  {billingRates.map(rate => (
                    <SelectItem key={rate.id} value={rate.id}>
                      {rate.name} - ${rate.rate}/hr
                      {rate.description && (
                        <span className="text-muted-foreground ml-1">
                          ({rate.description})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="no-charge"
                checked={noCharge}
                onCheckedChange={setNoCharge}
              />
              <Label htmlFor="no-charge">No Charge</Label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCloseModal}
                className="flex-1"
                disabled={isLoggingTime}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogTime}
                disabled={!description.trim() || !editableMinutes || parseInt(editableMinutes) <= 0 || isLoggingTime}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                {isLoggingTime ? "Logging..." : "Log Time"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}