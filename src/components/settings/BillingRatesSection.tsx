"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";

interface BillingRatesSectionProps {
  onSettingsChange: () => void;
}

interface BillingRate {
  id: string;
  name: string;
  description: string;
  rate: number;
  isDefault: boolean;
}

export function BillingRatesSection({ onSettingsChange }: BillingRatesSectionProps) {
  const [rates, setRates] = useState<BillingRate[]>([
    {
      id: "1",
      name: "Standard Rate",
      description: "Standard hourly billing rate",
      rate: 75.00,
      isDefault: true,
    },
    {
      id: "2",
      name: "Premium Rate",
      description: "Premium hourly billing rate for specialized work",
      rate: 125.00,
      isDefault: false,
    },
  ]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleRateChange = (id: string, field: keyof BillingRate, value: string | number | boolean) => {
    setRates(prev => prev.map(rate => 
      rate.id === id ? { ...rate, [field]: value } : rate
    ));
    onSettingsChange();
  };

  const handleDefaultChange = (id: string, isDefault: boolean) => {
    if (isDefault) {
      // Set all other rates to non-default
      setRates(prev => prev.map(rate => ({
        ...rate,
        isDefault: rate.id === id
      })));
    }
    onSettingsChange();
  };

  const addNewRate = () => {
    const newRate: BillingRate = {
      id: Date.now().toString(),
      name: "New Rate",
      description: "",
      rate: 0,
      isDefault: false,
    };
    setRates(prev => [...prev, newRate]);
    onSettingsChange();
  };

  const removeRate = (id: string) => {
    setRates(prev => prev.filter(rate => rate.id !== id));
    onSettingsChange();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement API call to save billing rates
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* System Billing Rates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">System Billing Rates</CardTitle>
              <CardDescription>
                Configure hourly rates for time tracking and invoicing.
              </CardDescription>
            </div>
            <Button onClick={addNewRate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Rate
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rates.map((rate) => (
            <div key={rate.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">Rate Configuration</h4>
                  {rate.isDefault && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                </div>
                {rates.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRate(rate.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`rate-name-${rate.id}`}>Rate Name</Label>
                  <Input
                    id={`rate-name-${rate.id}`}
                    value={rate.name}
                    onChange={(e) => handleRateChange(rate.id, 'name', e.target.value)}
                    placeholder="Standard Rate"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`rate-amount-${rate.id}`}>Hourly Rate ($)</Label>
                  <Input
                    id={`rate-amount-${rate.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={rate.rate}
                    onChange={(e) => handleRateChange(rate.id, 'rate', parseFloat(e.target.value) || 0)}
                    placeholder="75.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`rate-description-${rate.id}`}>Description</Label>
                <Input
                  id={`rate-description-${rate.id}`}
                  value={rate.description}
                  onChange={(e) => handleRateChange(rate.id, 'description', e.target.value)}
                  placeholder="Description of this billing rate..."
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={`rate-default-${rate.id}`}>Default Rate</Label>
                  <div className="text-sm text-muted-foreground">
                    Use this rate as the system default for new time entries
                  </div>
                </div>
                <Switch
                  id={`rate-default-${rate.id}`}
                  checked={rate.isDefault}
                  onCheckedChange={(checked) => handleDefaultChange(rate.id, checked)}
                />
              </div>
            </div>
          ))}

          {rates.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No billing rates configured</h3>
              <p className="text-muted-foreground mb-4">
                Add at least one billing rate to enable time tracking and invoicing.
              </p>
              <Button onClick={addNewRate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Rate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer-Specific Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer-Specific Rates</CardTitle>
          <CardDescription>
            Override system rates for specific customers. These rates take precedence over system defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              Customer-specific billing rates will be configured per customer in the customer management section.
            </div>
            <p className="text-sm text-muted-foreground">
              You can set different rates for different customers or user combinations to provide flexible billing options.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Section */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-2">
          {saveStatus === 'success' && (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Billing rates saved successfully</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">Failed to save billing rates</span>
            </>
          )}
        </div>
        
        <Button 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving && <Save className="mr-2 h-4 w-4 animate-spin" />}
          {!isSaving && <Save className="mr-2 h-4 w-4" />}
          {isSaving ? 'Saving...' : 'Save Billing Rates'}
        </Button>
      </div>
    </div>
  );
}