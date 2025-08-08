import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { DomainResolver } from '@/lib/email/DomainResolver';

/**
 * PUT /api/admin/email/domain-mappings/[id]
 * Update a domain mapping
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const mapping = await DomainResolver.updateDomainMapping(params.id, {
      ...(domain && { domain: domain.trim() }),
      ...(accountId && { accountId }),
      ...(priority !== undefined && { priority }),
      ...(isActive !== undefined && { isActive })
    });

    return NextResponse.json({
      message: 'Domain mapping updated successfully',
      mapping
    });

  } catch (error) {
    console.error('Update domain mapping error:', error);
    
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
      if (error.message.includes('Record to update not found')) {
        return NextResponse.json(
          { error: 'Domain mapping not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update domain mapping' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/email/domain-mappings/[id]
 * Delete a domain mapping
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await DomainResolver.deleteDomainMapping(params.id);

    return NextResponse.json({
      message: 'Domain mapping deleted successfully'
    });

  } catch (error) {
    console.error('Delete domain mapping error:', error);
    
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Domain mapping not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete domain mapping' },
      { status: 500 }
    );
  }
}