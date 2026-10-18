import type React from "react";
import { cn } from "../utils/cn";

export interface SegmentedButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  active: boolean;
  /** Opção sem resultados: continua clicável, porém mais discreta. */
  muted?: boolean;
  size?: "sm" | "md";
}

const SIZE_STYLES = {
  sm: "px-3 py-1 text-xs",
  md: "px-3.5 py-2 text-sm",
} as const;

export function SegmentedButton({
  active,
  muted = false,
  size = "sm",
  className,
  children,
  ...props
}: SegmentedButtonProps) {
  const stateStyles = (() => {
    if (active) return "border-slate-900 bg-slate-900 text-white shadow-xs";
    if (muted)
      return "border-dashed border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-700";
    return "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900";
  })();

  return (
    <button
      type="button"
      aria-pressed={props.role === "tab" ? undefined : active}
      className={cn(
        "cursor-pointer rounded-lg border font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
        SIZE_STYLES[size],
        stateStyles,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
