import { EmailAuditService, EmailAuditContext } from './EmailAuditService';
import { EmailAuditEventType } from '@prisma/client';

/**
 * Integration examples showing how to use EmailAuditService in various email operations
 * This file serves as documentation and implementation guide for audit logging
 */

/**
 * Example: Audit email integration creation
 */
export async function auditIntegrationCreation(
  integrationId: string,
  integrationData: Record<string, any>,
  context: EmailAuditContext
) {
  await EmailAuditService.logIntegrationEvent(
    EmailAuditEventType.INTEGRATION_CREATED,
    integrationId,
    'create_integration',
    context,
    {
      provider: integrationData.provider,
      accountId: integrationData.accountId,
      settings: integrationData.settings
    }
  );
}

/**
 * Example: Audit email message processing
 */
export async function auditMessageProcessing(
  messageId: string,
  processingResult: {
    success: boolean;
    ticketCreated?: boolean;
    ticketId?: string;
    processingTime: number;
    errors?: string[];
  },
  context: EmailAuditContext
) {
  await EmailAuditService.logMessageEvent(
    EmailAuditEventType.MESSAGE_PROCESSED,
    messageId,
    'process_message',
    context,
    {
      processingResult,
      ticketCreated: processingResult.ticketCreated,
      ticketId: processingResult.ticketId,
      processingTime: processingResult.processingTime
    }
  );

  // If ticket was created, log that separately
  if (processingResult.ticketCreated && processingResult.ticketId) {
    await EmailAuditService.logAuditEvent({
      eventType: EmailAuditEventType.TICKET_CREATED,
      entityType: 'Ticket',
      entityId: processingResult.ticketId,
      action: 'create_from_email',
      description: `Ticket created automatically from email ${messageId}`,
      success: true,
      metadata: {
        sourceMessageId: messageId,
        automaticCreation: true
      }
    }, context);
  }
}

/**
 * Example: Audit security scanning
 */
export async function auditSecurityScan(
  messageId: string,
  scanResults: {
    threatType?: string;
    riskLevel: string;
    securityScore: number;
    action: string;
    threats: string[];
    attachmentsScanned: number;
    scanEngine: string;
  },
  integrationId: string
) {
  // Log audit event
  await EmailAuditService.logAuditEvent({
    eventType: EmailAuditEventType.ATTACHMENT_SCANNED,
    entityType: 'EmailMessage',
    entityId: messageId,
    action: 'security_scan',
    description: `Security scan completed with ${scanResults.riskLevel} risk level`,
    success: true,
    metadata: scanResults
  }, { integrationId, messageId });

  // Log security event if threats detected
  if (scanResults.threats.length > 0) {
    await EmailAuditService.logSecurityEvent({
      integrationId,
      messageId,
      threatType: scanResults.threatType || 'UNKNOWN',
      riskLevel: scanResults.riskLevel,
      securityScore: scanResults.securityScore,
      action: scanResults.action,
      reason: `Detected threats: ${scanResults.threats.join(', ')}`,
      scanEngine: scanResults.scanEngine,
      scanResults: {
        threats: scanResults.threats,
        attachmentsScanned: scanResults.attachmentsScanned,
        scanTime: new Date().toISOString()
      }
    });

    // Generate security alert
    await EmailAuditService.logAuditEvent({
      eventType: EmailAuditEventType.SECURITY_ALERT_GENERATED,
      entityType: 'EmailMessage',
      entityId: messageId,
      action: 'generate_security_alert',
      description: `Security alert generated for ${scanResults.riskLevel} risk email`,
      success: true,
      metadata: {
        alertLevel: scanResults.riskLevel,
        threatCount: scanResults.threats.length,
        actionTaken: scanResults.action
      }
    }, { integrationId, messageId });
  }
}

/**
 * Example: Audit OAuth token refresh
 */
export async function auditTokenRefresh(
  integrationId: string,
  result: {
    success: boolean;
    error?: string;
    newExpiryTime?: Date;
  },
  context: EmailAuditContext
) {
  await EmailAuditService.logTokenEvent(
    integrationId,
    'refresh',
    result.success,
    result.error,
    {
      ...context,
      integrationId
    }
  );

  if (result.success && result.newExpiryTime) {
    await EmailAuditService.logAuditEvent({
      eventType: EmailAuditEventType.OAUTH_TOKEN_REFRESHED,
      entityType: 'EmailIntegration',
      entityId: integrationId,
      action: 'token_refresh_success',
      description: 'OAuth token refreshed successfully',
      success: true,
      metadata: {
        newExpiryTime: result.newExpiryTime.toISOString(),
        refreshTime: new Date().toISOString()
      }
    }, context);
  }
}

