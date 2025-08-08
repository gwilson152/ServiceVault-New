"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { BillingRateSelector } from "@/components/selectors/billing-rate-selector";
import { Plus, Clock, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LogTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Ticket information
  ticketId: string;
  ticketTitle: string;
  ticketNumber?: string;
  accountId: string;
  
  // Time entry data
  initialMinutes?: number;
  initialDescription?: string;
  
  // Dialog configuration
  mode: 'timer' | 'manual';
  showDateTimePicker?: boolean;
  allowMinuteEdit?: boolean;
  
  // Pre-selected billing rate
  initialBillingRateId?: string;
  
  // Callbacks
  onSubmit: (data: TimeEntryData) => Promise<void>;
  onCancel?: () => void;
  
  // Loading state
  isLoading?: boolean;
}

export interface TimeEntryData {
  ticketId: string;
  minutes: number;
  description: string;
  date: string;
  time?: string;
  noCharge: boolean;
  billingRateId?: string;
}

export function LogTimeEntryDialog({
  open,
  onOpenChange,
  ticketId,
  ticketTitle,
  ticketNumber,
  accountId,
  initialMinutes = 0,
  initialDescription = "",
  mode = 'timer',
  showDateTimePicker = mode === 'manual',
  allowMinuteEdit = true,
  initialBillingRateId = "",
  onSubmit,
  onCancel,
  isLoading = false
}: LogTimeEntryDialogProps) {
  
  // Form state
  const [minutes, setMinutes] = useState<string>("");
  const [description, setDescription] = useState("");
  const [noCharge, setNoCharge] = useState(false);
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [workTime, setWorkTime] = useState(new Date().toTimeString().slice(0, 5));
  const [billingRateId, setBillingRateId] = useState("");

  // Validation state
  const [showValidationWarning, setShowValidationWarning] = useState(false);

  // Initialize form when dialog opens or data changes
  useEffect(() => {
    if (open) {
      setMinutes(initialMinutes > 0 ? initialMinutes.toString() : "");
      setDescription(initialDescription);
      setNoCharge(false);
      setWorkDate(new Date().toISOString().split('T')[0]);
      setWorkTime(new Date().toTimeString().slice(0, 5));
      setBillingRateId(initialBillingRateId);
      setShowValidationWarning(false);
    }
  }, [open, initialMinutes, initialDescription, initialBillingRateId]);

  // Time validation
  useEffect(() => {
    const minutesNum = parseInt(minutes);
    if (minutesNum > 0) {
      // Show warning for very short (< 5 min) or very long (> 8 hours) entries
      const shouldWarn = minutesNum < 5 || minutesNum > 480;
      setShowValidationWarning(shouldWarn);
    } else {
      setShowValidationWarning(false);
    }
  }, [minutes]);

  const getDialogTitle = () => {
    switch (mode) {
      case 'timer':
        return "Log Timer Entry";
      case 'manual':
        return "Log Time Entry";
      default:
        return "Log Time Entry";
    }
  };

  const getMinutesLabel = () => {
    switch (mode) {
      case 'timer':
        return allowMinuteEdit ? "Minutes to Log *" : "Minutes Tracked";
      case 'manual':
        return "Minutes *";
      default:
        return "Minutes *";
    }
  };

  const handleSubmit = async () => {
    if (!minutes || !description.trim() || parseInt(minutes) <= 0) return;

    const timeEntryData: TimeEntryData = {
      ticketId,
      minutes: parseInt(minutes),
      description: description.trim(),
      date: workDate,
      time: showDateTimePicker ? workTime : undefined,
      noCharge,
      billingRateId: billingRateId || undefined
    };

    try {
      await onSubmit(timeEntryData);
    } catch (error) {
      console.error("Error submitting time entry:", error);
    }
  };

  const handleClose = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const isFormValid = minutes && description.trim() && parseInt(minutes) > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Ticket Information */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg space-y-3">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                {mode === 'timer' ? 'Time tracked for' : 'Logging time for'} {ticketTitle}
              </div>
              {ticketNumber && (
                <Badge variant="outline" className="text-xs mt-1">
                  {ticketNumber}
                </Badge>
              )}
              {mode === 'timer' && initialMinutes > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                  Original tracked: {initialMinutes}m
                </div>
              )}
            </div>
            
            {/* Minutes Input */}
            <div className="space-y-2">
              <Label htmlFor="minutes-input">{getMinutesLabel()}</Label>
              <Input
                id="minutes-input"
                type="number"
                step="15"
                min="1"
                max="1440"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="120"
                className="text-center font-mono text-lg"
                disabled={!allowMinuteEdit}
                required
              />
            </div>
          </div>

          {/* Time Validation Warning */}
          {showValidationWarning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {parseInt(minutes) < 5 
                  ? "This seems like a short time entry. Please verify the duration."
                  : "This is a long time entry (>8 hours). Please verify the duration."
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Date and Time Selection */}
          {showDateTimePicker && (
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
                <Label htmlFor="work-time">Start Time</Label>
                <Input
                  id="work-time"
                  type="time"
                  value={workTime}
                  onChange={(e) => setWorkTime(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  What time did you start?
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description-input">Description *</Label>
            <Textarea
              id="description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work performed..."
              rows={3}
              required
            />
          </div>

          {/* Billing Rate Selection */}
          {!noCharge && (
            <BillingRateSelector
              accountId={accountId}
              value={billingRateId}
              onValueChange={setBillingRateId}
              showNoChargeOption={false}
              autoSelectDefault={!initialBillingRateId}
              placeholder="Select billing rate (optional)"
            />
          )}

          {/* No Charge Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="no-charge"
              checked={noCharge}
              onCheckedChange={(checked) => {
                setNoCharge(checked);
                if (checked) setBillingRateId("");
              }}
            />
            <Label htmlFor="no-charge">No Charge</Label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isLoading}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              {isLoading ? "Logging..." : "Log Time"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}