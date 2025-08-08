import { prisma } from '@/lib/prisma';
import { emailToTicketWorkflow } from './EmailToTicketWorkflow';
import { emailThreadingService } from './EmailThreadingService';
import type { EmailMessageData } from './providers/EmailProvider';
import type { EmailProcessingContext } from './EmailToTicketWorkflow';

/**
 * Queue job status
 */
export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  RETRY = 'RETRY'
}

/**
 * Queue job priority
 */
export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 20
}

/**
 * Queue job types
 */
export enum JobType {
  PROCESS_EMAIL = 'PROCESS_EMAIL',
  SYNC_INTEGRATION = 'SYNC_INTEGRATION',
  CLEANUP_MESSAGES = 'CLEANUP_MESSAGES',
  REFRESH_TOKENS = 'REFRESH_TOKENS',
  UPDATE_THREAD = 'UPDATE_THREAD'
}

/**
 * Queue job structure
 */
export interface QueueJob {
  id: string;
  type: JobType;
  priority: JobPriority;
  status: JobStatus;
  data: any;
  context: EmailProcessingContext;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  error?: string;
  result?: any;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  processingTime?: number;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  // Processing limits
  maxConcurrentJobs: number;
  maxRetries: number;
  retryDelayBase: number; // Base delay in milliseconds
  retryDelayMax: number; // Maximum delay in milliseconds
  
  // Job timeouts
  jobTimeout: number; // Milliseconds
  cleanupInterval: number; // Milliseconds between cleanup runs
  
  // Queue management
  maxQueueSize: number;
  priorityProcessing: boolean;
  
  // Error handling
  deadLetterQueue: boolean;
  errorReportingEnabled: boolean;
  
  // Performance
  batchProcessing: boolean;
  batchSize: number;
}

/**
 * Default queue configuration
 */
const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxConcurrentJobs: 5,
  maxRetries: 3,
  retryDelayBase: 1000, // 1 second
  retryDelayMax: 60000, // 1 minute
  
  jobTimeout: 30000, // 30 seconds
  cleanupInterval: 60000, // 1 minute
  
  maxQueueSize: 1000,
  priorityProcessing: true,
  
  deadLetterQueue: true,
  errorReportingEnabled: true,
  
  batchProcessing: true,
  batchSize: 10
};

/**
 * Queue statistics
 */
export interface QueueStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  successRate: number;
  currentLoad: number; // 0-1
}

/**
 * Asynchronous email processing queue with retry logic and error handling
 */
export class EmailProcessingQueue {
  private config: QueueConfig;
  private isRunning = false;
  private workers = new Map<string, NodeJS.Timeout>();
  private workerPromises = new Map<string, Promise<void>>();
  private cleanupTimer?: NodeJS.Timeout;
  private stats = {
    processed: 0,
    failed: 0,
    totalProcessingTime: 0
  };

