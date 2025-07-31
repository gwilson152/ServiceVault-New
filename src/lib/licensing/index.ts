import { prisma } from "@/lib/prisma";

export interface LicenseStatus {
  isValid: boolean;
  licenseKey?: string;
  companyName?: string;
  userLimit?: number;
  currentUsers: number;
  features: string[];
  expiresAt?: Date;
  tier: "free" | "professional" | "enterprise";
  error?: string;
}

export interface LicenseValidationResponse {
  valid: boolean;
  company_name?: string;
  user_limit?: number;
  features?: string[];
  expires_at?: string;
  tier?: string;
  error?: string;
}

class LicensingService {
  private static instance: LicensingService;
  private cachedStatus: LicenseStatus | null = null;
  private lastCheck: number = 0;
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  static getInstance(): LicensingService {
    if (!LicensingService.instance) {
      LicensingService.instance = new LicensingService();
    }
    return LicensingService.instance;
  }

  async validateLicense(licenseKey: string): Promise<LicenseStatus> {
    try {
      // Check cache first
      if (this.cachedStatus && Date.now() - this.lastCheck < this.CACHE_DURATION) {
        return this.cachedStatus;
      }

      const currentUsers = await this.getCurrentUserCount();

      // If no license key, return free tier
      if (!licenseKey) {
        const freeStatus: LicenseStatus = {
          isValid: true,
          tier: "free",
          userLimit: 5,
          currentUsers,
          features: ["basic_support", "time_tracking", "basic_reporting"],
        };
        this.cachedStatus = freeStatus;
        this.lastCheck = Date.now();
        return freeStatus;
      }

      // Make API call to licensing server
      const apiUrl = process.env.LICENSING_API_URL;
      if (!apiUrl) {
        console.warn("LICENSING_API_URL not configured, using offline validation");
        return this.getOfflineValidation(licenseKey, currentUsers);
      }

      const response = await fetch(`${apiUrl}/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.LICENSING_API_KEY}`,
        },
        body: JSON.stringify({
          license_key: licenseKey,
          current_users: currentUsers,
        }),
      });

      const data: LicenseValidationResponse = await response.json();

      const status: LicenseStatus = {
        isValid: data.valid,
        licenseKey,
        companyName: data.company_name,
        userLimit: data.user_limit,
        currentUsers,
        features: data.features || [],
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
        tier: (data.tier as "free" | "professional" | "enterprise") || "free",
        error: data.error,
      };

      this.cachedStatus = status;
      this.lastCheck = Date.now();

      // Store license status in database for offline use
      await this.storeLicenseStatus(status);

      return status;
    } catch (error) {
      console.error("Error validating license:", error);
      
      // Try to get cached license from database
      const cachedLicense = await this.getCachedLicenseStatus();
      if (cachedLicense) {
        return cachedLicense;
      }

      // Fallback to free tier
      const currentUsers = await this.getCurrentUserCount();
      return {
        isValid: true,
        tier: "free",
        userLimit: 5,
        currentUsers,
        features: ["basic_support", "time_tracking", "basic_reporting"],
        error: "Unable to validate license, using cached/free tier",
      };
    }
  }

  private async getCurrentUserCount(): Promise<number> {
    try {
      return await prisma.user.count({
        where: {
          role: {
            in: ["ADMIN", "EMPLOYEE", "ACCOUNT_USER"]
          }
        }
      });
    } catch (error) {
      console.error("Error getting user count:", error);
      return 0;
    }
  }

  private async getOfflineValidation(licenseKey: string, currentUsers: number): Promise<LicenseStatus> {
    // Simple offline validation - in production, this would use cryptographic validation
    const isValidFormat = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseKey);
    
    if (!isValidFormat) {
      return {
        isValid: false,
        currentUsers,
        features: [],
        tier: "free",
        error: "Invalid license key format",
      };
    }

    // Mock validation based on license key pattern
    let tier: "free" | "professional" | "enterprise" = "professional";
    let userLimit = 25;
    let features = ["professional_support", "time_tracking", "advanced_reporting", "billing"];

    if (licenseKey.startsWith("ENT-")) {
      tier = "enterprise";
      userLimit = 100;
      features = ["enterprise_support", "time_tracking", "advanced_reporting", "billing", "custom_fields", "api_access"];
    }

    return {
      isValid: true,
      licenseKey,
      userLimit,
      currentUsers,
      features,
      tier,
    };
  }

  private async storeLicenseStatus(status: LicenseStatus): Promise<void> {
    try {
      await prisma.systemSettings.upsert({
        where: { key: "license_status" },
        update: {
          jsonValue: status,
          updatedAt: new Date(),
        },
        create: {
          key: "license_status",
          description: "Cached license validation status",
          jsonValue: status,
        },
      });
    } catch (error) {
      console.error("Error storing license status:", error);
    }
  }

  private async getCachedLicenseStatus(): Promise<LicenseStatus | null> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: "license_status" },
      });

      if (setting?.jsonValue) {
        const status = setting.jsonValue as LicenseStatus;
        status.currentUsers = await this.getCurrentUserCount();
        return status;
      }
    } catch (error) {
      console.error("Error getting cached license status:", error);
    }
    return null;
  }

  async checkFeatureAccess(feature: string): Promise<boolean> {
    const licenseKey = await this.getLicenseKey();
    const status = await this.validateLicense(licenseKey || "");
    return status.isValid && status.features.includes(feature);
  }

  async checkUserLimit(): Promise<{ allowed: boolean; current: number; limit: number }> {
    const licenseKey = await this.getLicenseKey();
    const status = await this.validateLicense(licenseKey || "");
    
    return {
      allowed: status.currentUsers < (status.userLimit || 5),
      current: status.currentUsers,
      limit: status.userLimit || 5,
    };
  }

  private async getLicenseKey(): Promise<string | null> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: "license_key" },
      });
      return setting?.value || null;
    } catch (error) {
      console.error("Error getting license key:", error);
      return null;
    }
  }

  async updateLicenseKey(licenseKey: string): Promise<LicenseStatus> {
    try {
      // Store the new license key
      await prisma.systemSettings.upsert({
        where: { key: "license_key" },
        update: {
          value: licenseKey,
          updatedAt: new Date(),
        },
        create: {
          key: "license_key",
          description: "Software license key",
          value: licenseKey,
        },
      });

      // Clear cache and validate new key
      this.cachedStatus = null;
      this.lastCheck = 0;

      return await this.validateLicense(licenseKey);
    } catch (error) {
      console.error("Error updating license key:", error);
      throw new Error("Failed to update license key");
    }
  }

  async getLicenseStatus(): Promise<LicenseStatus> {
    const licenseKey = await this.getLicenseKey();
    return await this.validateLicense(licenseKey || "");
  }

  // Clear cache when needed
  clearCache(): void {
    this.cachedStatus = null;
    this.lastCheck = 0;
  }
}

export const licensingService = LicensingService.getInstance();

// Feature constants
export const FEATURES = {
  BASIC_SUPPORT: "basic_support",
  PROFESSIONAL_SUPPORT: "professional_support",
  ENTERPRISE_SUPPORT: "enterprise_support",
  TIME_TRACKING: "time_tracking",
  BASIC_REPORTING: "basic_reporting",
  ADVANCED_REPORTING: "advanced_reporting",
  BILLING: "billing",
  CUSTOM_FIELDS: "custom_fields",
  API_ACCESS: "api_access",
  MULTIPLE_ACCOUNTS: "multiple_accounts",
  ADVANCED_PERMISSIONS: "advanced_permissions",
} as const;