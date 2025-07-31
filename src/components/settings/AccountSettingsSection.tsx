"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Building, UserPlus, Settings2 } from "lucide-react";

interface AccountSettingsSectionProps {
  onSettingsChange: () => void;
}

export function AccountSettingsSection({ onSettingsChange }: AccountSettingsSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Management</CardTitle>
          <CardDescription>
            Manage accounts, account users, and hierarchical relationships.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Account Types Overview */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <Building className="mr-2 h-4 w-4" />
                Account Types
              </h4>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">Individual</div>
                  <div className="text-xs text-muted-foreground">Single person accounts</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">Organization</div>
                  <div className="text-xs text-muted-foreground">Companies with multiple users</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">Subsidiary</div>
                  <div className="text-xs text-muted-foreground">Child organizations</div>
                </div>
              </div>
            </div>

            {/* Account User Management */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <UserPlus className="mr-2 h-4 w-4" />
                User Management
              </h4>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">Invitation System</div>
                  <div className="text-xs text-muted-foreground">Invite users to set up login</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">Permission Control</div>
                  <div className="text-xs text-muted-foreground">Granular access control</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">Hierarchical Access</div>
                  <div className="text-xs text-muted-foreground">Parent/child account visibility</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Default Account Settings</CardTitle>
          <CardDescription>
            Configure default permissions and settings for new account users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Account Settings Management</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              This section will provide granular control over account permissions, 
              default settings, and portal access configurations.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Available features:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Default account user permissions</li>
                <li>• Portal access controls</li>
                <li>• Time entry visibility settings</li>
                <li>• Ticket creation permissions</li>
                <li>• Hierarchical access controls</li>
                <li>• Invitation management</li>
              </ul>
            </div>
            <Button className="mt-4" onClick={() => alert('Account management interface coming soon!')}>
              <Users className="mr-2 h-4 w-4" />
              Manage Accounts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}