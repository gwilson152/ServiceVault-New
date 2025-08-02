"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
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
  Settings, 
  LogOut, 
  ArrowLeft,
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
import { AccountSelector } from "@/components/selectors/account-selector";
import { 
  AccountWithHierarchy, 
  buildAccountHierarchy, 
  getHierarchyStats
} from "@/utils/hierarchy";

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("invoices");

  // Permission hooks
  const {
    canViewInvoices,
    canCreateInvoices,
    canUpdateInvoices,
    canDeleteInvoices,
    canEditInvoiceItems,
    canViewBilling,
    canCreateBilling,
    canUpdateBilling,
    canDeleteBilling
  } = usePermissions();

  // Real data state
  const [accounts, setAccounts] = useState<AccountWithHierarchy[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [billingRates, setBillingRates] = useState<any[]>([]);
  
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

  // Billing rates state
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [showAddRate, setShowAddRate] = useState(false);
  const [newRate, setNewRate] = useState({
    name: "",
    rate: 0,
    description: "",
    isDefault: false
  });

  const { success, error } = useToast();

  // Data fetching functions
  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts/all');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    }
  };

  const fetchBillingRates = async () => {
    try {
      const response = await fetch('/api/billing/rates');
      if (response.ok) {
        const data = await response.json();
        setBillingRates(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch billing rates:', err);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      // Check permissions instead of hard-coded role
      const checkPermissions = async () => {
        const hasViewPermission = await canViewInvoices();
        if (!hasViewPermission) {
          router.push("/dashboard");
          return;
        }

        // Check billing permissions
        const [createBilling, updateBilling, deleteBilling] = await Promise.all([
          canCreateBilling(),
          canUpdateBilling(),
          canDeleteBilling()
        ]);
        
        setPermissions({
          createBilling,
          updateBilling,
          deleteBilling
        });

        // Fetch initial data
        Promise.all([
          fetchAccounts(),
          fetchInvoices(),
          fetchBillingRates()
        ]).finally(() => {
          setIsLoading(false);
        });
      };

      checkPermissions();
    }
  }, [status, session, router]);

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

  // Preview invoice items for manual selection
  const handlePreviewInvoice = async () => {
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
  };

  // Generate invoice with selected items
  const handleGenerateInvoice = async () => {
    if (!selectedAccount) {
      error('Please select an account');
      return;
    }

    if (showItemSelection && selectedTimeEntries.size === 0 && selectedAddons.size === 0) {
      error('Please select at least one item to include in the invoice');
      return;
    }

    try {
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          includeUnbilledOnly,
          includeSubsidiaries,
          // Manual selection support
          selectedTimeEntryIds: showItemSelection ? Array.from(selectedTimeEntries) : undefined,
          selectedAddonIds: showItemSelection ? Array.from(selectedAddons) : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        success('Invoice generated successfully');
        
        // Reset form and refresh invoices
        setSelectedAccount("");
        setStartDate("");
        setEndDate("");
        setShowItemSelection(false);
        setPreviewData(null);
        setSelectedTimeEntries(new Set());
        setSelectedAddons(new Set());
        
        fetchInvoices();
        setActiveTab("invoices");
      } else {
        const errorData = await response.json();
        error('Failed to generate invoice', errorData.error);
      }
    } catch (err) {
      console.error('Failed to generate invoice:', err);
      error('Failed to generate invoice');
    }
  };

  const handleAddRate = async () => {
    if (!newRate.name || !newRate.rate) {
      error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/billing/rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRate),
      });

      if (response.ok) {
        success('Billing rate added successfully');
        setShowAddRate(false);
        setNewRate({ name: "", rate: 0, description: "", isDefault: false });
        fetchBillingRates();
      } else {
        const data = await response.json();
        error('Failed to add billing rate', data.error);
      }
    } catch (err) {
      console.error('Failed to add billing rate:', err);
      error('Failed to add billing rate');
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    try {
      const response = await fetch(`/api/billing/rates/${rateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        success('Billing rate deleted successfully');
        fetchBillingRates();
      } else {
        const data = await response.json();
        error('Failed to delete billing rate', data.error);
      }
    } catch (err) {
      console.error('Failed to delete billing rate:', err);
      error('Failed to delete billing rate');
    }
  };

  const handleEditRate = (rateId: string) => {
    setEditingRate(rateId);
  };

  const handleSaveRate = async (rateId: string, updatedRate: { name: string; rate: number; description: string; isDefault: boolean }) => {
    try {
      const response = await fetch(`/api/billing/rates/${rateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRate),
      });

      if (response.ok) {
        success('Billing rate updated successfully');
        setEditingRate(null);
        fetchBillingRates();
      } else {
        const data = await response.json();
        error('Failed to update billing rate', data.error);
      }
    } catch (err) {
      console.error('Failed to update billing rate:', err);
      error('Failed to update billing rate');
    }
  };

  const handleInvoiceDelete = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        success('Invoice deleted successfully');
        fetchInvoices();
      } else {
        const errorData = await response.json();
        error('Failed to delete invoice', errorData.error);
      }
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      error('Failed to delete invoice');
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

  // Billing Rate Card Component
  const BillingRateCard = ({ rate }: { rate: { id: string; name: string; rate: number; description: string; isDefault: boolean } }) => {
    const [editData, setEditData] = useState({
      name: rate.name,
      rate: rate.rate,
      description: rate.description,
      isDefault: rate.isDefault
    });

    const isEditing = editingRate === rate.id;

    const handleSave = () => {
      handleSaveRate(rate.id, editData);
    };

    const handleCancel = () => {
      setEditingRate(null);
      setEditData({
        name: rate.name,
        rate: rate.rate,
        description: rate.description,
        isDefault: rate.isDefault
      });
    };

    return (
      <Card key={rate.id}>
        <CardContent className="p-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`name-${rate.id}`}>Rate Name</Label>
                  <Input
                    id={`name-${rate.id}`}
                    value={editData.name}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`rate-${rate.id}`}>Hourly Rate ($)</Label>
                  <Input
                    id={`rate-${rate.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={editData.rate}
                    onChange={(e) => setEditData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`desc-${rate.id}`}>Description</Label>
                <Input
                  id={`desc-${rate.id}`}
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`default-${rate.id}`}
                  checked={editData.isDefault}
                  onChange={(e) => setEditData(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor={`default-${rate.id}`} className="text-sm">
                  Set as default rate
                </Label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{rate.name}</div>
                  {rate.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{rate.description}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-green-600">
                  ${rate.rate}/hr
                </div>
                <div className="flex gap-2">
                  {permissions.updateBilling && (
                    <Button variant="ghost" size="sm" onClick={() => handleEditRate(rate.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {permissions.deleteBilling && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteRate(rate.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>  
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <DollarSign className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Billing & Invoicing</h1>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {session.user?.name || session.user?.email}
            </span>
            <Badge variant="secondary">{session.user?.role}</Badge>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="generate">Generate Invoice</TabsTrigger>
              <TabsTrigger value="rates">Billing Rates</TabsTrigger>
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

            {/* Billing Rates Tab */}
            <TabsContent value="rates" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Billing Rates Management</CardTitle>
                      <CardDescription>
                        Manage hourly billing rates for different types of work. Create, edit, and delete billing rates used in time tracking and invoicing.
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => setShowAddRate(true)}
                      disabled={!permissions.createBilling}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Rate
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Add New Rate Form */}
                    {showAddRate && (
                      <Card className="border-dashed">
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            <h4 className="font-medium">Add New Billing Rate</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="new-rate-name">Rate Name *</Label>
                                <Input
                                  id="new-rate-name"
                                  value={newRate.name}
                                  onChange={(e) => setNewRate(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="e.g., Senior Development"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="new-rate-amount">Hourly Rate ($) *</Label>
                                <Input
                                  id="new-rate-amount"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={newRate.rate}
                                  onChange={(e) => setNewRate(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                                  placeholder="125.00"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-rate-desc">Description</Label>
                              <Input
                                id="new-rate-desc"
                                value={newRate.description}
                                onChange={(e) => setNewRate(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Brief description of this billing rate"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="new-rate-default"
                                checked={newRate.isDefault}
                                onChange={(e) => setNewRate(prev => ({ ...prev, isDefault: e.target.checked }))}
                                className="rounded"
                              />
                              <Label htmlFor="new-rate-default" className="text-sm">
                                Set as default rate
                              </Label>
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleAddRate}>
                                <Save className="h-4 w-4 mr-2" />
                                Add Rate
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setShowAddRate(false);
                                  setNewRate({ name: "", rate: 0, description: "", isDefault: false });
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Existing Billing Rates */}
                    {billingRates.length === 0 ? (
                      <div className="text-center py-8">
                        <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">No billing rates</h3>
                        <p className="text-sm text-muted-foreground">Create your first billing rate to get started.</p>
                        <Button 
                          className="mt-4" 
                          onClick={() => setShowAddRate(true)}
                          disabled={!permissions.createBilling}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Billing Rate
                        </Button>
                      </div>
                    ) : (
                      billingRates.map((rate) => (
                        <BillingRateCard key={rate.id} rate={rate} />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}