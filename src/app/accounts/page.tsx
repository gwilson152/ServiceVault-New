/**
 * ACCOUNTS PAGE
 * 
 * Purpose: Account management with hierarchical display, user management, and account operations
 * Access: ADMIN role only - comprehensive account management capabilities
 * 
 * Key Functions:
 * - Display accounts in grid or tree view with hierarchy visualization
 * - Search and filter accounts by type (INDIVIDUAL, ORGANIZATION, SUBSIDIARY)
 * - Create new accounts with parent-child relationship configuration
 * - Navigate to individual account detail pages for user management
 * - View toggle (grid/tree) with localStorage persistence for user preference
 * 
 * Related Pages:
 * - /accounts/[id] - Individual account details with user management and settings
 * - /tickets - Tickets are scoped to accounts, account selection affects ticket visibility
 * - /time - Time entries can be account-scoped, accounts appear in filtering
 * - /billing - Accounts are billing entities, account selection affects invoice generation
 * - /dashboard - Account count statistics displayed on dashboard
 * 
 * API Dependencies:
 * - GET /api/accounts - Fetch accounts with pagination, search, and type filtering
 * - POST /api/accounts - Create new accounts with hierarchy relationships
 * - GET /api/accounts/[id] - Account details for navigation to individual pages
 * 
 * Components Used:
 * - AccountTreeView - Hierarchical tree display of accounts with expand/collapse
 * - AccountHierarchyCard - Enhanced card display with hierarchy indicators
 * - AccountViewToggle - Switch between grid and tree views with persistence
 * - CreateAccountDialog - Account creation form with parent account selection
 * - AccountSelector - Used within dialogs for parent account selection
 * 
 * State Management:
 * - Local state: Search filters, view mode, pagination, account list
 * - View preferences: Grid/tree mode stored in localStorage
 * - Action bar: Create account action for quick access
 * - Permission checking: Admin-only access with redirect for unauthorized users
 * 
 * Navigation:
 * - Entry points: Main navigation (admin only), dashboard account statistics
 * - Exit points: Individual account pages (/accounts/[id]), settings via query params
 * - Deep linking: Supports search parameters and account type filters
 * - Settings access: Uses ?tab=settings query parameter for direct tab navigation
 * 
 * Hierarchy Features:
 * - Visual parent-child relationships with indentation and connecting lines
 * - Account type differentiation (Organization > Subsidiary > Individual)
 * - Collapsible tree structure for large account hierarchies
 * - Search across hierarchy with parent context preservation
 */

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search,
  Plus
} from "lucide-react";
import { CreateAccountDialog } from "@/components/accounts/CreateAccountDialog";
import { AccountTreeView } from "@/components/accounts/AccountTreeView";
import { AccountHierarchyCard } from "@/components/accounts/AccountHierarchyCard";
import { AccountViewToggle, ViewMode } from "@/components/accounts/AccountViewToggle";
import { 
  AccountWithHierarchy, 
  buildAccountHierarchy, 
  searchAccountsInHierarchy,
  getHierarchyStats
} from "@/utils/hierarchy";
import { useActionBar } from "@/components/providers/ActionBarProvider";

export default function AccountsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [accounts, setAccounts] = useState<AccountWithHierarchy[]>([]);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [accountTypeFilter, setAccountTypeFilter] = useState("ALL");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { addAction, clearActions } = useActionBar();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load view preference from localStorage
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('accountsViewMode') as ViewMode) || 'grid';
    }
    return 'grid';
  });

  // Handle view mode changes and persist to localStorage
  const handleViewModeChange = (newViewMode: ViewMode) => {
    setViewMode(newViewMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('accountsViewMode', newViewMode);
    }
  };

  const fetchAccounts = useCallback(async () => {
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
  }, [currentPage, searchTerm, accountTypeFilter]);

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
  }, [status, session, router, fetchAccounts]);

  // Trigger fetchAccounts when filters change (handled by useCallback dependencies)
  useEffect(() => {
    if (!isLoading) {
      fetchAccounts();
    }
  }, [fetchAccounts, isLoading]);

  // Setup action bar
  useEffect(() => {
    addAction({
      id: "create-account",
      label: "Create Account",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => setShowCreateDialog(true),
      variant: "default"
    });

    // Cleanup on unmount
    return () => {
      clearActions();
    };
  }, [addAction, clearActions]);

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


  return (
    <>
      <main className="max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Accounts</h2>
              <p className="text-muted-foreground">
                Manage client accounts, users, and hierarchical relationships.
              </p>
              {accounts.length > 0 && (() => {
                const stats = getHierarchyStats(accounts);
                return (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{stats.organizationCount} Organizations</span>
                    <span>{stats.subsidiaryCount} Subsidiaries</span>
                    <span>{stats.individualCount} Individuals</span>
                    <span>{stats.totalActiveUsers} Active Users</span>
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center gap-4">
              <AccountViewToggle 
                currentView={viewMode} 
                onViewChange={handleViewModeChange}
              />
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </div>
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

          {/* Accounts Display */}
          {viewMode === 'tree' ? (
            <AccountTreeView 
              accounts={accounts}
              searchTerm={searchTerm}
            />
          ) : (
            <div className="space-y-6">
              {(() => {
                const hierarchicalAccounts = buildAccountHierarchy(accounts);
                const filteredAccounts = searchTerm 
                  ? searchAccountsInHierarchy(hierarchicalAccounts, searchTerm)
                  : hierarchicalAccounts;
                
                return filteredAccounts.map((account) => (
                  <AccountHierarchyCard
                    key={account.id}
                    account={account}
                    showChildren={true}
                  />
                ));
              })()}
            </div>
          )}

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

        </div>
      </main>

      {/* Create Account Dialog */}
      <CreateAccountDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onAccountCreated={fetchAccounts}
      />
    </>
  );
}