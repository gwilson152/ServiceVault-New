"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMinutes } from "@/lib/time-utils";
import { Edit, Trash2, Lock, FileText, Building } from "lucide-react";
import Link from "next/link";

interface TimeEntry {
  id: string;
  ticketId?: string;
  accountId?: string;
  description: string;
  minutes: number;
  date: string;
  noCharge: boolean;
  billingRateValue?: number;
  isApproved: boolean;
  userId: string;
  user: { id: string; name: string; email: string };
  ticket?: { id: string; title: string; ticketNumber?: string; account: { id: string; name: string } };
  account?: { id: string; name: string };
  invoiceItems?: Array<{ invoice: { id: string; invoiceNumber: string; status: string } }>;
}

interface TimeEntryCardProps {
  entry: TimeEntry;
  showBillingAmount?: boolean;
  permissions?: { canEdit: boolean; canDelete: boolean };
  onEdit?: (entry: TimeEntry) => void;
  onDelete?: (entryId: string) => void;
}

export function TimeEntryCard({ entry, showBillingAmount = false, permissions = { canEdit: false, canDelete: false }, onEdit, onDelete }: TimeEntryCardProps) {
  const { data: session } = useSession();
  
  // Memoize lock status and reason since they're synchronous
  const entryIsLocked = useMemo(() => {
    return !!(entry.invoiceItems && entry.invoiceItems.length > 0);
  }, [entry.invoiceItems]);
  
  const lockReason = useMemo(() => {
    if (!entry.invoiceItems || entry.invoiceItems.length === 0) {
      return null;
    }
    const invoice = entry.invoiceItems[0]?.invoice;
    if (invoice) {
      return `This time entry is part of Invoice #${invoice.invoiceNumber} (${invoice.status}) and cannot be modified.`;
    }
    return "This time entry is associated with an invoice and cannot be modified.";
  }, [entry.invoiceItems]);

  const handleEdit = useMemo(() => () => {
    if (permissions.canEdit && onEdit) {
      onEdit(entry);
    }
  }, [permissions.canEdit, onEdit, entry]);

  const handleDelete = useMemo(() => () => {
    if (permissions.canDelete && onDelete) {
      onDelete(entry.id);
    }
  }, [permissions.canDelete, onDelete, entry.id]);

  return (
    <Card key={entry.id}>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {entry.ticket && (
                <>
                  <Badge variant="outline">{entry.ticket.ticketNumber || entry.ticket.id}</Badge>
                  <span className="font-medium">{entry.ticket.title}</span>
                </>
              )}
              {entry.account && !entry.ticket && (
                <>
                  <Badge variant="outline">Account</Badge>
                  <span className="font-medium">{entry.account.name}</span>
                </>
              )}
              {entry.noCharge && (
                <Badge variant="secondary">No Charge</Badge>
              )}
              {entry.isApproved && (
                <Badge variant="secondary" className="text-green-700 bg-green-50 border-green-200">
                  Approved
                </Badge>
              )}
              {!entry.isApproved && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Pending Approval
                </Badge>
              )}
              {entryIsLocked && (
                <Badge variant="secondary" className="text-red-700 bg-red-50 border-red-200">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
              {entry.invoiceItems && entry.invoiceItems.length > 0 && (
                <Link href={`/invoices/${entry.invoiceItems[0].invoice.id}`}>
                  <Badge 
                    variant="outline" 
                    className="text-blue-600 border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    Invoice #{entry.invoiceItems[0].invoice.invoiceNumber}
                  </Badge>
                </Link>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {entry.ticket?.account?.name || entry.account?.name}
            </p>
            
            <p className="text-sm">{entry.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span>{new Date(entry.date).toLocaleDateString()}</span>
              <span>{entry.user.name || entry.user.email}</span>
              <span className="font-medium">{formatMinutes(entry.minutes)}</span>
              {showBillingAmount && !entry.noCharge && entry.billingRateValue && (
                <span className="font-medium text-green-600">
                  ${((entry.minutes / 60) * entry.billingRateValue).toFixed(2)}
                </span>
              )}
            </div>
            
            {entryIsLocked && lockReason && (
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                <Lock className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-700">{lockReason}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {permissions.canEdit && !entryIsLocked && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleEdit}
                title="Edit time entry"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {permissions.canDelete && !entryIsLocked && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700" 
                title="Delete time entry"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}