"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  Save,
  RotateCcw,
  AlertCircle
} from "lucide-react";

// Import setting section components (will be created)
import { GeneralSettingsSection } from "@/components/settings/GeneralSettingsSection";
import { TicketFieldsSection } from "@/components/settings/TicketFieldsSection";
import { EmailSettingsSection } from "@/components/settings/EmailSettingsSection";
import { LicenseSection } from "@/components/settings/LicenseSection";
import { DangerZoneSection } from "@/components/settings/DangerZoneSection";
import { useActionBar } from "@/components/providers/ActionBarProvider";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const { canViewSettings, canUpdateSettings, isLoading: permissionsLoading } = usePermissions();
  const { addAction, removeAction, clearActions } = useActionBar();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && !permissionsLoading) {
      // Check settings view permission instead of role
      if (!canViewSettings) {
        router.push("/dashboard");
      } else {
        setIsLoading(false);
      }
    }
  }, [status, session, router, canViewSettings, permissionsLoading]);

  // Setup action bar with save/reset buttons
  useEffect(() => {
    const setupActions = async () => {
      const canUpdate = await canUpdateSettings();
      
      if (hasUnsavedChanges && canUpdate) {
        addAction({
          id: "reset-settings",
          label: "Reset",
          icon: <RotateCcw className="h-4 w-4" />,
          onClick: handleResetAll,
          variant: "outline"
        });
        addAction({
          id: "save-settings", 
          label: "Save All",
          icon: <Save className="h-4 w-4" />,
          onClick: handleSaveAll,
          variant: "default"
        });
      } else {
        removeAction("reset-settings");
        removeAction("save-settings");
      }
    };

    setupActions();

    // Cleanup on unmount
    return () => {
      clearActions();
    };
  }, [hasUnsavedChanges, addAction, removeAction, clearActions, canUpdateSettings]);

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

  if (status === "loading" || isLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !canViewSettings) {
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
    <>
      {hasUnsavedChanges && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-orange-600">You have unsaved changes</span>
          </div>
        </div>
      )}
      
      <main className="max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">System Configuration</h2>
            <p className="text-muted-foreground">
              Manage system-wide settings, custom fields, email configuration, and integrations.
            </p>
          </div>

          {/* Settings Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="fields">Ticket Fields</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="license">License</TabsTrigger>
              <TabsTrigger value="danger" className="text-red-600 data-[state=active]:text-red-700">Danger Zone</TabsTrigger>
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


            <TabsContent value="email" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Configuration</CardTitle>
                  <CardDescription>
                    Configure SMTP settings, email templates, and notification preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmailSettingsSection 
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

            <TabsContent value="danger" className="space-y-4">
              <DangerZoneSection 
                onSettingsChange={() => setHasUnsavedChanges(false)} // Reset doesn't need unsaved changes tracking
              />
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
    </>
  );
}