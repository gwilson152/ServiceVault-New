"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  X, 
  Edit3,
  AlertTriangle
} from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  status: string;
  isDefault: boolean;
  variables: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  creator: { name: string; email: string };
}

interface EditEmailTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
  onTemplateUpdated: () => void;
}

export function EditEmailTemplateDialog({ open, onOpenChange, template, onTemplateUpdated }: EditEmailTemplateDialogProps) {
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const templateTypes = [
    { value: "USER_INVITATION", label: "User Invitation" },
    { value: "ACCOUNT_WELCOME", label: "Account Welcome" },
    { value: "TICKET_STATUS_CHANGE", label: "Ticket Status Change" },
    { value: "TIME_ENTRY_APPROVAL", label: "Time Entry Approval" },
    { value: "INVOICE_GENERATED", label: "Invoice Generated" },
    { value: "PASSWORD_RESET", label: "Password Reset" },
    { value: "SYSTEM_NOTIFICATION", label: "System Notification" }
  ];

  // Load template data when dialog opens
  useEffect(() => {
    if (template && open) {
      setTemplateName(template.name);
      setTemplateType(template.type);
      setSubject(template.subject);
      setHtmlBody(template.htmlBody);
      setTextBody(template.textBody || "");
      setIsActive(template.status === 'ACTIVE');
    }
  }, [template, open]);

  const handleSubmit = async () => {
    if (!template || !templateName || !templateType || !subject) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/email/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          type: templateType,
          subject,
          htmlBody,
          textBody: textBody || undefined,
          status: isActive ? 'ACTIVE' : 'INACTIVE'
        })
      });

      if (response.ok) {
        onTemplateUpdated();
        onOpenChange(false);
        resetForm();
      } else {
        console.error('Failed to update template');
      }
    } catch (error) {
      console.error('Failed to update template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTemplateName("");
    setTemplateType("");
    setSubject("");
    setHtmlBody("");
    setTextBody("");
    setIsActive(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit3 className="h-5 w-5" />
            <span>Edit Email Template</span>
          </DialogTitle>
          <DialogDescription>
            Update the template content and settings. Changes will affect future emails sent using this template.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] space-y-6">
          {/* Template Info */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-blue-900">Editing: {template.name}</h4>
                {template.isDefault && (
                  <Badge variant="default">Default Template</Badge>
                )}
              </div>
              <p className="text-sm text-blue-700">
                Created by {template.creator.name} on {new Date(template.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Warning for default templates */}
          {template.isDefault && (
            <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900">Default Template Warning</h4>
                <p className="text-sm text-amber-700 mt-1">
                  This is a default system template. Changes may affect system functionality. 
                  Consider creating a copy instead if you need extensive customizations.
                </p>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">Template Name *</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Enter template name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateType">Template Type *</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject (can include {{variables}})"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="htmlBody">HTML Body</Label>
              <Textarea
                id="htmlBody"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                placeholder="Enter HTML email content with {{variables}}"
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="textBody">Plain Text Body (Optional)</Label>
              <Textarea
                id="textBody"
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                placeholder="Enter plain text version (fallback for email clients that don't support HTML)"
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="isActive">Template Status</Label>
                <div className="text-sm text-muted-foreground">
                  {isActive ? 'Template is active and can be used for sending emails' : 'Template is inactive and will not be used'}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={isActive ? 'default' : 'secondary'}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!templateName || !templateType || !subject || isLoading}
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}