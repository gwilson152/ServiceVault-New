"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Package, 
  Plus 
} from "lucide-react";

interface QuickAddonEntryProps {
  ticketId: string;
  ticketTitle: string;
  onAddonAdded?: () => void;
}

export function QuickAddonEntry({ ticketId, ticketTitle, onAddonAdded }: QuickAddonEntryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");

  const handleQuickAddonEntry = () => {
    setIsModalOpen(true);
  };

  const handleAddAddon = async () => {
    if (!name.trim() || !price || !quantity) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/addons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          price: parseFloat(price),
          quantity: parseInt(quantity),
        }),
      });

      if (response.ok) {
        // Reset form and close modal
        setName("");
        setDescription("");
        setPrice("");
        setQuantity("1");
        setIsModalOpen(false);
        onAddonAdded?.();
      } else {
        const errorData = await response.json();
        console.error("Failed to add addon:", errorData.error);
        alert("Failed to add addon: " + errorData.error);
      }
    } catch (error) {
      console.error("Error adding addon:", error);
      alert("Failed to add addon");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setName("");
    setDescription("");
    setPrice("");
    setQuantity("1");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleQuickAddonEntry}
        title="Add addon"
      >
        <Package className="h-4 w-4" />
      </Button>

      {/* Quick Addon Entry Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Ticket Addon</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <strong>Ticket:</strong> {ticketId} - {ticketTitle}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-addon-name">Name *</Label>
              <Input
                id="quick-addon-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Part or service name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-addon-description">Description</Label>
              <Textarea
                id="quick-addon-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quick-addon-price">Price *</Label>
                <Input
                  id="quick-addon-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quick-addon-quantity">Quantity *</Label>
                <Input
                  id="quick-addon-quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
            </div>

            {price && quantity && (
              <div className="p-3 bg-green-50 dark:bg-green-950/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Cost</div>
                <div className="text-lg font-bold text-green-600">
                  ${(parseFloat(price || '0') * parseInt(quantity || '1')).toFixed(2)}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCloseModal}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddAddon}
                disabled={!name.trim() || !price || !quantity || isLoading}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                {isLoading ? "Adding..." : "Add Addon"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}