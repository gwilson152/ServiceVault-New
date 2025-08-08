import { prisma } from '@/lib/prisma';

/**
 * Rate limit window types
 */
export enum RateLimitWindow {
  SECOND = 'second',
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day'
}

/**
 * Rate limit key types
 */
export enum RateLimitKeyType {
  IP = 'ip',
  USER = 'user',
  INTEGRATION = 'integration',
  GLOBAL = 'global',
  ACCOUNT = 'account'
}

/**
 * Rate limit rule
 */
export interface RateLimitRule {
  id: string;
  keyType: RateLimitKeyType;
  window: RateLimitWindow;
  limit: number;
  burst?: number; // Allow burst above limit
  enabled: boolean;
  description?: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // seconds
  ruleId: string;
  keyValue: string;
}

/**
 * Rate limit quota info
 */
export interface RateLimitQuota {
  keyType: RateLimitKeyType;
  keyValue: string;
  window: RateLimitWindow;
  limit: number;
  used: number;
  remaining: number;
  resetTime: Date;
  burstUsed: number;
  burstRemaining: number;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  // Global settings
  enableRateLimiting: boolean;
  defaultRetryAfter: number; // seconds
  
  // Cleanup settings
  cleanupInterval: number; // milliseconds
  retentionPeriod: number; // milliseconds
  
  // Backoff settings
  enableExponentialBackoff: boolean;
  baseBackoffDelay: number; // milliseconds
  maxBackoffDelay: number; // milliseconds
  backoffMultiplier: number;
  
  // Monitoring
  enableDetailedLogging: boolean;
  alertThreshold: number; // Alert when rate limit hit count exceeds this
}

/**
 * Default rate limiting configuration
 */
const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  enableRateLimiting: true,
  defaultRetryAfter: 60, // 1 minute
  
  cleanupInterval: 3600000, // 1 hour
  retentionPeriod: 86400000, // 24 hours
  
  enableExponentialBackoff: true,
  baseBackoffDelay: 1000, // 1 second
  maxBackoffDelay: 300000, // 5 minutes
  backoffMultiplier: 2,
  
  enableDetailedLogging: false,
  alertThreshold: 100
};

/**
 * Default rate limit rules
 */
const DEFAULT_RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    id: 'global-per-second',
    keyType: RateLimitKeyType.GLOBAL,
    window: RateLimitWindow.SECOND,
    limit: 100,
    burst: 150,
    enabled: true,
    description: 'Global requests per second'
  },
  {
    id: 'global-per-minute',
    keyType: RateLimitKeyType.GLOBAL,
    window: RateLimitWindow.MINUTE,
    limit: 3000,
    burst: 4000,
    enabled: true,
    description: 'Global requests per minute'
  },
  {
    id: 'user-per-minute',
    keyType: RateLimitKeyType.USER,
    window: RateLimitWindow.MINUTE,
    limit: 300,
    burst: 500,
    enabled: true,
    description: 'User requests per minute'
  },
  {
    id: 'user-per-hour',
    keyType: RateLimitKeyType.USER,
    window: RateLimitWindow.HOUR,
    limit: 10000,
    enabled: true,
    description: 'User requests per hour'
  },
  {
    id: 'integration-per-minute',
    keyType: RateLimitKeyType.INTEGRATION,
    window: RateLimitWindow.MINUTE,
    limit: 60,
    burst: 120,
    enabled: true,
    description: 'Email integration requests per minute'
  },
  {
    id: 'integration-per-hour',
    keyType: RateLimitKeyType.INTEGRATION,
    window: RateLimitWindow.HOUR,
    limit: 3600,
    enabled: true,
    description: 'Email integration requests per hour'
  },
  {
    id: 'account-per-minute',
    keyType: RateLimitKeyType.ACCOUNT,
    window: RateLimitWindow.MINUTE,
    limit: 500,
    enabled: true,
    description: 'Account requests per minute'
  },
  {
    id: 'ip-per-minute',
    keyType: RateLimitKeyType.IP,
    window: RateLimitWindow.MINUTE,
    limit: 100,
    burst: 200,
    enabled: true,
    description: 'IP address requests per minute'
  }
];

/**
 * Rate limiting service with sliding window and exponential backoff
 */
export class RateLimitService {
  private config: RateLimitConfig;
  private rules = new Map<string, RateLimitRule>();
  private cache = new Map<string, any>(); // In-memory cache for performance
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    
    // Initialize default rules
    DEFAULT_RATE_LIMIT_RULES.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(
    keyType: RateLimitKeyType,
    keyValue: string,
    ruleId?: string
  ): Promise<RateLimitResult> {
    if (!this.config.enableRateLimiting) {
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: new Date(Date.now() + 60000),
        ruleId: 'disabled',
        keyValue
      };
    }

