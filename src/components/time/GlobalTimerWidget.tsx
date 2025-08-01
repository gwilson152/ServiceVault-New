"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTimeTracking } from "./TimeTrackingProvider";
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Minimize2,
  Plus
} from "lucide-react";

export function GlobalTimerWidget() {
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
    refreshActiveTimer: _refreshActiveTimer
  } = useTimeTracking();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  
  // Time entry form state
  const [description, setDescription] = useState("");
  const [noCharge, setNoCharge] = useState(false);
  const [selectedBillingRate, setSelectedBillingRate] = useState<string>("none");
  const [billingRates, setBillingRates] = useState<Array<{id: string; name: string; rate: number; description?: string}>>([]);
  const [timerData, setTimerData] = useState<{ minutes: number; ticketId: string; timerId: string } | null>(null);

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

  // Don't show widget if no timer is active
  if (!currentTicketId || !activeTimer) {
    return null;
  }

  const handleStopTimer = async () => {
    try {
      const result = await stopTimer();
      if (result) {
        setTimerData(result);
        setIsLogModalOpen(true);
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
      alert("Failed to stop timer");
    }
  };

  const handleLogTime = async () => {
    if (!timerData || !description.trim()) return;

    setIsLoggingTime(true);
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: timerData.ticketId,
          minutes: timerData.minutes,
          description: description.trim(),
          date: new Date().toISOString().split('T')[0],
          noCharge,
          billingRateId: selectedBillingRate === "none" ? null : selectedBillingRate
        }),
      });

      if (response.ok) {
        // Reset form and close modal
        setDescription("");
        setNoCharge(false);
        setSelectedBillingRate("none");
        setTimerData(null);
        setIsLogModalOpen(false);
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
    setIsLogModalOpen(false);
    setTimerData(null);
    setDescription("");
    setNoCharge(false);
    setSelectedBillingRate("none");
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
          {formatTime(timerSeconds)}
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
                <div className="text-2xl font-mono font-bold text-blue-600">
                  {formatTime(timerSeconds)}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {currentTicketTitle}
                </div>
                <Badge variant="outline" className="text-xs mt-1">
                  {currentTicketId}
                </Badge>
              </div>

              {/* Timer Controls */}
              <div className="flex gap-2">
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
      <Dialog open={isLogModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Time Entry</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {timerData ? `${timerData.minutes}m` : '0m'}
              </div>
              <div className="text-sm text-muted-foreground">
                Time tracked for {currentTicketTitle}
              </div>
              <Badge variant="outline" className="text-xs mt-1">
                {currentTicketId}
              </Badge>
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
                disabled={!description.trim() || isLoggingTime}
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