"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { TimeTrackingProvider } from "@/components/time/TimeTrackingProvider";
import { ActionBarProvider } from "@/components/providers/ActionBarProvider";
import { MultiTimerWidget } from "@/components/time/MultiTimerWidget";
import { Toaster } from "@/components/ui/toaster";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <QueryProvider>
        <ActionBarProvider>
          <TimeTrackingProvider>
            {children}
            <MultiTimerWidget />
            <Toaster />
          </TimeTrackingProvider>
        </ActionBarProvider>
      </QueryProvider>
    </NextAuthSessionProvider>
  );
}