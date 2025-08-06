import { PrismaClient } from '@prisma/client';
import { SETTING_DEFINITIONS, SettingsCategory, type SettingDefinition, type SystemSetting } from '@/types/settings';
import { permissionService } from '@/lib/permissions/PermissionService';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Settings service for managing application configuration
 * Provides type-safe getters/setters with validation and encryption support
 */
export class SettingsService {
  /**
   * Get a setting value with optional default and permission checking
   */
  async get<T = any>(key: string, defaultValue?: T, userId?: string): Promise<T> {
    try {
      // Check read permissions if userId provided
      if (userId) {
        const canRead = await this.checkReadPermission(userId, key);
        if (!canRead) {
          throw new Error(`Access denied: User ${userId} cannot read setting ${key}`);
        }
      }

      const setting = await prisma.systemSettings.findUnique({
        where: { key }
      });

      if (!setting) {
        // Return default value from definition or provided default
        const definition = SETTING_DEFINITIONS[key];
        return (definition?.defaultValue ?? defaultValue) as T;
      }

      // Return appropriate value based on setting type
      if (setting.value !== null) {
        const definition = SETTING_DEFINITIONS[key];
        return this.parseValue(setting.value, definition?.type || 'string') as T;
      }

      return (defaultValue ?? null) as T;
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return (defaultValue ?? null) as T;
    }
  }

