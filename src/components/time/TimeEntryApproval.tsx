"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeEntry {
  id: string;
  description: string;
  hours: number;
  date: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  approver?: {
    id: string;
    name: string;
    email: string;
  };
  ticket?: {
    id: string;
    title: string;
    account: {
      id: string;
      name: string;
    };
  };
}

interface TimeEntryApprovalProps {
  timeEntry: TimeEntry;
  onApprovalChange?: () => void;
  canApprove?: boolean;
}

export function TimeEntryApproval({ 
  timeEntry, 
  onApprovalChange,
  canApprove = false 
}: TimeEntryApprovalProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleApproval = async (action: 'approve' | 'reject') => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/time-entries/${timeEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        onApprovalChange?.();
      } else {
        const errorData = await response.json();
        console.error('Failed to update approval status:', errorData.error);
        alert('Failed to update approval status: ' + errorData.error);
      }
    } catch (error) {
      console.error('Error updating approval status:', error);
      alert('Failed to update approval status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getApprovalStatusBadge = () => {
    if (timeEntry.isApproved) {
      return (
        <Badge variant="secondary" className="text-green-700 bg-green-50 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="text-yellow-700 bg-yellow-50 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending Approval
        </Badge>
      );
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{timeEntry.hours}h</span>
            {getApprovalStatusBadge()}
          </div>
          <p className="text-sm text-muted-foreground">
            {timeEntry.description}
          </p>
          <div className="text-xs text-muted-foreground">
            <p>By: {timeEntry.user.name}</p>
            <p>Date: {new Date(timeEntry.date).toLocaleDateString()}</p>
            {timeEntry.ticket && (
              <p>Ticket: {timeEntry.ticket.title} ({timeEntry.ticket.account.name})</p>
            )}
          </div>
        </div>

        {canApprove && !timeEntry.isApproved && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApproval('approve')}
              disabled={isUpdating}
              className={cn(
                "text-green-700 border-green-300 hover:bg-green-50",
                isUpdating && "opacity-50"
              )}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApproval('reject')}
              disabled={isUpdating}
              className={cn(
                "text-red-700 border-red-300 hover:bg-red-50",
                isUpdating && "opacity-50"
              )}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </div>

      {timeEntry.isApproved && timeEntry.approver && timeEntry.approvedAt && (
        <div className="text-xs text-muted-foreground border-t pt-2">
          <p>
            Approved by {timeEntry.approver.name} on{' '}
            {new Date(timeEntry.approvedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}