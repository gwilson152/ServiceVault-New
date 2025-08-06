// Settings type definitions for type-safe configuration management

export type SettingType = 'string' | 'number' | 'boolean' | 'json' | 'encrypted';

export interface SettingDefinition {
  key: string;
  type: SettingType;
  category: string;
  required: boolean;
  validation?: (value: any) => boolean;
  description: string;
  defaultValue?: any;
  encrypted?: boolean;
  readPermissions?: string[]; // Permissions required to read this setting
  writePermissions?: string[]; // Permissions required to write this setting
  scope?: 'system' | 'account' | 'user'; // Which scope this setting applies to
}

export interface SystemSetting {
  key: string;
  value: string | null;
  jsonValue: any;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Settings categories
export enum SettingsCategory {
  SYSTEM = 'system',
  EMAIL = 'email',
  COMPANY = 'company',
  SECURITY = 'security',
  BILLING = 'billing',
  FEATURES = 'features'
}

// System Configuration Settings
export interface SystemConfig {
  appName: string;
  appDescription: string;
  baseUrl: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
  maintenanceMode: boolean;
}

// Email Configuration Settings
export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean; // true for SSL, false for TLS
  smtpUser: string;
  smtpPassword: string; // encrypted
  fromAddress: string;
  fromName: string;
  replyToAddress?: string;
  enableEmailNotifications: boolean;
}

// Company Information Settings
export interface CompanyConfig {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite?: string;
  companyLogo?: string;
  taxId?: string;
  defaultTaxRate: number;
  defaultCurrency: string;
}

// Security Settings
export interface SecurityConfig {
  sessionTimeout: number; // minutes
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  enableTwoFactor: boolean;
  loginAttemptLimit: number;
  lockoutDuration: number; // minutes
}

// Feature Settings
export interface FeatureConfig {
  enableTimeTracking: boolean;
  enableInvoicing: boolean;
  enableProjects: boolean;
  enableReports: boolean;
  enableApiAccess: boolean;
  maxUsers?: number;
  maxProjects?: number;
}

// Complete settings interface
export interface AppSettings {
  system: SystemConfig;
  email: EmailConfig;
  company: CompanyConfig;
  security: SecurityConfig;
  features: FeatureConfig;
}

