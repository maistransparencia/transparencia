import type React from "react";
import { cn } from "../utils/cn";

export type BadgeVariant =
  | "default"
  | "accent"
  | "warning"
  | "danger"
  | "success";

export interface BadgeProps
  extends Omit<React.ComponentPropsWithoutRef<"span">, "children"> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const styles: Record<BadgeVariant, string> = {
  default: "border-line bg-line2/40 text-mute2",
  accent: "border-brand-text/40 bg-brand-fill/10 font-semibold text-brand-text",
  warning: "border-warn-text/40 bg-warn-fill/10 font-semibold text-warn-text",
  danger:
    "border-danger-text/40 bg-danger-fill/10 font-semibold text-danger-text",
  success: "border-ok-text/40 bg-ok-fill/10 font-semibold text-ok-text",
};

export function Badge({
  variant = "default",
  children,
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-medium text-[11px]",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
