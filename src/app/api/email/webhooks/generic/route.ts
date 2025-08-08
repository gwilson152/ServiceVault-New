import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailToTicketWorkflow } from '@/lib/email/EmailToTicketWorkflow';
import { emailProviderRegistry } from '@/lib/email/providers/EmailProvider';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';

/**
 * Generic webhook notification structure
 */
interface GenericWebhookPayload {
  integrationId: string;
  provider: string;
  event: string;
  data: any;
  timestamp: string;
  signature?: string; // For webhook verification
}

/**
 * Handle generic webhook notifications
 * POST /api/email/webhooks/generic
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenericWebhookPayload;
    
    // Validate required fields
    if (!body.integrationId || !body.provider || !body.event) {
      return NextResponse.json({ 
        error: 'Missing required fields: integrationId, provider, event' 
      }, { status: 400 });
    }

    // Verify webhook signature if provided
    if (body.signature) {
      const isValid = await verifyWebhookSignature(request, body);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    // Process the webhook
    const result = await processGenericWebhook(body);

    return NextResponse.json({
      message: 'Webhook processed successfully',
      result
    });

  } catch (error) {
    console.error('Generic webhook error:', error);
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process generic webhook notification
 */
async function processGenericWebhook(payload: GenericWebhookPayload): Promise<{
  processed: boolean;
  messagesProcessed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let messagesProcessed = 0;

  try {
    // Find the email integration
    const integration = await prisma.emailIntegration.findFirst({
      where: {
        id: payload.integrationId,
        isActive: true
      },
      include: {
        account: true
      }
    });

    if (!integration) {
      errors.push(`No active integration found: ${payload.integrationId}`);
      return { processed: false, messagesProcessed, errors };
    }

    // Handle different event types
    switch (payload.event) {
      case 'new_message':
      case 'message_received':
        messagesProcessed = await handleNewMessageEvent(integration, payload.data);
        break;

      case 'message_updated':
      case 'message_modified':
        messagesProcessed = await handleMessageUpdatedEvent(integration, payload.data);
        break;

      case 'sync_request':
      case 'full_sync':
        messagesProcessed = await handleSyncRequestEvent(integration, payload.data);
        break;

      default:
        errors.push(`Unknown event type: ${payload.event}`);
        return { processed: false, messagesProcessed, errors };
    }

    return { processed: true, messagesProcessed, errors };

  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown processing error');
    return { processed: false, messagesProcessed, errors };
  }
}

/**
 * Handle new message event
 */
async function handleNewMessageEvent(integration: any, eventData: any): Promise<number> {
  // Get the email provider
  let provider = emailProviderRegistry.get(integration.id);
  
  if (!provider) {
    const { createEmailProvider } = await import('@/lib/email/providers/EmailProvider');
    provider = createEmailProvider(integration.providerConfig as any, integration.id);
    emailProviderRegistry.register(integration.id, provider);
  }

  // If specific message data is provided, process it directly
  if (eventData.messageData) {
    const result = await emailToTicketWorkflow.processEmail(eventData.messageData, {
      integrationId: integration.id,
      systemUserId: integration.account.id,
      skipPermissionChecks: true
    });

    return result.success ? 1 : 0;
  }

  // Otherwise, fetch recent messages
  const since = eventData.since ? new Date(eventData.since) : new Date(Date.now() - 5 * 60 * 1000);
  const maxMessages = eventData.maxMessages || 10;

  const messages = await provider.retrieveMessages(since, maxMessages);
  let processed = 0;

  for (const message of messages) {
    // Check if already processed
    const existing = await prisma.emailMessage.findFirst({
      where: { messageId: message.messageId }
    });

    if (existing) continue;

    const result = await emailToTicketWorkflow.processEmail(message, {
      integrationId: integration.id,
      systemUserId: integration.account.id,
      skipPermissionChecks: true
    });

    if (result.success) {
      processed++;
    }
  }

  return processed;
}

/**
 * Handle message updated event
 */
async function handleMessageUpdatedEvent(integration: any, eventData: any): Promise<number> {
  // For updated messages, we might want to update the ticket status or add comments
  // This is provider-specific logic
  
  if (!eventData.messageId) {
    return 0;
  }

  // Find existing message
  const existingMessage = await prisma.emailMessage.findFirst({
    where: { 
      messageId: eventData.messageId,
      integrationId: integration.id
    },
    include: {
      ticket: true
    }
  });

  if (!existingMessage || !existingMessage.ticket) {
    return 0;
  }

  // Update ticket based on message changes
  if (eventData.isRead === true && existingMessage.ticket.status === 'OPEN') {
    await prisma.ticket.update({
      where: { id: existingMessage.ticket.id },
      data: { status: 'IN_PROGRESS' }
    });
  }

  return 1;
}

/**
 * Handle sync request event
 */
async function handleSyncRequestEvent(integration: any, eventData: any): Promise<number> {
  // Trigger a full sync of messages
  let provider = emailProviderRegistry.get(integration.id);
  
  if (!provider) {
    const { createEmailProvider } = await import('@/lib/email/providers/EmailProvider');
    provider = createEmailProvider(integration.providerConfig as any, integration.id);
    emailProviderRegistry.register(integration.id, provider);
  }

  const since = eventData.since ? new Date(eventData.since) : integration.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const maxMessages = eventData.maxMessages || 100;

  const messages = await provider.retrieveMessages(since, maxMessages);
  let processed = 0;

  for (const message of messages) {
    const existing = await prisma.emailMessage.findFirst({
      where: { messageId: message.messageId }
    });

    if (existing) continue;

    const result = await emailToTicketWorkflow.processEmail(message, {
      integrationId: integration.id,
      systemUserId: integration.account.id,
      skipPermissionChecks: true
    });

    if (result.success) {
      processed++;
    }
  }

  // Update last sync time
  await prisma.emailIntegration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date() }
  });

  return processed;
}

/**
 * Verify webhook signature
 */
async function verifyWebhookSignature(request: NextRequest, payload: GenericWebhookPayload): Promise<boolean> {
  // This would implement signature verification based on the provider
  // For now, we'll do basic validation
  
  const signature = request.headers.get('x-webhook-signature') || payload.signature;
  
  if (!signature) {
    return false;
  }

  // Find integration to get webhook secret
  const integration = await prisma.emailIntegration.findFirst({
    where: { id: payload.integrationId }
  });

  if (!integration) {
    return false;
  }

  const config = integration.providerConfig as any;
  const webhookSecret = config.webhookSecret;

  if (!webhookSecret) {
    return true; // No secret configured, skip verification
  }

  // Implement HMAC verification (simplified)
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * Handle webhook management requests
 */
export async function GET(request: NextRequest) {
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

  // Return webhook endpoint information
  return NextResponse.json({
    endpoints: {
      microsoft: '/api/email/webhooks/microsoft',
      gmail: '/api/email/webhooks/gmail',
      generic: '/api/email/webhooks/generic'
    },
    supported_events: [
      'new_message',
      'message_received',
      'message_updated',
      'message_modified',
      'sync_request',
      'full_sync'
    ],
    authentication: {
      signature_header: 'x-webhook-signature',
      signature_method: 'HMAC-SHA256'
    }
  });
}