/**
 * Example: Audit synchronization operation
 */
export async function auditSyncOperation(
  integrationId: string,
  syncResult: {
    status: 'start' | 'complete' | 'fail';
    messagesProcessed?: number;
    newMessages?: number;
    errors?: string[];
    duration?: number;
  },
  context: EmailAuditContext
) {
  await EmailAuditService.logSyncEvent(
    integrationId,
    syncResult.status,
    {
      messagesProcessed: syncResult.messagesProcessed,
      newMessages: syncResult.newMessages,
      duration: syncResult.duration,
      errorCount: syncResult.errors?.length || 0
    },
    syncResult.errors?.join('; '),
    context
  );
}

/**
 * Example: Audit quarantine operations
 */
export async function auditQuarantineAction(
  action: 'quarantine' | 'release' | 'delete',
  messageIds: string[],
  reason: string,
  context: EmailAuditContext
) {
  // Log individual message events
  for (const messageId of messageIds) {
    const eventType = action === 'quarantine' 
      ? EmailAuditEventType.MESSAGE_QUARANTINED
      : action === 'release'
      ? EmailAuditEventType.MESSAGE_RELEASED
      : EmailAuditEventType.MESSAGE_DELETED;

    await EmailAuditService.logMessageEvent(
      eventType,
      messageId,
      `${action}_message`,
      context,
      {
        reason,
        actionTime: new Date().toISOString()
      }
    );
  }

  // Log bulk operation
  await EmailAuditService.logBulkOperation(
    action,
    messageIds,
    'EmailMessage',
    true,
    context,
    {
      reason,
      actionType: action,
      messageCount: messageIds.length
    }
  );
}

/**
 * Example: Audit configuration changes
 */
export async function auditConfigurationUpdate(
  integrationId: string,
  previousConfig: Record<string, any>,
  newConfig: Record<string, any>,
  context: EmailAuditContext
) {
  await EmailAuditService.logConfigurationChange(
    integrationId,
    'EmailIntegration',
    previousConfig,
    newConfig,
    { ...context, integrationId }
  );
}

/**
 * Example: Audit permission changes
 */
export async function auditPermissionChange(
  action: 'grant' | 'revoke',
  targetUserId: string,
  permission: string,
  resourceId: string,
  context: EmailAuditContext
) {
  await EmailAuditService.logPermissionChange(
    action,
    targetUserId,
    permission,
    resourceId,
    context
  );
}

/**
 * Example: Audit system errors
 */
export async function auditSystemError(
  error: Error,
  operation: string,
  entityType: string,
  entityId?: string,
  context: EmailAuditContext = {}
) {
  await EmailAuditService.logAuditEvent({
    eventType: EmailAuditEventType.SYSTEM_ERROR,
    entityType,
    entityId: entityId || 'system',
    action: `system_error_${operation}`,
    description: `System error during ${operation}: ${error.message}`,
    success: false,
    errorMessage: error.message,
    metadata: {
      operation,
      errorType: error.name,
      stackTrace: error.stack,
      timestamp: new Date().toISOString()
    }
  }, context);
}

/**
 * Wrapper function to automatically audit any email operation
 */
export function withEmailAudit<T extends any[], R>(
  eventType: EmailAuditEventType,
  entityType: string,
  action: string,
  operation: (...args: T) => Promise<R>
) {
  return async function auditedOperation(
    entityId: string,
    context: EmailAuditContext,
    ...args: T
  ): Promise<R> {
    const startTime = Date.now();
    let success = true;
    let errorMessage: string | undefined;
    let result: R;

    try {
      result = await operation(...args);
      return result;
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      const processingTime = Date.now() - startTime;
      
      // Log the operation
      await EmailAuditService.logAuditEvent({
        eventType,
        entityType,
        entityId,
        action,
        success,
        errorMessage,
        processingTime,
        metadata: {
          operationArgs: args.length,
          timestamp: new Date().toISOString()
        }
      }, context);
    }
  };
}

/**
 * Predefined audit wrappers for common operations
 */
export const auditedEmailOperations = {
  /**
   * Audit message processing
   */
  processMessage: withEmailAudit(
    EmailAuditEventType.MESSAGE_PROCESSED,
    'EmailMessage',
    'process_message',
    async (messageData: any) => {
      // Your message processing logic here
      return { success: true };
    }
  ),

  /**
   * Audit integration sync
   */
  syncIntegration: withEmailAudit(
    EmailAuditEventType.SYNC_STARTED,
    'EmailIntegration',
    'sync_messages',
    async (integrationConfig: any) => {
      // Your sync logic here
      return { messagesProcessed: 0 };
    }
  )
};