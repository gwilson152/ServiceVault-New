"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, AlertCircle, CheckCircle } from "lucide-react";

interface GeneralSettingsSectionProps {
  onSettingsChange: () => void;
}

interface GeneralSettings {
  appName: string;
  appDescription: string;
  supportEmail: string;
  companyName: string;
  companyAddress: string;
  timezone: string;
  dateFormat: string;
  defaultTaxRate: number;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  maintenanceMode: boolean;
}

export function GeneralSettingsSection({ onSettingsChange }: GeneralSettingsSectionProps) {
  const [settings, setSettings] = useState<GeneralSettings>({
    appName: "Service Vault",
    appDescription: "Time management and invoicing system for internal business use",
    supportEmail: "support@example.com",
    companyName: "Your Company Name",
    companyAddress: "123 Business St, City, State 12345",
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    defaultTaxRate: 8.0,
    enableEmailNotifications: true,
    enableSMSNotifications: false,
    maintenanceMode: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSettingChange = (key: keyof GeneralSettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    onSettingsChange();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement API call to save general settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const timezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "UTC",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
  ];

  const dateFormats = [
    "MM/DD/YYYY",
    "DD/MM/YYYY",
    "YYYY-MM-DD",
    "MMM DD, YYYY",
  ];

  return (
    <div className="space-y-6">
      {/* Application Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Application Information</CardTitle>
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

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Company Information</CardTitle>
          <CardDescription>
            Your company details for invoices and communications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={settings.companyName}
              onChange={(e) => handleSettingChange('companyName', e.target.value)}
              placeholder="Your Company Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyAddress">Company Address</Label>
            <Textarea
              id="companyAddress"
              value={settings.companyAddress}
              onChange={(e) => handleSettingChange('companyAddress', e.target.value)}
              placeholder="123 Business St, City, State 12345"
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Regional Settings</CardTitle>
          <CardDescription>
            Configure timezone, date formats, and localization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
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
                  {dateFormats.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format}
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
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-2">
          {saveStatus === 'success' && (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Settings saved successfully</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">Failed to save settings</span>
            </>
          )}
        </div>
        
        <Button 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving && <Save className="mr-2 h-4 w-4 animate-spin" />}
          {!isSaving && <Save className="mr-2 h-4 w-4" />}
          {isSaving ? 'Saving...' : 'Save General Settings'}
        </Button>
      </div>
    </div>
  );
}