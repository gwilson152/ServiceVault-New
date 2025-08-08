import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimitService, RateLimitKeyType } from '../RateLimitService';

/**
 * Rate limit options
 */
export interface RateLimitOptions {
  keyType?: RateLimitKeyType;
  ruleId?: string;
  skipAuthCheck?: boolean;
  customKeyExtractor?: (req: NextRequest) => Promise<string>;
  onLimitExceeded?: (req: NextRequest, result: any) => Promise<NextResponse>;
}

/**
 * Default rate limit options
 */
const DEFAULT_OPTIONS: RateLimitOptions = {
  keyType: RateLimitKeyType.IP,
  skipAuthCheck: false
};

/**
 * Rate limiting middleware for API routes
 */
export function withRateLimit(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options: RateLimitOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async function rateLimitedHandler(req: NextRequest, ...args: any[]): Promise<NextResponse> {
    try {
      // Extract key value based on key type
      const keyValue = await extractKeyValue(req, opts);
      
      if (!keyValue) {
        return NextResponse.json(
          { error: 'Unable to determine rate limit key' },
          { status: 400 }
        );
      }

      // Check rate limit
      const rateLimitResult = await rateLimitService.checkRateLimit(
        opts.keyType!,
        keyValue,
        opts.ruleId
      );

      // If rate limited, return 429
      if (!rateLimitResult.allowed) {
        const response = opts.onLimitExceeded 
          ? await opts.onLimitExceeded(req, rateLimitResult)
          : createRateLimitResponse(rateLimitResult);

        // Add rate limit headers
        addRateLimitHeaders(response, rateLimitResult);
        return response;
      }

      // Call the original handler
      const response = await handler(req, ...args);

      // Add rate limit headers to successful response
      addRateLimitHeaders(response, rateLimitResult);

      return response;

    } catch (error) {
      console.error('Rate limit middleware error:', error);
      
      // On error, allow the request through but log the issue
      return await handler(req, ...args);
    }
  };
}

/**
 * Extract key value for rate limiting
 */
async function extractKeyValue(req: NextRequest, options: RateLimitOptions): Promise<string | null> {
  // Use custom extractor if provided
  if (options.customKeyExtractor) {
    return await options.customKeyExtractor(req);
  }

  const keyType = options.keyType!;

  switch (keyType) {
    case RateLimitKeyType.IP:
      return getClientIP(req);

    case RateLimitKeyType.USER:
      if (options.skipAuthCheck) {
        return getClientIP(req); // Fallback to IP if no auth
      }
      
      const session = await getServerSession(authOptions);
      return session?.user?.id || null;

    case RateLimitKeyType.INTEGRATION:
      // Extract integration ID from URL or body
      return extractIntegrationId(req);

    case RateLimitKeyType.ACCOUNT:
      // Extract account ID from URL, body, or user session
      return await extractAccountId(req);

    case RateLimitKeyType.GLOBAL:
      return 'global';

    default:
      return getClientIP(req);
  }
}

/**
 * Get client IP address
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const real = req.headers.get('x-real-ip');
  const remote = req.headers.get('x-remote-addr');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (real) {
    return real;
  }
  
  if (remote) {
    return remote;
  }

  // Fallback for development
  return '127.0.0.1';
}

/**
 * Extract integration ID from request
 */
function extractIntegrationId(req: NextRequest): string | null {
  // Try URL path parameters
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  
  // Look for integration ID in common patterns
  const integrationIndex = pathSegments.findIndex(segment => segment === 'integrations');
  if (integrationIndex !== -1 && pathSegments[integrationIndex + 1]) {
    return pathSegments[integrationIndex + 1];
  }

  // Try query parameters
  const integrationId = url.searchParams.get('integrationId') || 
                        url.searchParams.get('integration_id');
  if (integrationId) {
    return integrationId;
  }

  return null;
}

/**
 * Extract account ID from request
 */
