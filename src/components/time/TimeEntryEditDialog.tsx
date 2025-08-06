"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketSelector } from "@/components/selectors/ticket-selector";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AccountSelector } from "@/components/selectors/account-selector";
import { BillingRateSelector } from "@/components/selectors/billing-rate-selector";
import { usePermissions } from "@/hooks/usePermissions";
import { formatMinutes } from "@/lib/time-utils";
import { Lock, FileText, Building, DollarSign, AlertTriangle } from "lucide-react";

interface TimeEntry {
  id: string;
  ticketId?: string;
  accountId?: string;
  description: string;
  minutes: number;
  date: string;
  noCharge: boolean;
  billingRateId?: string;
  billingRateName?: string;
  billingRateValue?: number;
  isApproved: boolean;
  userId: string;
  user: { id: string; name: string; email: string };
  ticket?: { id: string; title: string; account: { id: string; name: string } };
  account?: { id: string; name: string };
  invoiceItems?: Array<{ invoice: { id: string; status: string; invoiceNumber: string } }>;
}

interface TimeEntryEditDialogProps {
  timeEntry?: TimeEntry | null; // Optional - if null/undefined, dialog is in create mode
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TimeEntryEditDialog({ timeEntry, open, onOpenChange, onSuccess }: TimeEntryEditDialogProps) {
  const { data: session } = useSession();
  const { canViewBilling, canEditTimeEntries, canCreateTimeEntries, isSuperAdmin } = usePermissions();
  
  // Calculate permissions for the single time entry (or create mode)
  const getTimeEntryPermissions = (entry: TimeEntry | null) => {
    if (!session?.user?.id) {
      return { canEdit: false, canDelete: false, isLocked: false, getLockReason: () => null };
    }
    
    // If no entry provided, this is create mode
    if (!entry) {
      return { 
        canEdit: canCreateTimeEntries, 
        canDelete: false, 
        isLocked: false, 
        getLockReason: () => null 
      };
    }
    
    const isOwner = entry.userId === session.user.id;
    const isLocked = !!(entry.invoiceItems && entry.invoiceItems.length > 0);
    const isApproved = entry.isApproved;
    
    const getLockReason = () => {
      if (!isLocked) return null;
      const invoice = entry.invoiceItems?.[0]?.invoice;
      if (invoice) {
        return `This time entry is part of Invoice #${invoice.invoiceNumber} (${invoice.status}) and cannot be modified.`;
      }
      return "This time entry is associated with an invoice and cannot be modified.";
    };
    
    let canEdit = false;
    let canDelete = false;
    
    if (!isLocked) {
      if (isSuperAdmin) {
        canEdit = true;
        canDelete = true;
      } else {
        if (!isApproved) {
          canEdit = canEditTimeEntries || (isOwner && canEditTimeEntries);
        }
        canDelete = canEditTimeEntries || (isOwner && canEditTimeEntries);
      }
    }
    
    return { canEdit, canDelete, isLocked, getLockReason };
  };
  
  const { canEdit, canDelete, isLocked, getLockReason } = getTimeEntryPermissions(timeEntry);
  
  // Form state
  const [entryType, setEntryType] = useState<"ticket" | "account">("ticket");
  const [selectedTicket, setSelectedTicket] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [noCharge, setNoCharge] = useState(false);
  const [selectedBillingRate, setSelectedBillingRate] = useState<string>("none");
  
  // Data state
  const [accounts, setAccounts] = useState<Array<{id: string; name: string; accountType: string; parentAccountId?: string | null}>>([]);
  const [billingRates, setBillingRates] = useState<Array<{id: string; name: string; rate: number; description?: string}>>([]);
  const [tickets, setTickets] = useState<Array<{id: string; ticketNumber: string; title: string; account: {id: string; name: string}}>>([]);
  
  // Permission state
  const [showBillingRates, setShowBillingRates] = useState(false);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Set billing rates visibility based on permissions
  useEffect(() => {
    setShowBillingRates(canViewBilling);
  }, [canViewBilling]);

  // Initialize form with timeEntry data or defaults for create mode
  useEffect(() => {
    if (open) {
      if (timeEntry) {
        // Edit mode - populate with existing data
        setEntryType(timeEntry.ticketId ? "ticket" : "account");
        setSelectedTicket(timeEntry.ticketId || "");
        setSelectedAccount(timeEntry.accountId || "");
        setMinutes(timeEntry.minutes.toString());
        setDescription(timeEntry.description);
        
        // Parse date and time from timeEntry.date
        const entryDate = new Date(timeEntry.date);
        setDate(entryDate.toISOString().split('T')[0]);
        setTime(entryDate.toTimeString().slice(0, 5));
        
        setNoCharge(timeEntry.noCharge);
        setSelectedBillingRate(timeEntry.billingRateId || "none");
      } else {
        // Create mode - set defaults
        setEntryType("ticket");
        setSelectedTicket("");
        setSelectedAccount("");
        setMinutes("");
        setDescription("");
        setDate(new Date().toISOString().split('T')[0]);
        setTime(new Date().toTimeString().slice(0, 5));
        setNoCharge(false);
        setSelectedBillingRate("none");
      }
    }
  }, [timeEntry, open]);

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      fetchAccounts();
      fetchBillingRates();
      fetchTickets();
    }
  }, [open]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts?limit=100');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

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

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/tickets?limit=100');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      return;
    }

    // Validation
    if (!minutes || !description.trim() || !date || !time) {
      alert("Please fill in all required fields (minutes, description, date, and time)");
      return;
    }

    if ((entryType === "ticket" && !selectedTicket) || (entryType === "account" && !selectedAccount)) {
      alert("Please select a ticket or account");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ticketId: entryType === "ticket" ? selectedTicket : null,
        accountId: entryType === "account" ? selectedAccount : null,
        minutes: parseInt(minutes),
        description: description.trim(),
        date,
        time,
        noCharge,
        billingRateId: selectedBillingRate === "none" ? null : selectedBillingRate
      };

      let response;
      if (timeEntry) {
        // Edit mode - update existing entry
        response = await fetch(`/api/time-entries/${timeEntry.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        // Create mode - create new entry
        const endpoint = entryType === "ticket" 
          ? `/api/tickets/${selectedTicket}/time-entries`
          : `/api/accounts/${selectedAccount}/time-entries`;
        
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        onSuccess?.();
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        const action = timeEntry ? "update" : "create";
        alert(`Failed to ${action} time entry: ${errorData.error}`);
      }
    } catch (error) {
      const action = timeEntry ? "updating" : "creating";
      console.error(`Error ${action} time entry:`, error);
      alert(`Failed to ${action.slice(0, -3)} time entry`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!timeEntry || !canDelete) {
      return;
    }

    if (!confirm("Are you sure you want to delete this time entry? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/time-entries/${timeEntry.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onSuccess?.();
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        alert("Failed to delete time entry: " + errorData.error);
      }
    } catch (error) {
      console.error("Error deleting time entry:", error);
      alert("Failed to delete time entry");
    } finally {
      setIsDeleting(false);
    }
  };


  const isReadOnly = isLocked || !canEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLocked && <Lock className="h-4 w-4 text-red-500" />}
            {timeEntry ? "Edit Time Entry" : "Add New Time Entry"}
            {timeEntry?.isApproved && (
              <Badge variant="secondary" className="text-green-700 bg-green-50">
                Approved
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isLocked ? (
              <span className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>
                  <span className="text-red-700 font-medium block">Entry Locked</span>
                  <span className="text-red-600 text-sm">{getLockReason()}</span>
                </span>
              </span>
            ) : !canEdit ? (
              <span className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>
                  <span className="text-yellow-700 font-medium block">
                    {timeEntry ? "Cannot Edit" : "Cannot Create"}
                  </span>
                  <span className="text-yellow-600 text-sm">
                    You do not have permission to {timeEntry ? "edit this time entry" : "create time entries"}.
                  </span>
                </span>
              </span>
            ) : (
              timeEntry 
                ? "Modify the time entry details below. All fields marked with * are required."
                : "Create a new time entry by filling in the details below. All fields marked with * are required."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Entry Type Selection */}
          <div className="space-y-3">
            <Label>Time Entry Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  entryType === "ticket"
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-border'
                } ${isReadOnly ? 'opacity-50' : ''}`}
                onClick={() => !isReadOnly && setEntryType("ticket")}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium text-sm">Ticket</span>
                </div>
                <p className="text-xs text-muted-foreground">Log time against a specific ticket</p>
              </div>
              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  entryType === "account"
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-border'
                } ${isReadOnly ? 'opacity-50' : ''}`}
                onClick={() => !isReadOnly && setEntryType("account")}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Building className="h-4 w-4" />
                  <span className="font-medium text-sm">Account</span>
                </div>
                <p className="text-xs text-muted-foreground">Log time directly to an account</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entryType === "ticket" ? (
              <div className="space-y-2">
                <Label htmlFor="ticket-select">Ticket *</Label>
                <TicketSelector
                  tickets={tickets}
                  value={selectedTicket}
                  onValueChange={setSelectedTicket}
                  placeholder="Select a ticket"
                  enableFilters={true}
                  enableGrouping={true}
                  disabled={isReadOnly}
                  allowClear={true}
                  showStatusFilter={true}
                  showPriorityFilter={true}
                  showAccountFilter={true}
                  showAssigneeFilter={true}
                  showCustomerFilter={false} // Hide customer filter in time entry context
                  showTimeTrackingFilter={true}
                  showCreatedDateFilter={false} // Hide creation date in time entry context
                  showSubtitle={true}
                  showTimeInfo={true}
                  maxHeight="300px"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="account-select">Account *</Label>
                <AccountSelector
                  accounts={accounts}
                  value={selectedAccount}
                  onValueChange={setSelectedAccount}
                  placeholder="Select an account"
                  enableFilters={true}
                  enableGrouping={true}
                  disabled={isReadOnly}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="minutes-input">Minutes *</Label>
              <Input
                id="minutes-input"
                type="number"
                step="15"
                min="0"
                max="1440"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="120"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-input">Date *</Label>
              <Input
                id="date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-input">Start Time *</Label>
              <Input
                id="time-input"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={isReadOnly}
              />
              <p className="text-xs text-muted-foreground">
                What time did you start working?
              </p>
            </div>

            {/* Billing Rate - Only visible to users with BILLING.VIEW permission */}
            {showBillingRates && (
              <div className="space-y-2">
                <Label htmlFor="billing-rate">Billing Rate</Label>
                <BillingRateSelector
                  accountId={entryType === "account" ? selectedAccount : tickets.find(t => t.id === selectedTicket)?.account?.id || timeEntry?.account?.id || ""}
                  value={selectedBillingRate === "none" ? "" : selectedBillingRate}
                  onValueChange={(value) => setSelectedBillingRate(value || "none")}
                  placeholder="Select billing rate (optional)"
                  showNoChargeOption={false}
                  disabled={isReadOnly}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="no-charge"
                checked={noCharge}
                onCheckedChange={setNoCharge}
                disabled={isReadOnly}
              />
              <Label htmlFor="no-charge">No Charge</Label>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <Label htmlFor="description-input">Description *</Label>
            <Textarea
              id="description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work performed..."
              className="min-h-[100px]"
              required
              disabled={isReadOnly}
            />
          </div>

          {/* Current Entry Info - Only show in edit mode */}
          {timeEntry && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <h4 className="font-medium text-sm">Current Entry Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <p className="font-medium">{formatMinutes(timeEntry.minutes)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created by:</span>
                  <p className="font-medium">{timeEntry.user.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-medium">
                    {timeEntry.isApproved ? (
                      <Badge variant="secondary" className="text-green-700 bg-green-50">Approved</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </p>
                </div>
                {showBillingRates && timeEntry.billingRateValue && (
                  <div>
                    <span className="text-muted-foreground">Billing:</span>
                    <p className="font-medium">${((timeEntry.minutes / 60) * timeEntry.billingRateValue).toFixed(2)}</p>
                  </div>
                )}
              </div>
              
              {/* Invoice Information */}
              {timeEntry.invoiceItems && timeEntry.invoiceItems.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <span className="text-muted-foreground text-sm">Invoice:</span>
                  <p className="font-medium text-sm">
                    #{timeEntry.invoiceItems[0].invoice.invoiceNumber} 
                    <Badge variant="outline" className="ml-2">
                      {timeEntry.invoiceItems[0].invoice.status}
                    </Badge>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          {canDelete && !isLocked && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          )}
          
          {canEdit && !isReadOnly && (
            <Button 
              onClick={handleSave}
              disabled={isLoading || !minutes || !description.trim() || !date || !time}
            >
              {isLoading ? (timeEntry ? "Saving..." : "Creating...") : (timeEntry ? "Save Changes" : "Create Entry")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}