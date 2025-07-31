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
import { Textarea } from "@/components/ui/textarea";
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
  Eye
} from "lucide-react";

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
                  <CardTitle>Billing Rates</CardTitle>
                  <CardDescription>
                    Manage hourly billing rates for different types of work.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {billingRates.map((rate) => (
                      <Card key={rate.id}>
                        <CardContent className="p-4">
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
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <Button className="w-full" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Billing Rate
                    </Button>
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