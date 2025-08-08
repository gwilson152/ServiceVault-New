import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmailAuditService } from './EmailAuditService';

/**
 * Audit middleware options
 */
interface AuditMiddlewareOptions {
  action: string;
  resourceType: string;
  extractResourceId?: (req: NextRequest) => string | undefined;
  extractAccountId?: (req: NextRequest) => string | undefined;
  extractIntegrationId?: (req: NextRequest) => string | undefined;
  extractFilters?: (req: NextRequest) => Record<string, any> | undefined;
  extractSearchQuery?: (req: NextRequest) => string | undefined;
  logResponse?: boolean;
}

/**
 * Audit middleware for email endpoints
 */
export function auditEmailAccess(options: AuditMiddlewareOptions) {
  return function middleware<T extends any[]>(
    handler: (...args: T) => Promise<NextResponse>
  ) {
    return async function wrappedHandler(...args: T): Promise<NextResponse> {
      const startTime = Date.now();
      let success = true;
      let errorMessage: string | undefined;
      let response: NextResponse;
      let resultCount: number | undefined;

      // Extract request from arguments (assuming first arg is NextRequest)
      const req = args[0] as NextRequest;
      
      try {
        // Get session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          success = false;
          errorMessage = 'Unauthorized access attempt';
          response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        } else {
          // Execute the handler
          response = await handler(...args);
          
          // Check if response indicates success
          success = response.status >= 200 && response.status < 300;
          
          if (!success && response.status >= 400) {
            try {
              const responseBody = await response.clone().json();
              errorMessage = responseBody.error || responseBody.message || 'Unknown error';
            } catch {
              errorMessage = `HTTP ${response.status}`;
            }
          }

          // Extract result count from successful responses
          if (success && options.logResponse) {
            try {
              const responseBody = await response.clone().json();
              if (Array.isArray(responseBody)) {
                resultCount = responseBody.length;
              } else if (responseBody.data && Array.isArray(responseBody.data)) {
                resultCount = responseBody.data.length;
              } else if (responseBody.emails && Array.isArray(responseBody.emails)) {
                resultCount = responseBody.emails.length;
              } else if (typeof responseBody.total === 'number') {
                resultCount = responseBody.total;
              }
            } catch {
              // Ignore errors when extracting response data
            }
          }
        }

        // Log the access event
        if (session?.user?.id) {
          const processingTime = Date.now() - startTime;
          
          await EmailAuditService.logAccessEvent({
            action: options.action,
            resourceType: options.resourceType,
            resourceId: options.extractResourceId?.(req),
            searchQuery: options.extractSearchQuery?.(req),
            resultCount,
            filters: options.extractFilters?.(req),
            success,
            errorMessage,
            responseTime: processingTime
          }, {
            userId: session.user.id,
            accountId: options.extractAccountId?.(req),
            integrationId: options.extractIntegrationId?.(req),
            sessionId: session.user.id // Using user ID as session ID for simplicity
          });
        }

        return response;

      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Log the error
        if (args[0] && typeof args[0] === 'object' && 'url' in args[0]) {
          try {
            const session = await getServerSession(authOptions);
            if (session?.user?.id) {
              const processingTime = Date.now() - startTime;
              
              await EmailAuditService.logAccessEvent({
                action: options.action,
                resourceType: options.resourceType,
                resourceId: options.extractResourceId?.(req),
                searchQuery: options.extractSearchQuery?.(req),
                filters: options.extractFilters?.(req),
                success: false,
                errorMessage,
                responseTime: processingTime
              }, {
                userId: session.user.id,
                accountId: options.extractAccountId?.(req),
                integrationId: options.extractIntegrationId?.(req),
                sessionId: session.user.id
              });
            }
          } catch {
            // Don't let audit logging errors break the error handling
          }
        }

        throw error;
      }
    };
  };
}

/**
 * Common extractors for email API routes
 */
