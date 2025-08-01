import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { EmailTemplateType, EmailTemplateStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check email templates permission
    const canViewEmailTemplates = await hasPermission(session.user.id, {
      resource: 'email',
      action: 'templates'
    });

    if (!canViewEmailTemplates) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as EmailTemplateType | null;
    const status = searchParams.get('status') as EmailTemplateStatus | null;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
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

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check email templates permission
    const canManageEmailTemplates = await hasPermission(session.user.id, {
      resource: 'email',
      action: 'templates'
    });

    if (!canManageEmailTemplates) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    // Check if template name already exists
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { name }
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Template name already exists' },
        { status: 400 }
      );
    }

    // If marking as default, unmark other defaults of the same type
    if (isDefault) {
      await prisma.emailTemplate.updateMany({
        where: { type, isDefault: true },
        data: { isDefault: false }
      });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        type,
        subject,
        htmlBody,
        textBody: textBody || null,
        variables: JSON.stringify(variables || {}),
        isDefault: Boolean(isDefault),
        status: status || EmailTemplateStatus.ACTIVE,
        createdBy: session.user.id
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating email template:', error);
    return NextResponse.json(
      { error: 'Failed to create email template' },
      { status: 500 }
    );
  }
}