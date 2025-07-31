import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

interface AccountUser {
  id: string;
  accountId: string;
  email: string;
  name: string;
  permissions?: Record<string, unknown>;
  account: {
    id: string;
    name: string;
    accountType: string;
    parentAccount?: Record<string, unknown>;
    childAccounts?: Record<string, unknown>[];
  };
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
      accountUser?: AccountUser;
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string;
    accountUser?: AccountUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: string;
    accountUser?: AccountUser;
  }
}