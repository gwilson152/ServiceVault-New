"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  LogOut, 
  ArrowLeft,
  Search,
  Plus,
  Building,
  User,
  Mail,
  Eye,
  Settings
} from "lucide-react";
import { CreateAccountDialog } from "@/components/accounts/CreateAccountDialog";

interface Account {
  id: string;
  name: string;
  accountType: string;
  companyName?: string;
  parentAccount?: { name: string };
  accountUsers: Array<{
    id: string;
    name: string;
    email: string;
    user?: { id: string; name: string; email: string };
  }>;
  stats: {
    activeUsers: number;
    pendingInvitations: number;
    totalUsers: number;
    totalTickets: number;
    totalHours: number;
    billableHours: number;
  };
}

export default function AccountsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [accountTypeFilter, setAccountTypeFilter] = useState("ALL");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchAccounts = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (accountTypeFilter !== 'ALL') {
        params.append('accountType', accountTypeFilter);
      }

      const response = await fetch(`/api/accounts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts);
        setTotalAccounts(data.pagination.total);
      } else {
        console.error('Failed to fetch accounts');
        setAccounts([]);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      // Only admins can access account management
      if (session.user?.role !== "ADMIN") {
        router.push("/dashboard");
      } else {
        setIsLoading(false);
        fetchAccounts();
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (!isLoading) {
      fetchAccounts();
    }
  }, [searchTerm, accountTypeFilter, currentPage, isLoading]);

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

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "ORGANIZATION": return <Building className="h-4 w-4" />;
      case "SUBSIDIARY": return <Building className="h-4 w-4 text-blue-500" />;
      case "INDIVIDUAL": return <User className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case "ORGANIZATION": return <Badge variant="default">Organization</Badge>;
      case "SUBSIDIARY": return <Badge variant="secondary">Subsidiary</Badge>;
      case "INDIVIDUAL": return <Badge variant="outline">Individual</Badge>;
      default: return <Badge>{type}</Badge>;
    }
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
            <Users className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Account Management</h1>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {session.user?.name || session.user?.email}
            </span>
            <Badge variant="secondary">Admin</Badge>
            
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Accounts</h2>
              <p className="text-muted-foreground">
                Manage client accounts, users, and hierarchical relationships.
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Account
            </Button>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search accounts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {totalAccounts} accounts
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accounts Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getAccountTypeIcon(account.accountType)}
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                    </div>
                    {getAccountTypeBadge(account.accountType)}
                  </div>
                  {account.companyName && account.companyName !== account.name && (
                    <CardDescription>{account.companyName}</CardDescription>
                  )}
                  {account.parentAccount && (
                    <CardDescription className="text-blue-600">
                      Parent: {account.parentAccount.name}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{account.stats.activeUsers}</div>
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{account.stats.pendingInvitations}</div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{account.stats.totalUsers}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>

                  {/* Users Preview */}
                  {account.accountUsers.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Users:</div>
                      {account.accountUsers.slice(0, 2).map((accountUser, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <User className="h-3 w-3" />
                            <span>{accountUser.name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {accountUser.user ? (
                              <Badge variant="outline" className="text-xs">Active</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Invited</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {account.accountUsers.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{account.accountUsers.length - 2} more users
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => router.push(`/accounts/${account.id}`)}
                    >
                      <Eye className="mr-2 h-3 w-3" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Mail className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {accounts.length === 0 && !isLoading && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No accounts found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? "Try adjusting your search terms." : "Get started by creating your first account."}
                  </p>
                  {!searchTerm && (
                    <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Account
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Account Dialog */}
          <CreateAccountDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onAccountCreated={fetchAccounts}
          />
        </div>
      </main>
    </div>
  );
}