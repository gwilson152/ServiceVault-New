import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, email, name, phone, permissions } = body;

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

    // TODO: Send invitation email
    // For now, we'll just return the invitation link
    const invitationLink = `${process.env.NEXTAUTH_URL}/portal/accept-invitation?token=${invitationToken}`;

    return NextResponse.json({
      accountUser: {
        id: accountUser.id,
        email: accountUser.email,
        name: accountUser.name,
        phone: accountUser.phone,
        account: accountUser.account,
        invitationToken,
        invitationLink,
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