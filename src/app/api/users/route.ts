import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";
import { assignUserByDomain } from "@/lib/users/domainAssignmentService";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to view users
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "view"
    });
    
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeAccountInfo = searchParams.get("includeAccountInfo") === "true";

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        ...(includeAccountInfo && {
          memberships: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  accountType: true
                }
              },
              roles: {
                include: {
                  role: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      permissions: true,
                      inheritAllPermissions: true
                    }
                  }
                }
              }
            }
          },
          systemRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  permissions: true,
                  inheritAllPermissions: true
                }
              }
            }
          }
        })
      },
      orderBy: [
        { name: "asc" },
        { email: "asc" }
      ],
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to create users
    const canCreateUsers = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "create"
    });

    if (!canCreateUsers) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, systemRoleIds, assignToDomainAccount = true } = body;

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate and normalize email
    let normalizedEmail: string | null = null;
    if (email && typeof email === 'string' && email.trim().length > 0) {
      normalizedEmail = email.toLowerCase().trim();
      
      // Check if email is already in use
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
      
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
    }

    // Hash password if provided
    let hashedPassword: string | null = null;
    if (password && password.trim().length > 0) {
      hashedPassword = await bcrypt.hash(password.trim(), 12);
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        ...(systemRoleIds?.length > 0 && {
          systemRoles: {
            create: systemRoleIds.map((roleId: string) => ({
              roleId
            }))
          }
        })
      },
      include: {
        systemRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                permissions: true
              }
            }
          }
        },
        memberships: {
          include: {
            account: {
              select: {
                id: true,
                name: true,
                accountType: true
              }
            },
            roles: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
                    permissions: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Attempt domain-based account assignment if email provided and enabled
    let domainAssignmentResult = null;
    if (normalizedEmail && assignToDomainAccount) {
      try {
        domainAssignmentResult = await assignUserByDomain(user.id, normalizedEmail);
      } catch (domainError) {
        console.error('Domain assignment failed:', domainError);
        // Continue with user creation even if domain assignment fails
      }
    }

    // Refetch user with updated memberships if domain assignment succeeded
    let finalUser = user;
    if (domainAssignmentResult?.assigned) {
      finalUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          systemRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  permissions: true
                }
              }
            }
          },
          memberships: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  accountType: true
                }
              },
              roles: {
                include: {
                  role: {
                    select: {
                      id: true,
                      name: true,
                      permissions: true
                    }
                  }
                }
              }
            }
          }
        }
      });
    }

    // Build response message
    let message = "User created successfully";
    if (domainAssignmentResult?.assigned) {
      message += ` and assigned to ${domainAssignmentResult.accountName} via domain ${domainAssignmentResult.domain}`;
    } else if (domainAssignmentResult?.message) {
      message += ` (Domain assignment: ${domainAssignmentResult.message})`;
    }

    return NextResponse.json({
      user: {
        id: finalUser.id,
        name: finalUser.name,
        email: finalUser.email,
        createdAt: finalUser.createdAt,
        systemRoles: finalUser.systemRoles,
        memberships: finalUser.memberships,
        hasPassword: !!finalUser.password,
        canLogin: !!(finalUser.email && finalUser.password)
      },
      domainAssignment: domainAssignmentResult,
      message
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}