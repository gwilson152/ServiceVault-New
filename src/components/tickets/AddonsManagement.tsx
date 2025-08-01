"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  Package
} from "lucide-react";

interface TicketAddon {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  createdAt: string;
}

interface AddonsManagementProps {
  ticketId: string;
  addons: TicketAddon[];
  onAddonsChange?: () => void;
  canEdit?: boolean;
}

export function AddonsManagement({ 
  ticketId, 
  addons, 
  onAddonsChange, 
  canEdit = true 
}: AddonsManagementProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<TicketAddon | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setQuantity("1");
  };

  const handleAddAddon = () => {
    resetForm();
    setEditingAddon(null);
    setIsAddModalOpen(true);
  };

  const handleEditAddon = (addon: TicketAddon) => {
    setName(addon.name);
    setDescription(addon.description || "");
    setPrice(addon.price.toString());
    setQuantity(addon.quantity.toString());
    setEditingAddon(addon);
    setIsAddModalOpen(true);
  };

  const handleSaveAddon = async () => {
    setIsLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: parseFloat(price),
        quantity: parseInt(quantity),
      };

      let response;
      if (editingAddon) {
        // Update existing addon
        response = await fetch(`/api/tickets/${ticketId}/addons/${editingAddon.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new addon
        response = await fetch(`/api/tickets/${ticketId}/addons`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        resetForm();
        setEditingAddon(null);
        setIsAddModalOpen(false);
        onAddonsChange?.();
      } else {
        const errorData = await response.json();
        console.error("Failed to save addon:", errorData.error);
        alert("Failed to save addon: " + errorData.error);
      }
    } catch (error) {
      console.error("Error saving addon:", error);
      alert("Failed to save addon");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAddon = async (addonId: string) => {
    if (!confirm("Are you sure you want to delete this addon?")) {
      return;
    }

    try {
      const response = await fetch(`/api/tickets/${ticketId}/addons/${addonId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onAddonsChange?.();
      } else {
        const errorData = await response.json();
        console.error("Failed to delete addon:", errorData.error);
        alert("Failed to delete addon: " + errorData.error);
      }
    } catch (error) {
      console.error("Error deleting addon:", error);
      alert("Failed to delete addon");
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingAddon(null);
    resetForm();
  };

  const totalCost = addons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Ticket Addons</h3>
            {addons.length > 0 && (
              <Badge variant="secondary">
                {addons.length} item{addons.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {canEdit && (
            <Button onClick={handleAddAddon} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Addon
            </Button>
          )}
        </div>

        {/* Addons List */}
        {addons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No addons</h3>
              <p className="text-muted-foreground text-center mb-4">
                No additional parts or services have been added to this ticket.
              </p>
              {canEdit && (
                <Button onClick={handleAddAddon}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Addon
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {addons.map((addon) => (
              <Card key={addon.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{addon.name}</span>
                        <Badge variant="outline">
                          {addon.quantity}x ${addon.price.toFixed(2)}
                        </Badge>
                        <Badge variant="default" className="bg-green-600">
                          = ${(addon.quantity * addon.price).toFixed(2)}
                        </Badge>
                      </div>
                      {addon.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {addon.description}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Added {new Date(addon.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditAddon(addon)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteAddon(addon.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Total Cost */}
            {addons.length > 0 && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Total Addon Cost</span>
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      ${totalCost.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Addon Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddon ? 'Edit Addon' : 'Add New Addon'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addon-name">Name *</Label>
              <Input
                id="addon-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Part or service name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addon-description">Description</Label>
              <Textarea
                id="addon-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addon-price">Price *</Label>
                <Input
                  id="addon-price"
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
                <Label htmlFor="addon-quantity">Quantity *</Label>
                <Input
                  id="addon-quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
            </div>

            {price && quantity && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Cost</div>
                <div className="text-lg font-bold text-blue-600">
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
                onClick={handleSaveAddon}
                disabled={!name.trim() || !price || !quantity || isLoading}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                {isLoading ? 'Saving...' : (editingAddon ? 'Update' : 'Add')} Addon
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}