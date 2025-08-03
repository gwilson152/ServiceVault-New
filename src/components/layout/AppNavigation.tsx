"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Menu, 
  X,
  Home,
  FileText, 
  Users, 
  Clock, 
  DollarSign, 
  Settings, 
  LogOut,
  Building,
  Timer,
  BarChart3
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { ActionBar } from "@/components/ui/ActionBar";

interface AppNavigationProps {
  children: React.ReactNode;
}

export function AppNavigation({ children }: AppNavigationProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    canViewInvoices,
    canViewBilling,
    canViewSettings,
    canViewReports
  } = usePermissions();

  const isAdmin = session?.user?.role === "ADMIN";
  const isEmployee = session?.user?.role === "EMPLOYEE";
  const isAccountUser = session?.user?.role === "ACCOUNT_USER";

  const navigationItems = [
    {
      href: "/dashboard",
      icon: Home,
      label: "Dashboard",
      show: isAdmin || isEmployee
    },
    {
      href: "/tickets",
      icon: FileText,
      label: "Tickets",
      show: true // All roles can view tickets
    },
    {
      href: "/accounts",
      icon: Building,
      label: "Accounts",
      show: isAdmin || isEmployee
    },
    {
      href: "/time",
      icon: Clock,
      label: "Time Tracking",
      show: isAdmin || isEmployee
    },
    {
      href: "/billing",
      icon: DollarSign,
      label: "Billing",
      show: isAdmin || isEmployee,
      requiresPermission: canViewInvoices || canViewBilling
    },
    {
      href: "/reports",
      icon: BarChart3,
      label: "Reports",
      show: isAdmin || isEmployee,
      requiresPermission: canViewReports
    },
    {
      href: "/settings",
      icon: Settings,
      label: "Settings",
      show: isAdmin || isEmployee,
      requiresPermission: canViewSettings
    }
  ];

  const isActivePath = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="flex h-16 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2 ml-2">
            <Timer className="h-6 w-6" />
            <span className="font-semibold text-lg">Service Vault</span>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <ActionBar />
            
            <span className="text-sm text-muted-foreground hidden sm:block">
              {session?.user?.name || session?.user?.email}
            </span>
            <Badge variant="secondary">{session?.user?.role}</Badge>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-64 border-r bg-background transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-0`}>
          <div className="flex h-full flex-col pt-16 md:pt-0">
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-4 md:hidden">
              <div className="flex items-center space-x-2">
                <Timer className="h-5 w-5" />
                <span className="font-semibold">Service Vault</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 p-4">
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  
                  // Check if item should be shown
                  if (!item.show) return null;
                  if (item.requiresPermission !== undefined && !item.requiresPermission) return null;

                  return (
                    <Button
                      key={item.href}
                      variant={isActivePath(item.href) ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        router.push(item.href);
                        setIsSidebarOpen(false);
                      }}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </nav>
            </div>

            {/* User Info */}
            <div className="border-t p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session?.user?.name || session?.user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session?.user?.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}