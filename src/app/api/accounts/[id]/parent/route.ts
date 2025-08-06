import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to update accounts
    const canUpdate = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "accounts",
      action: "edit"
    });
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { parentId, accountType, name } = body;

    // Validate name if provided  
    if (name !== undefined && name !== null) {
      const trimmedName = name.trim();
      if (trimmedName === '') {
        return NextResponse.json({ error: 'Account name cannot be empty' }, { status: 400 });
      }
      if (trimmedName.length > 100) {
        return NextResponse.json({ error: 'Account name cannot exceed 100 characters' }, { status: 400 });  
      }
    }

    // Check if account exists
    const existingAccount = await prisma.account.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true, accountType: true }
        },
        children: {
          select: { id: true, name: true, accountType: true }
        }
      }
    });

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Validate parent assignment
    if (parentId) {
      // Check if parent account exists
      const parentAccount = await prisma.account.findUnique({
        where: { id: parentId },
        select: { id: true, name: true, accountType: true, parentId: true }
      });

      if (!parentAccount) {
        return NextResponse.json({ error: 'Parent account not found' }, { status: 404 });
      }

      // Prevent self-assignment
      if (parentId === id) {
        return NextResponse.json({ error: 'Account cannot be its own parent' }, { status: 400 });
      }

      // Prevent circular references by checking if the proposed parent is already a descendant
      const isCircular = await checkCircularReference(id, parentId);
      if (isCircular) {
        return NextResponse.json({ 
          error: 'This would create a circular reference in the account hierarchy' 
        }, { status: 400 });
      }

      // Business rule validation for account type and parent relationships
      const finalAccountType = accountType || existingAccount.accountType;
      
      if (finalAccountType === 'SUBSIDIARY') {
        if (parentAccount.accountType === 'INDIVIDUAL') {
          return NextResponse.json({ 
            error: 'Subsidiary accounts cannot have Individual accounts as parents' 
          }, { status: 400 });
        }
      }
    }

    // Additional validation for account type changes
    if (accountType && accountType !== existingAccount.accountType) {
      // Validate account type change business rules
      if (accountType === 'ORGANIZATION' && existingAccount.children.length > 0) {
        // If changing to ORGANIZATION, ensure it can support its children
        const individualChildren = existingAccount.children.filter(child => 
          child.accountType === 'INDIVIDUAL'
        );
        if (individualChildren.length > 0) {
          // This is generally OK - Organizations can have Individual children
        }
      }
      
      if (accountType === 'INDIVIDUAL' && existingAccount.children.length > 0) {
        // Individual accounts should not have children in most business cases
        const organizationOrSubsidiaryChildren = existingAccount.children.filter(child => 
          child.accountType === 'ORGANIZATION' || child.accountType === 'SUBSIDIARY'
        );
        if (organizationOrSubsidiaryChildren.length > 0) {
          return NextResponse.json({ 
            error: 'Individual accounts cannot have Organization or Subsidiary child accounts' 
          }, { status: 400 });
        }
      }
      
      if (accountType === 'SUBSIDIARY' && !parentId && !existingAccount.parentId) {
        return NextResponse.json({ 
          error: 'Subsidiary accounts must have a parent account' 
        }, { status: 400 });
      }
    }

    // Update the parent relationship, account type, and name
    const updateData: any = {
      parentId: parentId || null
    };
    
    if (accountType && accountType !== existingAccount.accountType) {
      updateData.accountType = accountType;
    }
    
    if (name && name.trim() && name !== existingAccount.name) {
      updateData.name = name.trim();
    }

    const updatedAccount = await prisma.account.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: { id: true, name: true, accountType: true }
        },
        children: {
          select: { id: true, name: true, accountType: true }
        }
      }
    });

    // Create success message
    let message = '';
    const parentChanged = (parentId || null) !== (existingAccount.parentId || null);
    const typeChanged = accountType && accountType !== existingAccount.accountType;
    const nameChanged = name && name.trim() && name !== existingAccount.name;
    
    const changes = [];
    if (nameChanged) changes.push(`renamed to "${updatedAccount.name}"`);
    if (typeChanged) changes.push(`type changed to ${accountType}`);
    if (parentChanged) {
      changes.push(parentId 
        ? `assigned to parent: ${updatedAccount.parent?.name}`
        : 'parent relationship removed'
      );
    }
    
    if (changes.length === 0) {
      message = 'No changes made';
    } else if (changes.length === 1) {
      message = `Account ${changes[0]}`;
    } else {
      const lastChange = changes.pop();
      message = `Account ${changes.join(', ')} and ${lastChange}`;
    }

    return NextResponse.json({
      success: true,
      account: updatedAccount,
      message
    });

  } catch (error) {
    console.error('Error updating account parent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check if assigning parentId to accountId would create a circular reference
 */
async function checkCircularReference(accountId: string, parentId: string): Promise<boolean> {
  // Get all ancestors of the proposed parent
  let currentId = parentId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      // We found a cycle in the existing hierarchy
      return true;
    }
    
    if (currentId === accountId) {
      // The account we're trying to assign as parent is actually a descendant
      return true;
    }

    visited.add(currentId);

    const parent = await prisma.account.findUnique({
      where: { id: currentId },
      select: { parentId: true }
    });

    currentId = parent?.parentId || null;
  }

  return false;
}