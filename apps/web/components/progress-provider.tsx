"use client";

import { ProgressProvider as BProgressProvider } from "@bprogress/next/app";
import type React from "react";

export interface ProgressProviderProps {
  children: React.ReactNode;
}

export function ProgressProvider({ children }: ProgressProviderProps) {
  return (
    <BProgressProvider
      height="3px"
      color="oklch(0.55 0.11 250)"
      options={{ showSpinner: false }}
      shallowRouting
    >
      {children}
    </BProgressProvider>
  );
}
