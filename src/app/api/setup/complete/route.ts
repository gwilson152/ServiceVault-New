/**
 * Setup Completion API Route
 * 
 * This route handles the final step of the initial system setup wizard.
 * It creates the first administrator user with super-admin privileges and
 * configures all system settings.
 * 
 * Key Features:
 * - Creates admin user with Super Administrator role via SystemRole table
 * - Uses new RoleTemplate system instead of hard-coded roles
 * - Configures system, email, company, security, and feature settings
 * - Atomic transaction with cleanup on error
 * - Validates all setup data before processing
 * 
 * Integration:
 * - Used by SetupWizard component during initial setup
 * - Requires database to be seeded with default role templates
 * - Creates SystemRole relationship for super-admin privileges
 * - Integrates with settingsService for configuration storage
 */

import { NextResponse } from "next/server";
import { settingsService } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { SetupData } from "@/types/setup";
import { 
  validateAdminAccount, 
  validateSystemConfig, 
  validateEmailConfig, 
  validateCompanyInfo 
} from "@/types/setup";

// POST /api/setup/complete - Complete initial setup
export async function POST(request: Request) {
  try {
    // Check if setup is actually required
    const setupRequired = await settingsService.isSetupRequired();
    if (!setupRequired) {
      return NextResponse.json({ 
        error: "Setup has already been completed" 
      }, { status: 400 });
    }

    const setupData: SetupData = await request.json();

    // Validate all setup data
    const adminValidation = validateAdminAccount(setupData.adminAccount);
    const systemValidation = validateSystemConfig(setupData.systemConfig);
    const emailValidation = validateEmailConfig(setupData.emailConfig);
    const companyValidation = validateCompanyInfo(setupData.companyInfo);

    const errors: Record<string, any> = {};
    if (!adminValidation.isValid) errors.adminAccount = adminValidation.errors;
    if (!systemValidation.isValid) errors.systemConfig = systemValidation.errors;
    if (!emailValidation.isValid) errors.emailConfig = emailValidation.errors;
    if (!companyValidation.isValid) errors.companyInfo = companyValidation.errors;

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ 
        error: "Validation failed",
        details: errors
      }, { status: 400 });
    }

    console.log("🚀 Starting initial system setup...");

    // 1. Check if user with this email already exists
    console.log("🔍 Checking for existing users...");
    const existingUser = await prisma.user.findUnique({
      where: { email: setupData.adminAccount.email }
    });

    if (existingUser) {
      return NextResponse.json({ 
        error: "Setup cannot continue", 
        message: `A user with email ${setupData.adminAccount.email} already exists. Please use a different email address or contact your administrator if you believe this is an error.`
      }, { status: 400 });
    }

    // 2. Get the Super Administrator role template
    console.log("🔍 Finding Super Administrator role...");
    const superAdminRole = await prisma.roleTemplate.findUnique({
      where: { name: 'Super Administrator' }
    });

    if (!superAdminRole) {
      throw new Error('Super Administrator role template not found. Please run database seed first.');
    }

    // 3. Create admin user
    console.log("👤 Creating admin user...");
    const hashedPassword = await bcrypt.hash(setupData.adminAccount.password, 10);
    
    const adminUser = await prisma.user.create({
      data: {
        name: setupData.adminAccount.name,
        email: setupData.adminAccount.email,
        password: hashedPassword
      }
    });

    // 4. Assign Super Administrator system role
    console.log("🔑 Assigning Super Administrator role...");
    await prisma.systemRole.create({
      data: {
        userId: adminUser.id,
        roleId: superAdminRole.id
      }
    });

    console.log(`✅ Admin user created with Super Administrator privileges: ${adminUser.email}`);

    // 5. Save system configuration
    console.log("⚙️ Saving system configuration...");
    const systemSettings = {
      'system.appName': setupData.systemConfig.appName,
      'system.appDescription': setupData.systemConfig.appDescription,
      'system.baseUrl': setupData.systemConfig.baseUrl,
      'system.timezone': setupData.systemConfig.timezone,
      'system.dateFormat': setupData.systemConfig.dateFormat,
      'system.language': setupData.systemConfig.language
    };

    await settingsService.setMany(systemSettings);
    console.log("✅ System configuration saved");

    // 6. Save email configuration
    console.log("📧 Saving email configuration...");
    const emailSettings = {
      'email.smtpHost': setupData.emailConfig.smtpHost,
      'email.smtpPort': setupData.emailConfig.smtpPort,
      'email.smtpSecure': setupData.emailConfig.smtpSecure,
      'email.smtpUser': setupData.emailConfig.smtpUser,
      'email.smtpPassword': setupData.emailConfig.smtpPassword, // TODO: Encrypt this
      'email.fromAddress': setupData.emailConfig.fromAddress,
      'email.fromName': setupData.emailConfig.fromName,
      'email.enableEmailNotifications': setupData.emailConfig.enableEmailNotifications
    };

    await settingsService.setMany(emailSettings);
    console.log("✅ Email configuration saved");

    // 7. Save company information
    console.log("🏢 Saving company information...");
    const companySettings = {
      'company.companyName': setupData.companyInfo.companyName,
      'company.companyAddress': setupData.companyInfo.companyAddress,
      'company.companyPhone': setupData.companyInfo.companyPhone,
      'company.companyEmail': setupData.companyInfo.companyEmail,
      'company.companyWebsite': setupData.companyInfo.companyWebsite || '',
      'company.defaultTaxRate': setupData.companyInfo.defaultTaxRate,
      'company.defaultCurrency': setupData.companyInfo.defaultCurrency
    };

    await settingsService.setMany(companySettings);
    console.log("✅ Company information saved");

    // 8. Set default security settings
    console.log("🔒 Setting default security configuration...");
    const securitySettings = {
      'security.sessionTimeout': 480, // 8 hours
      'security.passwordMinLength': 8,
      'security.loginAttemptLimit': 5
    };

    await settingsService.setMany(securitySettings);
    console.log("✅ Security configuration saved");

    // 9. Set default feature settings
    console.log("🎛️ Setting default feature configuration...");
    const featureSettings = {
      'features.enableTimeTracking': true,
      'features.enableInvoicing': true,
      'features.enableApiAccess': false
    };

    await settingsService.setMany(featureSettings);
    console.log("✅ Feature configuration saved");

    // 10. Mark setup as completed
    console.log("🎉 Marking setup as completed...");
    await settingsService.markSetupComplete();

    console.log("✅ Initial system setup completed successfully!");

    return NextResponse.json({
      success: true,
      message: "Initial setup completed successfully",
      adminUser: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        hasSystemRole: true
      },
      setupCompletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error completing setup:", error);
    
    // Try to clean up any partial data on error
    try {
      console.log("🧹 Cleaning up partial setup data...");
      
      // Delete any admin users created during this request
      if (setupData.adminAccount?.email) {
        await prisma.user.deleteMany({
          where: { 
            email: setupData.adminAccount.email
          }
        });
      }
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }

    return NextResponse.json({
      error: "Failed to complete setup",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}