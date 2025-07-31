"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  LogOut, 
  ArrowLeft,
  Save,
  RotateCcw,
  AlertCircle
} from "lucide-react";

// Import setting section components (will be created)
import { GeneralSettingsSection } from "@/components/settings/GeneralSettingsSection";
import { BillingRatesSection } from "@/components/settings/BillingRatesSection";
import { TicketFieldsSection } from "@/components/settings/TicketFieldsSection";
import { AccountSettingsSection } from "@/components/settings/AccountSettingsSection";
import { LicenseSection } from "@/components/settings/LicenseSection";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      // Only admins can access settings
      if (session.user?.role !== "ADMIN") {
        router.push("/dashboard");
      } else {
        setIsLoading(false);
      }
    }
  }, [status, session, router]);

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

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

  const handleSaveAll = async () => {
    // TODO: Implement save all settings
    console.log("Saving all settings...");
    setHasUnsavedChanges(false);
  };

  const handleResetAll = () => {
    // TODO: Implement reset all settings
    console.log("Resetting all settings...");
    setHasUnsavedChanges(false);
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
            <SettingsIcon className="h-6 w-6" />
            <h1 className="text-xl font-semibold">System Settings</h1>
          </div>

          {hasUnsavedChanges && (
            <div className="ml-4 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-600">Unsaved changes</span>
            </div>
          )}

          <div className="ml-auto flex items-center space-x-4">
            {hasUnsavedChanges && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetAll}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveAll}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save All
                </Button>
              </>
            )}
            
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
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">System Configuration</h2>
            <p className="text-muted-foreground">
              Manage system-wide settings, billing rates, custom fields, and integrations.
            </p>
          </div>

          {/* Settings Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="billing">Billing Rates</TabsTrigger>
              <TabsTrigger value="fields">Ticket Fields</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="license">License</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Basic application configuration and preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GeneralSettingsSection 
                    onSettingsChange={() => setHasUnsavedChanges(true)}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Rates</CardTitle>
                  <CardDescription>
                    Manage system-wide and account-specific billing rates.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BillingRatesSection 
                    onSettingsChange={() => setHasUnsavedChanges(true)}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fields" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Ticket Fields</CardTitle>
                  <CardDescription>
                    Configure custom fields for tickets and account data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TicketFieldsSection 
                    onSettingsChange={() => setHasUnsavedChanges(true)}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="accounts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage account permissions, hierarchical relationships, and user invitations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AccountSettingsSection 
                    onSettingsChange={() => setHasUnsavedChanges(true)}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="license" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>License Management</CardTitle>
                  <CardDescription>
                    Configure licensing platform integration and manage API keys.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LicenseSection 
                    onSettingsChange={() => setHasUnsavedChanges(true)}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer Information */}
          <Card className="mt-8">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Settings Management</p>
                  <p className="text-sm text-muted-foreground">
                    Changes are saved automatically. Use the &quot;Save All&quot; button to save across all sections.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>Last updated: Just now</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}