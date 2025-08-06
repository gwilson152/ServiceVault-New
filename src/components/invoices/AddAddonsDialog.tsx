"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Package, DollarSign, Hash, Loader2, FileText, Building2 } from "lucide-react";

interface TicketAddon {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  total: number;
  ticket: {
    id: string;
    title: string;
    ticketNumber: string;
  };
}

interface AddAddonsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  onSuccess: () => void;
}

export function AddAddonsDialog({ 
  open, 
  onOpenChange, 
  invoiceId, 
  onSuccess 
}: AddAddonsDialogProps) {
  const [availableAddons, setAvailableAddons] = useState<TicketAddon[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [includeSubsidiaries, setIncludeSubsidiaries] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchAvailableAddons();
    } else {
      // Reset state when dialog closes
      setSelectedAddons([]);
      setIncludeSubsidiaries(false);
      setError(null);
    }
  }, [open, invoiceId]);

  useEffect(() => {
    if (open) {
      fetchAvailableAddons();
    }
  }, [includeSubsidiaries]);

  const fetchAvailableAddons = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = `/api/invoices/${invoiceId}/available-items${includeSubsidiaries ? '?includeSubsidiaries=true' : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAvailableAddons(data.addons || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load available addons");
      }
    } catch (err) {
      console.error('Failed to fetch available addons:', err);
      setError("Failed to load available addons");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAddons.length === availableAddons.length) {
      setSelectedAddons([]);
    } else {
      setSelectedAddons(availableAddons.map(addon => addon.id));
    }
  };

  const handleAddAddons = async () => {
    if (selectedAddons.length === 0) {
      setError("Please select at least one addon to add");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeEntryIds: [],
          addonIds: selectedAddons
        }),
      });

      if (response.ok) {
        onSuccess();
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to add addons");
      }
    } catch (err) {
      console.error('Failed to add addons:', err);
      setError("Failed to add addons");
    } finally {
      setIsSaving(false);
    }
  };

  const getTotalAmount = () => {
    return availableAddons
      .filter(addon => selectedAddons.includes(addon.id))
      .reduce((sum, addon) => sum + (addon.total || 0), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Ticket Addons to Invoice</DialogTitle>
          <DialogDescription>
            Select unbilled ticket addons to add to this invoice. Only addons that haven't been invoiced are shown.
          </DialogDescription>
        </DialogHeader>

        {/* Include Subsidiaries Toggle */}
        <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="include-subsidiaries-addons" className="text-sm font-medium">
            Include subsidiary companies
          </Label>
          <Switch
            id="include-subsidiaries-addons"
            checked={includeSubsidiaries}
            onCheckedChange={setIncludeSubsidiaries}
          />
          <span className="text-xs text-muted-foreground">
            {includeSubsidiaries ? "Showing all companies" : "Current company only"}
          </span>
        </div>

        <div className="flex-1 overflow-auto p-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading available addons...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAvailableAddons}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          ) : availableAddons.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Available Addons</h3>
              <p>All ticket addons for this account have already been invoiced.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header with select all */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedAddons.length === availableAddons.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium">
                    Select All ({availableAddons.length} addons)
                  </label>
                </div>
                {selectedAddons.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {selectedAddons.length} selected • Total: ${getTotalAmount().toLocaleString()}
                  </div>
                )}
              </div>

              {/* Addon list */}
              <div className="space-y-3">
                {availableAddons.map((addon) => (
                  <Card 
                    key={addon.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedAddons.includes(addon.id) 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleAddonToggle(addon.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedAddons.includes(addon.id)}
                          onCheckedChange={() => handleAddonToggle(addon.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {addon.ticket.ticketNumber}
                              </Badge>
                              <span className="font-medium">
                                {addon.name}
                              </span>
                            </div>
                            <div className="text-lg font-bold text-green-600">
                              ${(addon.total || 0).toLocaleString()}
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1 mb-1">
                              <FileText className="h-3 w-3" />
                              <span>Ticket: {addon.ticket.title}</span>
                            </div>
                            {addon.description && (
                              <p>{addon.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              Unit Price: ${(addon.price || 0).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              Quantity: {addon.quantity || 0}
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              Total: ${(addon.total || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedAddons.length > 0 && (
              <span>
                {selectedAddons.length} addon{selectedAddons.length === 1 ? '' : 's'} selected
                • Total: ${getTotalAmount().toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddAddons} 
              disabled={selectedAddons.length === 0 || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${selectedAddons.length} Addon${selectedAddons.length === 1 ? '' : 's'}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}