  constructor(config?: Partial<QueueConfig>) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
  }

  /**
   * Start the queue processing
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Email processing queue already running');
      return;
    }

    console.log('Starting email processing queue...');
    this.isRunning = true;

    // Start worker processes
    for (let i = 0; i < this.config.maxConcurrentJobs; i++) {
      this.startWorker(`worker-${i}`);
    }

    // Start cleanup timer
    this.startCleanupTimer();

    // Mark stale processing jobs as failed
    await this.recoverStalledJobs();

    console.log(`Email processing queue started with ${this.config.maxConcurrentJobs} workers`);
  }

  /**
   * Stop the queue processing
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping email processing queue...');
    this.isRunning = false;

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Stop all workers
    for (const [workerId, timer] of this.workers.entries()) {
      clearTimeout(timer);
      this.workers.delete(workerId);
    }

    // Wait for current jobs to complete
    await Promise.allSettled(Array.from(this.workerPromises.values()));
    this.workerPromises.clear();

    console.log('Email processing queue stopped');
  }

  /**
   * Add email processing job to queue
   */
  async addEmailJob(
    email: EmailMessageData,
    context: EmailProcessingContext,
    priority: JobPriority = JobPriority.NORMAL
  ): Promise<string> {
    const job: Omit<QueueJob, 'id' | 'createdAt' | 'updatedAt'> = {
      type: JobType.PROCESS_EMAIL,
      priority,
      status: JobStatus.PENDING,
      data: { email },
      context,
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      processingTime: 0
    };

    return await this.addJob(job);
  }

  /**
   * Add integration sync job to queue
   */
  async addSyncJob(
    integrationId: string,
    options: { since?: Date; maxMessages?: number } = {},
    priority: JobPriority = JobPriority.LOW
  ): Promise<string> {
    const job: Omit<QueueJob, 'id' | 'createdAt' | 'updatedAt'> = {
      type: JobType.SYNC_INTEGRATION,
      priority,
      status: JobStatus.PENDING,
      data: { integrationId, ...options },
      context: { integrationId, skipPermissionChecks: true },
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      processingTime: 0
    };

    return await this.addJob(job);
  }

  /**
   * Add generic job to queue
   */
  private async addJob(job: Omit<QueueJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Check queue size limit
    const queueSize = await this.getQueueSize();
    if (queueSize >= this.config.maxQueueSize) {
      throw new Error('Queue is full');
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store job in database (using EmailProcessingLog as queue storage)
    await prisma.emailProcessingLog.create({
      data: {
        id: jobId,
        integrationId: job.context.integrationId,
        messageId: job.data.email?.messageId,
        action: job.type,
        status: 'PENDING',
        details: {
          priority: job.priority,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          jobData: job.data,
          context: job.context
        }
      }
    });

    return jobId;
  }

  /**
   * Start a worker process
   */
  private startWorker(workerId: string): void {
    const processJobs = async () => {
      while (this.isRunning) {
        try {
          const job = await this.getNextJob();
          
          if (!job) {
            // No jobs available, wait before checking again
            await this.sleep(1000);
            continue;
          }

          // Process the job
          await this.processJob(job);

        } catch (error) {
          console.error(`Worker ${workerId} error:`, error);
          await this.sleep(5000); // Wait longer on error
        }
      }
    };

    const workerPromise = processJobs();
    this.workerPromises.set(workerId, workerPromise);

    // Handle worker completion/error
    workerPromise.finally(() => {
      this.workerPromises.delete(workerId);
      this.workers.delete(workerId);
    });
  }

  /**
   * Get next job from queue
   */
  private async getNextJob(): Promise<QueueJob | null> {
    const now = new Date();

    // Get highest priority pending job
    const logEntry = await prisma.emailProcessingLog.findFirst({
      where: {
        status: 'PENDING',
        OR: [
          { details: { path: ['nextRetryAt'], equals: null } },
          { details: { path: ['nextRetryAt'], lte: now.toISOString() } }
        ]
      },
      orderBy: [
        { details: { path: ['priority'], sort: 'desc' } },
        { createdAt: 'asc' }
      ]
    });

    if (!logEntry) {
      return null;
    }

    // Mark as processing
    await prisma.emailProcessingLog.update({
      where: { id: logEntry.id },
      data: {
        status: 'PROCESSING',
        details: {
          ...logEntry.details,
          startedAt: now.toISOString()
        }
      }
    });

    // Convert to QueueJob format
    const details = logEntry.details as any;
    return {
      id: logEntry.id,
      type: logEntry.action as JobType,
      priority: details.priority || JobPriority.NORMAL,
      status: JobStatus.PROCESSING,
      data: details.jobData || {},
      context: details.context || { integrationId: logEntry.integrationId },
      attempts: details.attempts || 0,
      maxAttempts: details.maxAttempts || this.config.maxRetries,
      nextRetryAt: details.nextRetryAt ? new Date(details.nextRetryAt) : undefined,
      error: details.error,
      result: details.result,
      createdAt: logEntry.createdAt,
      updatedAt: logEntry.updatedAt || logEntry.createdAt,
      startedAt: now,
      processingTime: details.processingTime || 0
    };
  }

  /**
   * Process a job
   */
  private async processJob(job: QueueJob): Promise<void> {
    const startTime = Date.now();

    try {
      // Set job timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), this.config.jobTimeout);
      });

      let result: any;

      // Process job based on type
      const jobPromise = this.executeJob(job);
      result = await Promise.race([jobPromise, timeoutPromise]);

      // Job completed successfully
      const processingTime = Date.now() - startTime;
      await this.markJobCompleted(job, result, processingTime);

      this.stats.processed++;
      this.stats.totalProcessingTime += processingTime;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      await this.handleJobFailure(job, error, processingTime);

      this.stats.failed++;
    }
  }

  /**
   * Execute job based on type
   */
  private async executeJob(job: QueueJob): Promise<any> {
    switch (job.type) {
      case JobType.PROCESS_EMAIL:
        return await this.processEmailJob(job);
      
      case JobType.SYNC_INTEGRATION:
        return await this.processSyncJob(job);
      
      case JobType.CLEANUP_MESSAGES:
        return await this.processCleanupJob(job);
      
      case JobType.REFRESH_TOKENS:
        return await this.processTokenRefreshJob(job);
      
      case JobType.UPDATE_THREAD:
        return await this.processThreadUpdateJob(job);
      
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Process email job
   */
  private async processEmailJob(job: QueueJob): Promise<any> {
    const email = job.data.email as EmailMessageData;
    
    if (!email) {
      throw new Error('No email data provided');
    }

    // Process email through workflow
    const result = await emailToTicketWorkflow.processEmail(email, job.context);
    
    if (!result.success) {
      throw new Error(result.error || 'Email processing failed');
    }

    // Update email threading if ticket was created
    if (result.ticket) {
      await emailThreadingService.threadMessage(email, result.emailMessage);
    }

    return {
      ticketId: result.ticket?.id,
      ticketNumber: result.ticket?.ticketNumber,
      confidence: result.confidence,
      processingTime: result.processingTime
    };
  }

  /**
   * Process integration sync job
   */
  private async processSyncJob(job: QueueJob): Promise<any> {
    const { integrationId, since, maxMessages } = job.data;
    
    // This would typically trigger a full sync of the integration
    // For now, we'll simulate the sync
    console.log(`Syncing integration ${integrationId}...`);
    
    return {
      integrationId,
      messagesSynced: 0,
      syncTime: new Date()
    };
  }

  /**
   * Process cleanup job
   */
  private async processCleanupJob(job: QueueJob): Promise<any> {
    // Clean up old processed messages, logs, etc.
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    const deletedCount = await prisma.emailProcessingLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: 'SUCCESS'
      }
    });

    return {
      deletedLogs: deletedCount.count,
      cutoffDate
    };
  }

  /**
   * Process token refresh job
   */
  private async processTokenRefreshJob(job: QueueJob): Promise<any> {
    // Refresh OAuth tokens for integrations
    const { integrationId } = job.data;
    
    // Implementation would refresh tokens
    console.log(`Refreshing tokens for integration ${integrationId}...`);
    
    return {
      integrationId,
      refreshed: true,
      refreshTime: new Date()
    };
  }

  /**
   * Process thread update job
   */
  private async processThreadUpdateJob(job: QueueJob): Promise<any> {
    // Update email thread information
    const { threadId, messageId } = job.data;
    
    if (threadId) {
      await emailThreadingService.getThread(threadId);
    }
    
    return {
      threadId,
      messageId,
      updated: true
    };
  }

  /**
   * Mark job as completed
   */
  private async markJobCompleted(job: QueueJob, result: any, processingTime: number): Promise<void> {
    await prisma.emailProcessingLog.update({
      where: { id: job.id },
      data: {
        status: 'SUCCESS',
        details: {
          ...(job.data as any),
          result,
          processingTime,
          completedAt: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Handle job failure and retry logic
   */
  private async handleJobFailure(job: QueueJob, error: any, processingTime: number): Promise<void> {
    const attempts = job.attempts + 1;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (attempts >= job.maxAttempts) {
      // Job failed permanently
      await prisma.emailProcessingLog.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage,
          details: {
            ...(job.data as any),
            attempts,
            processingTime,
            failedAt: new Date().toISOString(),
            error: errorMessage
          }
        }
      });

      if (this.config.errorReportingEnabled) {
        console.error(`Job ${job.id} failed permanently after ${attempts} attempts:`, error);
      }
    } else {
      // Schedule retry
      const retryDelay = this.calculateRetryDelay(attempts);
      const nextRetryAt = new Date(Date.now() + retryDelay);

      await prisma.emailProcessingLog.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          errorMessage,
          details: {
            ...(job.data as any),
            attempts,
            processingTime,
            nextRetryAt: nextRetryAt.toISOString(),
            lastError: errorMessage
          }
        }
      });
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempts: number): number {
    const baseDelay = this.config.retryDelayBase;
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attempts - 1),
      this.config.retryDelayMax
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay;
    
    return exponentialDelay + jitter;
  }

  /**
   * Recover stalled jobs (processing jobs that got interrupted)
   */
  private async recoverStalledJobs(): Promise<void> {
    const stalledTimeout = new Date(Date.now() - this.config.jobTimeout * 2);
    
    await prisma.emailProcessingLog.updateMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: stalledTimeout }
      },
      data: {
        status: 'PENDING',
        errorMessage: 'Job stalled and recovered'
      }
    });
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.runCleanup();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Run cleanup tasks
   */
  private async runCleanup(): Promise<void> {
    // Clean up old completed jobs
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    await prisma.emailProcessingLog.deleteMany({
      where: {
        status: 'SUCCESS',
        createdAt: { lt: cutoffDate }
      }
    });

    // Recover stalled jobs
    await this.recoverStalledJobs();
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const [totalJobs, pendingJobs, processingJobs, completedJobs, failedJobs] = await Promise.all([
      prisma.emailProcessingLog.count(),
      prisma.emailProcessingLog.count({ where: { status: 'PENDING' } }),
      prisma.emailProcessingLog.count({ where: { status: 'PROCESSING' } }),
      prisma.emailProcessingLog.count({ where: { status: 'SUCCESS' } }),
      prisma.emailProcessingLog.count({ where: { status: 'FAILED' } })
    ]);

    const averageProcessingTime = this.stats.processed > 0 
      ? this.stats.totalProcessingTime / this.stats.processed 
      : 0;

    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
    const currentLoad = processingJobs / this.config.maxConcurrentJobs;

    return {
      totalJobs,
      pendingJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      averageProcessingTime,
      successRate,
      currentLoad
    };
  }

  /**
   * Get queue size
   */
  private async getQueueSize(): Promise<number> {
    return await prisma.emailProcessingLog.count({
      where: { status: { in: ['PENDING', 'PROCESSING'] } }
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): QueueConfig {
    return { ...this.config };
  }
}

/**
 * Default email processing queue instance
 */
export const emailProcessingQueue = new EmailProcessingQueue();