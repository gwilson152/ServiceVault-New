"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, use, useCallback } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText,
  Download,
  Edit,
  Calendar,
  User,
  Building2,
  DollarSign,
  Clock,
  X,
  Trash2,
  Check,
  Send,
  Undo,
  Plus
} from "lucide-react";
import { formatMinutes } from "@/lib/time-utils";
import { useActionBar } from "@/components/providers/ActionBarProvider";
import { AddTimeEntriesDialog } from "@/components/invoices/AddTimeEntriesDialog";
import { AddAddonsDialog } from "@/components/invoices/AddAddonsDialog";
import { InvoiceDateField } from "@/components/invoices/InvoiceDateField";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  createdAt: string;
  issueDate: string;
  dueDate?: string;
  total: number;
  notes?: string;
  account: {
    id: string;
    name: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    timeEntry?: {
      id: string;
      date: string;
      minutes: number;
      user: {
        id: string;
        name: string;
      };
      ticket?: {
        id: string;
        title: string;
        ticketNumber: string;
      };
    };
    addon?: {
      id: string;
      name: string;
      ticket: {
        id: string;
        title: string;
        ticketNumber: string;
      };
    };
  }>;
  creator: {
    id: string;
    name: string;
    email: string;
  };
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddTimeEntries, setShowAddTimeEntries] = useState(false);
  const [showAddAddons, setShowAddAddons] = useState(false);
  const [canUpdateInvoiceDates, setCanUpdateInvoiceDates] = useState(false);
  const [permissions, setPermissions] = useState({
    canView: false,
    canEdit: false,
    canEditItems: false,
    canDelete: false,
    canMarkSent: false,
    canMarkPaid: false,
    canUnmarkPaid: false,
    canExportPDF: false,
    canAddItems: false,
    canUpdateDates: false,
    isEditable: false,
    statusReason: null as string | null
  });
  const resolvedParams = use(params);
  const { addAction, clearActions } = useActionBar();

  // Use base permissions hook
  const { 
    canViewInvoices, 
    canEditInvoices, 
    canDeleteInvoices, 
    canCreateInvoices,
    loading: permissionsLoading 
  } = usePermissions();

  const fetchInvoice = useCallback(async () => {
    try {
      const response = await fetch(`/api/invoices/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else if (response.status === 404) {
        setError("Invoice not found");
      } else {
        setError("Failed to load invoice");
      }
    } catch (error) {
      setError("Failed to load invoice");
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchInvoice();
    }
  }, [status, session, router, resolvedParams.id, fetchInvoice]);

  // Set permissions based on invoice state and user permissions
  useEffect(() => {
    if (!invoice || !session?.user) return;
    
    // Use the synchronous permission hooks for simpler logic
    const canView = canViewInvoices;
    const canEdit = canEditInvoices && invoice.status === 'DRAFT';
    const canDelete = canDeleteInvoices && invoice.status === 'DRAFT';
    
    if (!canView) {
      setError("You don't have permission to view this invoice");
      return;
    }
    
    setPermissions({
      canView,
      canEdit,
      canEditItems: canEdit,
      canDelete,
      canMarkSent: invoice.status === 'DRAFT' && canEdit,
      canMarkPaid: (invoice.status === 'SENT' || invoice.status === 'OVERDUE') && canEdit,
      canUnmarkPaid: invoice.status === 'PAID' && canEdit,
      canExportPDF: canView,
      canAddItems: canEdit,
      canUpdateDates: canEdit,
      isEditable: invoice.status === 'DRAFT',
      statusReason: invoice.status !== 'DRAFT' ? `This invoice is ${invoice.status.toLowerCase()} and cannot be modified.` : null
    });
    
    setCanUpdateInvoiceDates(canEdit);
  }, [invoice?.id, invoice?.status, session?.user?.id, canViewInvoices, canEditInvoices, canDeleteInvoices]);

  // Setup ActionBar with invoice-specific actions using cached permissions
  useEffect(() => {
    if (!invoice || !session?.user) return;

    clearActions();

    // Always add PDF export if user has permission
    if (permissions.canExportPDF) {
      addAction({
        id: "export-pdf",
        label: "Export PDF",
        icon: <Download className="h-4 w-4" />,
        onClick: handleExportPDF,
        variant: "outline"
      });
    }

    // Status-specific actions
    if (invoice.status === 'DRAFT') {
      if (permissions.canMarkSent) {
        addAction({
          id: "mark-sent",
          label: "Mark as Sent",
          icon: <Send className="h-4 w-4" />,
          onClick: () => handleStatusChange('SENT'),
          variant: "default"
        });
      }

      if (permissions.canEdit) {
        addAction({
          id: "edit-invoice",
          label: editMode ? "Done Editing" : "Edit Invoice",
          icon: <Edit className="h-4 w-4" />,
          onClick: handleEditToggle,
          variant: "outline"
        });
      }

      if (permissions.canDelete) {
        addAction({
          id: "delete-invoice",
          label: "Delete",
          icon: <Trash2 className="h-4 w-4" />,
          onClick: handleDeleteInvoice,
          variant: "destructive"
        });
      }
    } else if (invoice.status === 'SENT' || invoice.status === 'OVERDUE') {
      if (permissions.canMarkPaid) {
        addAction({
          id: "mark-paid",
          label: "Mark as Paid",
          icon: <Check className="h-4 w-4" />,
          onClick: () => handleStatusChange('PAID'),
          variant: "default"
        });
      }
    } else if (invoice.status === 'PAID') {
      if (permissions.canUnmarkPaid) {
        addAction({
          id: "unmark-paid",
          label: "Unmark as Paid",
          icon: <Undo className="h-4 w-4" />,
          onClick: () => handleStatusChange('SENT'),
          variant: "outline"
        });
      }
    }

    // Cleanup on unmount  
    return () => {
      clearActions();
    };
  }, [invoice?.id, invoice?.status, editMode, session?.user?.id, permissions, addAction, clearActions]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    if (!invoice || !confirm("Are you sure you want to remove this item from the invoice?")) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh invoice data
        await fetchInvoice();
      } else {
        const errorData = await response.json();
        setError("Failed to remove item: " + errorData.error);
      }
    } catch (err) {
      console.error('Failed to remove item:', err);
      setError("Failed to remove item");
    }
  }, [invoice, fetchInvoice]);

  const handleEditToggle = useCallback(async () => {
    if (!editMode) {
      // Check permission before enabling edit mode
      if (!permissions.canEdit) {
        setError("You don't have permission to edit this invoice");
        return;
      }
    }
    setEditMode(!editMode);
  }, [editMode, permissions.canEdit]);

  const handleDateUpdate = useCallback(async (field: 'issueDate' | 'dueDate', newDate: string | null) => {
    if (!invoice) return;

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [field]: newDate
        }),
      });

      if (response.ok) {
        // Refresh invoice data
        await fetchInvoice();
      } else {
        const errorData = await response.json();
        setError(`Failed to update ${field}: ${errorData.error}`);
      }
    } catch (err) {
      console.error(`Failed to update ${field}:`, err);
      setError(`Failed to update ${field}`);
    }
  }, [invoice, fetchInvoice]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!invoice) return;

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchInvoice(); // Refresh invoice data
      } else {
        const errorData = await response.json();
        setError("Failed to update invoice status: " + errorData.error);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setError("Failed to update invoice status");
    }
  }, [invoice, fetchInvoice]);

  const handleDeleteInvoice = useCallback(async () => {
    if (!invoice || !confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/billing');
      } else {
        const errorData = await response.json();
        setError("Failed to delete invoice: " + errorData.error);
      }
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      setError("Failed to delete invoice");
    }
  }, [invoice, router]);

  const handleExportPDF = useCallback(async () => {
    if (!invoice) return;

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError("Failed to generate PDF");
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setError("Failed to export PDF");
    }
  }, [invoice]);

  if (status === "loading" || isLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !canViewInvoices) {
    return null;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Invoice Error</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push("/billing")}>
              Back to Billing
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "DRAFT": return "secondary";
      case "SENT": return "default";
      case "PAID": return "outline";
      case "OVERDUE": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusDescription = (status: string): string => {
    switch (status) {
      case "DRAFT": return "Draft - Can be edited and deleted";
      case "SENT": return "Sent - Awaiting payment";
      case "PAID": return "Paid - Invoice completed";
      case "OVERDUE": return "Overdue - Payment is past due";
      default: return "Unknown status";
    }
  };

  // Group items by type
  const timeEntryItems = invoice.items.filter(item => item.timeEntry);
  const addonItems = invoice.items.filter(item => item.addon);

  return (
    <div className="p-6">
        <div className="space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Invoice {invoice.invoiceNumber}</CardTitle>
                  <CardDescription>
                    {getStatusDescription(invoice.status)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(invoice.status)} className="text-sm">
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 group">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    Account
                  </div>
                  <div className="font-medium">{invoice.account.name}</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Issue Date
                  </div>
                  <InvoiceDateField
                    value={invoice.issueDate}
                    type="issue"
                    canUpdate={canUpdateInvoiceDates}
                    onUpdate={(newDate) => handleDateUpdate('issueDate', newDate)}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User className="h-4 w-4" />
                    Created By
                  </div>
                  <div>{invoice.creator.name}</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Due Date
                  </div>
                  <InvoiceDateField
                    value={invoice.dueDate}
                    type="due"
                    canUpdate={canUpdateInvoiceDates}
                    onUpdate={(newDate) => handleDateUpdate('dueDate', newDate)}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Total Amount
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    ${invoice.total.toLocaleString()}
                  </div>
                </div>
              </div>
              
              {invoice.notes && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                </div>
              )}

              {!permissions.isEditable && permissions.statusReason && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-yellow-600" />
                    <h4 className="font-medium text-yellow-800">Editing Restricted</h4>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">{permissions.statusReason}</p>
                </div>
              )}

              {editMode && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-blue-600" />
                    <h4 className="font-medium text-blue-800">Edit Mode Active</h4>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">Click the X button next to items to remove them from the invoice.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Entry Items */}
          {(timeEntryItems.length > 0 || editMode) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Time Entries ({timeEntryItems.length})
                    </CardTitle>
                    <CardDescription>
                      Billable time entries included in this invoice
                    </CardDescription>
                  </div>
                  {editMode && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddTimeEntries(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Time Entries
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {timeEntryItems.length > 0 ? (
                  <div className="space-y-3">
                    {timeEntryItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.timeEntry?.user.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {formatMinutes(item.timeEntry?.minutes || 0)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              ${item.rate}/hr
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.description}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.timeEntry?.ticket ? (
                              `Ticket ${item.timeEntry.ticket.ticketNumber}: ${item.timeEntry.ticket.title}`
                            ) : (
                              'Direct account time'
                            )} • {item.timeEntry?.date ? new Date(item.timeEntry.date).toLocaleDateString() : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {editMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Remove this item"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <div className="text-right">
                            <div className="font-medium">
                              ${item.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="mx-auto h-12 w-12 mb-4" />
                    <p>No time entries on this invoice yet.</p>
                    {editMode && <p className="text-sm mt-2">Click "Add Time Entries" to include billable time.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Addon Items */}
          {(addonItems.length > 0 || editMode) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Ticket Addons ({addonItems.length})
                    </CardTitle>
                    <CardDescription>
                      Additional items and parts included in this invoice
                    </CardDescription>
                  </div>
                  {editMode && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddAddons(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Addons
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {addonItems.length > 0 ? (
                  <div className="space-y-3">
                    {addonItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.addon?.name}</span>
                          <Badge variant="outline" className="text-xs">
                            Qty: {item.quantity}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            ${item.rate.toFixed(2)} each
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Ticket {item.addon?.ticket.ticketNumber}: {item.addon?.ticket.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {editMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Remove this item"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <div className="text-right">
                          <div className="font-medium">
                            ${item.amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4" />
                    <p>No addons on this invoice yet.</p>
                    {editMode && <p className="text-sm mt-2">Click "Add Addons" to include ticket parts and extras.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Invoice Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-green-600">${invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialogs */}
        {invoice && (
          <>
            <AddTimeEntriesDialog
              open={showAddTimeEntries}
              onOpenChange={setShowAddTimeEntries}
              invoiceId={invoice.id}
              onSuccess={fetchInvoice}
            />

            <AddAddonsDialog
              open={showAddAddons}
              onOpenChange={setShowAddAddons}
              invoiceId={invoice.id}
              onSuccess={fetchInvoice}
            />
          </>
        )}
    </div>
  );
}