// Setting validation rules
export const SETTING_DEFINITIONS: Record<string, SettingDefinition> = {
  // System settings
  'system.appName': {
    key: 'system.appName',
    type: 'string',
    category: SettingsCategory.SYSTEM,
    required: true,
    description: 'Application name displayed throughout the system',
    defaultValue: 'Service Vault'
  },
  'system.appDescription': {
    key: 'system.appDescription',
    type: 'string',
    category: SettingsCategory.SYSTEM,
    required: false,
    description: 'Brief description of the application',
    defaultValue: 'Time management and invoicing system'
  },
  'system.baseUrl': {
    key: 'system.baseUrl',
    type: 'string',
    category: SettingsCategory.SYSTEM,
    required: true,
    description: 'Base URL for the application (used in emails and API)',
    validation: (value: string) => /^https?:\/\//.test(value)
  },
  'system.timezone': {
    key: 'system.timezone',
    type: 'string',
    category: SettingsCategory.SYSTEM,
    required: true,
    description: 'Default timezone for the application',
    defaultValue: 'America/New_York'
  },
  'system.dateFormat': {
    key: 'system.dateFormat',
    type: 'string',
    category: SettingsCategory.SYSTEM,
    required: true,
    description: 'Date format used throughout the application',
    defaultValue: 'MM/dd/yyyy'
  },
  'system.maintenanceMode': {
    key: 'system.maintenanceMode',
    type: 'boolean',
    category: SettingsCategory.SYSTEM,
    required: true,
    description: 'Enable maintenance mode to restrict access',
    defaultValue: false
  },

  // Email settings
  'email.smtpHost': {
    key: 'email.smtpHost',
    type: 'string',
    category: SettingsCategory.EMAIL,
    required: true,
    description: 'SMTP server hostname',
    scope: 'system',
    readPermissions: ['settings:view', 'email:view'],
    writePermissions: ['settings:edit', 'system:admin']
  },
  'email.smtpPort': {
    key: 'email.smtpPort',
    type: 'number',
    category: SettingsCategory.EMAIL,
    required: true,
    description: 'SMTP server port',
    defaultValue: 587
  },
  'email.smtpSecure': {
    key: 'email.smtpSecure',
    type: 'boolean',
    category: SettingsCategory.EMAIL,
    required: true,
    description: 'Use SSL/TLS for SMTP connection',
    defaultValue: true
  },
  'email.smtpUser': {
    key: 'email.smtpUser',
    type: 'string',
    category: SettingsCategory.EMAIL,
    required: false,
    description: 'SMTP authentication username (optional for some servers)'
  },
  'email.smtpPassword': {
    key: 'email.smtpPassword',
    type: 'encrypted',
    category: SettingsCategory.EMAIL,
    required: false,
    description: 'SMTP authentication password (optional for some servers)',
    encrypted: true
  },
  'email.fromAddress': {
    key: 'email.fromAddress',
    type: 'string',
    category: SettingsCategory.EMAIL,
    required: true,
    description: 'Default from email address',
    validation: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    scope: 'system',
    readPermissions: ['settings:view', 'email:view'],
    writePermissions: ['settings:edit', 'system:admin']
  },
  'email.fromName': {
    key: 'email.fromName',
    type: 'string',
    category: SettingsCategory.EMAIL,
    required: true,
    description: 'Default from name for emails',
    scope: 'system',
    readPermissions: ['settings:view', 'email:view'],
    writePermissions: ['settings:edit', 'system:admin']
  },
  'email.enableEmailNotifications': {
    key: 'email.enableEmailNotifications',
    type: 'boolean',
    category: SettingsCategory.EMAIL,
    required: true,
    description: 'Enable email notifications system-wide',
    defaultValue: true,
    scope: 'system',
    readPermissions: ['settings:view'],
    writePermissions: ['settings:edit', 'system:admin']
  },

  // Company settings
  'company.companyName': {
    key: 'company.companyName',
    type: 'string',
    category: SettingsCategory.COMPANY,
    required: true,
    description: 'Company or organization name'
  },
  'company.companyAddress': {
    key: 'company.companyAddress',
    type: 'string',
    category: SettingsCategory.COMPANY,
    required: false,
    description: 'Company address for invoices and documentation'
  },
  'company.companyPhone': {
    key: 'company.companyPhone',
    type: 'string',
    category: SettingsCategory.COMPANY,
    required: false,
    description: 'Company phone number'
  },
  'company.companyEmail': {
    key: 'company.companyEmail',
    type: 'string',
    category: SettingsCategory.COMPANY,
    required: true,
    description: 'Company contact email address',
    validation: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  },
  'company.defaultTaxRate': {
    key: 'company.defaultTaxRate',
    type: 'number',
    category: SettingsCategory.COMPANY,
    required: true,
    description: 'Default tax rate percentage for invoices',
    defaultValue: 0,
    validation: (value: number) => value >= 0 && value <= 100
  },
  'company.defaultCurrency': {
    key: 'company.defaultCurrency',
    type: 'string',
    category: SettingsCategory.COMPANY,
    required: true,
    description: 'Default currency code (ISO 4217)',
    defaultValue: 'USD',
    validation: (value: string) => /^[A-Z]{3}$/.test(value)
  },

  // Security settings
  'security.sessionTimeout': {
    key: 'security.sessionTimeout',
    type: 'number',
    category: SettingsCategory.SECURITY,
    required: true,
    description: 'Session timeout in minutes',
    defaultValue: 480, // 8 hours
    validation: (value: number) => value > 0 && value <= 10080 // max 1 week
  },
  'security.passwordMinLength': {
    key: 'security.passwordMinLength',
    type: 'number',
    category: SettingsCategory.SECURITY,
    required: true,
    description: 'Minimum password length',
    defaultValue: 8,
    validation: (value: number) => value >= 6 && value <= 128
  },
  'security.loginAttemptLimit': {
    key: 'security.loginAttemptLimit',
    type: 'number',
    category: SettingsCategory.SECURITY,
    required: true,
    description: 'Maximum failed login attempts before lockout',
    defaultValue: 5,
    validation: (value: number) => value > 0 && value <= 50
  },

  // Feature settings
  'features.enableTimeTracking': {
    key: 'features.enableTimeTracking',
    type: 'boolean',
    category: SettingsCategory.FEATURES,
    required: true,
    description: 'Enable time tracking functionality',
    defaultValue: true
  },
  'features.enableInvoicing': {
    key: 'features.enableInvoicing',
    type: 'boolean',
    category: SettingsCategory.FEATURES,
    required: true,
    description: 'Enable invoicing functionality',
    defaultValue: true
  },
  'features.enableApiAccess': {
    key: 'features.enableApiAccess',
    type: 'boolean',
    category: SettingsCategory.FEATURES,
    required: true,
    description: 'Enable API access for external integrations',
    defaultValue: false
  }
};

// Helper type for setting values
export type SettingValue<T extends keyof typeof SETTING_DEFINITIONS> = 
  typeof SETTING_DEFINITIONS[T]['type'] extends 'string' ? string :
  typeof SETTING_DEFINITIONS[T]['type'] extends 'number' ? number :
  typeof SETTING_DEFINITIONS[T]['type'] extends 'boolean' ? boolean :
  typeof SETTING_DEFINITIONS[T]['type'] extends 'json' ? any :
  typeof SETTING_DEFINITIONS[T]['type'] extends 'encrypted' ? string :
  any;