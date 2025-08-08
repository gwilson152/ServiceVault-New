import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailToTicketWorkflow } from '@/lib/email/EmailToTicketWorkflow';
import { emailProviderRegistry } from '@/lib/email/providers/EmailProvider';
import { webhookRateLimit } from '@/lib/email/middleware/rateLimitMiddleware';

/**
 * Microsoft Graph webhook notification structure
 */
interface MicrosoftGraphNotification {
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  tenantId: string;
  clientState: string;
  changeType: string;
  resource: string;
  resourceData: {
    '@odata.type': string;
    '@odata.id': string;
    '@odata.etag': string;
    id: string;
  };
}

/**
 * Microsoft Graph webhook payload
 */
interface MicrosoftGraphWebhookPayload {
  value: MicrosoftGraphNotification[];
  validationTokens?: string[];
}

/**
 * Handle Microsoft Graph webhook notifications
 * POST /api/email/webhooks/microsoft
 */
export const POST = webhookRateLimit(async function microsoftGraphWebhook(request: NextRequest) {
  try {
    const body = await request.json() as MicrosoftGraphWebhookPayload;
    
    // Handle subscription validation
    if (body.validationTokens && body.validationTokens.length > 0) {
      return new NextResponse(body.validationTokens[0], {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Process notifications
    if (!body.value || body.value.length === 0) {
      return NextResponse.json({ message: 'No notifications to process' });
    }

    const results = await Promise.allSettled(
      body.value.map(notification => processGraphNotification(notification))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      message: 'Notifications processed',
      successful,
      failed,
      total: body.value.length
    });

  } catch (error) {
    console.error('Microsoft Graph webhook error:', error);
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * Process individual Microsoft Graph notification
 */
async function processGraphNotification(notification: MicrosoftGraphNotification): Promise<void> {
  try {
    // Find the email integration by client state (integration ID)
    const integration = await prisma.emailIntegration.findFirst({
      where: {
        id: notification.clientState,
        provider: 'MICROSOFT_GRAPH',
        isActive: true
      },
      include: {
        account: true
      }
    });

    if (!integration) {
      console.warn(`No active Microsoft Graph integration found for client state: ${notification.clientState}`);
      return;
    }

    // Get the email provider
    let provider = emailProviderRegistry.get(integration.id);
    
    if (!provider) {
      // Create provider if not registered
      const { createEmailProvider } = await import('@/lib/email/providers/EmailProvider');
      provider = createEmailProvider(integration.providerConfig as any, integration.id);
      emailProviderRegistry.register(integration.id, provider);
    }

    // Extract message ID from resource data
    const messageId = notification.resourceData.id;
    
    if (!messageId) {
      console.warn('No message ID found in Microsoft Graph notification');
      return;
    }

    // For Microsoft Graph, we need to fetch the actual message
    // The notification only tells us a message exists, not the content
    await fetchAndProcessGraphMessage(provider, integration, messageId);

  } catch (error) {
    console.error('Error processing Microsoft Graph notification:', error);
    throw error;
  }
}

/**
 * Fetch and process message from Microsoft Graph
 */
async function fetchAndProcessGraphMessage(
  provider: any,
  integration: any,
  messageId: string
): Promise<void> {
  try {
    // This would typically fetch the specific message from Microsoft Graph
    // For now, we'll trigger a sync to get new messages
    
    const messages = await provider.retrieveMessages(new Date(Date.now() - 5 * 60 * 1000), 10);
    
    for (const message of messages) {
      // Check if we've already processed this message
      const existingMessage = await prisma.emailMessage.findFirst({
        where: { messageId: message.messageId }
      });

      if (existingMessage) {
        continue; // Skip already processed messages
      }

      // Process the email through the workflow
      const result = await emailToTicketWorkflow.processEmail(message, {
        integrationId: integration.id,
        systemUserId: integration.account.id, // Use account ID as system user
        skipPermissionChecks: true // Webhook processing bypasses user permissions
      });

      if (!result.success) {
        console.error(`Failed to process email ${message.messageId}:`, result.error);
      }
    }

  } catch (error) {
    console.error('Error fetching Microsoft Graph message:', error);
    throw error;
  }
}

/**
 * Handle webhook subscription validation (GET request)
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const validationToken = url.searchParams.get('validationToken');

  if (validationToken) {
    // Microsoft Graph subscription validation
    return new NextResponse(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  return NextResponse.json({ message: 'Microsoft Graph webhook endpoint' });
}