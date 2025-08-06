import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';
import { emailService, EmailServiceError } from '@/lib/email/EmailService';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to resend invitations
    const canResendInvitations = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "resend-invitation"
    });

    if (!canResendInvitations) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: accountUserId } = await params;

    // Find the account user
    const accountUser = await prisma.accountUser.findUnique({
      where: { id: accountUserId },
      include: {
        account: true,
        user: true
      }
    });

    if (!accountUser) {
      return NextResponse.json({ error: 'Account user not found' }, { status: 404 });
    }

    // Check if user is already active (has linked user account)
    if (accountUser.user) {
      return NextResponse.json(
        { error: 'User has already accepted the invitation and is active' },
        { status: 400 }
      );
    }

    // Check if current invitation is still valid (optional - we'll generate a new one anyway)
    const now = new Date();
    const isExpired = accountUser.invitationExpiry && accountUser.invitationExpiry < now;

    // Generate new invitation token and expiry
    const newInvitationToken = crypto.randomUUID();
    const newInvitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update the account user with new invitation details
    const updatedAccountUser = await prisma.accountUser.update({
      where: { id: accountUserId },
      data: {
        invitationToken: newInvitationToken,
        invitationExpiry: newInvitationExpiry,
      },
      include: {
        account: true
      }
    });

    const invitationLink = `${process.env.NEXTAUTH_URL}/portal/accept-invitation?token=${newInvitationToken}`;

    // Send the invitation email
    try {
      await emailService.sendTemplateEmail('USER_INVITATION', {
        to: accountUser.email,
        toName: accountUser.name
      }, {
        systemName: 'Service Vault',
        userName: accountUser.name,
        accountName: accountUser.account.name,
        inviterName: session.user.name || session.user.email,
        inviterEmail: session.user.email,
        invitationLink,
        expirationDate: newInvitationExpiry.toLocaleDateString(),
        isResend: true // Flag to indicate this is a resend
      });

      return NextResponse.json({
        message: 'Invitation email sent successfully',
        accountUser: {
          id: updatedAccountUser.id,
          name: updatedAccountUser.name,
          email: updatedAccountUser.email,
          invitationExpiry: newInvitationExpiry,
          wasExpired: isExpired
        }
      });

    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      
      // Revert the token update if email failed
      await prisma.accountUser.update({
        where: { id: accountUserId },
        data: {
          invitationToken: accountUser.invitationToken,
          invitationExpiry: accountUser.invitationExpiry,
        }
      });

      // Return user-friendly error message based on error type
      if (emailError instanceof EmailServiceError) {
        return NextResponse.json(
          { 
            error: emailError.userMessage,
            code: emailError.code,
            details: emailError.code === 'EMAIL_TEMPLATE_NOT_FOUND' ? 
              'The system administrator needs to configure the USER_INVITATION email template.' : 
              undefined
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to send invitation email. Please try again or contact support.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}