import { emailProcessingQueue } from './EmailProcessingQueue';
import { emailProviderRegistry } from './providers/EmailProvider';
import { accountMappingService } from './AccountMappingService';
import { emailThreadingService } from './EmailThreadingService';
import { prisma } from '@/lib/prisma';

/**
 * Service status
 */
export enum ServiceStatus {
  STOPPED = 'STOPPED',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
  ERROR = 'ERROR'
}

/**
 * Service health check result
 */
export interface ServiceHealth {
  status: ServiceStatus;
  uptime: number; // milliseconds
  lastError?: string;
  lastErrorTime?: Date;
  processedJobs: number;
  failedJobs: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

/**
 * Email service configuration
 */
export interface EmailServiceConfig {
  autoStartQueue: boolean;
  loadActiveIntegrations: boolean;
  enableHealthChecks: boolean;
  healthCheckInterval: number; // milliseconds
  tokenRefreshInterval: number; // milliseconds
  cleanupInterval: number; // milliseconds
}

/**
 * Default service configuration
 */
const DEFAULT_SERVICE_CONFIG: EmailServiceConfig = {
  autoStartQueue: true,
  loadActiveIntegrations: true,
  enableHealthChecks: true,
  healthCheckInterval: 60000, // 1 minute
  tokenRefreshInterval: 3600000, // 1 hour
  cleanupInterval: 21600000 // 6 hours
};

/**
 * Email service manager
 * Manages all email-related background services and integrations
 */
export class EmailServiceManager {
  private config: EmailServiceConfig;
  private status = ServiceStatus.STOPPED;
  private startTime?: Date;
  private lastError?: string;
  private lastErrorTime?: Date;
  private healthCheckTimer?: NodeJS.Timer;
  private tokenRefreshTimer?: NodeJS.Timer;
  private cleanupTimer?: NodeJS.Timer;
  private processedJobs = 0;
  private failedJobs = 0;

  constructor(config?: Partial<EmailServiceConfig>) {
    this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };
  }

  /**
   * Start all email services
   */
  async start(): Promise<void> {
    if (this.status === ServiceStatus.RUNNING) {
      console.log('Email services already running');
      return;
    }

    console.log('Starting email services...');
    this.status = ServiceStatus.STARTING;
    this.startTime = new Date();

    try {
      // Start processing queue
      if (this.config.autoStartQueue) {
        await emailProcessingQueue.start();
      }

      // Load active integrations
      if (this.config.loadActiveIntegrations) {
        await this.loadActiveIntegrations();
      }

      // Start background timers
      this.startHealthChecks();
      this.startTokenRefreshTimer();
      this.startCleanupTimer();

      this.status = ServiceStatus.RUNNING;
      console.log('Email services started successfully');

    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.lastErrorTime = new Date();
      
      console.error('Failed to start email services:', error);
      throw error;
    }
  }

  /**
   * Stop all email services
   */
  async stop(): Promise<void> {
    if (this.status === ServiceStatus.STOPPED) {
      return;
    }

    console.log('Stopping email services...');
    this.status = ServiceStatus.STOPPING;

    try {
      // Stop timers
      this.stopTimers();

      // Stop processing queue
      await emailProcessingQueue.stop();

      // Disconnect all providers
      await emailProviderRegistry.cleanup();

      // Clear caches
      accountMappingService.clearCache();
      emailThreadingService.clearCache();

      this.status = ServiceStatus.STOPPED;
      console.log('Email services stopped successfully');

    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.lastErrorTime = new Date();
      
      console.error('Failed to stop email services:', error);
      throw error;
    }
  }

  /**
   * Restart all services
   */
  async restart(): Promise<void> {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
    await this.start();
  }

