"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { 
  Save, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Edit,
  X,
  DollarSign
} from "lucide-react";

interface BillingRate {
  id: string;
  name: string;
  description: string;
  rate: number;
  isDefault: boolean;
  isEnabled: boolean;
  isUsed?: boolean;
}

export function BillingRatesSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAddRate, setShowAddRate] = useState(false);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [newRate, setNewRate] = useState({
    name: "",
    rate: 0,
    description: "",
    isDefault: false,
    isEnabled: true
  });

  // Permission checks
  const { 
    canViewBilling, 
    canCreateBilling, 
    canUpdateBilling, 
    canDeleteBilling 
  } = usePermissions();

  const permissions = {
    viewBilling: canViewBilling,
    createBilling: canCreateBilling,
    updateBilling: canUpdateBilling,
    deleteBilling: canDeleteBilling
  };

  // Billing rates query
  const { data: billingRates = [], isLoading } = useQuery<BillingRate[]>({
    queryKey: ['billing-rates'],
    queryFn: async () => {
      const response = await fetch('/api/billing/rates');
      if (!response.ok) {
        throw new Error('Failed to fetch billing rates');
      }
      return response.json();
    },
    enabled: permissions.viewBilling
  });

  // Success/Error handlers
  const success = (message: string) => {
    toast({ title: "Success", description: message });
  };

  const error = (title: string, description?: string) => {
    toast({ 
      title, 
      description: description || "Please try again.",
      variant: "destructive" 
    });
  };

  // Mutations
  const createBillingRateMutation = useMutation({
    mutationFn: async (data: Omit<BillingRate, 'id'>) => {
      const response = await fetch('/api/billing/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create billing rate');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-rates'] });
    },
  });

  const updateBillingRateMutation = useMutation({
    mutationFn: async ({ rateId, data }: { rateId: string; data: Partial<BillingRate> }) => {
      const response = await fetch(`/api/billing/rates/${rateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update billing rate');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-rates'] });
    },
  });

  const deleteBillingRateMutation = useMutation({
    mutationFn: async (rateId: string) => {
      const response = await fetch(`/api/billing/rates/${rateId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete billing rate');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-rates'] });
    },
  });

  // Handlers
  const handleAddRate = async () => {
    if (!newRate.name || newRate.rate <= 0) {
      error('Please fill in all required fields');
      return;
    }

    try {
      await createBillingRateMutation.mutateAsync({
        ...newRate,
        isEnabled: true
      });
      success('Billing rate created successfully');
      setShowAddRate(false);
      setNewRate({ name: "", rate: 0, description: "", isDefault: false, isEnabled: true });
    } catch (err: any) {
      console.error('Failed to create billing rate:', err);
      error('Failed to create billing rate', err.message);
    }
  };

  const handleEditRate = (rateId: string) => {
    setEditingRate(rateId);
  };

  const handleSaveRate = async (rateId: string, updatedRate: { name: string; rate: number; description: string; isDefault: boolean; isEnabled: boolean }) => {
    try {
      await updateBillingRateMutation.mutateAsync({ rateId, data: updatedRate });
      success('Billing rate updated successfully');
      setEditingRate(null);
    } catch (err: any) {
      console.error('Failed to update billing rate:', err);
      error('Failed to update billing rate', err.message);
    }
  };

  const handleToggleEnabled = async (rateId: string, isEnabled: boolean) => {
    try {
      await updateBillingRateMutation.mutateAsync({ 
        rateId, 
        data: { isEnabled } 
      });
      success(`Billing rate ${isEnabled ? 'enabled' : 'disabled'} successfully`);
    } catch (err: any) {
      console.error('Failed to update billing rate:', err);
      error('Failed to update billing rate', err.message);
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    const rate = billingRates.find(r => r.id === rateId);
    if (rate?.isUsed) {
      error('Cannot delete billing rate', 'This rate is being used in existing time entries. You can disable it instead.');
      return;
    }

    if (!confirm("Are you sure you want to delete this billing rate? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteBillingRateMutation.mutateAsync(rateId);
      success('Billing rate deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete billing rate:', err);
      error('Failed to delete billing rate', err.message);
    }
  };

  // BillingRateCard component
  const BillingRateCard = ({ rate }: { rate: BillingRate }) => {
    const [editData, setEditData] = useState({
      name: rate.name,
      rate: rate.rate,
      description: rate.description,
      isDefault: rate.isDefault,
      isEnabled: rate.isEnabled
    });

    const isEditing = editingRate === rate.id;

    const handleSave = () => {
      handleSaveRate(rate.id, editData);
    };

    const handleCancel = () => {
      setEditingRate(null);
      setEditData({
        name: rate.name,
        rate: rate.rate,
        description: rate.description,
        isDefault: rate.isDefault,
        isEnabled: rate.isEnabled
      });
    };

    return (
      <Card key={rate.id} className={!rate.isEnabled ? "opacity-60" : ""}>
        <CardContent className="p-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`name-${rate.id}`}>Rate Name</Label>
                  <Input
                    id={`name-${rate.id}`}
                    value={editData.name}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`rate-${rate.id}`}>Hourly Rate ($)</Label>
                  <Input
                    id={`rate-${rate.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={editData.rate}
                    onChange={(e) => setEditData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`desc-${rate.id}`}>Description</Label>
                <Input
                  id={`desc-${rate.id}`}
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`default-${rate.id}`}
                    checked={editData.isDefault}
                    onChange={(e) => setEditData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor={`default-${rate.id}`} className="text-sm">
                    Set as default rate
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`enabled-${rate.id}`}
                    checked={editData.isEnabled}
                    onCheckedChange={(checked) => setEditData(prev => ({ ...prev, isEnabled: checked }))}
                  />
                  <Label htmlFor={`enabled-${rate.id}`} className="text-sm">
                    Enabled for new entries
                  </Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{rate.name}</div>
                  {rate.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                  {!rate.isEnabled && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Disabled
                    </Badge>
                  )}
                  {rate.isUsed && (
                    <Badge variant="outline" className="text-xs text-blue-600">
                      In Use
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{rate.description}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-green-600">
                  ${rate.rate}/hr
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rate.isEnabled}
                    onCheckedChange={(checked) => handleToggleEnabled(rate.id, checked)}
                    disabled={!permissions.updateBilling}
                  />
                  <div className="flex gap-2">
                    {permissions.updateBilling && (
                      <Button variant="ghost" size="sm" onClick={() => handleEditRate(rate.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {permissions.deleteBilling && !rate.isUsed && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteRate(rate.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>  
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading billing rates...</div>;
  }

  if (!permissions.viewBilling) {
    return <div className="text-center py-8 text-muted-foreground">You don't have permission to view billing rates.</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Billing Rates Management</CardTitle>
              <CardDescription>
                Manage hourly billing rates for different types of work. Create, edit, and delete billing rates used in time tracking and invoicing.
              </CardDescription>
            </div>
            {permissions.createBilling && (
              <Button 
                onClick={() => setShowAddRate(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Rate
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Add New Rate Form */}
            {showAddRate && (
              <Card className="border-dashed">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <h4 className="font-medium">Add New Billing Rate</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-rate-name">Rate Name *</Label>
                        <Input
                          id="new-rate-name"
                          value={newRate.name}
                          onChange={(e) => setNewRate(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Senior Development"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-rate-amount">Hourly Rate ($) *</Label>
                        <Input
                          id="new-rate-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={newRate.rate}
                          onChange={(e) => setNewRate(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                          placeholder="125.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-rate-desc">Description</Label>
                      <Input
                        id="new-rate-desc"
                        value={newRate.description}
                        onChange={(e) => setNewRate(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of this billing rate"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="new-rate-default"
                        checked={newRate.isDefault}
                        onChange={(e) => setNewRate(prev => ({ ...prev, isDefault: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="new-rate-default" className="text-sm">
                        Set as default rate
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddRate}>
                        <Save className="h-4 w-4 mr-2" />
                        Add Rate
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowAddRate(false);
                          setNewRate({ name: "", rate: 0, description: "", isDefault: false, isEnabled: true });
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing Billing Rates */}
            {billingRates.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No billing rates</h3>
                <p className="text-sm text-muted-foreground">Create your first billing rate to get started.</p>
                {permissions.createBilling && (
                  <Button 
                    className="mt-4" 
                    onClick={() => setShowAddRate(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Billing Rate
                  </Button>
                )}
              </div>
            ) : (
              billingRates.map((rate) => (
                <BillingRateCard key={rate.id} rate={rate} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}