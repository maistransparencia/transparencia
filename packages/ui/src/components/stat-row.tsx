import type React from "react";
import { cn } from "../utils/cn";

export interface StatRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}

export function StatRow({ label, value, className }: StatRowProps) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 border-line border-b py-2 text-sm",
        className,
      )}
    >
      <span className="text-mute2">{label}</span>
      <span className="text-right font-medium text-ink tabular-nums">
        {value}
      </span>
    </div>
  );
}