  /**
   * Get service health status
   */
  getHealth(): ServiceHealth {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    return {
      status: this.status,
      uptime,
      lastError: this.lastError,
      lastErrorTime: this.lastErrorTime,
      processedJobs: this.processedJobs,
      failedJobs: this.failedJobs,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Load active email integrations
   */
  private async loadActiveIntegrations(): Promise<void> {
    try {
      const integrations = await prisma.emailIntegration.findMany({
        where: { isActive: true },
        include: { account: true }
      });

      console.log(`Loading ${integrations.length} active email integrations...`);

      for (const integration of integrations) {
        try {
          // Create and register email provider
          const { createEmailProvider } = await import('./providers/EmailProvider');
          const provider = createEmailProvider(
            integration.providerConfig as any, 
            integration.id
          );

          emailProviderRegistry.register(integration.id, provider);

          // Test connection
          const testResult = await provider.testConnection();
          if (!testResult.success) {
            console.warn(`Integration ${integration.id} connection test failed: ${testResult.error}`);
          }

          console.log(`Loaded integration: ${integration.id} (${integration.provider})`);

        } catch (error) {
          console.error(`Failed to load integration ${integration.id}:`, error);
        }
      }

    } catch (error) {
      console.error('Failed to load active integrations:', error);
      throw error;
    }
  }

  /**
   * Start health check timer
   */
  private startHealthChecks(): void {
    if (!this.config.enableHealthChecks) {
      return;
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform system health check
   */
  private async performHealthCheck(): Promise<void> {
    // Check queue health
    const queueStats = await emailProcessingQueue.getStats();
    
    if (queueStats.currentLoad > 0.9) {
      console.warn('Email processing queue is under heavy load');
    }

    if (queueStats.successRate < 80) {
      console.warn(`Email processing success rate is low: ${queueStats.successRate}%`);
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / 1024 / 1024;
    
    if (memUsageMB > 500) { // 500MB threshold
      console.warn(`High memory usage: ${memUsageMB.toFixed(2)}MB`);
    }

    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error('Database connectivity check failed:', error);
      this.lastError = 'Database connectivity issue';
      this.lastErrorTime = new Date();
    }
  }

  /**
   * Start token refresh timer
   */
  private startTokenRefreshTimer(): void {
    this.tokenRefreshTimer = setInterval(async () => {
      try {
        await this.refreshExpiredTokens();
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }, this.config.tokenRefreshInterval);
  }

  /**
   * Refresh expired OAuth tokens
   */
  private async refreshExpiredTokens(): Promise<void> {
    // Find integrations with tokens expiring soon
    const integrations = await prisma.emailIntegration.findMany({
      where: {
        isActive: true,
        provider: { in: ['MICROSOFT_GRAPH', 'GMAIL'] }
      }
    });

    for (const integration of integrations) {
      try {
        const config = integration.providerConfig as any;
        
        if (config.tokenExpiry) {
          const expiryTime = new Date(config.tokenExpiry);
          const now = new Date();
          
          // Refresh if expiring within 10 minutes
          if (expiryTime.getTime() - now.getTime() < 10 * 60 * 1000) {
            const provider = emailProviderRegistry.get(integration.id);
            
            if (provider) {
              const refreshResult = await provider.refreshTokens();
              
              if (refreshResult.success) {
                // Update database with new tokens
                await prisma.emailIntegration.update({
                  where: { id: integration.id },
                  data: {
                    providerConfig: {
                      ...config,
                      accessToken: refreshResult.accessToken,
                      refreshToken: refreshResult.refreshToken,
                      tokenExpiry: refreshResult.expiresAt
                    }
                  }
                });
                
                console.log(`Refreshed tokens for integration ${integration.id}`);
              } else {
                console.warn(`Token refresh failed for integration ${integration.id}: ${refreshResult.error}`);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Token refresh error for integration ${integration.id}:`, error);
      }
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.performCleanup();
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Perform system cleanup
   */
  private async performCleanup(): Promise<void> {
    console.log('Performing system cleanup...');
    
    // Clean up old processed messages
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const deletedMessages = await prisma.emailMessage.deleteMany({
      where: {
        status: 'PROCESSED',
        processedAt: { lt: cutoffDate },
        ticketId: null // Don't delete messages linked to tickets
      }
    });

    // Clean up old processing logs
    const deletedLogs = await prisma.emailProcessingLog.deleteMany({
      where: {
        status: 'SUCCESS',
        createdAt: { lt: cutoffDate }
      }
    });

    // Clear service caches
    accountMappingService.clearCache();
    emailThreadingService.clearCache();

    console.log(`Cleanup completed: deleted ${deletedMessages.count} messages and ${deletedLogs.count} logs`);
  }

  /**
   * Stop all timers
   */
  private stopTimers(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EmailServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): EmailServiceConfig {
    return { ...this.config };
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<{
    status: ServiceStatus;
    uptime: number;
    activeIntegrations: number;
    queueStats: any;
    memoryUsage: NodeJS.MemoryUsage;
    processedJobs: number;
    failedJobs: number;
  }> {
    const health = this.getHealth();
    const queueStats = await emailProcessingQueue.getStats();
    const activeIntegrations = emailProviderRegistry.getRegisteredIds().length;

    return {
      status: health.status,
      uptime: health.uptime,
      activeIntegrations,
      queueStats,
      memoryUsage: health.memoryUsage || process.memoryUsage(),
      processedJobs: health.processedJobs,
      failedJobs: health.failedJobs
    };
  }
}

/**
 * Default email service manager instance
 */
export const emailServiceManager = new EmailServiceManager();

/**
 * Auto-start services in production
 */
if (process.env.NODE_ENV === 'production') {
  emailServiceManager.start().catch(error => {
    console.error('Failed to auto-start email services:', error);
  });
}