import { prisma } from '@/lib/prisma';
import { EmailAuditEventType } from '@prisma/client';
import { headers } from 'next/headers';

/**
 * Audit context for email operations
 */
export interface EmailAuditContext {
  userId?: string;
  sessionId?: string;
  accountId?: string;
  integrationId?: string;
  messageId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit event data
 */
export interface EmailAuditEvent {
  eventType: EmailAuditEventType;
  entityType: string;
  entityId: string;
  action: string;
  description?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
  processingTime?: number;
}

/**
 * Access log event data
 */
export interface EmailAccessEvent {
  action: string;
  resourceType: string;
  resourceId?: string;
  searchQuery?: string;
  resultCount?: number;
  filters?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
  responseTime?: number;
}

/**
 * Security log event data
 */
export interface EmailSecurityEvent {
  integrationId?: string;
  messageId?: string;
  attachmentId?: string;
  threatType: string;
  riskLevel: string;
  securityScore?: number;
  action: string;
  reason?: string;
  scanEngine?: string;
  scanResults?: Record<string, any>;
  falsePositive?: boolean;
  reviewedBy?: string;
  reviewNotes?: string;
  notificationsSent?: Record<string, any>;
}

/**
 * Service for comprehensive email audit logging
 */
export class EmailAuditService {
  /**
   * Extract request context from headers
   */
  private static async getRequestContext(): Promise<Partial<EmailAuditContext>> {
    try {
      const headersList = headers();
      
      return {
        ipAddress: headersList.get('x-forwarded-for') || 
                   headersList.get('x-real-ip') || 
                   'unknown',
        userAgent: headersList.get('user-agent') || 'unknown'
      };
    } catch {
      // Headers might not be available in some contexts
      return {};
    }
  }

