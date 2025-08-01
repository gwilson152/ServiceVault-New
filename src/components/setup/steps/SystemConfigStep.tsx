"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Globe, Clock, AlertCircle } from "lucide-react";
import type { SetupStepProps } from "@/types/setup";
import { validateSystemConfig } from "@/types/setup";

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Australia/Sydney", label: "Sydney" }
];

const DATE_FORMAT_OPTIONS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (European)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" }
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" }
];

export function SystemConfigStep({ data, updateData, setIsValid }: SetupStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const validation = validateSystemConfig(data.systemConfig);
    setErrors(validation.errors);
    setIsValid(validation.isValid);
  }, [data.systemConfig, setIsValid]);

  const updateSystemConfig = useCallback((field: string, value: string) => {
    updateData(prevData => ({
      systemConfig: {
        ...prevData.systemConfig,
        [field]: value
      }
    }));
  }, [updateData]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
          <Settings className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          System Configuration
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Configure basic system settings and preferences.
        </p>
      </div>

      {/* Form Fields */}
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        {/* App Name */}
        <div>
          <Label htmlFor="app-name" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Application Name
          </Label>
          <Input
            id="app-name"
            type="text"
            placeholder="Service Vault"
            value={data.systemConfig.appName}
            onChange={(e) => updateSystemConfig('appName', e.target.value)}
            className={errors.appName ? 'border-red-300' : ''}
          />
          {errors.appName && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.appName}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            This name will appear in the browser title and navigation
          </p>
        </div>

        {/* App Description */}
        <div>
          <Label htmlFor="app-description">
            Application Description
          </Label>
          <Input
            id="app-description"
            type="text"
            placeholder="Time Management and Invoicing System"
            value={data.systemConfig.appDescription}
            onChange={(e) => updateSystemConfig('appDescription', e.target.value)}
            className={errors.appDescription ? 'border-red-300' : ''}
          />
          {errors.appDescription && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.appDescription}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Brief description of your system's purpose
          </p>
        </div>

        {/* Base URL */}
        <div>
          <Label htmlFor="base-url" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Base URL
          </Label>
          <Input
            id="base-url"
            type="url"
            placeholder="https://yourdomain.com"
            value={data.systemConfig.baseUrl}
            onChange={(e) => updateSystemConfig('baseUrl', e.target.value)}
            className={errors.baseUrl ? 'border-red-300' : ''}
          />
          {errors.baseUrl && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.baseUrl}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            The public URL where your application will be accessible
          </p>
        </div>

        {/* Timezone */}
        <div>
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Default Timezone
          </Label>
          <Select
            value={data.systemConfig.timezone}
            onValueChange={(value) => updateSystemConfig('timezone', value)}
          >
            <SelectTrigger className={errors.timezone ? 'border-red-300' : ''}>
              <SelectValue placeholder="Select timezone..." />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.timezone && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.timezone}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Used for displaying dates and times throughout the system
          </p>
        </div>

        {/* Date Format */}
        <div>
          <Label>Date Format</Label>
          <Select
            value={data.systemConfig.dateFormat}
            onValueChange={(value) => updateSystemConfig('dateFormat', value)}
          >
            <SelectTrigger className={errors.dateFormat ? 'border-red-300' : ''}>
              <SelectValue placeholder="Select date format..." />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.dateFormat && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.dateFormat}
            </p>
          )}
        </div>

        {/* Language */}
        <div>
          <Label>Language</Label>
          <Select
            value={data.systemConfig.language}
            onValueChange={(value) => updateSystemConfig('language', value)}
          >
            <SelectTrigger className={errors.language ? 'border-red-300' : ''}>
              <SelectValue placeholder="Select language..." />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.language && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.language}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Primary language for the user interface
          </p>
        </div>
      </form>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          These settings can be changed later in the system settings page.
        </AlertDescription>
      </Alert>
    </div>
  );
}