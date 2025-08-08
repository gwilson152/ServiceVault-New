import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { prisma } from '@/lib/prisma';

/**
 * Get quarantined emails
 * GET /api/email/security/quarantine
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'QUARANTINED';
    const since = searchParams.get('since');

    const whereClause: any = {
      status
    };

    if (since) {
      whereClause.createdAt = { gte: new Date(since) };
    }

    // Get quarantined emails
    const [emails, total] = await Promise.all([
      prisma.emailMessage.findMany({
        where: whereClause,
        include: {
          integration: {
            include: { account: true }
          },
          ticket: {
            select: { id: true, ticketNumber: true, subject: true }
          },
          attachments: {
            select: { id: true, filename: true, size: true, contentType: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.emailMessage.count({ where: whereClause })
    ]);

    // Get security logs for these emails
    const messageIds = emails.map(e => e.messageId).filter(Boolean) as string[];
    const securityLogs = await prisma.emailProcessingLog.findMany({
      where: {
        messageId: { in: messageIds },
        action: { in: ['SECURITY_CHECK', 'SECURITY_QUARANTINED', 'SECURITY_BLOCKED'] }
      },
      select: {
        messageId: true,
        action: true,
        status: true,
        details: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map security details to emails
    const emailsWithSecurity = emails.map(email => {
      const emailSecurityLogs = securityLogs.filter(log => log.messageId === email.messageId);
      const latestSecurityLog = emailSecurityLogs[0];
      
      return {
        id: email.id,
        messageId: email.messageId,
        fromEmail: email.fromEmail,
        fromName: email.fromName,
        subject: email.subject,
        createdAt: email.createdAt,
        status: email.status,
        priority: email.priority,
        integration: {
          id: email.integration.id,
          provider: email.integration.provider,
          account: {
            id: email.integration.account.id,
            name: email.integration.account.name
          }
        },
        ticket: email.ticket,
        attachmentCount: email.attachments.length,
        security: latestSecurityLog ? {
          riskLevel: latestSecurityLog.details?.riskLevel,
          securityScore: latestSecurityLog.details?.securityScore,
          threats: latestSecurityLog.details?.threats || [],
          warnings: latestSecurityLog.details?.warnings || [],
          action: latestSecurityLog.action,
          scannedAt: latestSecurityLog.createdAt
        } : null
      };
    });

    return NextResponse.json({
      emails: emailsWithSecurity,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalQuarantined: total,
        riskLevels: await this.getRiskLevelSummary(whereClause)
      }
    });

  } catch (error) {
    console.error('Get quarantine error:', error);
    
    return NextResponse.json({
      error: 'Failed to get quarantined emails',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Manage quarantined email (release, delete, etc.)
 * PATCH /api/email/security/quarantine/[id]
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const canManage = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'admin'
    });

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, emailIds, reason } = await request.json();

    if (!action || !emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    const validActions = ['release', 'delete', 'block_sender', 'whitelist_sender'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    let results: any[] = [];

    switch (action) {
      case 'release':
        // Release quarantined emails and process them
        results = await this.releaseQuarantinedEmails(emailIds, session.user.id, reason);
        break;

      case 'delete':
        // Permanently delete quarantined emails
        results = await this.deleteQuarantinedEmails(emailIds, session.user.id, reason);
        break;

      case 'block_sender':
        // Add sender to blacklist
        results = await this.blockSenders(emailIds, session.user.id, reason);
        break;

      case 'whitelist_sender':
        // Add sender to whitelist
        results = await this.whitelistSenders(emailIds, session.user.id, reason);
        break;
    }

    return NextResponse.json({
      message: `Successfully performed ${action} on ${results.length} emails`,
      results,
      action
    });

  } catch (error) {
    console.error('Quarantine management error:', error);
    
    return NextResponse.json({
      error: 'Failed to manage quarantined emails',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Helper method to get risk level summary
 */
