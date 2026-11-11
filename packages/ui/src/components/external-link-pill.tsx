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

const ehUrlWeb = (href: string) => {
  try {
    const { protocol } = new URL(href);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

export function ExternalLinkPill({
  href,
  className,
  children,
  ...props
}: ExternalLinkPillProps) {
  if (!ehUrlWeb(href)) {
    return <span className={className}>{children}</span>;
  }

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
      <span className="pt-px leading-none">{children}</span>
      <span className="sr-only"> (abre em nova aba)</span>
      <ExternalLink size={12} aria-hidden="true" className="shrink-0" />
    </a>
  );
}
