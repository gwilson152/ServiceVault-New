"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Mail, Phone, Globe, DollarSign, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface CompanyInfoSectionProps {
  // No props needed - each section manages its own state
}

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($) - US Dollar" },
  { value: "EUR", label: "EUR (€) - Euro" },
  { value: "GBP", label: "GBP (£) - British Pound" },
  { value: "CAD", label: "CAD ($) - Canadian Dollar" },
  { value: "AUD", label: "AUD ($) - Australian Dollar" },
  { value: "JPY", label: "JPY (¥) - Japanese Yen" },
  { value: "CHF", label: "CHF - Swiss Franc" },
  { value: "SEK", label: "SEK - Swedish Krona" },
  { value: "NOK", label: "NOK - Norwegian Krone" },
  { value: "DKK", label: "DKK - Danish Krone" }
];

interface CompanyInfo {
  companyName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  taxId: string;
  description: string;
}

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  companyName: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  phone: "",
  email: "",
  website: "",
  currency: "USD",
  taxId: "",
  description: ""
};

export function CompanyInfoSection({}: CompanyInfoSectionProps) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DEFAULT_COMPANY_INFO);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      // Use individual API calls for each setting key to match SettingsService approach
      const settingKeys = [
        'company.companyName',
        'company.companyAddress',
        'company.companyPhone',
        'company.companyEmail',
        'company.companyWebsite',
        'company.defaultCurrency',
        'company.defaultTaxRate'
      ];

      const companyData: Partial<CompanyInfo> = {};
      
      for (const key of settingKeys) {
        try {
          const response = await fetch(`/api/settings/${encodeURIComponent(key)}`);
          if (response.ok) {
            const data = await response.json();
            
            // Map settings keys to local properties
            switch(key) {
              case 'company.companyName':
                companyData.companyName = data.value;
                break;
              case 'company.companyAddress':
                companyData.address = data.value;
                break;
              case 'company.companyPhone':
                companyData.phone = data.value;
                break;
              case 'company.companyEmail':
                companyData.email = data.value;
                break;
              case 'company.companyWebsite':
                companyData.website = data.value;
                break;
              case 'company.defaultCurrency':
                companyData.currency = data.value;
                break;
              case 'company.defaultTaxRate':
                // Note: defaultTaxRate is not part of CompanyInfo interface, skip for now
                break;
            }
          }
        } catch (err) {
          console.log(`Setting ${key} not found, using default`);
        }
      }

      setCompanyInfo({ ...DEFAULT_COMPANY_INFO, ...companyData });
    } catch (err) {
      console.error('Failed to load company info:', err);
      error('Failed to load company information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Use individual PUT requests to match SettingsService approach
      const settingsToSave = [
        { key: 'company.companyName', value: companyInfo.companyName },
        { key: 'company.companyAddress', value: companyInfo.address },
        { key: 'company.companyPhone', value: companyInfo.phone },
        { key: 'company.companyEmail', value: companyInfo.email },
        { key: 'company.companyWebsite', value: companyInfo.website },
        { key: 'company.defaultCurrency', value: companyInfo.currency },
      ];

      const savePromises = settingsToSave.map(async ({ key, value }) => {
        const response = await fetch(`/api/settings/${encodeURIComponent(key)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save ${key}`);
        }
      });

      await Promise.all(savePromises);
      
      setHasChanges(false);
      success('Company information saved successfully');
    } catch (err) {
      console.error('Failed to save company info:', err);
      error('Failed to save company information');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    loadCompanyInfo();
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading company information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Basic company details used in invoices and system branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                value={companyInfo.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Your Company Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-id">Tax ID / Registration Number</Label>
              <Input
                id="tax-id"
                value={companyInfo.taxId}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                placeholder="Tax ID or registration number"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={companyInfo.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={companyInfo.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State / Province</Label>
              <Input
                id="state"
                value={companyInfo.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="State or province"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip-code">ZIP / Postal Code</Label>
              <Input
                id="zip-code"
                value={companyInfo.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                placeholder="ZIP or postal code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={companyInfo.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Company Description</Label>
            <Textarea
              id="description"
              value={companyInfo.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of your company (optional)"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>
            Contact details for customer communication and invoicing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-email">Company Email</Label>
              <Input
                id="company-email"
                type="email"
                value={companyInfo.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-phone">Phone Number</Label>
              <Input
                id="company-phone"
                type="tel"
                value={companyInfo.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={companyInfo.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <Select
                value={companyInfo.currency}
                onValueChange={(value) => handleInputChange('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map(currency => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="flex justify-end space-x-2">
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
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
}