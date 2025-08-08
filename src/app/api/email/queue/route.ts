import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { emailProcessingQueue, JobPriority } from '@/lib/email/EmailProcessingQueue';

/**
 * Get queue statistics and status
 * GET /api/email/queue
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

    // Get queue statistics
    const stats = await emailProcessingQueue.getStats();
    const config = emailProcessingQueue.getConfig();

    return NextResponse.json({
      stats,
      config: {
        maxConcurrentJobs: config.maxConcurrentJobs,
        maxRetries: config.maxRetries,
        maxQueueSize: config.maxQueueSize,
        priorityProcessing: config.priorityProcessing
      },
      isRunning: true // You could add a method to check if queue is running
    });

  } catch (error) {
    console.error('Queue stats error:', error);
    
    return NextResponse.json({
      error: 'Failed to get queue statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Manually add job to queue or manage queue
 * POST /api/email/queue
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action, jobType, data, priority } = body;

    switch (action) {
      case 'start':
        await emailProcessingQueue.start();
        return NextResponse.json({ message: 'Queue started successfully' });

      case 'stop':
        await emailProcessingQueue.stop();
        return NextResponse.json({ message: 'Queue stopped successfully' });

      case 'add_sync_job':
        if (!data?.integrationId) {
          return NextResponse.json({ error: 'Integration ID required' }, { status: 400 });
        }
        
        const jobId = await emailProcessingQueue.addSyncJob(
          data.integrationId,
          {
            since: data.since ? new Date(data.since) : undefined,
            maxMessages: data.maxMessages
          },
          priority || JobPriority.NORMAL
        );
        
        return NextResponse.json({ 
          message: 'Sync job added to queue',
          jobId
        });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Queue management error:', error);
    
    return NextResponse.json({
      error: 'Queue management failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Update queue configuration
 * PATCH /api/email/queue
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
    
    // Validate configuration
    const allowedFields = [
      'maxConcurrentJobs',
      'maxRetries',
      'retryDelayBase',
      'retryDelayMax',
      'jobTimeout',
      'maxQueueSize',
      'priorityProcessing',
      'deadLetterQueue',
      'errorReportingEnabled',
      'batchProcessing',
      'batchSize'
    ];

    const validConfig: any = {};
    for (const [key, value] of Object.entries(configUpdate)) {
      if (allowedFields.includes(key)) {
        validConfig[key] = value;
      }
    }

    // Update queue configuration
    emailProcessingQueue.updateConfig(validConfig);
    
    return NextResponse.json({
      message: 'Queue configuration updated',
      config: emailProcessingQueue.getConfig()
    });

  } catch (error) {
    console.error('Queue config update error:', error);
    
    return NextResponse.json({
      error: 'Failed to update queue configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}