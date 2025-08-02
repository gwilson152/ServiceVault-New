"use client"

import * as React from "react"
import { ToastProvider as RadixToastProvider, ToastViewport } from "@/components/ui/toast"

interface ToastProviderProps {
  children: React.ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <RadixToastProvider>
      {children}
      <ToastViewport />
    </RadixToastProvider>
  )
}