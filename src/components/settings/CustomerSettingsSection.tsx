"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

interface CustomerSettingsSectionProps {
  onSettingsChange: () => void;
}

export function CustomerSettingsSection({ onSettingsChange }: CustomerSettingsSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Management Settings</CardTitle>
          <CardDescription>
            Configure default permissions and settings for customer accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Customer Settings Management</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              This section will provide granular control over customer permissions, 
              default settings, and portal access configurations.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Coming soon:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Default customer permissions</li>
                <li>• Portal access controls</li>
                <li>• Time entry visibility settings</li>
                <li>• Ticket creation permissions</li>
                <li>• Custom field access controls</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}