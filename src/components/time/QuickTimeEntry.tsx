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
  Play 
} from "lucide-react";
import { useTimeTracking } from "./TimeTrackingProvider";

interface QuickTimeEntryProps {
  ticketId: string;
  ticketTitle: string;
  onTimeLogged?: () => void;
}

export function QuickTimeEntry({ ticketId, ticketTitle, onTimeLogged }: QuickTimeEntryProps) {
  const { startTimer, isTimerRunning, currentTicketId } = useTimeTracking();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  
  // Form state
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [noCharge, setNoCharge] = useState(false);

  const isCurrentTicket = currentTicketId === ticketId;

  const handleStartTimer = () => {
    startTimer(ticketId, ticketTitle);
  };

  const handleQuickTimeEntry = () => {
    setIsModalOpen(true);
  };

  const handleLogTime = async () => {
    if (!hours || !description.trim()) return;

    setIsLogging(true);
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          hours: parseFloat(hours),
          description: description.trim(),
          date: new Date().toISOString().split('T')[0],
          noCharge
        }),
      });

      if (response.ok) {
        // Reset form and close modal
        setHours("");
        setDescription("");
        setNoCharge(false);
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
    setHours("");
    setDescription("");
    setNoCharge(false);
  };

  return (
    <>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStartTimer}
          disabled={isTimerRunning && !isCurrentTicket}
          title={isCurrentTicket ? "Timer active" : "Start timer"}
          className={isCurrentTicket ? "text-green-600" : ""}
        >
          <Play className="h-4 w-4" />
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
            <DialogTitle>Log Time Entry</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <strong>Ticket:</strong> {ticketId} - {ticketTitle}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-hours">Hours *</Label>
              <Input
                id="quick-hours"
                type="number"
                step="0.25"
                min="0"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="2.5"
                required
              />
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
                disabled={!hours || !description.trim() || isLogging}
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