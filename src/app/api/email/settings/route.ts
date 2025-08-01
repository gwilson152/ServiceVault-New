import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check email settings permission
    const canViewEmailSettings = await hasPermission(session.user.id, {
      resource: 'email',
      action: 'settings'
    });

    if (!canViewEmailSettings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await prisma.emailSettings.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        smtpHost: true,
        smtpPort: true,
        smtpUsername: true,
        smtpSecure: true,
        fromEmail: true,
        fromName: true,
        replyToEmail: true,
        testMode: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: { id: true, name: true, email: true }
        },
        updater: {
          select: { id: true, name: true, email: true }
        }
        // Note: smtpPassword is intentionally excluded for security
      }
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email settings' },
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

    // Check email settings permission
    const canUpdateEmailSettings = await hasPermission(session.user.id, {
      resource: 'email',
      action: 'settings'
    });

    if (!canUpdateEmailSettings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      smtpHost,
      smtpPort,
      smtpUsername,
      smtpPassword,
      smtpSecure,
      fromEmail,
      fromName,
      replyToEmail,
      testMode
    } = body;

    // Validate required fields
    if (!smtpHost || !smtpPort || !fromEmail || !fromName) {
      return NextResponse.json(
        { error: 'Missing required fields: smtpHost, smtpPort, fromEmail, fromName' },
        { status: 400 }
      );
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail)) {
      return NextResponse.json(
        { error: 'Invalid fromEmail format' },
        { status: 400 }
      );
    }

    if (replyToEmail && !emailRegex.test(replyToEmail)) {
      return NextResponse.json(
        { error: 'Invalid replyToEmail format' },
        { status: 400 }
      );
    }

    // Deactivate existing settings
    await prisma.emailSettings.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Create new settings
    const settings = await prisma.emailSettings.create({
      data: {
        smtpHost,
        smtpPort: parseInt(smtpPort.toString()),
        smtpUsername,
        smtpPassword, // TODO: Encrypt password before storing
        smtpSecure: Boolean(smtpSecure),
        fromEmail,
        fromName,
        replyToEmail: replyToEmail || null,
        testMode: Boolean(testMode),
        isActive: true,
        createdBy: session.user.id
      },
      select: {
        id: true,
        smtpHost: true,
        smtpPort: true,
        smtpUsername: true,
        smtpSecure: true,
        fromEmail: true,
        fromName: true,
        replyToEmail: true,
        testMode: true,
        isActive: true,
        createdAt: true,
        creator: {
          select: { id: true, name: true, email: true }
        }
        // Note: smtpPassword is intentionally excluded for security
      }
    });

    return NextResponse.json({ settings }, { status: 201 });
  } catch (error) {
    console.error('Error creating email settings:', error);
    return NextResponse.json(
      { error: 'Failed to create email settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check email settings permission
    const canUpdateEmailSettings = await hasPermission(session.user.id, {
      resource: 'email',
      action: 'settings'
    });

    if (!canUpdateEmailSettings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      smtpHost,
      smtpPort,
      smtpUsername,
      smtpPassword,
      smtpSecure,
      fromEmail,
      fromName,
      replyToEmail,
      testMode
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Settings ID is required for update' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!smtpHost || !smtpPort || !fromEmail || !fromName) {
      return NextResponse.json(
        { error: 'Missing required fields: smtpHost, smtpPort, fromEmail, fromName' },
        { status: 400 }
      );
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail)) {
      return NextResponse.json(
        { error: 'Invalid fromEmail format' },
        { status: 400 }
      );
    }

    if (replyToEmail && !emailRegex.test(replyToEmail)) {
      return NextResponse.json(
        { error: 'Invalid replyToEmail format' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {
      smtpHost,
      smtpPort: parseInt(smtpPort.toString()),
      smtpUsername,
      smtpSecure: Boolean(smtpSecure),
      fromEmail,
      fromName,
      replyToEmail: replyToEmail || null,
      testMode: Boolean(testMode),
      updatedBy: session.user.id
    };

    // Only update password if provided
    if (smtpPassword && smtpPassword.trim() !== '') {
      updateData.smtpPassword = smtpPassword; // TODO: Encrypt password
    }

    const settings = await prisma.emailSettings.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        smtpHost: true,
        smtpPort: true,
        smtpUsername: true,
        smtpSecure: true,
        fromEmail: true,
        fromName: true,
        replyToEmail: true,
        testMode: true,
        isActive: true,
        updatedAt: true,
        updater: {
          select: { id: true, name: true, email: true }
        }
        // Note: smtpPassword is intentionally excluded for security
      }
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating email settings:', error);
    return NextResponse.json(
      { error: 'Failed to update email settings' },
      { status: 500 }
    );
  }
}