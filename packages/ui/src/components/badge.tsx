import type React from "react";
import { cn } from "../utils/cn";

export interface BadgeProps {
  variant?: "default" | "accent" | "warning" | "danger" | "success";
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  const styles = {
    default: "border-line bg-line2/40 text-mute2",
    accent: "border-brand/40 bg-brand/10 font-semibold text-brand",
    warning: "border-warn/40 bg-warn/10 font-semibold text-warn",
    danger: "border-danger/40 bg-danger/10 font-semibold text-danger",
    success: "border-ok/40 bg-ok/10 font-semibold text-ok",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 font-medium text-[11px]",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
