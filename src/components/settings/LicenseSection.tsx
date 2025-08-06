"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Shield, AlertCircle, CheckCircle, XCircle, Users } from "lucide-react";
import { useState, useEffect } from "react";

interface LicenseStatus {
  isValid: boolean;
  licenseKey?: string;
  companyName?: string;
  userLimit?: number;
  currentUsers: number;
  features: string[];
  expiresAt?: string;
  tier: "free" | "professional" | "enterprise";
  error?: string;
}

interface LicenseSectionProps {
  // No props needed - each section manages its own state
}

export function LicenseSection({}: LicenseSectionProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newLicenseKey, setNewLicenseKey] = useState("");

  const fetchLicenseStatus = async () => {
    try {
      const response = await fetch("/api/license");
      if (response.ok) {
        const status = await response.json();
        setLicenseStatus(status);
        setLicenseKey(status.licenseKey || "");
        setNewLicenseKey(status.licenseKey || "");
      }
    } catch (error) {
      console.error("Error fetching license status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLicense = async () => {
    if (!newLicenseKey.trim()) return;
    
    setIsVerifying(true);
    setIsSaving(true);
    try {
      const response = await fetch("/api/license", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          licenseKey: newLicenseKey.trim(),
        }),
      });

      if (response.ok) {
        const status = await response.json();
        setLicenseStatus(status);
        setLicenseKey(status.licenseKey || "");
        // Settings change handled by component state
      } else {
        const error = await response.json();
        alert("Failed to verify license: " + error.error);
      }
    } catch (error) {
      console.error("Error verifying license:", error);
      alert("Failed to verify license");
    } finally {
      setIsVerifying(false);
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchLicenseStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
              <h3 className="mt-2 text-sm font-semibold">Loading license status...</h3>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!licenseStatus) return null;
    
    if (licenseStatus.isValid) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          <CheckCircle className="mr-1 h-3 w-3" />
          Active
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Invalid
        </Badge>
      );
    }
  };

  const getTierDisplayName = (tier: string) => {
    switch (tier) {
      case "free": return "Free";
      case "professional": return "Professional";
      case "enterprise": return "Enterprise";
      default: return tier;
    }
  };

  return (
    <div className="space-y-6">
      {/* License Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            License Status
          </CardTitle>
          <CardDescription>
            Current licensing information and status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">License Status</div>
              <div className="text-sm text-muted-foreground">
                {licenseStatus?.isValid ? "Active and validated" : "Invalid or expired"}
                {licenseStatus?.error && (
                  <span className="text-red-600"> - {licenseStatus.error}</span>
                )}
              </div>
            </div>
            {getStatusBadge()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-medium">License Type</div>
              <div className="text-sm text-muted-foreground">
                {licenseStatus ? getTierDisplayName(licenseStatus.tier) : "Unknown"}
              </div>
            </div>
            <div>
              <div className="font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                User Limit
              </div>
              <div className="text-sm text-muted-foreground">
                {licenseStatus?.currentUsers || 0} / {licenseStatus?.userLimit || 0} users
              </div>
            </div>
            {licenseStatus?.companyName && (
              <div>
                <div className="font-medium">Company</div>
                <div className="text-sm text-muted-foreground">{licenseStatus.companyName}</div>
              </div>
            )}
            {licenseStatus?.expiresAt && (
              <div>
                <div className="font-medium">Expires</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(licenseStatus.expiresAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* License Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">License Configuration</CardTitle>
          <CardDescription>
            Configure your license key and validation settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newLicenseKey">License Key</Label>
            <div className="flex gap-2">
              <Input
                id="newLicenseKey"
                type="text"
                value={newLicenseKey}
                onChange={(e) => {
                  setNewLicenseKey(e.target.value);
                  // Settings change handled by component state
                }}
                placeholder="Enter your license key (e.g., XXXX-XXXX-XXXX-XXXX)"
                className="font-mono"
              />
              <Button 
                variant="outline"
                onClick={handleVerifyLicense}
                disabled={isVerifying || !newLicenseKey.trim()}
              >
                {isVerifying ? (
                  <Key className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Key className="mr-2 h-4 w-4" />
                )}
                {isVerifying ? 'Verifying...' : 'Update & Verify'}
              </Button>
            </div>
            {licenseKey && (
              <p className="text-xs text-muted-foreground">
                Current key: {licenseKey.replace(/(.{4})/g, '$1-').slice(0, -1)}
              </p>
            )}
          </div>

          <div className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">
                  License Integration
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Your license is automatically verified periodically. Manual verification 
                  is only needed when changing license keys or troubleshooting connectivity issues.
                  Use format: XXXX-XXXX-XXXX-XXXX or ENT-XXXX-XXXX-XXXX for enterprise licenses.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feature Availability</CardTitle>
          <CardDescription>
            Features available with your current license.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Time Tracking</span>
              <Badge variant={licenseStatus?.features.includes("time_tracking") ? "default" : "secondary"} 
                className={licenseStatus?.features.includes("time_tracking") ? "bg-green-100 text-green-800" : ""}>
                {licenseStatus?.features.includes("time_tracking") ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Billing & Invoicing</span>
              <Badge variant={licenseStatus?.features.includes("billing") ? "default" : "secondary"} 
                className={licenseStatus?.features.includes("billing") ? "bg-green-100 text-green-800" : ""}>
                {licenseStatus?.features.includes("billing") ? "Enabled" : "Pro Feature"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Customer Portal</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">API Access</span>
              <Badge variant={licenseStatus?.features.includes("api_access") ? "default" : "secondary"} 
                className={licenseStatus?.features.includes("api_access") ? "bg-green-100 text-green-800" : ""}>
                {licenseStatus?.features.includes("api_access") ? "Enabled" : "Enterprise Feature"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Advanced Reporting</span>
              <Badge variant={licenseStatus?.features.includes("advanced_reporting") ? "default" : "secondary"} 
                className={licenseStatus?.features.includes("advanced_reporting") ? "bg-green-100 text-green-800" : ""}>
                {licenseStatus?.features.includes("advanced_reporting") ? "Enabled" : "Pro Feature"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Custom Fields</span>
              <Badge variant={licenseStatus?.features.includes("custom_fields") ? "default" : "secondary"} 
                className={licenseStatus?.features.includes("custom_fields") ? "bg-green-100 text-green-800" : ""}>
                {licenseStatus?.features.includes("custom_fields") ? "Enabled" : "Enterprise Feature"}
              </Badge>
            </div>
          </div>

          {licenseStatus?.tier === "free" && (
            <div className="mt-4 p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/50 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                    Free Tier Limitations
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    You are currently using the free tier with limited features and users ({licenseStatus?.currentUsers || 0}/{licenseStatus?.userLimit || 0} users). 
                    Consider upgrading to unlock additional features and increase user limits.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}