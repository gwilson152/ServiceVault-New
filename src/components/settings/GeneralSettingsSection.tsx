"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, AlertCircle, CheckCircle, Settings, Globe, Clock, RotateCcw } from "lucide-react";
import { CompanyInfoSection } from "./CompanyInfoSection";
import { useToast } from "@/hooks/useToast";

interface GeneralSettingsSectionProps {
  onSettingsChange: () => void;
}

interface SystemSettings {
  appName: string;
  appDescription: string;
  supportEmail: string;
  timezone: string;
  dateFormat: string;
  language: string;
  defaultTaxRate: number;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  maintenanceMode: boolean;
}

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

const DEFAULT_SETTINGS: SystemSettings = {
  appName: "Service Vault",
  appDescription: "Time management and invoicing system for internal business use",
  supportEmail: "support@example.com",
  timezone: "America/New_York",
  dateFormat: "MM/DD/YYYY",
  language: "en",
  defaultTaxRate: 8.0,
  enableEmailNotifications: true,
  enableSMSNotifications: false,
  maintenanceMode: false,
};

export function GeneralSettingsSection({ onSettingsChange }: GeneralSettingsSectionProps) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/system');
      if (response.ok) {
        const data = await response.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      } else {
        console.log('No system settings found, using defaults');
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
      error('Failed to load system settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (key: keyof SystemSettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    onSettingsChange();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setHasChanges(false);
        success('System settings saved successfully');
      } else {
        const data = await response.json();
        error('Failed to save system settings', data.error);
      }
    } catch (err) {
      console.error('Failed to save system settings:', err);
      error('Failed to save system settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    loadSettings();
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Information Section */}
      <CompanyInfoSection onSettingsChange={onSettingsChange} />

      {/* Application Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Application Information
          </CardTitle>
          <CardDescription>
            Basic information about your Service Vault installation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appName">Application Name</Label>
              <Input
                id="appName"
                value={settings.appName}
                onChange={(e) => handleSettingChange('appName', e.target.value)}
                placeholder="Service Vault"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={settings.supportEmail}
                onChange={(e) => handleSettingChange('supportEmail', e.target.value)}
                placeholder="support@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appDescription">Application Description</Label>
            <Textarea
              id="appDescription"
              value={settings.appDescription}
              onChange={(e) => handleSettingChange('appDescription', e.target.value)}
              placeholder="Describe your Service Vault installation..."
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* System Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="mr-2 h-5 w-5" />
            System Configuration
          </CardTitle>
          <CardDescription>
            Configure timezone, date formats, and localization preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => handleSettingChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={settings.dateFormat}
                onValueChange={(value) => handleSettingChange('dateFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMAT_OPTIONS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => handleSettingChange('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
            <Input
              id="defaultTaxRate"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={settings.defaultTaxRate}
              onChange={(e) => handleSettingChange('defaultTaxRate', parseFloat(e.target.value) || 0)}
              placeholder="8.0"
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification Settings</CardTitle>
          <CardDescription>
            Configure system-wide notification preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailNotifications">Email Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Send email notifications for ticket updates and system events
              </div>
            </div>
            <Switch
              id="emailNotifications"
              checked={settings.enableEmailNotifications}
              onCheckedChange={(checked) => handleSettingChange('enableEmailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="smsNotifications">SMS Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Send SMS notifications for urgent updates (requires SMS provider)
              </div>
            </div>
            <Switch
              id="smsNotifications"
              checked={settings.enableSMSNotifications}
              onCheckedChange={(checked) => handleSettingChange('enableSMSNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Settings</CardTitle>
          <CardDescription>
            Advanced system configuration options.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
              <div className="text-sm text-muted-foreground">
                Enable maintenance mode to prevent user access during updates
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {settings.maintenanceMode && (
                <Badge variant="destructive">Active</Badge>
              )}
              <Switch
                id="maintenanceMode"
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => handleSettingChange('maintenanceMode', checked)}
              />
            </div>
          </div>

          {settings.maintenanceMode && (
            <div className="p-4 border border-orange-200 bg-orange-50 dark:bg-orange-950/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Maintenance mode is enabled. Users will see a maintenance page when trying to access the system.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Section */}
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
            {isSaving ? 'Saving...' : 'Save System Settings'}
          </Button>
        </div>
      )}
    </div>
  );
}