  /**
   * Set a setting value with validation and permission checking
   */
  async set(key: string, value: any, description?: string, userId?: string): Promise<void> {
    try {
      // Check write permissions if userId provided
      if (userId) {
        const canWrite = await this.checkWritePermission(userId, key);
        if (!canWrite) {
          throw new Error(`Access denied: User ${userId} cannot write setting ${key}`);
        }
      }

      const definition = SETTING_DEFINITIONS[key];
      
      // Validate the value if definition exists
      if (definition && !this.validateValue(value, definition)) {
        throw new Error(`Invalid value for setting ${key}`);
      }

      // Store all values as strings, parse on retrieval
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      await prisma.systemSettings.upsert({
        where: { key },
        update: {
          value: stringValue,
          updatedAt: new Date()
        },
        create: {
          key,
          value: stringValue
        }
      });
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple settings by category
   */
  async getByCategory(category: SettingsCategory): Promise<Record<string, any>> {
    try {
      const categoryKeys = Object.keys(SETTING_DEFINITIONS).filter(
        key => SETTING_DEFINITIONS[key].category === category
      );

      const settings: Record<string, any> = {};
      
      for (const key of categoryKeys) {
        settings[key] = await this.get(key);
      }

      return settings;
    } catch (error) {
      console.error(`Error getting settings for category ${category}:`, error);
      return {};
    }
  }

  /**
   * Set multiple settings at once
   */
  async setMany(settings: Record<string, any>): Promise<void> {
    try {
      const operations = Object.entries(settings).map(([key, value]) => 
        this.set(key, value)
      );
      
      await Promise.all(operations);
    } catch (error) {
      console.error('Error setting multiple settings:', error);
      throw error;
    }
  }

  /**
   * Get all settings as a flat object
   */
  async getAll(): Promise<Record<string, any>> {
    try {
      const allSettings = await prisma.systemSettings.findMany();
      const result: Record<string, any> = {};

      for (const setting of allSettings) {
        if (setting.value !== null) {
          const definition = SETTING_DEFINITIONS[setting.key];
          result[setting.key] = this.parseValue(setting.value, definition?.type || 'string');
        }
      }

      // Add default values for missing settings
      for (const [key, definition] of Object.entries(SETTING_DEFINITIONS)) {
        if (!(key in result) && definition.defaultValue !== undefined) {
          result[key] = definition.defaultValue;
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting all settings:', error);
      return {};
    }
  }

  /**
   * Delete a setting
   */
  async delete(key: string): Promise<void> {
    try {
      await prisma.systemSettings.delete({
        where: { key }
      });
    } catch (error) {
      console.error(`Error deleting setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if setup is required
   */
  async isSetupRequired(): Promise<boolean> {
    try {
      // Check if we have any users at all
      const userCount = await prisma.user.count();
      
      // Setup is required if no users exist
      return userCount === 0;
    } catch (error) {
      console.error('Error checking setup status:', error);
      return true; // Default to requiring setup on error
    }
  }

  /**
   * Mark setup as completed
   */
  async markSetupComplete(): Promise<void> {
    try {
      await this.set('system.setupCompleted', true, 'Setup completion marker');
      await this.set('system.setupCompletedAt', new Date().toISOString(), 'Setup completion timestamp');
    } catch (error) {
      console.error('Error marking setup as complete:', error);
      throw error;
    }
  }

  /**
   * Validate a setting value against its definition
   */
  private validateValue(value: any, definition: SettingDefinition): boolean {
    try {
      // Check required values
      if (definition.required && (value === null || value === undefined || value === '')) {
        return false;
      }

      // Type checking
      switch (definition.type) {
        case 'string':
          if (typeof value !== 'string') return false;
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) return false;
          break;
        case 'boolean':
          if (typeof value !== 'boolean') return false;
          break;
        case 'json':
          // JSON values can be any type
          break;
        case 'encrypted':
          if (typeof value !== 'string') return false;
          break;
      }

      // Custom validation
      if (definition.validation && !definition.validation(value)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating setting value:', error);
      return false;
    }
  }

  /**
   * Parse a string value based on its type
   */
  private parseValue(value: string, type: string): any {
    try {
      switch (type) {
        case 'number':
          return parseFloat(value);
        case 'boolean':
          return value.toLowerCase() === 'true';
        case 'json':
          return JSON.parse(value);
        default:
          return value;
      }
    } catch (error) {
      console.error('Error parsing setting value:', error);
      return value;
    }
  }

  /**
   * Get settings organized by category
   */
  async getSettingsByCategory(): Promise<Record<SettingsCategory, Record<string, any>>> {
    try {
      const result: Record<SettingsCategory, Record<string, any>> = {
        [SettingsCategory.SYSTEM]: {},
        [SettingsCategory.EMAIL]: {},
        [SettingsCategory.COMPANY]: {},
        [SettingsCategory.SECURITY]: {},
        [SettingsCategory.BILLING]: {},
        [SettingsCategory.FEATURES]: {}
      };

      for (const category of Object.values(SettingsCategory)) {
        result[category] = await this.getByCategory(category);
      }

      return result;
    } catch (error) {
      console.error('Error getting settings by category:', error);
      return {
        [SettingsCategory.SYSTEM]: {},
        [SettingsCategory.EMAIL]: {},
        [SettingsCategory.COMPANY]: {},
        [SettingsCategory.SECURITY]: {},
        [SettingsCategory.BILLING]: {},
        [SettingsCategory.FEATURES]: {}
      };
    }
  }

  /**
   * Check if user has read permission for a setting
   */
  private async checkReadPermission(userId: string, key: string): Promise<boolean> {
    const definition = SETTING_DEFINITIONS[key];
    if (!definition?.readPermissions?.length) {
      return true; // No read restrictions
    }

    // Check if user has any of the required read permissions
    for (const permission of definition.readPermissions) {
      const [resource, action] = permission.split(':');
      const hasPermission = await permissionService.hasPermission({
        userId,
        resource,
        action
      });
      if (hasPermission) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has write permission for a setting
   */
  private async checkWritePermission(userId: string, key: string): Promise<boolean> {
    const definition = SETTING_DEFINITIONS[key];
    if (!definition?.writePermissions?.length) {
      return true; // No write restrictions
    }

    // Check if user has any of the required write permissions
    for (const permission of definition.writePermissions) {
      const [resource, action] = permission.split(':');
      const hasPermission = await permissionService.hasPermission({
        userId,
        resource,
        action
      });
      if (hasPermission) {
        return true;
      }
    }

    return false;
  }

  /**
   * Test email configuration
   */
  async testEmailConfig(config: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPassword: string;
    fromAddress: string;
    fromName: string;
    testEmail: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // This would integrate with an email service
      // For now, just validate the configuration
      if (!config.smtpHost || !config.smtpUser || !config.smtpPassword || !config.fromAddress) {
        return { success: false, error: 'Missing required email configuration' };
      }

      // TODO: Implement actual SMTP testing
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransporter({...});
      // await transporter.verify();
      
      return { success: true };
    } catch (error) {
      console.error('Error testing email configuration:', error);
      return { success: false, error: 'Failed to test email configuration' };
    }
  }
}

// Export singleton instance
export const settingsService = new SettingsService();