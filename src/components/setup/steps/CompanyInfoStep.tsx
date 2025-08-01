"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, Mail, Phone, Globe, DollarSign, AlertCircle } from "lucide-react";
import type { SetupStepProps } from "@/types/setup";
import { validateCompanyInfo } from "@/types/setup";

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

export function CompanyInfoStep({ data, updateData, setIsValid }: SetupStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const validation = validateCompanyInfo(data.companyInfo);
    setErrors(validation.errors);
    setIsValid(validation.isValid);
  }, [data.companyInfo, setIsValid]);

  const updateCompanyInfo = useCallback((field: string, value: string | number) => {
    updateData(prevData => ({
      companyInfo: {
        ...prevData.companyInfo,
        [field]: value
      }
    }));
  }, [updateData]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
          <Building className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Company Information
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Add your company details for invoices and billing.
        </p>
      </div>

      {/* Form Fields */}
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        {/* Company Name */}
        <div>
          <Label htmlFor="company-name" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Company Name *
          </Label>
          <Input
            id="company-name"
            type="text"
            placeholder="Your Company Inc."
            value={data.companyInfo.companyName}
            onChange={(e) => updateCompanyInfo('companyName', e.target.value)}
            className={errors.companyName ? 'border-red-300' : ''}
          />
          {errors.companyName && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.companyName}
            </p>
          )}
        </div>

        {/* Company Address */}
        <div>
          <Label htmlFor="company-address">
            Company Address *
          </Label>
          <Textarea
            id="company-address"
            placeholder="123 Business Street&#10;Suite 100&#10;City, State 12345&#10;Country"
            value={data.companyInfo.companyAddress}
            onChange={(e) => updateCompanyInfo('companyAddress', e.target.value)}
            className={errors.companyAddress ? 'border-red-300' : ''}
            rows={4}
          />
          {errors.companyAddress && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.companyAddress}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Full mailing address for invoices and legal documents
          </p>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company-phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="company-phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={data.companyInfo.companyPhone}
              onChange={(e) => updateCompanyInfo('companyPhone', e.target.value)}
              className={errors.companyPhone ? 'border-red-300' : ''}
            />
            {errors.companyPhone && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.companyPhone}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="company-email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Company Email *
            </Label>
            <Input
              id="company-email"
              type="email"
              placeholder="info@yourcompany.com"
              value={data.companyInfo.companyEmail}
              onChange={(e) => updateCompanyInfo('companyEmail', e.target.value)}
              className={errors.companyEmail ? 'border-red-300' : ''}
            />
            {errors.companyEmail && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.companyEmail}
              </p>
            )}
          </div>
        </div>

        {/* Website */}
        <div>
          <Label htmlFor="company-website" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Company Website
          </Label>
          <Input
            id="company-website"
            type="url"
            placeholder="https://www.yourcompany.com"
            value={data.companyInfo.companyWebsite}
            onChange={(e) => updateCompanyInfo('companyWebsite', e.target.value)}
            className={errors.companyWebsite ? 'border-red-300' : ''}
          />
          {errors.companyWebsite && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.companyWebsite}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Optional - will appear on invoices if provided
          </p>
        </div>

        {/* Billing Defaults */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Billing Defaults
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Default Currency *
              </Label>
              <Select
                value={data.companyInfo.defaultCurrency}
                onValueChange={(value) => updateCompanyInfo('defaultCurrency', value)}
              >
                <SelectTrigger className={errors.defaultCurrency ? 'border-red-300' : ''}>
                  <SelectValue placeholder="Select currency..." />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.defaultCurrency && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.defaultCurrency}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="default-tax-rate">
                Default Tax Rate (%)
              </Label>
              <Input
                id="default-tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="8.25"
                value={data.companyInfo.defaultTaxRate}
                onChange={(e) => updateCompanyInfo('defaultTaxRate', parseFloat(e.target.value) || 0)}
                className={errors.defaultTaxRate ? 'border-red-300' : ''}
              />
              {errors.defaultTaxRate && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.defaultTaxRate}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Can be overridden per customer or invoice
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          This information will appear on invoices and can be updated later in company settings.
          Fields marked with * are required.
        </AlertDescription>
      </Alert>
    </div>
  );
}