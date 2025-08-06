/**
 * NextAuth Configuration
 * 
 * This file configures NextAuth authentication for the Service Vault application.
 * Updated to work with the new ABAC permission system using RoleTemplate and 
 * AccountMembership models instead of hard-coded roles.
 * 
 * Key Features:
 * - Credentials provider for email/password authentication
 * - Integration with new User/AccountMembership/SystemRole schema
 * - JWT-based sessions with user permissions included
 * - Support for both account-specific and system-wide roles
 * 
 * Integration:
 * - Uses new AccountMembership model for account-level permissions
 * - Uses SystemRole model for system-wide permissions (like super-admin)
 * - Compatible with PermissionService for permission checking
 * - Session includes full user context for permission evaluation
 */

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            memberships: {
              include: {
                account: {
                  include: {
                    parent: true,
                    children: true,
                  }
                },
                roles: {
                  include: {
                    role: true
                  }
                }
              }
            },
            systemRoles: {
              include: {
                role: true
              }
            }
          }
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          memberships: user.memberships,
          systemRoles: user.systemRoles,
        };
      }
    })
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.memberships = user.memberships;
        token.systemRoles = user.systemRoles;
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.memberships = token.memberships;
        session.user.systemRoles = token.systemRoles;
      }
      return session;
    }
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
};