"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { TimeTrackingProvider } from "@/components/time/TimeTrackingProvider";
import { MultiTimerWidget } from "@/components/time/MultiTimerWidget";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <TimeTrackingProvider>
        {children}
        <MultiTimerWidget />
      </TimeTrackingProvider>
    </NextAuthSessionProvider>
  );
}