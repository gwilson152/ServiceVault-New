"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  User, 
  Settings, 
  Mail, 
  Building, 
  AlertCircle,
  Globe,
  DollarSign,
  Clock
} from "lucide-react";
import type { SetupStepProps } from "@/types/setup";

export function ReviewStep({ data, setIsValid }: SetupStepProps) {
  useEffect(() => {
    // Review step is always valid since all validation happened in previous steps
    setIsValid(true);
  }, [setIsValid]);

  const formatCurrency = (code: string) => {
    const currencyMap: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$',
      'JPY': '¥',
      'CHF': 'CHF',
      'SEK': 'kr',
      'NOK': 'kr',
      'DKK': 'kr'
    };
    return `${currencyMap[code] || code} (${code})`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Review Configuration
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Please review your configuration before completing the setup.
        </p>
      </div>

      {/* Admin Account */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Administrator Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
              <span className="text-sm font-medium">{data.adminAccount.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
              <span className="text-sm font-medium">{data.adminAccount.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Role:</span>
              <Badge variant="secondary">Administrator</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            System Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Application Name:</span>
              <span className="text-sm font-medium">{data.systemConfig.appName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Description:</span>
              <span className="text-sm font-medium">{data.systemConfig.appDescription}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Base URL:</span>
              <span className="text-sm font-medium flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {data.systemConfig.baseUrl}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Timezone:</span>
              <span className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {data.systemConfig.timezone}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Date Format:</span>
              <span className="text-sm font-medium">{data.systemConfig.dateFormat}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Language:</span>
              <span className="text-sm font-medium">{data.systemConfig.language.toUpperCase()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Email Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.emailConfig.enableEmailNotifications ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Enabled
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">SMTP Host:</span>
                <span className="text-sm font-medium">{data.emailConfig.smtpHost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Port:</span>
                <span className="text-sm font-medium">
                  {data.emailConfig.smtpPort} ({data.emailConfig.smtpSecure ? 'TLS' : 'Plain'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">From Address:</span>
                <span className="text-sm font-medium">{data.emailConfig.fromAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">From Name:</span>
                <span className="text-sm font-medium">{data.emailConfig.fromName}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
              <Badge variant="secondary">Disabled</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building className="h-4 w-4" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Company Name:</span>
              <span className="text-sm font-medium">{data.companyInfo.companyName}</span>
            </div>
            <div className="flex justify-start">
              <span className="text-sm text-gray-600 dark:text-gray-400 mr-4 mt-1">Address:</span>
              <div className="text-sm font-medium whitespace-pre-line">
                {data.companyInfo.companyAddress}
              </div>
            </div>
            {data.companyInfo.companyPhone && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Phone:</span>
                <span className="text-sm font-medium">{data.companyInfo.companyPhone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
              <span className="text-sm font-medium">{data.companyInfo.companyEmail}</span>
            </div>
            {data.companyInfo.companyWebsite && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Website:</span>
                <span className="text-sm font-medium">{data.companyInfo.companyWebsite}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Default Currency:</span>
                <span className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(data.companyInfo.defaultCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Default Tax Rate:</span>
                <span className="text-sm font-medium">{data.companyInfo.defaultTaxRate}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Notice */}
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong>Ready to Complete Setup!</strong>
          <br />
          All configuration looks good. Click "Complete Setup" to finalize your Service Vault installation.
        </AlertDescription>
      </Alert>

      {/* Security Notice */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>What happens next:</strong>
          <ul className="mt-2 text-sm space-y-1">
            <li>• Your admin account will be created with encrypted password</li>
            <li>• All settings will be saved securely to the database</li>
            <li>• You'll be redirected to the login page to start using the system</li>
            <li>• All settings can be modified later through the settings page</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}