"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, User, Calendar, DollarSign, Loader2, Building2 } from "lucide-react";
import { formatMinutes } from "@/lib/time-utils";

interface TimeEntry {
  id: string;
  date: string;
  minutes: number;
  description: string;
  user: {
    id: string;
    name: string;
  };
  ticket?: {
    id: string;
    title: string;
    ticketNumber: string;
  };
  billingRate?: {
    id: string;
    name: string;
    rate: number;
  } | null;
  estimatedAmount: number;
}

interface AddTimeEntriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  onSuccess: () => void;
}

export function AddTimeEntriesDialog({ 
  open, 
  onOpenChange, 
  invoiceId, 
  onSuccess 
}: AddTimeEntriesDialogProps) {
  const [availableTimeEntries, setAvailableTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedTimeEntries, setSelectedTimeEntries] = useState<string[]>([]);
  const [includeSubsidiaries, setIncludeSubsidiaries] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchAvailableTimeEntries();
    } else {
      // Reset state when dialog closes
      setSelectedTimeEntries([]);
      setIncludeSubsidiaries(false);
      setError(null);
    }
  }, [open, invoiceId]);

  useEffect(() => {
    if (open) {
      fetchAvailableTimeEntries();
    }
  }, [includeSubsidiaries]);

  const fetchAvailableTimeEntries = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = `/api/invoices/${invoiceId}/available-items${includeSubsidiaries ? '?includeSubsidiaries=true' : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAvailableTimeEntries(data.timeEntries || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load available time entries");
      }
    } catch (err) {
      console.error('Failed to fetch available time entries:', err);
      setError("Failed to load available time entries");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeEntryToggle = (timeEntryId: string) => {
    setSelectedTimeEntries(prev => 
      prev.includes(timeEntryId)
        ? prev.filter(id => id !== timeEntryId)
        : [...prev, timeEntryId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTimeEntries.length === availableTimeEntries.length) {
      setSelectedTimeEntries([]);
    } else {
      setSelectedTimeEntries(availableTimeEntries.map(entry => entry.id));
    }
  };

  const handleAddTimeEntries = async () => {
    if (selectedTimeEntries.length === 0) {
      setError("Please select at least one time entry to add");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeEntryIds: selectedTimeEntries,
          addonIds: []
        }),
      });

      if (response.ok) {
        onSuccess();
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to add time entries");
      }
    } catch (err) {
      console.error('Failed to add time entries:', err);
      setError("Failed to add time entries");
    } finally {
      setIsSaving(false);
    }
  };

  const getTotalAmount = () => {
    return availableTimeEntries
      .filter(entry => selectedTimeEntries.includes(entry.id))
      .reduce((sum, entry) => sum + (entry.estimatedAmount || 0), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Time Entries to Invoice</DialogTitle>
          <DialogDescription>
            Select unbilled time entries to add to this invoice. Only approved time entries are shown.
          </DialogDescription>
        </DialogHeader>

        {/* Include Subsidiaries Toggle */}
        <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="include-subsidiaries" className="text-sm font-medium">
            Include subsidiary companies
          </Label>
          <Switch
            id="include-subsidiaries"
            checked={includeSubsidiaries}
            onCheckedChange={setIncludeSubsidiaries}
          />
          <span className="text-xs text-muted-foreground">
            {includeSubsidiaries ? "Showing all companies" : "Current company only"}
          </span>
        </div>

        <div className="flex-1 overflow-auto p-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading available time entries...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAvailableTimeEntries}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          ) : availableTimeEntries.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Available Time Entries</h3>
              <p>All approved time entries for this account have already been invoiced.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header with select all */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedTimeEntries.length === availableTimeEntries.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium">
                    Select All ({availableTimeEntries.length} entries)
                  </label>
                </div>
                {selectedTimeEntries.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {selectedTimeEntries.length} selected • Total: ${getTotalAmount().toLocaleString()}
                  </div>
                )}
              </div>

              {/* Time entry list */}
              <div className="space-y-3">
                {availableTimeEntries.map((entry) => (
                  <Card 
                    key={entry.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedTimeEntries.includes(entry.id) 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleTimeEntryToggle(entry.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedTimeEntries.includes(entry.id)}
                          onCheckedChange={() => handleTimeEntryToggle(entry.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {entry.ticket && (
                                <Badge variant="outline" className="text-xs">
                                  {entry.ticket.ticketNumber}
                                </Badge>
                              )}
                              <span className="font-medium">
                                {entry.ticket?.title || "No Ticket"}
                              </span>
                            </div>
                            <div className="text-lg font-bold text-green-600">
                              ${(entry.estimatedAmount || 0).toLocaleString()}
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {entry.description}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(entry.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {entry.user.name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatMinutes(entry.minutes || 0)}
                            </div>
                            {entry.billingRate && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {entry.billingRate.name} (${entry.billingRate.rate || 0}/hr)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedTimeEntries.length > 0 && (
              <span>
                {selectedTimeEntries.length} time {selectedTimeEntries.length === 1 ? 'entry' : 'entries'} selected
                • Total: ${getTotalAmount().toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddTimeEntries} 
              disabled={selectedTimeEntries.length === 0 || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${selectedTimeEntries.length} Time ${selectedTimeEntries.length === 1 ? 'Entry' : 'Entries'}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}