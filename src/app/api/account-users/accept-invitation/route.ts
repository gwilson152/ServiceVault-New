import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword } = body;

    if (!token || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Find account user by invitation token
    const accountUser = await prisma.accountUser.findUnique({
      where: { invitationToken: token },
      include: { account: true }
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
        { error: 'User already has login credentials' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User record
    const user = await prisma.user.create({
      data: {
        email: accountUser.email,
        name: accountUser.name,
        password: hashedPassword,
        role: 'ACCOUNT_USER',
        accountUserId: accountUser.id,
      }
    });

    // Update AccountUser with userId and clear invitation token
    await prisma.accountUser.update({
      where: { id: accountUser.id },
      data: {
        userId: user.id,
        invitationToken: null,
        invitationExpiry: null,
      }
    });

    return NextResponse.json({
      message: 'Account activated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}