export const auditExtractors = {
  /**
   * Extract account ID from URL path
   */
  accountIdFromPath: (req: NextRequest): string | undefined => {
    const pathParts = req.nextUrl.pathname.split('/');
    const accountIndex = pathParts.indexOf('accounts');
    if (accountIndex !== -1 && accountIndex + 1 < pathParts.length) {
      return pathParts[accountIndex + 1];
    }
    return undefined;
  },

  /**
   * Extract integration ID from URL path
   */
  integrationIdFromPath: (req: NextRequest): string | undefined => {
    const pathParts = req.nextUrl.pathname.split('/');
    const integrationIndex = pathParts.indexOf('integrations');
    if (integrationIndex !== -1 && integrationIndex + 1 < pathParts.length) {
      return pathParts[integrationIndex + 1];
    }
    return undefined;
  },

  /**
   * Extract message ID from URL path
   */
  messageIdFromPath: (req: NextRequest): string | undefined => {
    const pathParts = req.nextUrl.pathname.split('/');
    const messageIndex = pathParts.indexOf('messages');
    if (messageIndex !== -1 && messageIndex + 1 < pathParts.length) {
      return pathParts[messageIndex + 1];
    }
    return undefined;
  },

  /**
   * Extract filters from query parameters
   */
  filtersFromQuery: (req: NextRequest): Record<string, any> | undefined => {
    const searchParams = req.nextUrl.searchParams;
    const filters: Record<string, any> = {};
    
    for (const [key, value] of searchParams.entries()) {
      if (!['page', 'limit', 'search'].includes(key)) {
        filters[key] = value;
      }
    }
    
    return Object.keys(filters).length > 0 ? filters : undefined;
  },

  /**
   * Extract search query from query parameters
   */
  searchFromQuery: (req: NextRequest): string | undefined => {
    return req.nextUrl.searchParams.get('search') || 
           req.nextUrl.searchParams.get('q') || 
           undefined;
  },

  /**
   * Extract account ID from query parameters
   */
  accountIdFromQuery: (req: NextRequest): string | undefined => {
    return req.nextUrl.searchParams.get('accountId') || undefined;
  },

  /**
   * Extract integration ID from query parameters
   */
  integrationIdFromQuery: (req: NextRequest): string | undefined => {
    return req.nextUrl.searchParams.get('integrationId') || undefined;
  }
};

/**
 * Pre-configured audit decorators for common email operations
 */
export const emailAuditDecorators = {
  /**
   * Audit email integration access
   */
  auditIntegrationAccess: (action: string) => auditEmailAccess({
    action,
    resourceType: 'INTEGRATION',
    extractResourceId: auditExtractors.integrationIdFromPath,
    extractAccountId: auditExtractors.accountIdFromPath,
    logResponse: true
  }),

  /**
   * Audit email message access
   */
  auditMessageAccess: (action: string) => auditEmailAccess({
    action,
    resourceType: 'MESSAGE',
    extractResourceId: auditExtractors.messageIdFromPath,
    extractAccountId: auditExtractors.accountIdFromPath,
    extractIntegrationId: auditExtractors.integrationIdFromQuery,
    extractFilters: auditExtractors.filtersFromQuery,
    extractSearchQuery: auditExtractors.searchFromQuery,
    logResponse: true
  }),

  /**
   * Audit quarantine access
   */
  auditQuarantineAccess: (action: string) => auditEmailAccess({
    action,
    resourceType: 'QUARANTINE',
    extractAccountId: auditExtractors.accountIdFromPath,
    extractFilters: auditExtractors.filtersFromQuery,
    extractSearchQuery: auditExtractors.searchFromQuery,
    logResponse: true
  }),

  /**
   * Audit attachment access
   */
  auditAttachmentAccess: (action: string) => auditEmailAccess({
    action,
    resourceType: 'ATTACHMENT',
    extractAccountId: auditExtractors.accountIdFromPath,
    extractIntegrationId: auditExtractors.integrationIdFromQuery,
    logResponse: false
  }),

  /**
   * Audit security operations
   */
  auditSecurityAccess: (action: string) => auditEmailAccess({
    action,
    resourceType: 'SECURITY',
    extractAccountId: auditExtractors.accountIdFromPath,
    extractFilters: auditExtractors.filtersFromQuery,
    logResponse: true
  }),

  /**
   * Audit export operations
   */
  auditExportAccess: (action: string) => auditEmailAccess({
    action,
    resourceType: 'EXPORT',
    extractAccountId: auditExtractors.accountIdFromPath,
    extractIntegrationId: auditExtractors.integrationIdFromQuery,
    extractFilters: auditExtractors.filtersFromQuery,
    logResponse: false
  })
};