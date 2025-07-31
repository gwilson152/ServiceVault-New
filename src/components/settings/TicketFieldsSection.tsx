"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

interface TicketFieldsSectionProps {
  onSettingsChange: () => void;
}

export function TicketFieldsSection({ onSettingsChange }: TicketFieldsSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Custom Ticket Fields</CardTitle>
          <CardDescription>
            Configure additional fields for tickets to capture specific information relevant to your business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ticket Fields Configuration</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              This section will allow you to create custom fields for tickets such as priority levels, 
              categories, and other business-specific data fields.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Coming soon:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Custom field types (text, select, checkbox, etc.)</li>
                <li>• Field validation rules</li>
                <li>• Required field configuration</li>
                <li>• Field display order management</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}