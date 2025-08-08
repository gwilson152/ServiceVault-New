import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { emailSecurityService } from '@/lib/email/EmailSecurityService';

/**
 * Get email security statistics and configuration
 * GET /api/email/security
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'admin'
    });

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    // Get security statistics
    const stats = await emailSecurityService.getSecurityStats(sinceDate);
    
    // Get current configuration
    const config = emailSecurityService.getConfig();

    return NextResponse.json({
      stats,
      config: {
        enableSpamFiltering: config.enableSpamFiltering,
        spamThreshold: config.spamThreshold,
        enableContentScanning: config.enableContentScanning,
        scanAttachments: config.scanAttachments,
        maxAttachmentSize: config.maxAttachmentSize,
        blockedFileTypes: config.blockedFileTypes,
        quarantineFileTypes: config.quarantineFileTypes,
        enableUrlScanning: config.enableUrlScanning,
        enableSenderReputation: config.enableSenderReputation,
        reputationThreshold: config.reputationThreshold,
        autoQuarantineSuspicious: config.autoQuarantineSuspicious,
        autoDeleteMalicious: config.autoDeleteMalicious,
        whitelistedDomains: config.whitelistedDomains,
        blacklistedDomains: config.blacklistedDomains
      },
      period: {
        since: sinceDate.toISOString(),
        until: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Security stats error:', error);
    
    return NextResponse.json({
      error: 'Failed to get security statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Update email security configuration
 * PATCH /api/email/security
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const canAdmin = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'admin'
    });

    if (!canAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const configUpdate = await request.json();

    // Validate configuration update
    const allowedFields = [
      'enableSpamFiltering',
      'spamThreshold',
      'spamQuarantineThreshold',
      'enableContentScanning',
      'scanAttachments',
      'maxAttachmentSize',
      'blockedFileTypes',
      'quarantineFileTypes',
      'enableUrlScanning',
      'urlScanTimeout',
      'enableSenderReputation',
      'reputationThreshold',
      'enableContentFiltering',
      'suspiciousPatterns',
      'autoQuarantineSuspicious',
      'autoDeleteMalicious',
      'notifyAdminOnThreats',
      'whitelistedDomains',
      'whitelistedSenders',
      'blacklistedDomains',
      'blacklistedSenders'
    ];

    const validConfig: any = {};
    for (const [key, value] of Object.entries(configUpdate)) {
      if (allowedFields.includes(key)) {
        validConfig[key] = value;
      }
    }

    // Validate specific fields
    if (validConfig.spamThreshold !== undefined) {
      if (validConfig.spamThreshold < 0 || validConfig.spamThreshold > 100) {
        return NextResponse.json({ error: 'Spam threshold must be between 0 and 100' }, { status: 400 });
      }
    }

    if (validConfig.maxAttachmentSize !== undefined) {
      if (validConfig.maxAttachmentSize < 0 || validConfig.maxAttachmentSize > 100 * 1024 * 1024) { // Max 100MB
        return NextResponse.json({ error: 'Max attachment size must be between 0 and 100MB' }, { status: 400 });
      }
    }

    if (validConfig.blockedFileTypes !== undefined) {
      if (!Array.isArray(validConfig.blockedFileTypes)) {
        return NextResponse.json({ error: 'Blocked file types must be an array' }, { status: 400 });
      }
    }

    // Update security configuration
    emailSecurityService.updateConfig(validConfig);
    
    // Get updated configuration
    const updatedConfig = emailSecurityService.getConfig();

    return NextResponse.json({
      message: 'Security configuration updated successfully',
      config: {
        enableSpamFiltering: updatedConfig.enableSpamFiltering,
        spamThreshold: updatedConfig.spamThreshold,
        enableContentScanning: updatedConfig.enableContentScanning,
        scanAttachments: updatedConfig.scanAttachments,
        maxAttachmentSize: updatedConfig.maxAttachmentSize,
        blockedFileTypes: updatedConfig.blockedFileTypes,
        quarantineFileTypes: updatedConfig.quarantineFileTypes,
        enableUrlScanning: updatedConfig.enableUrlScanning,
        enableSenderReputation: updatedConfig.enableSenderReputation,
        reputationThreshold: updatedConfig.reputationThreshold,
        autoQuarantineSuspicious: updatedConfig.autoQuarantineSuspicious,
        autoDeleteMalicious: updatedConfig.autoDeleteMalicious,
        whitelistedDomains: updatedConfig.whitelistedDomains,
        blacklistedDomains: updatedConfig.blacklistedDomains
      }
    });

  } catch (error) {
    console.error('Security config update error:', error);
    
    return NextResponse.json({
      error: 'Failed to update security configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Test email security scanning
 * POST /api/email/security/test
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const canTest = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'test'
    });

    if (!canTest) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, integrationId } = await request.json();

    if (!email || !email.fromEmail || !email.subject) {
      return NextResponse.json({ error: 'Invalid email data provided' }, { status: 400 });
    }

    // Perform security scan
    const securityResult = await emailSecurityService.checkEmailSecurity(email, integrationId || 'test');

    return NextResponse.json({
      message: 'Security scan completed',
      result: {
        isSecure: securityResult.isSecure,
        riskLevel: securityResult.riskLevel,
        score: securityResult.score,
        threats: securityResult.threats,
        warnings: securityResult.warnings,
        blockedReasons: securityResult.blockedReasons
      },
      recommendation: securityResult.score >= 80 ? 'BLOCK' : 
                      securityResult.score >= 60 ? 'QUARANTINE' : 
                      securityResult.score >= 30 ? 'MONITOR' : 'ALLOW'
    });

  } catch (error) {
    console.error('Security test error:', error);
    
    return NextResponse.json({
      error: 'Security test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}