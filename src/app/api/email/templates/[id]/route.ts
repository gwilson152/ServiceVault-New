import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';
import { EmailTemplateType, EmailTemplateStatus } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check email templates permission
    const canViewEmailTemplates = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "email",
      action: "templates"
    });

    if (!canViewEmailTemplates) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        updater: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { emailQueue: true }
        }
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching email template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email template' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check email templates permission
    const canManageEmailTemplates = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "email",
      action: "templates"
    });

    if (!canManageEmailTemplates) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if template exists
    const { id } = await params;
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      type,
      subject,
      htmlBody,
      textBody,
      variables,
      isDefault,
      status
    } = body;

    // Validate required fields
    if (!name || !type || !subject || !htmlBody) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, subject, htmlBody' },
        { status: 400 }
      );
    }

    // Check if template name already exists (excluding current template)
    const nameExists = await prisma.emailTemplate.findFirst({
      where: { 
        name,
        id: { not: id }
      }
    });

    if (nameExists) {
      return NextResponse.json(
        { error: 'Template name already exists' },
        { status: 400 }
      );
    }

    // If marking as default, unmark other defaults of the same type
    if (isDefault && !existingTemplate.isDefault) {
      await prisma.emailTemplate.updateMany({
        where: { 
          type, 
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      });
    }

    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id },
      data: {
        name,
        type,
        subject,
        htmlBody,
        textBody: textBody || null,
        variables: JSON.stringify(variables || {}),
        isDefault: Boolean(isDefault),
        status: status || EmailTemplateStatus.ACTIVE,
        updatedBy: session.user.id
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        updater: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({ template: updatedTemplate });
  } catch (error) {
    console.error('Error updating email template:', error);
    return NextResponse.json(
      { error: 'Failed to update email template' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check email templates permission
    const canManageEmailTemplates = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "email",
      action: "templates"
    });

    if (!canManageEmailTemplates) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if template exists
    const { id } = await params;
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: { emailQueue: true }
        }
      }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Prevent deletion of default templates
    if (existingTemplate.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default template. Remove default status first.' },
        { status: 400 }
      );
    }

    // Check if template is in use
    if (existingTemplate._count.emailQueue > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete template. It has been used in ${existingTemplate._count.emailQueue} email(s). Consider deactivating instead.`,
          usageCount: existingTemplate._count.emailQueue
        },
        { status: 400 }
      );
    }

    await prisma.emailTemplate.delete({
      where: { id }
    });

    return NextResponse.json({ 
      message: 'Template deleted successfully',
      deletedId: id 
    });
  } catch (error) {
    console.error('Error deleting email template:', error);
    return NextResponse.json(
      { error: 'Failed to delete email template' },
      { status: 500 }
    );
  }
}