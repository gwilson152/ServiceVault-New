"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAllAccountsQuery } from "@/hooks/queries/useAccountsQuery";
import { useInvoicesQuery } from "@/hooks/queries/useBillingQuery";
import { 
  useGenerateInvoiceMutation, 
  useDeleteInvoiceMutation 
} from "@/hooks/queries/useBillingMutations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  Plus, 
  FileText,
  Calendar,
  Users,
  Edit,
  Trash2,
  Download,
  Eye,
  Save,
  X
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useActionBar } from "@/components/providers/ActionBarProvider";
import { AccountSelector } from "@/components/selectors/account-selector";
import { 
  AccountWithHierarchy, 
  buildAccountHierarchy, 
  getHierarchyStats
} from "@/utils/hierarchy";

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("invoices");

  // Permission hooks - these return synchronous boolean values
  const {
    canViewInvoices,
    canCreateInvoices,
    canUpdateInvoices,
    canDeleteInvoices,
    canEditInvoiceItems,
    canViewBilling,
    canCreateBilling,
    canUpdateBilling,
    canDeleteBilling,
    loading: permissionsHookLoading
  } = usePermissions();

  // TanStack Query hooks replace manual state management
  const { data: accounts = [], isLoading: accountsLoading } = useAllAccountsQuery();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoicesQuery();
  
  // Combined loading state from TanStack Query hooks and permissions
  const isLoading = accountsLoading || invoicesLoading || permissionsHookLoading;
  
  // Permission state
  const [permissions, setPermissions] = useState({
    createBilling: false,
    updateBilling: false,
    deleteBilling: false
  });

  // Invoice generation state
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeUnbilledOnly, setIncludeUnbilledOnly] = useState(true);
  const [includeSubsidiaries, setIncludeSubsidiaries] = useState(false);
  
  // Manual selection state
  const [showItemSelection, setShowItemSelection] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedTimeEntries, setSelectedTimeEntries] = useState<Set<string>>(new Set());
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());


  const { success, error } = useToast();
  const { addAction, clearActions } = useActionBar();

  // Mutation hooks for data modifications
  const generateInvoiceMutation = useGenerateInvoiceMutation();
  const deleteInvoiceMutation = useDeleteInvoiceMutation();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && !permissionsHookLoading) {
      // Check permissions using synchronous hook values
      if (!canViewInvoices && !canViewBilling) {
        router.push("/dashboard");
        return;
      }

      // Update local permissions state from hook values
      setPermissions({
        createBilling: canCreateBilling,
        updateBilling: canUpdateBilling,
        deleteBilling: canDeleteBilling
      });

      // Data fetching is now handled automatically by TanStack Query hooks
    }
  }, [status, session, router, canViewInvoices, canViewBilling, canCreateBilling, canUpdateBilling, canDeleteBilling, permissionsHookLoading]);

  // All useCallback hooks must be defined before any conditional returns

  // Preview invoice items for manual selection
  const handlePreviewInvoice = useCallback(async () => {
    if (!selectedAccount) {
      error('Please select an account');
      return;
    }

    try {
      const response = await fetch('/api/invoices/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          includeUnbilledOnly,
          includeSubsidiaries
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
        
        // Pre-select all items by default
        setSelectedTimeEntries(new Set(data.timeEntries?.map((te: any) => te.id) || []));
        setSelectedAddons(new Set(data.ticketAddons?.map((addon: any) => addon.id) || []));
        
        setShowItemSelection(true);
        setActiveTab("generate");
      } else {
        const errorData = await response.json();
        error('Failed to preview invoice items', errorData.error);
      }
    } catch (err) {
      console.error('Failed to preview invoice:', err);
      error('Failed to preview invoice items');
    }
  }, [selectedAccount, startDate, endDate, includeUnbilledOnly, includeSubsidiaries, error, setPreviewData, setSelectedTimeEntries, setSelectedAddons, setShowItemSelection, setActiveTab]);

  // Generate invoice with selected items
  const handleGenerateInvoice = useCallback(async () => {
    if (!selectedAccount) {
      error('Please select an account');
      return;
    }

    if (showItemSelection && selectedTimeEntries.size === 0 && selectedAddons.size === 0) {
      error('Please select at least one item to include in the invoice');
      return;
    }

    try {
      await generateInvoiceMutation.mutateAsync({
        accountId: selectedAccount,
        startDate: startDate || '',
        endDate: endDate || '',
        includeUnbilledOnly,
        includeSubsidiaries,
        // Manual selection support
        selectedTimeEntryIds: showItemSelection ? Array.from(selectedTimeEntries) : undefined,
        selectedAddonIds: showItemSelection ? Array.from(selectedAddons) : undefined,
      });
      
      success('Invoice generated successfully');
      
      // Reset form - queries will auto-refresh via invalidation
      setSelectedAccount("");
      setStartDate("");
      setEndDate("");
      setShowItemSelection(false);
      setPreviewData(null);
      setSelectedTimeEntries(new Set());
      setSelectedAddons(new Set());
      
      setActiveTab("invoices");
    } catch (err: any) {
      console.error('Failed to generate invoice:', err);
      error('Failed to generate invoice', err.message);
    }
  }, [selectedAccount, showItemSelection, selectedTimeEntries, selectedAddons, startDate, endDate, includeUnbilledOnly, includeSubsidiaries, generateInvoiceMutation, success, error, setSelectedAccount, setStartDate, setEndDate, setShowItemSelection, setPreviewData, setSelectedTimeEntries, setSelectedAddons, setActiveTab]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Get selected account details for hierarchy display
  const selectedAccountDetails = accounts.find(account => account.id === selectedAccount);
  const hierarchicalAccounts = buildAccountHierarchy(accounts);


  const handleInvoiceDelete = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteInvoiceMutation.mutateAsync(invoiceId);
      success('Invoice deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete invoice:', err);
      error('Failed to delete invoice', err.message);
    }
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "DRAFT": return "secondary";
      case "SENT": return "default";
      case "PAID": return "outline";
      case "OVERDUE": return "destructive";
      default: return "secondary";
    }
  };

  // Calculate statistics from real data
  const stats = {
    totalInvoices: invoices.length,
    draftInvoices: invoices.filter(i => i.status === "DRAFT").length,
    totalRevenue: invoices.filter(i => i.status === "PAID").reduce((sum, i) => sum + (i.total || 0), 0),
    pendingAmount: invoices.filter(i => i.status === "SENT").reduce((sum, i) => sum + (i.total || 0), 0)
  };

  // Calculate real-time totals for manual selection
  const calculateSelectedTotals = () => {
    if (!previewData) return { timeTotal: 0, addonTotal: 0, total: 0 };
    
    const timeTotal = previewData.timeEntries
      ?.filter((te: any) => selectedTimeEntries.has(te.id))
      .reduce((sum: number, te: any) => sum + ((te.minutes / 60) * (te.billingRateValue || 0)), 0) || 0;
      
    const addonTotal = previewData.ticketAddons
      ?.filter((addon: any) => selectedAddons.has(addon.id))
      .reduce((sum: number, addon: any) => sum + (addon.price * addon.quantity), 0) || 0;
    
    return {
      timeTotal,
      addonTotal,
      total: timeTotal + addonTotal
    };
  };

  // Invoice Action Buttons Component
  const InvoiceActionButtons = ({ 
    invoice, 
    canView, 
    canEdit, 
    canDelete, 
    onView, 
    onEdit, 
    onDelete 
  }: { 
    invoice: any;
    canView: () => Promise<boolean>;
    canEdit: () => Promise<boolean>;
    canDelete: () => Promise<boolean>;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
  }) => {
    const [permissions, setPermissions] = useState({
      view: false,
      edit: false,
      delete: false
    });

    useEffect(() => {
      const checkPermissions = async () => {
        const [view, edit, del] = await Promise.all([
          canView(),
          canEdit(),
          canDelete()
        ]);
        setPermissions({ view, edit, delete: del });
      };
      checkPermissions();
    }, [canView, canEdit, canDelete]);

    return (
      <div className="flex gap-2">
        {permissions.view && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onView}
            title="View invoice details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" title="Download PDF">
          <Download className="h-4 w-4" />
        </Button>
        {permissions.edit && invoice.status === 'DRAFT' && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onEdit}
            title="Edit invoice"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {permissions.delete && invoice.status === 'DRAFT' && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-600 hover:text-red-700"
            onClick={onDelete}
            title="Delete invoice"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };


  return (
    <>

      <main className="max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Billing Management</h2>
            <p className="text-muted-foreground">
              Generate invoices, manage billing rates, and track revenue.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalInvoices}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Draft Invoices</CardTitle>
                <Calendar className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.draftInvoices}</div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Paid invoices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                <Users className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.pendingAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Awaiting payment</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="generate">Generate Invoice</TabsTrigger>
            </TabsList>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Management</CardTitle>
                  <CardDescription>
                    View and manage all generated invoices.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {invoices.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">No invoices</h3>
                        <p className="text-sm text-muted-foreground">Generate your first invoice to get started.</p>
                        <Button 
                          className="mt-4" 
                          onClick={() => setActiveTab("generate")}
                          disabled={!canCreateInvoices}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Generate Invoice
                        </Button>
                      </div>
                    ) : (
                      invoices.map((invoice) => (
                        <Card key={invoice.id}>
                          <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-lg">{invoice.invoiceNumber}</span>
                                  <Badge variant={getStatusColor(invoice.status)}>
                                    {invoice.status}
                                  </Badge>
                                </div>
                                
                                <p className="text-sm font-medium">{invoice.account?.name}</p>
                                
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>Created: {new Date(invoice.createdAt).toLocaleDateString()}</span>
                                  <span>Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</span>
                                  <span>{invoice.items?.filter((item: any) => item.timeEntry).length || 0} time entries</span>
                                  <span>{invoice.items?.filter((item: any) => item.ticketAddon).length || 0} addons</span>
                                </div>
                                
                                <div className="text-2xl font-bold text-green-600">
                                  ${invoice.total.toLocaleString()}
                                </div>
                              </div>

                              <InvoiceActionButtons 
                                invoice={invoice}
                                canView={canViewInvoices}
                                canEdit={canUpdateInvoices}
                                canDelete={canDeleteInvoices}
                                onView={() => router.push(`/invoices/${invoice.id}`)}
                                onEdit={() => router.push(`/invoices/${invoice.id}`)}
                                onDelete={() => handleInvoiceDelete(invoice.id)}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Generate Invoice Tab */}
            <TabsContent value="generate" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Generate New Invoice</CardTitle>
                  <CardDescription>
                    Create an invoice from unbilled time entries and ticket addons.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="account-select">Account</Label>
                      <AccountSelector
                        accounts={hierarchicalAccounts}
                        value={selectedAccount}
                        onValueChange={setSelectedAccount}
                        placeholder="Select an account"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Options</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="unbilled-only"
                            checked={includeUnbilledOnly}
                            onChange={(e) => setIncludeUnbilledOnly(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="unbilled-only" className="text-sm">
                            Unbilled items only
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="include-subsidiaries"
                            checked={includeSubsidiaries}
                            onChange={(e) => setIncludeSubsidiaries(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="include-subsidiaries" className="text-sm">
                            Include subsidiary accounts
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date (Optional)</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end-date">End Date (Optional)</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handlePreviewInvoice}
                      disabled={!selectedAccount}
                      variant="outline"
                      className="flex-1"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview Items
                    </Button>
                    <Button 
                      onClick={handleGenerateInvoice}
                      disabled={!selectedAccount}
                      className="flex-1"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Generate Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Manual Item Selection Dialog */}
              {showItemSelection && previewData && (
                <Card className="mt-4">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Select Invoice Items</CardTitle>
                        <CardDescription>
                          Choose which time entries and addons to include in the invoice for {selectedAccountDetails?.name}.
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowItemSelection(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Selection Summary */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">Selection Summary</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedTimeEntries.size} time entries • {selectedAddons.size} addons
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ${calculateSelectedTotals().total.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Time: ${calculateSelectedTotals().timeTotal.toFixed(2)} • Addons: ${calculateSelectedTotals().addonTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Time Entries Section */}
                    {previewData.timeEntries && previewData.timeEntries.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Time Entries ({previewData.timeEntries.length})</h4>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                const allIds = new Set(previewData.timeEntries.map((te: any) => te.id));
                                setSelectedTimeEntries(allIds);
                              }}
                            >
                              Select All
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedTimeEntries(new Set())}
                            >
                              Clear All
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {previewData.timeEntries.map((entry: any) => (
                            <div key={entry.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                              <input
                                type="checkbox"
                                checked={selectedTimeEntries.has(entry.id)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedTimeEntries);
                                  if (e.target.checked) {
                                    newSelected.add(entry.id);
                                  } else {
                                    newSelected.delete(entry.id);
                                  }
                                  setSelectedTimeEntries(newSelected);
                                }}
                                className="rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{entry.user?.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {(entry.minutes / 60).toFixed(1)}h
                                  </Badge>
                                  {entry.billingRateValue && (
                                    <Badge variant="secondary" className="text-xs">
                                      ${entry.billingRateValue}/hr
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {entry.description}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {entry.ticket ? `Ticket: ${entry.ticket.title}` : `Account: ${entry.account?.name}`} • 
                                  {new Date(entry.date).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  ${((entry.minutes / 60) * (entry.billingRateValue || 0)).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ticket Addons Section */}
                    {previewData.ticketAddons && previewData.ticketAddons.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Ticket Addons ({previewData.ticketAddons.length})</h4>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                const allIds = new Set(previewData.ticketAddons.map((addon: any) => addon.id));
                                setSelectedAddons(allIds);
                              }}
                            >
                              Select All
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedAddons(new Set())}
                            >
                              Clear All
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {previewData.ticketAddons.map((addon: any) => (
                            <div key={addon.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                              <input
                                type="checkbox"
                                checked={selectedAddons.has(addon.id)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedAddons);
                                  if (e.target.checked) {
                                    newSelected.add(addon.id);
                                  } else {
                                    newSelected.delete(addon.id);
                                  }
                                  setSelectedAddons(newSelected);
                                }}
                                className="rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{addon.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    Qty: {addon.quantity}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    ${addon.price.toFixed(2)} each
                                  </Badge>
                                </div>
                                {addon.description && (
                                  <div className="text-sm text-muted-foreground truncate">
                                    {addon.description}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  Ticket: {addon.ticket?.title} • 
                                  {new Date(addon.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  ${(addon.price * addon.quantity).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Generation Actions */}
                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={handleGenerateInvoice}
                        disabled={selectedTimeEntries.size === 0 && selectedAddons.size === 0}
                        className="flex-1"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Generate Invoice (${calculateSelectedTotals().total.toFixed(2)})
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setShowItemSelection(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

          </Tabs>
        </div>
      </main>
    </>
  );
}