    // Find applicable rule
    const rule = this.findApplicableRule(keyType, ruleId);
    if (!rule || !rule.enabled) {
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: new Date(Date.now() + 60000),
        ruleId: rule?.id || 'none',
        keyValue
      };
    }

    const cacheKey = this.getCacheKey(rule.id, keyType, keyValue);
    const windowStart = this.getWindowStart(rule.window);
    const windowEnd = this.getWindowEnd(rule.window);

    // Check current usage
    const currentUsage = await this.getCurrentUsage(cacheKey, windowStart, windowEnd);
    
    // Determine limits
    const baseLimit = rule.limit;
    const burstLimit = rule.burst || baseLimit;
    const totalLimit = Math.max(baseLimit, burstLimit);

    // Check if request is allowed
    const allowed = currentUsage < totalLimit;
    const remaining = Math.max(0, totalLimit - currentUsage - 1);

    // Record the request if allowed
    if (allowed) {
      await this.recordRequest(cacheKey, windowEnd);
    }

    // Calculate retry after time
    let retryAfter: number | undefined;
    if (!allowed) {
      if (this.config.enableExponentialBackoff) {
        retryAfter = this.calculateExponentialBackoff(cacheKey, currentUsage, totalLimit);
      } else {
        retryAfter = this.config.defaultRetryAfter;
      }

      // Log rate limit hit
      if (this.config.enableDetailedLogging) {
        await this.logRateLimitHit(keyType, keyValue, rule.id, currentUsage, totalLimit);
      }
    }

    return {
      allowed,
      remaining,
      resetTime: windowEnd,
      retryAfter,
      ruleId: rule.id,
      keyValue
    };
  }

  /**
   * Get current quota information
   */
  async getQuota(keyType: RateLimitKeyType, keyValue: string): Promise<RateLimitQuota[]> {
    const quotas: RateLimitQuota[] = [];

    // Get all applicable rules for this key type
    const applicableRules = Array.from(this.rules.values())
      .filter(rule => rule.keyType === keyType && rule.enabled);

    for (const rule of applicableRules) {
      const cacheKey = this.getCacheKey(rule.id, keyType, keyValue);
      const windowStart = this.getWindowStart(rule.window);
      const windowEnd = this.getWindowEnd(rule.window);
      
      const used = await this.getCurrentUsage(cacheKey, windowStart, windowEnd);
      const baseLimit = rule.limit;
      const burstLimit = rule.burst || baseLimit;
      
      const baseUsed = Math.min(used, baseLimit);
      const burstUsed = Math.max(0, used - baseLimit);

      quotas.push({
        keyType,
        keyValue,
        window: rule.window,
        limit: baseLimit,
        used: baseUsed,
        remaining: Math.max(0, baseLimit - baseUsed),
        resetTime: windowEnd,
        burstUsed,
        burstRemaining: Math.max(0, burstLimit - baseLimit - burstUsed)
      });
    }

    return quotas;
  }

  /**
   * Reset rate limit for a key
   */
  async resetRateLimit(keyType: RateLimitKeyType, keyValue: string, ruleId?: string): Promise<void> {
    if (ruleId) {
      const cacheKey = this.getCacheKey(ruleId, keyType, keyValue);
      this.cache.delete(cacheKey);
      
      // Also clear from persistent storage if implemented
      await this.clearPersistentUsage(cacheKey);
    } else {
      // Reset all rules for this key
      const applicableRules = Array.from(this.rules.values())
        .filter(rule => rule.keyType === keyType);
      
      for (const rule of applicableRules) {
        const cacheKey = this.getCacheKey(rule.id, keyType, keyValue);
        this.cache.delete(cacheKey);
        await this.clearPersistentUsage(cacheKey);
      }
    }
  }

  /**
   * Get rate limit statistics
   */
  async getStatistics(since?: Date): Promise<{
    totalRequests: number;
    blockedRequests: number;
    topLimitedKeys: Array<{ key: string; hits: number }>;
    ruleStats: Array<{ ruleId: string; hits: number; blocks: number }>;
  }> {
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    // This would typically query a persistent log
    // For now, return basic stats from memory
    return {
      totalRequests: 0,
      blockedRequests: 0,
      topLimitedKeys: [],
      ruleStats: []
    };
  }

  /**
   * Add or update a rate limit rule
   */
  addRule(rule: RateLimitRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a rate limit rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all rules
   */
  getRules(): RateLimitRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Find applicable rule for key type
   */
  private findApplicableRule(keyType: RateLimitKeyType, ruleId?: string): RateLimitRule | undefined {
    if (ruleId) {
      const rule = this.rules.get(ruleId);
      if (rule && rule.keyType === keyType) {
        return rule;
      }
    }

    // Find the most restrictive rule for this key type
    return Array.from(this.rules.values())
      .filter(rule => rule.keyType === keyType && rule.enabled)
      .sort((a, b) => a.limit - b.limit)[0];
  }

  /**
   * Generate cache key
   */
  private getCacheKey(ruleId: string, keyType: RateLimitKeyType, keyValue: string): string {
    return `ratelimit:${ruleId}:${keyType}:${keyValue}`;
  }

  /**
   * Get window start time
   */
  private getWindowStart(window: RateLimitWindow): Date {
    const now = new Date();
    
    switch (window) {
      case RateLimitWindow.SECOND:
        return new Date(Math.floor(now.getTime() / 1000) * 1000);
      case RateLimitWindow.MINUTE:
        return new Date(Math.floor(now.getTime() / 60000) * 60000);
      case RateLimitWindow.HOUR:
        return new Date(Math.floor(now.getTime() / 3600000) * 3600000);
      case RateLimitWindow.DAY:
        const day = new Date(now);
        day.setHours(0, 0, 0, 0);
        return day;
      default:
        return new Date(Math.floor(now.getTime() / 60000) * 60000);
    }
  }

  /**
   * Get window end time
   */
  private getWindowEnd(window: RateLimitWindow): Date {
    const start = this.getWindowStart(window);
    
    switch (window) {
      case RateLimitWindow.SECOND:
        return new Date(start.getTime() + 1000);
      case RateLimitWindow.MINUTE:
        return new Date(start.getTime() + 60000);
      case RateLimitWindow.HOUR:
        return new Date(start.getTime() + 3600000);
      case RateLimitWindow.DAY:
        return new Date(start.getTime() + 86400000);
      default:
        return new Date(start.getTime() + 60000);
    }
  }

  /**
   * Get current usage for a cache key
   */
  private async getCurrentUsage(cacheKey: string, windowStart: Date, windowEnd: Date): Promise<number> {
    // First check in-memory cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.windowEnd.getTime() === windowEnd.getTime()) {
      return cached.count;
    }

    // If not in cache or window changed, initialize
    const count = 0; // In a real implementation, this would query persistent storage
    
    this.cache.set(cacheKey, {
      count,
      windowStart,
      windowEnd
    });

    return count;
  }

  /**
   * Record a request
   */
  private async recordRequest(cacheKey: string, windowEnd: Date): Promise<void> {
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.windowEnd.getTime() === windowEnd.getTime()) {
      cached.count++;
    } else {
      this.cache.set(cacheKey, {
        count: 1,
        windowEnd
      });
    }

    // In a real implementation, you would also persist this to the database
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateExponentialBackoff(cacheKey: string, currentUsage: number, limit: number): number {
    const overageRatio = (currentUsage - limit) / limit;
    const exponentialDelay = Math.min(
      this.config.baseBackoffDelay * Math.pow(this.config.backoffMultiplier, overageRatio),
      this.config.maxBackoffDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay;
    
    return Math.ceil((exponentialDelay + jitter) / 1000); // Convert to seconds
  }

  /**
   * Log rate limit hit
   */
  private async logRateLimitHit(
    keyType: RateLimitKeyType,
    keyValue: string,
    ruleId: string,
    currentUsage: number,
    limit: number
  ): Promise<void> {
    try {
      await prisma.emailProcessingLog.create({
        data: {
          integrationId: keyType === RateLimitKeyType.INTEGRATION ? keyValue : 'system',
          action: 'RATE_LIMIT_HIT',
          status: 'BLOCKED',
          details: {
            keyType,
            keyValue,
            ruleId,
            currentUsage,
            limit,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Failed to log rate limit hit:', error);
    }
  }

  /**
   * Clear persistent usage data
   */
  private async clearPersistentUsage(cacheKey: string): Promise<void> {
    // In a real implementation, this would clear persistent storage
    // For now, we just clear the cache
    this.cache.delete(cacheKey);
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of this.cache.entries()) {
      if (value.windowEnd && value.windowEnd.getTime() < now - this.config.retentionPeriod) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    if (expiredKeys.length > 0 && this.config.enableDetailedLogging) {
      console.log(`Rate limit cleanup: removed ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Stop the service
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    this.cache.clear();
  }
}

/**
 * Default rate limit service instance
 */
export const rateLimitService = new RateLimitService();