  /**
   * Log email audit event
   */
  static async logAuditEvent(
    event: EmailAuditEvent,
    context: EmailAuditContext = {}
  ): Promise<void> {
    try {
      const requestContext = await this.getRequestContext();
      const mergedContext = { ...requestContext, ...context };

      await prisma.emailAuditLog.create({
        data: {
          eventType: event.eventType,
          entityType: event.entityType,
          entityId: event.entityId,
          userId: mergedContext.userId,
          sessionId: mergedContext.sessionId,
          action: event.action,
          description: event.description,
          previousValues: event.previousValues,
          newValues: event.newValues,
          metadata: event.metadata,
          ipAddress: mergedContext.ipAddress,
          userAgent: mergedContext.userAgent,
          accountId: mergedContext.accountId,
          integrationId: mergedContext.integrationId,
          messageId: mergedContext.messageId,
          success: event.success ?? true,
          errorMessage: event.errorMessage,
          processingTime: event.processingTime
        }
      });
    } catch (error) {
      // Don't let audit logging failures break the main functionality
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Log email access event
   */
  static async logAccessEvent(
    event: EmailAccessEvent,
    context: EmailAuditContext
  ): Promise<void> {
    try {
      if (!context.userId) {
        throw new Error('User ID is required for access logging');
      }

      const requestContext = await this.getRequestContext();
      const mergedContext = { ...requestContext, ...context };

      await prisma.emailAccessLog.create({
        data: {
          userId: context.userId,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          accountId: mergedContext.accountId,
          integrationId: mergedContext.integrationId,
          searchQuery: event.searchQuery,
          resultCount: event.resultCount,
          filters: event.filters,
          ipAddress: mergedContext.ipAddress,
          userAgent: mergedContext.userAgent,
          sessionId: mergedContext.sessionId,
          success: event.success ?? true,
          errorMessage: event.errorMessage,
          responseTime: event.responseTime
        }
      });
    } catch (error) {
      console.error('Failed to log access event:', error);
    }
  }

  /**
   * Log email security event
   */
  static async logSecurityEvent(event: EmailSecurityEvent): Promise<void> {
    try {
      await prisma.emailSecurityLog.create({
        data: {
          integrationId: event.integrationId,
          messageId: event.messageId,
          attachmentId: event.attachmentId,
          threatType: event.threatType,
          riskLevel: event.riskLevel,
          securityScore: event.securityScore,
          action: event.action,
          reason: event.reason,
          scanEngine: event.scanEngine,
          scanResults: event.scanResults,
          falsePositive: event.falsePositive ?? false,
          reviewedBy: event.reviewedBy,
          reviewNotes: event.reviewNotes,
          notificationsSent: event.notificationsSent
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Log integration lifecycle events
   */
  static async logIntegrationEvent(
    eventType: EmailAuditEventType,
    integrationId: string,
    action: string,
    context: EmailAuditContext = {},
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAuditEvent({
      eventType,
      entityType: 'EmailIntegration',
      entityId: integrationId,
      action,
      metadata
    }, { ...context, integrationId });
  }

  /**
   * Log message processing events
   */
  static async logMessageEvent(
    eventType: EmailAuditEventType,
    messageId: string,
    action: string,
    context: EmailAuditContext = {},
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAuditEvent({
      eventType,
      entityType: 'EmailMessage',
      entityId: messageId,
      action,
      metadata
    }, { ...context, messageId });
  }

  /**
   * Log OAuth token events
   */
  static async logTokenEvent(
    integrationId: string,
    action: 'refresh' | 'expire',
    success: boolean,
    errorMessage?: string,
    context: EmailAuditContext = {}
  ): Promise<void> {
    const eventType = action === 'refresh' ? 
      EmailAuditEventType.OAUTH_TOKEN_REFRESHED : 
      EmailAuditEventType.OAUTH_TOKEN_EXPIRED;

    await this.logAuditEvent({
      eventType,
      entityType: 'EmailIntegration',
      entityId: integrationId,
      action: `token_${action}`,
      success,
      errorMessage,
      metadata: {
        tokenAction: action,
        timestamp: new Date().toISOString()
      }
    }, { ...context, integrationId });
  }

  /**
   * Log synchronization events
   */
  static async logSyncEvent(
    integrationId: string,
    action: 'start' | 'complete' | 'fail',
    metadata?: Record<string, any>,
    errorMessage?: string,
    context: EmailAuditContext = {}
  ): Promise<void> {
    const eventTypeMap = {
      start: EmailAuditEventType.SYNC_STARTED,
      complete: EmailAuditEventType.SYNC_COMPLETED,
      fail: EmailAuditEventType.SYNC_FAILED
    };

    await this.logAuditEvent({
      eventType: eventTypeMap[action],
      entityType: 'EmailIntegration',
      entityId: integrationId,
      action: `sync_${action}`,
      success: action !== 'fail',
      errorMessage,
      metadata
    }, { ...context, integrationId });
  }

  /**
   * Log bulk operations
   */
  static async logBulkOperation(
    action: string,
    entityIds: string[],
    entityType: string,
    success: boolean,
    context: EmailAuditContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAuditEvent({
      eventType: EmailAuditEventType.BULK_ACTION_PERFORMED,
      entityType,
      entityId: entityIds.join(','),
      action: `bulk_${action}`,
      success,
      metadata: {
        ...metadata,
        entityCount: entityIds.length,
        entityIds
      }
    }, context);
  }

  /**
   * Log configuration changes
   */
  static async logConfigurationChange(
    entityId: string,
    entityType: string,
    previousValues: Record<string, any>,
    newValues: Record<string, any>,
    context: EmailAuditContext
  ): Promise<void> {
    await this.logAuditEvent({
      eventType: EmailAuditEventType.CONFIGURATION_CHANGED,
      entityType,
      entityId,
      action: 'update_configuration',
      description: `Configuration updated for ${entityType} ${entityId}`,
      previousValues,
      newValues,
      metadata: {
        changedFields: Object.keys(newValues).filter(
          key => JSON.stringify(previousValues[key]) !== JSON.stringify(newValues[key])
        )
      }
    }, context);
  }

  /**
   * Log permission changes
   */
  static async logPermissionChange(
    action: 'grant' | 'revoke',
    userId: string,
    permission: string,
    resourceId: string,
    context: EmailAuditContext
  ): Promise<void> {
    const eventType = action === 'grant' ? 
      EmailAuditEventType.PERMISSION_GRANTED : 
      EmailAuditEventType.PERMISSION_REVOKED;

    await this.logAuditEvent({
      eventType,
      entityType: 'Permission',
      entityId: `${userId}:${permission}:${resourceId}`,
      action: `${action}_permission`,
      description: `${action} permission ${permission} for user ${userId} on resource ${resourceId}`,
      metadata: {
        targetUserId: userId,
        permission,
        resourceId
      }
    }, context);
  }

  /**
   * Get audit logs with filtering and pagination
   */
  static async getAuditLogs(params: {
    eventTypes?: EmailAuditEventType[];
    entityTypes?: string[];
    userId?: string;
    accountId?: string;
    integrationId?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      eventTypes,
      entityTypes,
      userId,
      accountId,
      integrationId,
      success,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = params;

    const where: any = {};

    if (eventTypes?.length) where.eventType = { in: eventTypes };
    if (entityTypes?.length) where.entityType = { in: entityTypes };
    if (userId) where.userId = userId;
    if (accountId) where.accountId = accountId;
    if (integrationId) where.integrationId = integrationId;
    if (success !== undefined) where.success = success;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.emailAuditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.emailAuditLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    };
  }

  /**
   * Get access logs with filtering and pagination
   */
  static async getAccessLogs(params: {
    userId?: string;
    actions?: string[];
    resourceTypes?: string[];
    accountId?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      actions,
      resourceTypes,
      accountId,
      success,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = params;

    const where: any = {};

    if (userId) where.userId = userId;
    if (actions?.length) where.action = { in: actions };
    if (resourceTypes?.length) where.resourceType = { in: resourceTypes };
    if (accountId) where.accountId = accountId;
    if (success !== undefined) where.success = success;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.emailAccessLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.emailAccessLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    };
  }

  /**
   * Get security logs with filtering and pagination
   */
  static async getSecurityLogs(params: {
    threatTypes?: string[];
    riskLevels?: string[];
    integrationId?: string;
    falsePositive?: boolean;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      threatTypes,
      riskLevels,
      integrationId,
      falsePositive,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = params;

    const where: any = {};

    if (threatTypes?.length) where.threatType = { in: threatTypes };
    if (riskLevels?.length) where.riskLevel = { in: riskLevels };
    if (integrationId) where.integrationId = integrationId;
    if (falsePositive !== undefined) where.falsePositive = falsePositive;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.emailSecurityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.emailSecurityLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    };
  }

  /**
   * Get audit statistics
   */
  static async getAuditStatistics(params: {
    startDate?: Date;
    endDate?: Date;
    accountId?: string;
    integrationId?: string;
  }) {
    const { startDate, endDate, accountId, integrationId } = params;

    const dateFilter: any = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.gte = startDate;
      if (endDate) dateFilter.lte = endDate;
    }

    const auditWhere: any = {};
    const accessWhere: any = {};
    const securityWhere: any = {};

    if (dateFilter.gte || dateFilter.lte) {
      auditWhere.timestamp = dateFilter;
      accessWhere.timestamp = dateFilter;
      securityWhere.timestamp = dateFilter;
    }

    if (accountId) {
      auditWhere.accountId = accountId;
      accessWhere.accountId = accountId;
    }

    if (integrationId) {
      auditWhere.integrationId = integrationId;
      accessWhere.integrationId = integrationId;
      securityWhere.integrationId = integrationId;
    }

    const [
      totalAuditEvents,
      failedAuditEvents,
      totalAccessEvents,
      failedAccessEvents,
      totalSecurityEvents,
      highRiskSecurityEvents,
      eventTypeBreakdown,
      accessActionBreakdown
    ] = await Promise.all([
      prisma.emailAuditLog.count({ where: auditWhere }),
      prisma.emailAuditLog.count({ where: { ...auditWhere, success: false } }),
      prisma.emailAccessLog.count({ where: accessWhere }),
      prisma.emailAccessLog.count({ where: { ...accessWhere, success: false } }),
      prisma.emailSecurityLog.count({ where: securityWhere }),
      prisma.emailSecurityLog.count({ where: { ...securityWhere, riskLevel: { in: ['HIGH', 'CRITICAL'] } } }),
      
      // Event type breakdown
      prisma.emailAuditLog.groupBy({
        by: ['eventType'],
        where: auditWhere,
        _count: true
      }),
      
      // Access action breakdown
      prisma.emailAccessLog.groupBy({
        by: ['action'],
        where: accessWhere,
        _count: true
      })
    ]);

    return {
      summary: {
        totalAuditEvents,
        failedAuditEvents,
        auditSuccessRate: totalAuditEvents > 0 ? 
          ((totalAuditEvents - failedAuditEvents) / totalAuditEvents * 100).toFixed(2) : '100',
        totalAccessEvents,
        failedAccessEvents,
        accessSuccessRate: totalAccessEvents > 0 ? 
          ((totalAccessEvents - failedAccessEvents) / totalAccessEvents * 100).toFixed(2) : '100',
        totalSecurityEvents,
        highRiskSecurityEvents,
        securityRiskRate: totalSecurityEvents > 0 ? 
          (highRiskSecurityEvents / totalSecurityEvents * 100).toFixed(2) : '0'
      },
      breakdown: {
        eventTypes: eventTypeBreakdown.map(item => ({
          eventType: item.eventType,
          count: item._count
        })),
        accessActions: accessActionBreakdown.map(item => ({
          action: item.action,
          count: item._count
        }))
      }
    };
  }

  /**
   * Clean up old audit logs (data retention)
   */
  static async cleanupOldLogs(retentionDays: number = 90): Promise<{
    deletedAuditLogs: number;
    deletedAccessLogs: number;
    deletedSecurityLogs: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const [auditResult, accessResult, securityResult] = await Promise.all([
      prisma.emailAuditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      }),
      prisma.emailAccessLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      }),
      prisma.emailSecurityLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      })
    ]);

    return {
      deletedAuditLogs: auditResult.count,
      deletedAccessLogs: accessResult.count,
      deletedSecurityLogs: securityResult.count
    };
  }
}

/**
 * Default audit service instance
 */
export const emailAuditService = EmailAuditService;