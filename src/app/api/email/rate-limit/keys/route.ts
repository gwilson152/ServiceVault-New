import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { rateLimitService, RateLimitKeyType } from '@/lib/email/RateLimitService';
import { adminRateLimit } from '@/lib/email/middleware/rateLimitMiddleware';

/**
 * Get quota information for rate limit keys
 * GET /api/email/rate-limit/keys
 */
export const GET = adminRateLimit(async function getQuotas(request: NextRequest) {
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
    const keyType = searchParams.get('keyType') as RateLimitKeyType;
    const keyValue = searchParams.get('keyValue');

    if (!keyType || !keyValue) {
      return NextResponse.json({ 
        error: 'Key type and key value are required' 
      }, { status: 400 });
    }

    if (!Object.values(RateLimitKeyType).includes(keyType)) {
      return NextResponse.json({ error: 'Invalid key type' }, { status: 400 });
    }

    // Get quota information
    const quotas = await rateLimitService.getQuota(keyType, keyValue);

    return NextResponse.json({
      keyType,
      keyValue,
      quotas: quotas.map(quota => ({
        window: quota.window,
        limit: quota.limit,
        used: quota.used,
        remaining: quota.remaining,
        resetTime: quota.resetTime,
        burstUsed: quota.burstUsed,
        burstRemaining: quota.burstRemaining,
        utilizationPercent: Math.round((quota.used / quota.limit) * 100)
      })),
      summary: {
        totalQuotas: quotas.length,
        hasActiveUsage: quotas.some(q => q.used > 0),
        highestUtilization: quotas.length > 0 ? 
          Math.max(...quotas.map(q => (q.used / q.limit) * 100)) : 0,
        nextResetTime: quotas.length > 0 ? 
          new Date(Math.min(...quotas.map(q => q.resetTime.getTime()))) : null
      }
    });

  } catch (error) {
    console.error('Get quota error:', error);
    
    return NextResponse.json({
      error: 'Failed to get quota information',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

/**
 * Manage rate limit keys (reset, block, etc.)
 * POST /api/email/rate-limit/keys
 */
export const POST = adminRateLimit(async function manageKeys(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const canManage = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'admin'
    });

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, keyType, keyValue, ruleId, reason } = await request.json();

    if (!action || !keyType || !keyValue) {
      return NextResponse.json({ 
        error: 'Action, key type, and key value are required' 
      }, { status: 400 });
    }

    const validActions = ['reset', 'check', 'block_temporary', 'unblock'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!Object.values(RateLimitKeyType).includes(keyType)) {
      return NextResponse.json({ error: 'Invalid key type' }, { status: 400 });
    }

    let result: any = {};

    switch (action) {
      case 'reset':
        await rateLimitService.resetRateLimit(keyType, keyValue, ruleId);
        result = {
          message: `Rate limit reset for ${keyType}:${keyValue}`,
          resetTime: new Date(),
          ruleId: ruleId || 'all'
        };
        break;

      case 'check':
        const checkResult = await rateLimitService.checkRateLimit(keyType, keyValue, ruleId);
        result = {
          message: 'Rate limit check completed',
          allowed: checkResult.allowed,
          remaining: checkResult.remaining,
          resetTime: checkResult.resetTime,
          retryAfter: checkResult.retryAfter,
          ruleId: checkResult.ruleId
        };
        break;

      case 'block_temporary':
        // This would implement temporary blocking - not implemented in basic service
        result = {
          message: 'Temporary blocking not implemented yet',
          keyType,
          keyValue,
          reason
        };
        break;

      case 'unblock':
        // This would implement unblocking - not implemented in basic service
        await rateLimitService.resetRateLimit(keyType, keyValue);
        result = {
          message: `Unblocked ${keyType}:${keyValue}`,
          unblockedTime: new Date()
        };
        break;
    }

    // Get updated quota information if not a check operation
    if (action !== 'check') {
      const quotas = await rateLimitService.getQuota(keyType, keyValue);
      result.quotas = quotas;
    }

    return NextResponse.json({
      action,
      keyType,
      keyValue,
      result
    });

  } catch (error) {
    console.error('Manage keys error:', error);
    
    return NextResponse.json({
      error: 'Failed to manage rate limit key',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

/**
 * Batch operations on rate limit keys
 * PATCH /api/email/rate-limit/keys
 */
export const PATCH = adminRateLimit(async function batchManageKeys(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const canManage = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'admin'
    });

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, keys, ruleId, reason } = await request.json();

    if (!action || !keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ 
        error: 'Action and keys array are required' 
      }, { status: 400 });
    }

    if (keys.length > 100) {
      return NextResponse.json({ 
        error: 'Maximum 100 keys per batch operation' 
      }, { status: 400 });
    }

    const validActions = ['reset', 'check_all'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid batch action' }, { status: 400 });
    }

    const results = [];

    for (const key of keys) {
      if (!key.keyType || !key.keyValue) {
        results.push({
          keyType: key.keyType,
          keyValue: key.keyValue,
          success: false,
          error: 'Missing key type or value'
        });
        continue;
      }

      if (!Object.values(RateLimitKeyType).includes(key.keyType)) {
        results.push({
          keyType: key.keyType,
          keyValue: key.keyValue,
          success: false,
          error: 'Invalid key type'
        });
        continue;
      }

      try {
        let result: any = { success: true };

        switch (action) {
          case 'reset':
            await rateLimitService.resetRateLimit(key.keyType, key.keyValue, ruleId);
            result.message = 'Reset successful';
            result.resetTime = new Date();
            break;

          case 'check_all':
            const checkResult = await rateLimitService.checkRateLimit(
              key.keyType, 
              key.keyValue, 
              ruleId
            );
            result.allowed = checkResult.allowed;
            result.remaining = checkResult.remaining;
            result.resetTime = checkResult.resetTime;
            result.retryAfter = checkResult.retryAfter;
            break;
        }

        results.push({
          keyType: key.keyType,
          keyValue: key.keyValue,
          ...result
        });

      } catch (error) {
        results.push({
          keyType: key.keyType,
          keyValue: key.keyValue,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const summary = {
      totalKeys: keys.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      action,
      processedAt: new Date()
    };

    return NextResponse.json({
      message: `Batch ${action} completed`,
      results,
      summary
    });

  } catch (error) {
    console.error('Batch manage keys error:', error);
    
    return NextResponse.json({
      error: 'Failed to perform batch operation',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});