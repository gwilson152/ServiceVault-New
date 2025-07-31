import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find account user by invitation token
    const accountUser = await prisma.accountUser.findUnique({
      where: { invitationToken: token },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            accountType: true,
            companyName: true,
          }
        }
      }
    });

    if (!accountUser) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (accountUser.invitationExpiry && accountUser.invitationExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Check if user already has login credentials
    if (accountUser.userId) {
      return NextResponse.json(
        { error: 'Invitation already used' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      accountUser: {
        id: accountUser.id,
        email: accountUser.email,
        name: accountUser.name,
        account: accountUser.account,
      }
    });

  } catch (error) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}