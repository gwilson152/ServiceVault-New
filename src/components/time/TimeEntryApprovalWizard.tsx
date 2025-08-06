"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import { formatMinutes } from "@/lib/time-utils";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  SkipForward, 
  ChevronLeft, 
  ChevronRight, 
  Edit,
  DollarSign,
  Lock,
  FileText,
  Building,
  AlertTriangle
} from "lucide-react";

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
  ticket?: { id: string; title: string; ticketNumber?: string; account: { id: string; name: string } };
  account?: { id: string; name: string };
  invoiceItems?: Array<{ invoice: { id: string; status: string; invoiceNumber: string } }>;
}

interface ApprovalWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type WizardStep = 'loading' | 'review' | 'edit' | 'complete';
type ApprovalAction = 'approve' | 'skip' | 'edit';

export function TimeEntryApprovalWizard({ open, onOpenChange, onSuccess }: ApprovalWizardProps) {
  const { data: session } = useSession();
  const { canApproveTimeEntries, canEditTimeEntries, canViewBilling } = usePermissions();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('loading');
  const [pendingEntries, setPendingEntries] = useState<TimeEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedEntries, setProcessedEntries] = useState<Set<string>>(new Set());
  const [approvedCount, setApprovedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntry, setEditedEntry] = useState<Partial<TimeEntry>>({});
  
  // Data state
  const [billingRates, setBillingRates] = useState<Array<{id: string; name: string; rate: number; description?: string}>>([]);
  const [tickets, setTickets] = useState<Array<{id: string; ticketNumber: string; title: string; account: {id: string; name: string}}>>([]);
  
  // Permission state
  const [canApprove, setCanApprove] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);
  const [showBillingRates, setShowBillingRates] = useState(false);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);

  // Check permissions
  useEffect(() => {
    const checkPermissions = () => {
      setCanApprove(canApproveTimeEntries);
      setCanUpdate(canEditTimeEntries);      
      setShowBillingRates(canViewBilling);
    };
    
    checkPermissions();
  }, [canApproveTimeEntries, canEditTimeEntries, canViewBilling]);

  // Load pending entries when dialog opens
  useEffect(() => {
    if (open && canApprove) {
      loadPendingEntries();
      loadSupportingData();
    }
  }, [open, canApprove]);

  const loadPendingEntries = async () => {
    setCurrentStep('loading');
    try {
      const response = await fetch('/api/time-entries?approved=false&limit=100');
      if (response.ok) {
        const data = await response.json();
        const entries = (data.timeEntries || []).filter((entry: TimeEntry) => 
          !entry.isApproved && 
          (!entry.invoiceItems || entry.invoiceItems.length === 0)
        );
        setPendingEntries(entries);
        setCurrentIndex(0);
        setProcessedEntries(new Set());
        setApprovedCount(0);
        setSkippedCount(0);
        
        if (entries.length > 0) {
          setCurrentStep('review');
        } else {
          setCurrentStep('complete');
        }
      }
    } catch (error) {
      console.error('Error loading pending entries:', error);
    }
  };

  const loadSupportingData = async () => {
    try {
      const [billingResponse, ticketsResponse] = await Promise.all([
        fetch('/api/billing/rates'),
        fetch('/api/tickets?limit=100')
      ]);

      if (billingResponse.ok) {
        const billingData = await billingResponse.json();
        setBillingRates(billingData || []);
      }

      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        setTickets(ticketsData.tickets || []);
      }
    } catch (error) {
      console.error('Error loading supporting data:', error);
    }
  };

  const getCurrentEntry = (): TimeEntry | null => {
    return pendingEntries[currentIndex] || null;
  };

  const getRemainingEntries = (): TimeEntry[] => {
    return pendingEntries.filter((_, index) => index > currentIndex && !processedEntries.has(pendingEntries[index].id));
  };

  const handleApprove = async () => {
    const entry = getCurrentEntry();
    if (!entry || !canApprove) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/time-entries/${entry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (response.ok) {
        setProcessedEntries(prev => new Set(prev).add(entry.id));
        setApprovedCount(prev => prev + 1);
        moveToNext();
      } else {
        const errorData = await response.json();
        alert('Failed to approve entry: ' + errorData.error);
      }
    } catch (error) {
      console.error('Error approving entry:', error);
      alert('Failed to approve entry');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    const entry = getCurrentEntry();
    if (!entry) return;

    setProcessedEntries(prev => new Set(prev).add(entry.id));
    setSkippedCount(prev => prev + 1);
    moveToNext();
  };

  const handleEdit = () => {
    const entry = getCurrentEntry();
    if (!entry || !canUpdate) return;

    setEditedEntry({
      description: entry.description,
      minutes: entry.minutes,
      noCharge: entry.noCharge,
      billingRateId: entry.billingRateId
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    const entry = getCurrentEntry();
    if (!entry || !canUpdate) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/time-entries/${entry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedEntry),
      });

      if (response.ok) {
        // Update the entry in our local state
        const updatedEntries = [...pendingEntries];
        updatedEntries[currentIndex] = { ...entry, ...editedEntry };
        setPendingEntries(updatedEntries);
        
        setIsEditing(false);
        setEditedEntry({});
      } else {
        const errorData = await response.json();
        alert('Failed to update entry: ' + errorData.error);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Failed to update entry');
    } finally {
      setIsProcessing(false);
    }
  };

  const moveToNext = () => {
    const remainingEntries = getRemainingEntries();
    if (remainingEntries.length === 0) {
      setCurrentStep('complete');
    } else {
      // Find next unprocessed entry
      let nextIndex = currentIndex + 1;
      while (nextIndex < pendingEntries.length && processedEntries.has(pendingEntries[nextIndex].id)) {
        nextIndex++;
      }
      
      if (nextIndex < pendingEntries.length) {
        setCurrentIndex(nextIndex);
      } else {
        setCurrentStep('complete');
      }
    }
  };

  const moveToPrevious = () => {
    if (currentIndex > 0) {
      let prevIndex = currentIndex - 1;
      while (prevIndex >= 0 && processedEntries.has(pendingEntries[prevIndex].id)) {
        prevIndex--;
      }
      
      if (prevIndex >= 0) {
        setCurrentIndex(prevIndex);
      }
    }
  };

  const handleBulkApprove = async () => {
    const remainingEntries = getRemainingEntries();
    if (remainingEntries.length === 0 || !canApprove) return;

    if (!confirm(`Approve all ${remainingEntries.length} remaining time entries?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const approvalPromises = remainingEntries.map(entry =>
        fetch(`/api/time-entries/${entry.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'approve' }),
        })
      );

      const results = await Promise.allSettled(approvalPromises);
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      
      setApprovedCount(prev => prev + successCount);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Error bulk approving entries:', error);
      alert('Failed to bulk approve entries');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    onSuccess?.();
    onOpenChange(false);
    // Reset state
    setCurrentStep('loading');
    setCurrentIndex(0);
    setProcessedEntries(new Set());
    setApprovedCount(0);
    setSkippedCount(0);
    setIsEditing(false);
    setEditedEntry({});
  };

  if (!canApprove) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Access Denied
            </DialogTitle>
            <DialogDescription>
              You do not have permission to approve time entries.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const currentEntry = getCurrentEntry();
  const totalEntries = pendingEntries.length;
  const processedCount = processedEntries.size;
  const remainingCount = totalEntries - processedCount;
  const progressPercent = totalEntries > 0 ? (processedCount / totalEntries) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-500" />
            Time Entry Approval Wizard
          </DialogTitle>
          <DialogDescription>
            Review and approve pending time entries. You can edit entries inline or skip entries that aren't ready for approval.
          </DialogDescription>
        </DialogHeader>

        {currentStep === 'loading' && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
              <p className="text-lg font-medium">Loading pending entries...</p>
            </div>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Approval Complete!</h3>
            <div className="space-y-2 text-muted-foreground">
              <p>Approved: <span className="font-semibold text-green-600">{approvedCount}</span> entries</p>
              <p>Skipped: <span className="font-semibold text-yellow-600">{skippedCount}</span> entries</p>
              <p>Total processed: <span className="font-semibold">{approvedCount + skippedCount}</span> entries</p>
            </div>
          </div>
        )}

        {currentStep === 'review' && currentEntry && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress: {currentIndex + 1} of {totalEntries}</span>
                <span>{remainingCount} remaining</span>
              </div>
              <Progress value={progressPercent} className="w-full" />
            </div>

            {/* Entry Review */}
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    {currentEntry.ticket && (
                      <>
                        <Badge variant="outline">{currentEntry.ticket.ticketNumber || currentEntry.ticket.id}</Badge>
                        <span className="font-medium">{currentEntry.ticket.title}</span>
                      </>
                    )}
                    {currentEntry.account && !currentEntry.ticket && (
                      <>
                        <Badge variant="outline">Account</Badge>
                        <span className="font-medium">{currentEntry.account.name}</span>
                      </>
                    )}
                    {currentEntry.noCharge && (
                      <Badge variant="secondary">No Charge</Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {currentEntry.ticket?.account?.name || currentEntry.account?.name}
                  </p>
                  
                  {isEditing ? (
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea
                          id="edit-description"
                          value={editedEntry.description || ''}
                          onChange={(e) => setEditedEntry(prev => ({ ...prev, description: e.target.value }))}
                          className="min-h-[80px]"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-minutes">Minutes</Label>
                          <Input
                            id="edit-minutes"
                            type="number"
                            step="15"
                            min="0"
                            max="1440"
                            value={editedEntry.minutes || ''}
                            onChange={(e) => setEditedEntry(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        
                        {showBillingRates && (
                          <div className="space-y-2">
                            <Label htmlFor="edit-billing-rate">Billing Rate</Label>
                            <Select 
                              value={editedEntry.billingRateId || 'none'} 
                              onValueChange={(value) => setEditedEntry(prev => ({ ...prev, billingRateId: value === 'none' ? null : value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No billing rate</SelectItem>
                                {billingRates.map(rate => (
                                  <SelectItem key={rate.id} value={rate.id}>
                                    {rate.name} - ${rate.rate}/hr
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="edit-no-charge"
                          checked={editedEntry.noCharge || false}
                          onCheckedChange={(checked) => setEditedEntry(prev => ({ ...prev, noCharge: checked }))}
                        />
                        <Label htmlFor="edit-no-charge">No Charge</Label>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm">{currentEntry.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{new Date(currentEntry.date).toLocaleDateString()}</span>
                    <span>{currentEntry.user.name || currentEntry.user.email}</span>
                    <span className="font-medium">{formatMinutes(currentEntry.minutes)}</span>
                    {showBillingRates && !currentEntry.noCharge && currentEntry.billingRateValue && (
                      <span className="font-medium text-green-600">
                        ${((currentEntry.minutes / 60) * currentEntry.billingRateValue).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={moveToPrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <Button
                  variant="outline"
                  onClick={moveToNext}
                  disabled={remainingCount <= 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel Edit
                    </Button>
                    <Button onClick={handleSaveEdit} disabled={isProcessing}>
                      {isProcessing ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleSkip}
                      disabled={isProcessing}
                    >
                      <SkipForward className="h-4 w-4 mr-1" />
                      Skip
                    </Button>
                    
                    {canUpdate && (
                      <Button
                        variant="outline"
                        onClick={handleEdit}
                        disabled={isProcessing}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    
                    <Button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? "Approving..." : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Bulk Actions */}
            {remainingCount > 1 && !isEditing && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {remainingCount} entries remaining
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleBulkApprove}
                    disabled={isProcessing}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    Approve All Remaining
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {currentStep === 'complete' ? 'Close' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}