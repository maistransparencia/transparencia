import type React from "react";
import { cn } from "../utils/cn";

export interface SegmentedButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  active: boolean;
  /** Opção sem resultados: continua clicável, porém mais discreta. */
  muted?: boolean;
  size?: "sm" | "md";
  /** `segmentado`: botão com borda; `tabs`: aba com filete inferior. */
  variant?: "segmentado" | "tabs";
}

const SIZE_STYLES = {
  sm: "px-3 py-1 text-xs",
  md: "px-3.5 py-2 text-sm",
} as const;

export function SegmentedButton({
  active,
  muted = false,
  size = "sm",
  variant = "segmentado",
  className,
  children,
  ...props
}: SegmentedButtonProps) {
  const stateStyles = (() => {
    if (variant === "tabs") {
      if (active) return "border-ink font-semibold text-ink";
      if (muted)
        return "border-transparent text-mute3 hover:border-mute3 hover:text-ink";
      return "border-transparent text-mute2 hover:border-mute3 hover:text-ink";
    }
    if (active) return "border-ink bg-ink text-onink hover:bg-ink/90";
    if (muted)
      return "border-dashed border-line bg-page text-mute3 hover:border-mute3 hover:bg-line2/60 hover:text-ink";
    return "border-line bg-page text-ink hover:border-mute3 hover:bg-line2/60";
  })();

  const ariaDeSelecao =
    variant === "tabs"
      ? ({ role: "tab", "aria-selected": active } as const)
      : ({ "aria-pressed": active } as const);

  return (
    <button
      type="button"
      {...ariaDeSelecao}
      className={cn(
        "cursor-pointer font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50",
        variant === "tabs" ? "border-b-2" : "rounded-md border",
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
