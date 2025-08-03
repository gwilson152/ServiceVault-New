"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { AppNavigation } from "./AppNavigation";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Pages that should not show the navigation
  const publicPages = ["/", "/auth/signin", "/auth/signup", "/auth/error"];
  const isPublicPage = publicPages.includes(pathname);

  // Show loading or public pages without navigation
  if (status === "loading" || isPublicPage || !session) {
    return <>{children}</>;
  }

  // Show navigation for authenticated users
  return (
    <AppNavigation>
      {children}
    </AppNavigation>
  );
}