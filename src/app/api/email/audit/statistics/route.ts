import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmailAuditService } from '@/lib/email/EmailAuditService';
import { permissionService } from '@/lib/permissions/PermissionService';

/**
 * GET /api/email/audit/statistics
 * Retrieve email audit statistics and breakdowns
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

    // Parse date range
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    // Parse context filters
    const accountId = searchParams.get('accountId') || undefined;
    const integrationId = searchParams.get('integrationId') || undefined;

    const statistics = await EmailAuditService.getAuditStatistics({
      startDate,
      endDate,
      accountId,
      integrationId
    });

    return NextResponse.json(statistics);

  } catch (error) {
    console.error('Audit statistics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}