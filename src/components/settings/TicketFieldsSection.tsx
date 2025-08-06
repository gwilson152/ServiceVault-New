"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Hash, Save, RotateCcw } from "lucide-react";
import { 
  validateTicketNumberTemplate, 
  previewTicketNumber, 
  getAvailableTemplateTags,
  DEFAULT_TICKET_NUMBER_TEMPLATE 
} from "@/lib/ticket-number-generator";

interface TicketFieldsSectionProps {
  // No props needed - each section manages its own state
}

export function TicketFieldsSection({}: TicketFieldsSectionProps) {
  const [template, setTemplate] = useState("");
  const [originalTemplate, setOriginalTemplate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewSample, setPreviewSample] = useState("");

  const availableTags = getAvailableTemplateTags();

  // Load current template
  useEffect(() => {
    loadCurrentTemplate();
  }, []);

  // Update preview when template changes
  useEffect(() => {
    if (template) {
      try {
        const preview = previewTicketNumber(template, "Sample Account");
        setPreviewSample(preview);
        
        const validation = validateTicketNumberTemplate(template);
        setValidationError(validation.valid ? null : validation.error || null);
      } catch (error) {
        setPreviewSample("Error generating preview");
        setValidationError("Invalid template format");
      }
    }
  }, [template]);

  const loadCurrentTemplate = async () => {
    try {
      const response = await fetch("/api/settings/ticketNumberTemplate");
      if (response.ok) {
        const data = await response.json();
        const currentTemplate = data.value || DEFAULT_TICKET_NUMBER_TEMPLATE;
        setTemplate(currentTemplate);
        setOriginalTemplate(currentTemplate);
      } else {
        // Use default if setting doesn't exist
        setTemplate(DEFAULT_TICKET_NUMBER_TEMPLATE);
        setOriginalTemplate(DEFAULT_TICKET_NUMBER_TEMPLATE);
      }
    } catch (error) {
      console.error("Error loading ticket number template:", error);
      setTemplate(DEFAULT_TICKET_NUMBER_TEMPLATE);
      setOriginalTemplate(DEFAULT_TICKET_NUMBER_TEMPLATE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const validation = validateTicketNumberTemplate(template);
    if (!validation.valid) {
      setValidationError(validation.error || "Invalid template");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/settings/ticketNumberTemplate", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value: template,
          description: "Template for generating ticket numbers. Available tags: {account}, {year}, {month}, {day}, {sequence}, {sequence:N}, {random}"
        }),
      });

      if (response.ok) {
        setOriginalTemplate(template);
      } else {
        const error = await response.json();
        console.error("Error updating template:", error);
        alert("Failed to update template: " + error.error);
      }
    } catch (error) {
      console.error("Error updating template:", error);
      alert("Failed to update template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTemplate(originalTemplate);
    setValidationError(null);
  };

  const hasChanges = template !== originalTemplate;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">Loading ticket settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Ticket Number Format
          </CardTitle>
          <CardDescription>
            Configure how ticket numbers are generated. Ticket numbers make it easier to reference and identify tickets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Ticket Number Template</Label>
              <Input
                id="template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder={DEFAULT_TICKET_NUMBER_TEMPLATE}
                className={validationError ? "border-red-500" : ""}
              />
              {validationError && (
                <p className="text-sm text-red-600">{validationError}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Use template tags to customize how ticket numbers are generated.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Preview</Label>
              <div className="p-3 bg-muted rounded-md">
                <Badge variant="outline" className="font-mono">
                  {previewSample}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                This is how a ticket number would look based on your template.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Available Template Tags</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableTags.map((tag) => (
                  <div key={tag.tag} className="p-3 border rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {tag.tag}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {tag.example}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tag.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {hasChanges && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={isSaving}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !!validationError}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Template"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

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