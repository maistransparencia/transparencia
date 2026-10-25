import type React from "react";
import { cn } from "../utils/cn";

export interface SectionHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Link ou botão alinhado à direita do título. */
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <header className={cn("border-ink border-t-2 pt-4 pb-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-semibold font-serif text-ink text-xl sm:text-2xl">
          {title}
        </h2>
        {action && <div className="shrink-0 text-sm">{action}</div>}
      </div>
      {description && (
        <p className="mt-1.5 max-w-3xl text-mute2 text-sm leading-relaxed">
          {description}
        </p>
      )}
    </header>
  );
}
