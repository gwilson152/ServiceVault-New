import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { DomainResolver } from '@/lib/email/DomainResolver';

/**
 * GET /api/admin/email/domain-mappings
 * Get all domain mappings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check global email admin permission
    const canAdminEmailGlobal = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'admin-global'
    });

    if (!canAdminEmailGlobal) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const mappings = await DomainResolver.getAllDomainMappings();

    return NextResponse.json({
      mappings,
      total: mappings.length
    });

  } catch (error) {
    console.error('Domain mappings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/email/domain-mappings
 * Create a new domain mapping
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check global email admin permission
    const canAdminEmailGlobal = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'admin-global'
    });

    if (!canAdminEmailGlobal) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { domain, accountId, priority, isActive } = body;

    // Validate required fields
    if (!domain || !accountId) {
      return NextResponse.json(
        { error: 'Domain and accountId are required' },
        { status: 400 }
      );
    }

    const mapping = await DomainResolver.createDomainMapping({
      domain: domain.trim(),
      accountId,
      priority: priority || 0,
      isActive: isActive ?? true
    });

    return NextResponse.json({
      message: 'Domain mapping created successfully',
      mapping
    });

  } catch (error) {
    console.error('Create domain mapping error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      if (error.message.includes('Invalid domain')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create domain mapping' },
      { status: 500 }
    );
  }
}