async function getRiskLevelSummary(whereClause: any) {
  const securityLogs = await prisma.emailProcessingLog.findMany({
    where: {
      action: { in: ['SECURITY_CHECK', 'SECURITY_QUARANTINED'] },
      createdAt: whereClause.createdAt || { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    },
    select: { details: true }
  });

  const riskLevels = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  
  securityLogs.forEach(log => {
    const riskLevel = (log.details as any)?.riskLevel;
    if (riskLevel && riskLevels.hasOwnProperty(riskLevel)) {
      riskLevels[riskLevel as keyof typeof riskLevels]++;
    }
  });

  return riskLevels;
}

/**
 * Release quarantined emails
 */
async function releaseQuarantinedEmails(emailIds: string[], userId: string, reason?: string) {
  const results = [];

  for (const emailId of emailIds) {
    try {
      // Update email status
      const email = await prisma.emailMessage.update({
        where: { id: emailId },
        data: { 
          status: 'PENDING',
          processedAt: null
        }
      });

      // Log the action
      await prisma.emailProcessingLog.create({
        data: {
          integrationId: email.integrationId,
          messageId: email.messageId,
          action: 'QUARANTINE_RELEASED',
          status: 'SUCCESS',
          details: {
            releasedBy: userId,
            reason: reason || 'Manual release',
            releasedAt: new Date().toISOString()
          }
        }
      });

      results.push({ emailId, success: true, message: 'Released successfully' });

    } catch (error) {
      results.push({ 
        emailId, 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  return results;
}

/**
 * Delete quarantined emails
 */
async function deleteQuarantinedEmails(emailIds: string[], userId: string, reason?: string) {
  const results = [];

  for (const emailId of emailIds) {
    try {
      // Get email details before deletion
      const email = await prisma.emailMessage.findUnique({
        where: { id: emailId }
      });

      if (!email) {
        results.push({ emailId, success: false, message: 'Email not found' });
        continue;
      }

      // Log the deletion
      await prisma.emailProcessingLog.create({
        data: {
          integrationId: email.integrationId,
          messageId: email.messageId,
          action: 'QUARANTINE_DELETED',
          status: 'SUCCESS',
          details: {
            deletedBy: userId,
            reason: reason || 'Manual deletion',
            deletedAt: new Date().toISOString(),
            fromEmail: email.fromEmail,
            subject: email.subject
          }
        }
      });

      // Delete attachments first
      await prisma.emailAttachment.deleteMany({
        where: { emailMessageId: emailId }
      });

      // Delete the email
      await prisma.emailMessage.delete({
        where: { id: emailId }
      });

      results.push({ emailId, success: true, message: 'Deleted successfully' });

    } catch (error) {
      results.push({ 
        emailId, 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  return results;
}

/**
 * Block senders
 */
async function blockSenders(emailIds: string[], userId: string, reason?: string) {
  const results = [];

  for (const emailId of emailIds) {
    try {
      const email = await prisma.emailMessage.findUnique({
        where: { id: emailId }
      });

      if (!email) {
        results.push({ emailId, success: false, message: 'Email not found' });
        continue;
      }

      // Add to system blacklist (this would need to be implemented in security service)
      // For now, just log the action
      await prisma.emailProcessingLog.create({
        data: {
          integrationId: email.integrationId,
          messageId: email.messageId,
          action: 'SENDER_BLOCKED',
          status: 'SUCCESS',
          details: {
            blockedBy: userId,
            reason: reason || 'Manual block',
            blockedAt: new Date().toISOString(),
            senderEmail: email.fromEmail,
            senderDomain: email.fromEmail.split('@')[1]
          }
        }
      });

      results.push({ 
        emailId, 
        success: true, 
        message: `Blocked sender: ${email.fromEmail}` 
      });

    } catch (error) {
      results.push({ 
        emailId, 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  return results;
}

/**
 * Whitelist senders
 */
async function whitelistSenders(emailIds: string[], userId: string, reason?: string) {
  const results = [];

  for (const emailId of emailIds) {
    try {
      const email = await prisma.emailMessage.findUnique({
        where: { id: emailId }
      });

      if (!email) {
        results.push({ emailId, success: false, message: 'Email not found' });
        continue;
      }

      // Add to system whitelist (this would need to be implemented in security service)
      // For now, just log the action
      await prisma.emailProcessingLog.create({
        data: {
          integrationId: email.integrationId,
          messageId: email.messageId,
          action: 'SENDER_WHITELISTED',
          status: 'SUCCESS',
          details: {
            whitelistedBy: userId,
            reason: reason || 'Manual whitelist',
            whitelistedAt: new Date().toISOString(),
            senderEmail: email.fromEmail,
            senderDomain: email.fromEmail.split('@')[1]
          }
        }
      });

      // Also release the email
      await prisma.emailMessage.update({
        where: { id: emailId },
        data: { 
          status: 'PENDING',
          processedAt: null
        }
      });

      results.push({ 
        emailId, 
        success: true, 
        message: `Whitelisted sender: ${email.fromEmail}` 
      });

    } catch (error) {
      results.push({ 
        emailId, 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  return results;
}