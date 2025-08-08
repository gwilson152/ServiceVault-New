import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { prisma } from '@/lib/prisma';
import { emailProviderRegistry, createEmailProvider } from '@/lib/email/providers/EmailProvider';

/**
 * Webhook configuration
 */
interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
}

/**
 * Setup webhook for email integration
 * POST /api/email/integrations/[id]/webhooks
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integrationId = params.id;
    
    // Get integration and verify permissions
    const integration = await prisma.emailIntegration.findUnique({
      where: { id: integrationId },
      include: { account: true }
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Check permissions
    const canConfigure = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'configure',
      accountId: integration.accountId
    });

    if (!canConfigure) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json() as WebhookConfig;

    // Validate webhook URL
    if (!body.url || !isValidUrl(body.url)) {
      return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
    }

    // Get or create email provider
    let provider = emailProviderRegistry.get(integrationId);
    
    if (!provider) {
      provider = createEmailProvider(integration.providerConfig as any, integrationId);
      emailProviderRegistry.register(integrationId, provider);
    }

    // Setup webhook with provider
    const webhookSubscription = await provider.setupWebhook(body.url);

    if (!webhookSubscription) {
      return NextResponse.json({ 
        error: 'Failed to setup webhook with provider',
        message: `${integration.provider} may not support webhooks`
      }, { status: 400 });
    }

    // Update integration configuration with webhook details
    const updatedConfig = {
      ...(integration.providerConfig as any),
      webhook: {
        ...body,
        subscriptionId: webhookSubscription.id,
        expiresAt: webhookSubscription.expiresAt,
        setupAt: new Date().toISOString()
      }
    };

    await prisma.emailIntegration.update({
      where: { id: integrationId },
      data: { 
        providerConfig: updatedConfig
      }
    });

    return NextResponse.json({
      message: 'Webhook setup successfully',
      webhook: {
        subscriptionId: webhookSubscription.id,
        url: body.url,
        events: webhookSubscription.events,
        expiresAt: webhookSubscription.expiresAt,
        enabled: body.enabled
      }
    });

  } catch (error) {
    console.error('Webhook setup error:', error);
    
    return NextResponse.json({
      error: 'Failed to setup webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get webhook configuration
 * GET /api/email/integrations/[id]/webhooks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integrationId = params.id;
    
    // Get integration and verify permissions
    const integration = await prisma.emailIntegration.findUnique({
      where: { id: integrationId }
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Check permissions
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'configure',
      accountId: integration.accountId
    });

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const config = integration.providerConfig as any;
    const webhookConfig = config.webhook;

    if (!webhookConfig) {
      return NextResponse.json({ 
        webhook: null,
        message: 'No webhook configured'
      });
    }

    // Check if webhook subscription is still valid
    let isExpired = false;
    if (webhookConfig.expiresAt) {
      isExpired = new Date(webhookConfig.expiresAt) <= new Date();
    }

    return NextResponse.json({
      webhook: {
        subscriptionId: webhookConfig.subscriptionId,
        url: webhookConfig.url,
        events: webhookConfig.events || [],
        enabled: webhookConfig.enabled,
        setupAt: webhookConfig.setupAt,
        expiresAt: webhookConfig.expiresAt,
        isExpired,
        provider: integration.provider
      }
    });

  } catch (error) {
    console.error('Get webhook error:', error);
    
    return NextResponse.json({
      error: 'Failed to get webhook configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Remove webhook configuration
 * DELETE /api/email/integrations/[id]/webhooks
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integrationId = params.id;
    
    // Get integration and verify permissions
    const integration = await prisma.emailIntegration.findUnique({
      where: { id: integrationId }
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Check permissions
    const canConfigure = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'configure',
      accountId: integration.accountId
    });

    if (!canConfigure) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const config = integration.providerConfig as any;
    const webhookConfig = config.webhook;

    if (!webhookConfig || !webhookConfig.subscriptionId) {
      return NextResponse.json({ message: 'No webhook to remove' });
    }

    // Get email provider and remove webhook
    let provider = emailProviderRegistry.get(integrationId);
    
    if (!provider) {
      provider = createEmailProvider(integration.providerConfig as any, integrationId);
    }

    // Remove webhook from provider
    const removed = await provider.removeWebhook(webhookConfig.subscriptionId);

    // Update integration configuration
    const updatedConfig = { ...config };
    delete updatedConfig.webhook;

    await prisma.emailIntegration.update({
      where: { id: integrationId },
      data: { 
        providerConfig: updatedConfig
      }
    });

    return NextResponse.json({
      message: 'Webhook removed successfully',
      removed
    });

  } catch (error) {
    console.error('Remove webhook error:', error);
    
    return NextResponse.json({
      error: 'Failed to remove webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Update webhook configuration
 * PATCH /api/email/integrations/[id]/webhooks
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integrationId = params.id;
    const body = await request.json();
    
    // Get integration and verify permissions
    const integration = await prisma.emailIntegration.findUnique({
      where: { id: integrationId }
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Check permissions
    const canConfigure = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'configure',
      accountId: integration.accountId
    });

    if (!canConfigure) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const config = integration.providerConfig as any;
    const webhookConfig = config.webhook;

    if (!webhookConfig) {
      return NextResponse.json({ error: 'No webhook configured' }, { status: 400 });
    }

    // Update webhook configuration
    const updatedWebhookConfig = {
      ...webhookConfig,
      ...body,
      updatedAt: new Date().toISOString()
    };

    const updatedConfig = {
      ...config,
      webhook: updatedWebhookConfig
    };

    await prisma.emailIntegration.update({
      where: { id: integrationId },
      data: { 
        providerConfig: updatedConfig
      }
    });

    return NextResponse.json({
      message: 'Webhook updated successfully',
      webhook: updatedWebhookConfig
    });

  } catch (error) {
    console.error('Update webhook error:', error);
    
    return NextResponse.json({
      error: 'Failed to update webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Validate webhook URL
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:'; // Require HTTPS for security
  } catch {
    return false;
  }
}