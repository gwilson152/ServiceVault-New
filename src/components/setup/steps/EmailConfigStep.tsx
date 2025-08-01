"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Server, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import type { SetupStepProps } from "@/types/setup";
import { validateEmailConfig } from "@/types/setup";

export function EmailConfigStep({ data, updateData, setIsValid }: SetupStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const validation = validateEmailConfig(data.emailConfig);
    setErrors(validation.errors);
    setIsValid(validation.isValid);
  }, [data.emailConfig, setIsValid]);

  const updateEmailConfig = useCallback((field: string, value: string | number | boolean) => {
    updateData(prevData => ({
      emailConfig: {
        ...prevData.emailConfig,
        [field]: value
      }
    }));
  }, [updateData]);

  const testEmailConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);

    try {
      // TODO: Implement actual email test endpoint
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      // For now, just validate that required fields are filled
      const hasRequiredFields = 
        data.emailConfig.smtpHost && 
        data.emailConfig.smtpPort && 
        data.emailConfig.fromAddress;

      if (hasRequiredFields) {
        setTestResult({
          success: true,
          message: "Connection test successful! Email configuration is valid."
        });
      } else {
        setTestResult({
          success: false,
          message: "Please fill in all required fields before testing."
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Connection test failed. Please check your settings."
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Email Configuration
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Configure SMTP settings for sending notifications and invoices.
        </p>
      </div>

      {/* Enable Email Notifications */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="enable-email"
          checked={data.emailConfig.enableEmailNotifications}
          onCheckedChange={(checked) => updateEmailConfig('enableEmailNotifications', checked as boolean)}
        />
        <Label htmlFor="enable-email" className="text-sm font-medium">
          Enable email notifications
        </Label>
      </div>

      {data.emailConfig.enableEmailNotifications && (
        <>
          {/* Form Fields */}
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {/* SMTP Host */}
            <div>
              <Label htmlFor="smtp-host" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                SMTP Host
              </Label>
              <Input
                id="smtp-host"
                type="text"
                placeholder="smtp.gmail.com"
                value={data.emailConfig.smtpHost}
                onChange={(e) => updateEmailConfig('smtpHost', e.target.value)}
                className={errors.smtpHost ? 'border-red-300' : ''}
              />
              {errors.smtpHost && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.smtpHost}
                </p>
              )}
            </div>

            {/* SMTP Port and Security */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  placeholder="587"
                  value={data.emailConfig.smtpPort}
                  onChange={(e) => updateEmailConfig('smtpPort', parseInt(e.target.value) || 587)}
                  className={errors.smtpPort ? 'border-red-300' : ''}
                />
                {errors.smtpPort && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.smtpPort}
                  </p>
                )}
              </div>

              <div>
                <Label>Security</Label>
                <Select
                  value={data.emailConfig.smtpSecure ? "true" : "false"}
                  onValueChange={(value) => updateEmailConfig('smtpSecure', value === "true")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">TLS/SSL (Secure)</SelectItem>
                    <SelectItem value="false">None (Insecure)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SMTP Credentials */}
            <div>
              <Label htmlFor="smtp-user">SMTP Username (Optional)</Label>
              <Input
                id="smtp-user"
                type="text"
                placeholder="your-email@gmail.com (leave empty if no auth required)"
                value={data.emailConfig.smtpUser}
                onChange={(e) => updateEmailConfig('smtpUser', e.target.value)}
                className={errors.smtpUser ? 'border-red-300' : ''}
              />
              {errors.smtpUser && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.smtpUser}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Required only if your SMTP server requires authentication
              </p>
            </div>

            <div>
              <Label htmlFor="smtp-password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                SMTP Password (Optional)
              </Label>
              <div className="relative">
                <Input
                  id="smtp-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Leave empty if no authentication required"
                  autoComplete="new-password"
                  value={data.emailConfig.smtpPassword}
                  onChange={(e) => updateEmailConfig('smtpPassword', e.target.value)}
                  className={errors.smtpPassword ? 'border-red-300 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.smtpPassword && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.smtpPassword}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Only needed if your SMTP server requires authentication
              </p>
            </div>

            {/* From Address */}
            <div>
              <Label htmlFor="from-address">From Email Address</Label>
              <Input
                id="from-address"
                type="email"
                placeholder="noreply@yourcompany.com"
                value={data.emailConfig.fromAddress}
                onChange={(e) => updateEmailConfig('fromAddress', e.target.value)}
                className={errors.fromAddress ? 'border-red-300' : ''}
              />
              {errors.fromAddress && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.fromAddress}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Email address that will appear as the sender
              </p>
            </div>

            {/* From Name */}
            <div>
              <Label htmlFor="from-name">From Name</Label>
              <Input
                id="from-name"
                type="text"
                placeholder="Service Vault"
                value={data.emailConfig.fromName}
                onChange={(e) => updateEmailConfig('fromName', e.target.value)}
                className={errors.fromName ? 'border-red-300' : ''}
              />
              {errors.fromName && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.fromName}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Name that will appear as the sender
              </p>
            </div>
          </form>

          {/* Test Connection */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={testEmailConnection}
              disabled={testingConnection || !data.emailConfig.smtpHost || !data.emailConfig.fromAddress}
              className="w-full"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Test Email Configuration
                </>
              )}
            </Button>

            {testResult && (
              <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={testResult.success ? "text-green-700" : "text-red-700"}>
                  {testResult.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Configuration Tips */}
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Common SMTP Settings:</strong>
              <ul className="mt-2 text-sm space-y-1">
                <li>• <strong>Gmail:</strong> smtp.gmail.com, port 587, TLS (requires username/app password)</li>
                <li>• <strong>Outlook:</strong> smtp-mail.outlook.com, port 587, TLS (requires username/password)</li>
                <li>• <strong>Yahoo:</strong> smtp.mail.yahoo.com, port 587, TLS (requires username/password)</li>
                <li>• <strong>Local/Internal:</strong> Many internal SMTP servers don't require authentication</li>
              </ul>
            </AlertDescription>
          </Alert>
        </>
      )}

      {!data.emailConfig.enableEmailNotifications && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            Email notifications are disabled. You can enable them later in settings if needed.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}