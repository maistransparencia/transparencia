import { ExternalLink } from "lucide-react";
import type React from "react";
import { cn } from "../utils/cn";

export interface ExternalLinkPillProps
  extends Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "target" | "rel" | "href"
  > {
  href: string;
}

export function ExternalLinkPill({
  href,
  className,
  children,
  ...props
}: ExternalLinkPillProps) {
  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-pill px-3 py-1 text-ink text-xs transition-colors hover:border-mute3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        className,
      )}
    >
      <span>{children}</span>
      <ExternalLink size={12} aria-hidden="true" />
    </a>
  );
}
