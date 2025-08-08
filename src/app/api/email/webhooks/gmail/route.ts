import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailToTicketWorkflow } from '@/lib/email/EmailToTicketWorkflow';
import { emailProviderRegistry } from '@/lib/email/providers/EmailProvider';

/**
 * Gmail Pub/Sub notification structure
 */
interface GmailPubSubMessage {
  message: {
    data: string; // Base64 encoded JSON
    messageId: string;
    publishTime: string;
    attributes?: Record<string, string>;
  };
  subscription: string;
}

/**
 * Gmail notification data (decoded from Pub/Sub message)
 */
interface GmailNotificationData {
  emailAddress: string;
  historyId: string;
}

/**
 * Handle Gmail webhook notifications via Google Cloud Pub/Sub
 * POST /api/email/webhooks/gmail
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GmailPubSubMessage;
    
    if (!body.message?.data) {
      return NextResponse.json({ error: 'No message data provided' }, { status: 400 });
    }

    // Decode the Pub/Sub message
    const decodedData = Buffer.from(body.message.data, 'base64').toString('utf-8');
    const notificationData = JSON.parse(decodedData) as GmailNotificationData;

    // Process the Gmail notification
    await processGmailNotification(notificationData, body);

    return NextResponse.json({ message: 'Gmail notification processed successfully' });

  } catch (error) {
    console.error('Gmail webhook error:', error);
    
    return NextResponse.json(
      { 
        error: 'Gmail webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process Gmail Pub/Sub notification
 */
async function processGmailNotification(
  notificationData: GmailNotificationData,
  pubsubMessage: GmailPubSubMessage
): Promise<void> {
  try {
    // Find the email integration for this Gmail address
    const integration = await prisma.emailIntegration.findFirst({
      where: {
        provider: 'GMAIL',
        isActive: true,
        // Match by email address in provider config
        providerConfig: {
          path: ['username'],
          equals: notificationData.emailAddress
        }
      },
      include: {
        account: true
      }
    });

    if (!integration) {
      console.warn(`No active Gmail integration found for email: ${notificationData.emailAddress}`);
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

    // Get the stored history ID to check what's new
    const lastHistoryId = await getLastHistoryId(integration.id);
    
    if (lastHistoryId && notificationData.historyId <= lastHistoryId) {
      // No new messages since last check
      return;
    }

    // Fetch new messages since last sync
    const lastSyncTime = integration.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const messages = await provider.retrieveMessages(lastSyncTime, 50);

    // Process each new message
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
        systemUserId: integration.account.id,
        skipPermissionChecks: true // Webhook processing bypasses user permissions
      });

      if (!result.success) {
        console.error(`Failed to process Gmail message ${message.messageId}:`, result.error);
      }
    }

    // Update the last sync time and history ID
    await prisma.emailIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        providerConfig: {
          ...(integration.providerConfig as any),
          lastHistoryId: notificationData.historyId
        }
      }
    });

  } catch (error) {
    console.error('Error processing Gmail notification:', error);
    throw error;
  }
}

/**
 * Get last processed history ID for Gmail
 */
async function getLastHistoryId(integrationId: string): Promise<string | null> {
  try {
    const integration = await prisma.emailIntegration.findUnique({
      where: { id: integrationId },
      select: { providerConfig: true }
    });

    const config = integration?.providerConfig as any;
    return config?.lastHistoryId || null;

  } catch (error) {
    console.error('Error getting last history ID:', error);
    return null;
  }
}

/**
 * Verify Pub/Sub push endpoint (if needed)
 */
export async function GET(request: NextRequest) {
  // Google Cloud Pub/Sub doesn't require GET verification like webhooks
  // But we can provide endpoint info
  return NextResponse.json({ 
    message: 'Gmail Pub/Sub webhook endpoint',
    endpoint: '/api/email/webhooks/gmail',
    method: 'POST'
  });
}