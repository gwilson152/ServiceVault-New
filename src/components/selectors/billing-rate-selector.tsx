/**
 * Billing Rate Selector Component
 * 
 * Standardized selector component for choosing billing rates with account-specific overrides.
 * Shows effective rates with inheritance information and visual indicators for overrides
 * and inherited rates from parent accounts. Designed for app-wide usage.
 * 
 * Features:
 * - Account-specific billing rate overrides
 * - Parent account inheritance (child inherits from parent)
 * - Visual indicators for overrides vs system defaults
 * - Effective rate calculation and display
 * - Permission-based data loading
 * - Loading and error states
 * - Optional "No Charge" selection
 * - Responsive design
 * 
 * Integration:
 * - Uses /api/accounts/[id]/billing-rates for rate data
 * - Integrates with billingRateService for effective rate calculation
 * - Used in time entry creation/editing, invoice generation, etc.
 * 
 * Usage:
 * ```tsx
 * <BillingRateSelector
 *   accountId={accountId}
 *   value={selectedRateId}
 *   onValueChange={setSelectedRateId}
 *   showNoChargeOption={true}
 *   placeholder="Select billing rate"
 * />
 * ```
 */

"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DollarSign, 
  ArrowDown, 
  Building, 
  Info,
  Loader2
} from "lucide-react";

export interface BillingRate {
  id: string;
  name: string;
  description?: string;
  systemRate: number;
  accountRate?: number;
  effectiveRate: number;
  hasOverride: boolean;
  overrideId?: string;
  isDefault: boolean;
  inheritedFromAccountId?: string;
  inheritedAccountName?: string;
}

export interface BillingRateSelectorProps {
  /** Account ID to load billing rates for */
  accountId: string;
  /** Currently selected billing rate ID */
  value?: string;
  /** Callback when selection changes */
  onValueChange: (value: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Whether selection is required */
  required?: boolean;
  /** Whether to show "No Charge" option */
  showNoChargeOption?: boolean;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Additional CSS class names */
  className?: string;
  /** Custom label text (default: "Billing Rate") */
  label?: string;
  /** Whether to auto-select the default billing rate (default: true) */
  autoSelectDefault?: boolean;
}

export function BillingRateSelector({
  accountId,
  value,
  onValueChange,
  disabled = false,
  required = false,
  showNoChargeOption = true,
  placeholder = "Select billing rate",
  className = "",
  label = "Billing Rate",
  autoSelectDefault = true
}: BillingRateSelectorProps) {
  const [billingRates, setBillingRates] = useState<BillingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string>("");

  useEffect(() => {
    loadBillingRates();
  }, [accountId]); // Note: Don't include value/onValueChange to avoid infinite loops

  const loadBillingRates = async () => {
    if (!accountId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/accounts/${accountId}/billing-rates`);
      
      if (response.ok) {
        const data = await response.json();
        const rates = data.billingRates || [];
        setBillingRates(rates);
        setAccountName(data.account?.name || "");
        
        // Auto-select default billing rate if enabled and no current value
        if (autoSelectDefault && !value && rates.length > 0) {
          // First try to find a rate marked as default
          let defaultRate = rates.find(rate => rate.isDefault);
          
          // If no explicit default, use the first rate as fallback
          if (!defaultRate && rates.length > 0) {
            defaultRate = rates[0];
          }
          
          if (defaultRate) {
            onValueChange(defaultRate.id);
          }
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load billing rates");
        setBillingRates([]);
      }
    } catch (err) {
      setError("Failed to load billing rates");
      setBillingRates([]);
    } finally {
      setLoading(false);
    }
  };

  const getRateIcon = (rate: BillingRate) => {
    if (rate.hasOverride) {
      return <DollarSign className="h-3 w-3 text-green-500" />;
    }
    if (rate.inheritedFromAccountId) {
      return <ArrowDown className="h-3 w-3 text-blue-500" />;
    }
    return <Building className="h-3 w-3 text-gray-400" />;
  };

  const getRateBadge = (rate: BillingRate) => {
    if (rate.hasOverride) {
      return <Badge variant="secondary" className="text-xs">Account Override</Badge>;
    }
    if (rate.inheritedFromAccountId) {
      return <Badge variant="outline" className="text-xs">Inherited</Badge>;
    }
    if (rate.isDefault) {
      return <Badge variant="default" className="text-xs">Default</Badge>;
    }
    return null;
  };

  const formatRateDescription = (rate: BillingRate) => {
    const effectiveRateText = `$${rate.effectiveRate.toFixed(2)}/hour`;
    
    if (rate.hasOverride) {
      return `${effectiveRateText} (Account Override - System: $${rate.systemRate.toFixed(2)})`;
    }
    
    if (rate.inheritedFromAccountId) {
      return `${effectiveRateText} (Inherited from parent account)`;
    }
    
    return `${effectiveRateText} (System Default)`;
  };

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="flex items-center gap-2 p-2 border rounded">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading billing rates...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <Select 
        value={value} 
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showNoChargeOption && (
            <SelectItem value="no-charge">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border border-gray-300" />
                <span>No Charge</span>
                <Badge variant="outline" className="text-xs">$0.00</Badge>
              </div>
            </SelectItem>
          )}
          
          {billingRates.map((rate) => (
            <SelectItem key={rate.id} value={rate.id}>
              <div className="flex items-center justify-between w-full min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  {getRateIcon(rate)}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{rate.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {formatRateDescription(rate)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {getRateBadge(rate)}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Show inheritance information if applicable */}
      {value && value !== "no-charge" && billingRates.length > 0 && (
        <div className="mt-1">
          {(() => {
            const selectedRate = billingRates.find(r => r.id === value);
            if (!selectedRate) return null;

            if (selectedRate.hasOverride) {
              return (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <Info className="h-3 w-3" />
                  <span>
                    Using account-specific rate: ${selectedRate.effectiveRate.toFixed(2)}/hour
                    (System default: ${selectedRate.systemRate.toFixed(2)}/hour)
                  </span>
                </div>
              );
            }

            if (selectedRate.inheritedFromAccountId) {
              return (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Info className="h-3 w-3" />
                  <span>
                    Rate inherited from parent account: ${selectedRate.effectiveRate.toFixed(2)}/hour
                  </span>
                </div>
              );
            }

            if (selectedRate.isDefault) {
              return (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Info className="h-3 w-3" />
                  <span>Using system default rate: ${selectedRate.effectiveRate.toFixed(2)}/hour</span>
                </div>
              );
            }

            return (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Info className="h-3 w-3" />
                <span>System rate: ${selectedRate.effectiveRate.toFixed(2)}/hour</span>
              </div>
            );
          })()}
        </div>
      )}
      
      {accountName && (
        <p className="text-xs text-muted-foreground">
          Billing rates for: {accountName}
        </p>
      )}
    </div>
  );
}

// Re-export types for convenience
export type { BillingRate, BillingRateSelectorProps };