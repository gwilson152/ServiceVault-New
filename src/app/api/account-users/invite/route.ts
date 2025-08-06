import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';
import { emailService } from '@/lib/email/EmailService';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user invitation permission
    const canInviteUsers = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "invite"
    });

    if (!canInviteUsers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { accountId, email, name, phone, permissions, sendInvitation } = body;

    if (!accountId || !email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId, email, name' },
        { status: 400 }
      );
    }

    // Check if account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if email is already in use
    const existingAccountUser = await prisma.accountUser.findUnique({
      where: { email }
    });

    if (existingAccountUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create account user
    const accountUser = await prisma.accountUser.create({
      data: {
        accountId,
        email,
        name,
        phone,
        invitationToken,
        invitationExpiry,
        permissions: permissions || {
          canViewOwnTickets: true,
          canViewAccountTickets: false,
          canCreateTickets: true,
          canManageAccountUsers: false,
        },
      },
      include: {
        account: true,
      }
    });

    const invitationLink = `${process.env.NEXTAUTH_URL}/portal/accept-invitation?token=${invitationToken}`;

    // Send invitation email if requested
    if (sendInvitation) {
      try {
        await emailService.sendTemplateEmail('USER_INVITATION', {
          to: email,
          toName: name
        }, {
          systemName: 'Service Vault',
          userName: name,
          accountName: account.name,
          inviterName: session.user.name || session.user.email,
          inviterEmail: session.user.email,
          invitationLink,
          expirationDate: invitationExpiry.toLocaleDateString()
        });
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Continue with user creation even if email fails
      }
    }

    return NextResponse.json({
      accountUser: {
        id: accountUser.id,
        email: accountUser.email,
        name: accountUser.name,
        phone: accountUser.phone,
        account: accountUser.account,
        invitationToken,
        invitationLink,
        emailSent: sendInvitation
      }
    });

  } catch (error) {
    console.error('Error inviting account user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}