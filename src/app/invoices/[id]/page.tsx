"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Settings,
  LogOut,
  FileText,
  Download,
  Edit,
  Calendar,
  User,
  Building2,
  DollarSign,
  Clock
} from "lucide-react";
import { formatMinutes } from "@/lib/time-utils";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  createdAt: string;
  dueDate?: string;
  subtotal: number;
  tax: number;
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
    ticketAddon?: {
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

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      // Only admins and employees can view invoices
      const role = session.user?.role;
      if (role !== "ADMIN" && role !== "EMPLOYEE") {
        router.push("/dashboard");
      } else {
        fetchInvoice();
      }
    }
  }, [status, session, router, params.id]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else if (response.status === 404) {
        setError("Invoice not found");
      } else {
        setError("Failed to load invoice");
      }
    } catch (err) {
      console.error('Failed to fetch invoice:', err);
      setError("Failed to load invoice");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "EMPLOYEE")) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/billing")}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6" />
              <h1 className="text-xl font-semibold">Invoice Details</h1>
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
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Invoice Not Found</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.push("/billing")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Billing
              </Button>
            </div>
          </div>
        </main>
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

  // Group items by type
  const timeEntryItems = invoice.items.filter(item => item.timeEntry);
  const addonItems = invoice.items.filter(item => item.ticketAddon);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/billing")}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Invoice {invoice.invoiceNumber}</h1>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            
            {session.user?.role === "ADMIN" && (
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            
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
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Invoice {invoice.invoiceNumber}</CardTitle>
                  <CardDescription>
                    Invoice details and line items
                  </CardDescription>
                </div>
                <Badge variant={getStatusColor(invoice.status)} className="text-sm">
                  {invoice.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    Created
                  </div>
                  <div>{new Date(invoice.createdAt).toLocaleDateString()}</div>
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
            </CardContent>
          </Card>

          {/* Time Entry Items */}
          {timeEntryItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Time Entries ({timeEntryItems.length})
                </CardTitle>
                <CardDescription>
                  Billable time entries included in this invoice
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                      <div className="text-right">
                        <div className="font-medium">
                          ${item.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Addon Items */}
          {addonItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Ticket Addons ({addonItems.length})
                </CardTitle>
                <CardDescription>
                  Additional items and parts included in this invoice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {addonItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.ticketAddon?.name}</span>
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
                          Ticket {item.ticketAddon?.ticket.ticketNumber}: {item.ticketAddon?.ticket.title}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          ${item.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>${invoice.tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">${invoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}