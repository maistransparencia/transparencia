import { cn } from "@transparencia/ui";
import type React from "react";

export interface KPIGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  /** `divisoria`: colunas separadas por filete vertical, sem espaçamento. */
  variant?: "padrao" | "divisoria";
  className?: string;
}

export function KPIGrid({
  children,
  columns = 4,
  variant = "padrao",
  className,
}: KPIGridProps) {
  return (
    <div
      className={cn(
        variant === "divisoria"
          ? "grid divide-x divide-line *:border-e-0 *:py-3 *:first:pl-0 max-sm:divide-y"
          : "grid gap-4",
        variant === "divisoria" &&
          columns === 2 &&
          "sm:*:not-nth-[2n+1]:border-l sm:*:nth-[2n+1]:border-l-0 sm:*:not-nth-[2n+1]:pl-5 sm:*:nth-[2n+1]:pl-0",
        variant === "divisoria" &&
          columns === 3 &&
          "sm:*:not-nth-[3n+1]:border-l sm:*:nth-[3n+1]:border-l-0 sm:*:not-nth-[3n+1]:pl-5 sm:*:nth-[3n+1]:pl-0",
        variant === "divisoria" &&
          columns === 4 &&
          "sm:*:not-nth-[2n+1]:border-l sm:*:nth-[2n+1]:border-l-0 sm:*:not-nth-[2n+1]:pl-5 sm:*:nth-[2n+1]:pl-0 lg:*:not-nth-[4n+1]:border-l lg:*:nth-[4n+1]:border-l-0 lg:*:not-nth-[4n+1]:pl-5 lg:*:nth-[4n+1]:pl-0",
        variant === "divisoria" &&
          columns === 5 &&
          "sm:*:not-nth-[2n+1]:border-l sm:*:nth-[2n+1]:border-l-0 sm:*:not-nth-[2n+1]:pl-5 sm:*:nth-[2n+1]:pl-0 lg:*:not-nth-[5n+1]:border-l lg:*:nth-[5n+1]:border-l-0 lg:*:not-nth-[5n+1]:pl-5 lg:*:nth-[5n+1]:pl-0",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        columns === 5 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
