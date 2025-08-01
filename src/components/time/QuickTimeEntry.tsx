"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Clock, 
  Plus, 
  Play,
  Square
} from "lucide-react";
import { useTimeTracking } from "./TimeTrackingProvider";

interface QuickTimeEntryProps {
  ticketId: string;
  ticketTitle: string;
  onTimeLogged?: () => void;
}

export function QuickTimeEntry({ ticketId, ticketTitle, onTimeLogged }: QuickTimeEntryProps) {
  const { startTimer, stopTimer, getTimerForTicket } = useTimeTracking();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  
  // Form state
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [noCharge, setNoCharge] = useState(false);
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [workTime, setWorkTime] = useState(new Date().toTimeString().slice(0, 5));

  const activeTimer = getTimerForTicket(ticketId);
  const hasActiveTimer = !!activeTimer;

  const handleStartTimer = async () => {
    try {
      await startTimer(ticketId, ticketTitle);
      onTimeLogged?.(); // Refresh to show updated timer state
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleStopTimer = async () => {
    try {
      const result = await stopTimer();
      if (result) {
        onTimeLogged?.(); // Refresh to show updated timer state
      }
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  const handleQuickTimeEntry = () => {
    setIsModalOpen(true);
  };

  const handleLogTime = async () => {
    if (!minutes || !description.trim()) return;

    setIsLogging(true);
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          minutes: parseInt(minutes),
          description: description.trim(),
          date: workDate,
          time: workTime,
          noCharge
        }),
      });

      if (response.ok) {
        // Reset form and close modal
        setMinutes("");
        setDescription("");
        setNoCharge(false);
        setWorkDate(new Date().toISOString().split('T')[0]);
        setWorkTime(new Date().toTimeString().slice(0, 5));
        setIsModalOpen(false);
        onTimeLogged?.();
      } else {
        const errorData = await response.json();
        console.error("Failed to log time:", errorData.error);
        alert("Failed to log time: " + errorData.error);
      }
    } catch (error) {
      console.error("Error logging time:", error);
      alert("Failed to log time");
    } finally {
      setIsLogging(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setMinutes("");
    setDescription("");
    setNoCharge(false);
    setWorkDate(new Date().toISOString().split('T')[0]);
    setWorkTime(new Date().toTimeString().slice(0, 5));
  };

  return (
    <>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={hasActiveTimer ? handleStopTimer : handleStartTimer}
          disabled={false}
          title={hasActiveTimer ? "Stop timer and log time" : "Start timer"}
          className={hasActiveTimer ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
        >
          {hasActiveTimer ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleQuickTimeEntry}
          title="Log time"
        >
          <Clock className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Time Entry Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Time Entry with Date & Time</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <strong>Ticket:</strong> {ticketTitle}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-minutes">Minutes *</Label>
              <Input
                id="quick-minutes"
                type="number"
                step="15"
                min="0"
                max="1440"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="120"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work-date">Date *</Label>
                <Input
                  id="work-date"
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
                <div className="text-xs text-muted-foreground">
                  When was this work performed?
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="work-time">Start Time *</Label>
                <Input
                  id="work-time"
                  type="time"
                  value={workTime}
                  onChange={(e) => setWorkTime(e.target.value)}
                  required
                />
                <div className="text-xs text-muted-foreground">
                  What time did you start working?
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-description">Description *</Label>
              <Textarea
                id="quick-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the work performed..."
                rows={3}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="quick-no-charge"
                checked={noCharge}
                onCheckedChange={setNoCharge}
              />
              <Label htmlFor="quick-no-charge">No Charge</Label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCloseModal}
                className="flex-1"
                disabled={isLogging}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogTime}
                disabled={!minutes || !description.trim() || isLogging}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                {isLogging ? "Logging..." : "Log Time"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}