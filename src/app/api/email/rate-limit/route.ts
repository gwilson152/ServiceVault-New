import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { rateLimitService, RateLimitKeyType, RateLimitWindow } from '@/lib/email/RateLimitService';
import { withRateLimit, adminRateLimit } from '@/lib/email/middleware/rateLimitMiddleware';

/**
 * Get rate limit configuration and statistics
 * GET /api/email/rate-limit
 */
export const GET = withRateLimit(async function getRateLimit(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';
    const since = searchParams.get('since');

    // Get current configuration
    const config = rateLimitService.getConfig();
    
    // Get all rules
    const rules = rateLimitService.getRules();

    // Get statistics if requested
    let statistics;
    if (includeStats) {
      const sinceDate = since ? new Date(since) : undefined;
      statistics = await rateLimitService.getStatistics(sinceDate);
    }

    return NextResponse.json({
      config: {
        enableRateLimiting: config.enableRateLimiting,
        defaultRetryAfter: config.defaultRetryAfter,
        enableExponentialBackoff: config.enableExponentialBackoff,
        baseBackoffDelay: config.baseBackoffDelay,
        maxBackoffDelay: config.maxBackoffDelay,
        backoffMultiplier: config.backoffMultiplier,
        enableDetailedLogging: config.enableDetailedLogging,
        alertThreshold: config.alertThreshold
      },
      rules: rules.map(rule => ({
        id: rule.id,
        keyType: rule.keyType,
        window: rule.window,
        limit: rule.limit,
        burst: rule.burst,
        enabled: rule.enabled,
        description: rule.description
      })),
      statistics
    });

  } catch (error) {
    console.error('Get rate limit error:', error);
    
    return NextResponse.json({
      error: 'Failed to get rate limit configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}, { keyType: RateLimitKeyType.USER, ruleId: 'user-per-minute' });

/**
 * Update rate limit configuration
 * PATCH /api/email/rate-limit
 */
export const PATCH = adminRateLimit(async function updateRateLimit(request: NextRequest) {
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
    const { config, rules } = body;

    // Update configuration if provided
    if (config) {
      const allowedConfigFields = [
        'enableRateLimiting',
        'defaultRetryAfter',
        'enableExponentialBackoff',
        'baseBackoffDelay',
        'maxBackoffDelay',
        'backoffMultiplier',
        'enableDetailedLogging',
        'alertThreshold'
      ];

      const validConfig: any = {};
      for (const [key, value] of Object.entries(config)) {
        if (allowedConfigFields.includes(key)) {
          validConfig[key] = value;
        }
      }

      // Validate configuration values
      if (validConfig.defaultRetryAfter !== undefined && 
          (validConfig.defaultRetryAfter < 1 || validConfig.defaultRetryAfter > 3600)) {
        return NextResponse.json({ 
          error: 'Default retry after must be between 1 and 3600 seconds' 
        }, { status: 400 });
      }

      if (validConfig.baseBackoffDelay !== undefined && 
          (validConfig.baseBackoffDelay < 100 || validConfig.baseBackoffDelay > 60000)) {
        return NextResponse.json({ 
          error: 'Base backoff delay must be between 100ms and 60s' 
        }, { status: 400 });
      }

      if (validConfig.maxBackoffDelay !== undefined && 
          (validConfig.maxBackoffDelay < 1000 || validConfig.maxBackoffDelay > 600000)) {
        return NextResponse.json({ 
          error: 'Max backoff delay must be between 1s and 10m' 
        }, { status: 400 });
      }

      rateLimitService.updateConfig(validConfig);
    }

    // Update rules if provided
    if (rules && Array.isArray(rules)) {
      for (const rule of rules) {
        // Validate rule
        if (!rule.id || !rule.keyType || !rule.window || typeof rule.limit !== 'number') {
          return NextResponse.json({ 
            error: `Invalid rule: ${rule.id || 'missing id'}` 
          }, { status: 400 });
        }

        // Validate key type
        if (!Object.values(RateLimitKeyType).includes(rule.keyType)) {
          return NextResponse.json({ 
            error: `Invalid key type: ${rule.keyType}` 
          }, { status: 400 });
        }

        // Validate window
        if (!Object.values(RateLimitWindow).includes(rule.window)) {
          return NextResponse.json({ 
            error: `Invalid window: ${rule.window}` 
          }, { status: 400 });
        }

        // Validate limits
        if (rule.limit < 1 || rule.limit > 1000000) {
          return NextResponse.json({ 
            error: `Invalid limit for rule ${rule.id}: must be between 1 and 1,000,000` 
          }, { status: 400 });
        }

        if (rule.burst !== undefined && (rule.burst < rule.limit || rule.burst > rule.limit * 10)) {
          return NextResponse.json({ 
            error: `Invalid burst for rule ${rule.id}: must be between limit and limit * 10` 
          }, { status: 400 });
        }

        rateLimitService.addRule({
          id: rule.id,
          keyType: rule.keyType,
          window: rule.window,
          limit: rule.limit,
          burst: rule.burst,
          enabled: rule.enabled !== false,
          description: rule.description
        });
      }
    }

    // Return updated configuration
    const updatedConfig = rateLimitService.getConfig();
    const updatedRules = rateLimitService.getRules();

    return NextResponse.json({
      message: 'Rate limit configuration updated successfully',
      config: updatedConfig,
      rules: updatedRules
    });

  } catch (error) {
    console.error('Update rate limit error:', error);
    
    return NextResponse.json({
      error: 'Failed to update rate limit configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

/**
 * Test rate limiting
 * POST /api/email/rate-limit/test
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const canTest = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'test'
    });

    if (!canTest) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { keyType, keyValue, ruleId, count = 1 } = await request.json();

    if (!keyType || !keyValue) {
      return NextResponse.json({ error: 'Key type and value required' }, { status: 400 });
    }

    if (!Object.values(RateLimitKeyType).includes(keyType)) {
      return NextResponse.json({ error: 'Invalid key type' }, { status: 400 });
    }

    if (count < 1 || count > 100) {
      return NextResponse.json({ error: 'Count must be between 1 and 100' }, { status: 400 });
    }

    // Perform test requests
    const results = [];
    for (let i = 0; i < count; i++) {
      const result = await rateLimitService.checkRateLimit(keyType, keyValue, ruleId);
      results.push({
        request: i + 1,
        allowed: result.allowed,
        remaining: result.remaining,
        retryAfter: result.retryAfter,
        ruleId: result.ruleId
      });

      // Small delay between requests
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Get quota information
    const quotas = await rateLimitService.getQuota(keyType, keyValue);

    return NextResponse.json({
      message: `Completed ${count} test requests`,
      results,
      quotas,
      summary: {
        allowed: results.filter(r => r.allowed).length,
        blocked: results.filter(r => !r.allowed).length,
        totalRequests: count
      }
    });

  } catch (error) {
    console.error('Rate limit test error:', error);
    
    return NextResponse.json({
      error: 'Rate limit test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}