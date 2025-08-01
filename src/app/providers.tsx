"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { TimeTrackingProvider } from "@/components/time/TimeTrackingProvider";
import { GlobalTimerWidget } from "@/components/time/GlobalTimerWidget";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <TimeTrackingProvider>
        {children}
        <GlobalTimerWidget />
      </TimeTrackingProvider>
    </NextAuthSessionProvider>
  );
}