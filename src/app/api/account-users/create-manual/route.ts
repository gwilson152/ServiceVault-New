import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';
import { emailService } from '@/lib/email/EmailService';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user manual creation permission
    const canCreate = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "create-manual"
    });

    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { accountId, email, name, phone, permissions, temporaryPassword, sendWelcomeEmail } = body;

    if (!accountId || !email || !name || !temporaryPassword) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId, email, name, temporaryPassword' },
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

    // Check if email is already in use (in both User and AccountUser tables)
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    const existingAccountUser = await prisma.accountUser.findUnique({
      where: { email }
    });

    if (existingUser || existingAccountUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Use a transaction to create both user and account user records
    const result = await prisma.$transaction(async (tx) => {
      // Create the main user record
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'ACCOUNT_USER',
        }
      });

      // Create the account user record and link it to the user
      const accountUser = await tx.accountUser.create({
        data: {
          accountId,
          email,
          name,
          phone,
          userId: user.id, // Link to the created user
          permissions: permissions || {
            canViewOwnTickets: true,
            canViewAccountTickets: false,  
            canCreateTickets: true,
            canManageAccountUsers: false,
          },
          // No invitation token needed for manual creation
        },
        include: {
          account: true,
          user: true
        }
      });

      return { user, accountUser };
    });

    // Send welcome email if requested
    if (sendWelcomeEmail) {
      try {
        await emailService.sendTemplateEmail('ACCOUNT_WELCOME', {
          to: email,
          toName: name
        }, {
          systemName: 'Service Vault',
          userName: name,
          accountName: account.name,
          loginEmail: email,
          temporaryPassword: temporaryPassword,
          loginUrl: `${process.env.NEXTAUTH_URL}/portal/login`,
          createdByName: session.user.name || session.user.email,
          createdByEmail: session.user.email,
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Continue with user creation even if email fails
      }
    }

    return NextResponse.json({
      message: 'User created successfully',
      accountUser: {
        id: result.accountUser.id,
        email: result.accountUser.email,
        name: result.accountUser.name,
        phone: result.accountUser.phone,
        account: result.accountUser.account,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role
        },
        emailSent: sendWelcomeEmail
      }
    });

  } catch (error) {
    console.error('Error creating account user manually:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}