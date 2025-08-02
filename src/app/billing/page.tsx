"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("invoices");

  // Invoice generation state
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeUnbilledOnly, setIncludeUnbilledOnly] = useState(true);

  // Billing rates state
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [showAddRate, setShowAddRate] = useState(false);
  const [newRate, setNewRate] = useState({
    name: "",
    hourlyRate: 0,
    description: ""
  });

  const { success, error } = useToast();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      // Only admins can access billing
      const role = session.user?.role;
      if (role !== "ADMIN") {
        router.push("/dashboard");
      } else {
        setIsLoading(false);
      }
    }
  }, [status, session, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || session.user?.role !== "ADMIN") {
    return null;
  }

  // Mock data - will be replaced with real data from API
  const customers = [
    { id: "1", name: "Example Corp", email: "billing@example.com" },
    { id: "2", name: "Tech Solutions", email: "accounts@techsolutions.com" },
    { id: "3", name: "StartupXYZ", email: "finance@startupxyz.com" },
  ];

  const invoices = [
    {
      id: "1",
      invoiceNumber: "INV-2024-001",
      customer: "Example Corp",
      customerId: "1",
      total: 1875.00,
      status: "DRAFT",
      createdAt: "2024-01-26",
      dueDate: "2024-02-26",
      timeEntries: 3,
      addons: 1
    },
    {
      id: "2",
      invoiceNumber: "INV-2024-002",
      customer: "Tech Solutions",
      customerId: "2",
      total: 2250.00,
      status: "SENT",
      createdAt: "2024-01-25",
      dueDate: "2024-02-25",
      timeEntries: 5,
      addons: 0
    },
    {
      id: "3",
      invoiceNumber: "INV-2024-003",
      customer: "StartupXYZ",
      customerId: "3",
      total: 975.00,
      status: "PAID",
      createdAt: "2024-01-24",
      dueDate: "2024-02-24",
      timeEntries: 2,
      addons: 2
    },
  ];

  const billingRates = [
    { id: "1", name: "Standard Development", hourlyRate: 75.00, description: "General development work" },
    { id: "2", name: "Senior Development", hourlyRate: 95.00, description: "Senior level development" },
    { id: "3", name: "Consultation", hourlyRate: 125.00, description: "Technical consultation" },
  ];

  const handleGenerateInvoice = async () => {
    // TODO: Implement API call to generate invoice
    console.log("Generating invoice:", {
      customerId: selectedCustomer,
      startDate,
      endDate,
      includeUnbilledOnly
    });
  };

  const handleAddRate = async () => {
    if (!newRate.name || !newRate.hourlyRate) {
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
        setNewRate({ name: "", hourlyRate: 0, description: "" });
        // TODO: Refresh billing rates list
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
        // TODO: Refresh billing rates list
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

  const handleSaveRate = async (rateId: string, updatedRate: { name: string; hourlyRate: number; description: string }) => {
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
        // TODO: Refresh billing rates list
      } else {
        const data = await response.json();
        error('Failed to update billing rate', data.error);
      }
    } catch (err) {
      console.error('Failed to update billing rate:', err);
      error('Failed to update billing rate');
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

  const stats = {
    totalInvoices: invoices.length,
    draftInvoices: invoices.filter(i => i.status === "DRAFT").length,
    totalRevenue: invoices.filter(i => i.status === "PAID").reduce((sum, i) => sum + i.total, 0),
    pendingAmount: invoices.filter(i => i.status === "SENT").reduce((sum, i) => sum + i.total, 0)
  };

  // Billing Rate Card Component
  const BillingRateCard = ({ rate }: { rate: { id: string; name: string; hourlyRate: number; description: string } }) => {
    const [editData, setEditData] = useState({
      name: rate.name,
      hourlyRate: rate.hourlyRate,
      description: rate.description
    });

    const isEditing = editingRate === rate.id;

    const handleSave = () => {
      handleSaveRate(rate.id, editData);
    };

    const handleCancel = () => {
      setEditingRate(null);
      setEditData({
        name: rate.name,
        hourlyRate: rate.hourlyRate,
        description: rate.description
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
                    value={editData.hourlyRate}
                    onChange={(e) => setEditData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
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
                <div className="font-medium">{rate.name}</div>
                <div className="text-sm text-muted-foreground">{rate.description}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-green-600">
                  ${rate.hourlyRate}/hr
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEditRate(rate.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteRate(rate.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
                        <Button className="mt-4" onClick={() => setActiveTab("generate")}>
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
                                
                                <p className="text-sm font-medium">{invoice.customer}</p>
                                
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>Created: {invoice.createdAt}</span>
                                  <span>Due: {invoice.dueDate}</span>
                                  <span>{invoice.timeEntries} time entries</span>
                                  <span>{invoice.addons} addons</span>
                                </div>
                                
                                <div className="text-2xl font-bold text-green-600">
                                  ${invoice.total.toLocaleString()}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
                      <Label htmlFor="customer-select">Customer</Label>
                      <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Include Items</Label>
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

                  <Button 
                    onClick={handleGenerateInvoice}
                    disabled={!selectedCustomer}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Invoice
                  </Button>
                </CardContent>
              </Card>
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
                    <Button onClick={() => setShowAddRate(true)}>
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
                                  value={newRate.hourlyRate}
                                  onChange={(e) => setNewRate(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
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
                            <div className="flex gap-2">
                              <Button onClick={handleAddRate}>
                                <Save className="h-4 w-4 mr-2" />
                                Add Rate
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setShowAddRate(false);
                                  setNewRate({ name: "", hourlyRate: 0, description: "" });
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
                        <Button className="mt-4" onClick={() => setShowAddRate(true)}>
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