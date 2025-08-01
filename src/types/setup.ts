// Setup wizard type definitions

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<SetupStepProps>;
  isComplete: boolean;
  isValid: boolean;
}

export interface SetupStepProps {
  data: SetupData;
  updateData: (updates: Partial<SetupData> | ((prev: SetupData) => Partial<SetupData>)) => void;
  onNext: () => void;
  onPrevious: () => void;
  isValid: boolean;
  setIsValid: (valid: boolean) => void;
}

export interface AdminAccountData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SystemConfigData {
  appName: string;
  appDescription: string;
  baseUrl: string;
  timezone: string;
  dateFormat: string;
  language: string;
}

export interface EmailConfigData {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromAddress: string;
  fromName: string;
  enableEmailNotifications: boolean;
  testEmailSent?: boolean;
}

export interface CompanyInfoData {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite?: string;
  defaultTaxRate: number;
  defaultCurrency: string;
}

export interface SetupData {
  adminAccount: AdminAccountData;
  systemConfig: SystemConfigData;
  emailConfig: EmailConfigData;
  companyInfo: CompanyInfoData;
}

export interface SetupStatus {
  isSetupRequired: boolean;
  hasAdminUsers: boolean;
  hasSystemSettings: boolean;
  setupCompleted: boolean;
  setupCompletedAt?: string;
}

export interface SetupValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

// Default setup data
export const DEFAULT_SETUP_DATA: SetupData = {
  adminAccount: {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  },
  systemConfig: {
    appName: 'Service Vault',
    appDescription: 'Time management and invoicing system for internal business use',
    baseUrl: '',
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    language: 'en'
  },
  emailConfig: {
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: '',
    smtpPassword: '',
    fromAddress: '',
    fromName: '',
    enableEmailNotifications: true,
    testEmailSent: false
  },
  companyInfo: {
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    defaultTaxRate: 0,
    defaultCurrency: 'USD'
  }
};

// Validation functions
export const validateAdminAccount = (data: AdminAccountData): SetupValidationResult => {
  const errors: Record<string, string> = {};
  
  if (!data.name?.trim()) {
    errors.name = 'Name is required';
  }
  
  if (!data.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
  }
  
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: {}
  };
};

export const validateSystemConfig = (data: SystemConfigData): SetupValidationResult => {
  const errors: Record<string, string> = {};
  
  if (!data.appName?.trim()) {
    errors.appName = 'Application name is required';
  }
  
  if (!data.baseUrl?.trim()) {
    errors.baseUrl = 'Base URL is required';
  } else if (!/^https?:\/\//.test(data.baseUrl)) {
    errors.baseUrl = 'Base URL must start with http:// or https://';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: {}
  };
};

export const validateEmailConfig = (data: EmailConfigData): SetupValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  
  if (!data.smtpHost?.trim()) {
    errors.smtpHost = 'SMTP host is required';
  }
  
  if (!data.smtpPort || data.smtpPort <= 0 || data.smtpPort > 65535) {
    errors.smtpPort = 'Please enter a valid port number (1-65535)';
  }
  
  // SMTP username and password are optional - some servers don't require authentication
  // No validation needed for smtpUser and smtpPassword
  
  if (!data.fromAddress?.trim()) {
    errors.fromAddress = 'From email address is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.fromAddress)) {
    errors.fromAddress = 'Please enter a valid email address';
  }
  
  if (!data.fromName?.trim()) {
    errors.fromName = 'From name is required';
  }
  
  if (!data.testEmailSent) {
    warnings.testEmail = 'Consider sending a test email to verify configuration';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
};

export const validateCompanyInfo = (data: CompanyInfoData): SetupValidationResult => {
  const errors: Record<string, string> = {};
  
  if (!data.companyName?.trim()) {
    errors.companyName = 'Company name is required';
  }
  
  if (!data.companyEmail?.trim()) {
    errors.companyEmail = 'Company email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.companyEmail)) {
    errors.companyEmail = 'Please enter a valid email address';
  }
  
  if (data.defaultTaxRate < 0 || data.defaultTaxRate > 100) {
    errors.defaultTaxRate = 'Tax rate must be between 0 and 100';
  }
  
  if (!data.defaultCurrency?.trim()) {
    errors.defaultCurrency = 'Default currency is required';
  } else if (!/^[A-Z]{3}$/.test(data.defaultCurrency)) {
    errors.defaultCurrency = 'Currency must be a 3-letter ISO code (e.g., USD)';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: {}
  };
};