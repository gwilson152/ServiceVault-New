import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmailAuditService } from '@/lib/email/EmailAuditService';
import { permissionService } from '@/lib/permissions/PermissionService';

/**
 * GET /api/email/audit/access
 * Retrieve email access logs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission
    const canAdminEmail = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'admin'
    });

    if (!canAdminEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const actions = searchParams.get('action') 
      ? [searchParams.get('action')!]
      : undefined;
    
    const resourceTypes = searchParams.get('resourceType') 
      ? [searchParams.get('resourceType')!]
      : undefined;

    const userId = searchParams.get('userId') || undefined;
    const accountId = searchParams.get('accountId') || undefined;
    
    const success = searchParams.get('success') 
      ? searchParams.get('success') === 'true'
      : undefined;

    // Parse date range
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);

    const result = await EmailAuditService.getAccessLogs({
      actions,
      resourceTypes,
      userId,
      accountId,
      success,
      startDate,
      endDate,
      page,
      limit
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Access logs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}