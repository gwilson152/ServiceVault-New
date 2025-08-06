import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';
import { EmailQueueStatus } from '@prisma/client';
import { emailService } from '@/lib/email/EmailService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check email queue permission
    const canViewEmailQueue = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "email",
      action: "queue"
    });

    if (!canViewEmailQueue) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const status = searchParams.get('status') as EmailQueueStatus | null;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [emails, total, stats] = await Promise.all([
      prisma.emailQueue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: {
            select: { id: true, name: true, type: true }
          },
          creator: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.emailQueue.count({ where }),
      emailService.getQueueStats()
    ]);

    return NextResponse.json({
      emails,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching email queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email queue' },
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

    // Check email send permission
    const canSendEmail = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "email",
      action: "send"
    });

    if (!canSendEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      to,
      toName,
      cc,
      bcc,
      subject,
      htmlBody,
      textBody,
      templateId,
      variables,
      priority,
      scheduledAt
    } = body;

    // Validate required fields
    if (!to || !subject || !htmlBody) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, htmlBody' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email format for recipient' },
        { status: 400 }
      );
    }

    // Queue the email
    const emailId = await emailService.queueEmail({
      to,
      toName,
      cc,
      bcc,
      subject,
      htmlBody,
      textBody,
      templateId,
      variables,
      priority,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      createdBy: session.user.id
    });

    const queuedEmail = await prisma.emailQueue.findUnique({
      where: { id: emailId },
      include: {
        template: {
          select: { id: true, name: true, type: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({ email: queuedEmail }, { status: 201 });
  } catch (error) {
    console.error('Error queueing email:', error);
    return NextResponse.json(
      { error: 'Failed to queue email' },
      { status: 500 }
    );
  }
}