async function extractAccountId(req: NextRequest): Promise<string | null> {
  // Try URL path parameters
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  
  // Look for account ID in common patterns
  const accountIndex = pathSegments.findIndex(segment => segment === 'accounts');
  if (accountIndex !== -1 && pathSegments[accountIndex + 1]) {
    return pathSegments[accountIndex + 1];
  }

  // Try query parameters
  const accountId = url.searchParams.get('accountId') || 
                    url.searchParams.get('account_id');
  if (accountId) {
    return accountId;
  }

  // Try to get from user session (primary account)
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      // In a real implementation, you'd query the user's primary account
      // For now, return user ID as fallback
      return session.user.id;
    }
  } catch (error) {
    console.error('Error getting session for account ID:', error);
  }

  return null;
}

/**
 * Create rate limit exceeded response
 */
function createRateLimitResponse(result: any): NextResponse {
  const message = `Rate limit exceeded. Try again ${result.retryAfter ? `in ${result.retryAfter} seconds` : 'later'}.`;
  
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message,
      retryAfter: result.retryAfter,
      resetTime: result.resetTime,
      ruleId: result.ruleId
    },
    { status: 429 }
  );
}

/**
 * Add rate limit headers to response
 */
function addRateLimitHeaders(response: NextResponse, result: any): void {
  response.headers.set('X-RateLimit-Limit', '100'); // This should come from the rule
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime.getTime() / 1000).toString());
  
  if (result.retryAfter) {
    response.headers.set('Retry-After', result.retryAfter.toString());
  }
  
  response.headers.set('X-RateLimit-Rule', result.ruleId);
}

/**
 * Specific rate limit configurations for different endpoints
 */
export const emailIntegrationRateLimit = withRateLimit.bind(null, {
  keyType: RateLimitKeyType.INTEGRATION,
  ruleId: 'integration-per-minute'
});

export const userRateLimit = withRateLimit.bind(null, {
  keyType: RateLimitKeyType.USER,
  ruleId: 'user-per-minute'
});

export const accountRateLimit = withRateLimit.bind(null, {
  keyType: RateLimitKeyType.ACCOUNT,
  ruleId: 'account-per-minute'
});

export const ipRateLimit = withRateLimit.bind(null, {
  keyType: RateLimitKeyType.IP,
  ruleId: 'ip-per-minute',
  skipAuthCheck: true
});

/**
 * High-throughput rate limit for webhooks
 */
export const webhookRateLimit = withRateLimit.bind(null, {
  keyType: RateLimitKeyType.INTEGRATION,
  customKeyExtractor: async (req: NextRequest) => {
    // Extract integration ID from webhook signature or path
    const integrationId = extractIntegrationId(req);
    return integrationId || getClientIP(req);
  },
  onLimitExceeded: async (req: NextRequest, result: any) => {
    // For webhooks, we might want to return 503 instead of 429
    return NextResponse.json(
      {
        error: 'Service temporarily unavailable',
        message: 'Webhook processing rate limit exceeded',
        retryAfter: result.retryAfter
      },
      { status: 503 }
    );
  }
});

/**
 * Admin rate limit with higher limits
 */
export const adminRateLimit = withRateLimit.bind(null, {
  keyType: RateLimitKeyType.USER,
  customKeyExtractor: async (req: NextRequest) => {
    const session = await getServerSession(authOptions);
    
    // Check if user has admin permissions
    if (session?.user?.id) {
      // In a real implementation, check if user is admin
      // For now, just return user ID with admin prefix
      return `admin:${session.user.id}`;
    }
    
    return getClientIP(req);
  }
});

/**
 * Security endpoint rate limit - very restrictive
 */
export const securityRateLimit = withRateLimit.bind(null, {
  keyType: RateLimitKeyType.USER,
  ruleId: 'security-per-minute', // This rule would need to be defined
  onLimitExceeded: async (req: NextRequest, result: any) => {
    // Security endpoints should have more detailed logging
    console.warn(`Security endpoint rate limit exceeded for user: ${result.keyValue}`);
    
    return NextResponse.json(
      {
        error: 'Security rate limit exceeded',
        message: 'Too many security operations. Please wait before trying again.',
        retryAfter: result.retryAfter
      },
      { status: 429 }
    );
  }
});