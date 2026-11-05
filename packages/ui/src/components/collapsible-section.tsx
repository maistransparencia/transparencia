"use client";

import { ChevronRight } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

export interface CollapsibleSectionProps {
  /** Âncora da seção (`#id` abre a seção ao chegar). */
  id: string;
  title: React.ReactNode;
  /** Escopo ou contagem acima do título, como no `SectionHeader`. */
  eyebrow?: React.ReactNode;
  /** Descrição da seção; fica no corpo, visível só com a seção aberta. */
  description?: React.ReactNode;
  /** Resumo com número, sempre visível, mesmo recolhida. */
  summary?: React.ReactNode;
  /** Abre a seção na primeira renderização (por exemplo, deep link). */
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Seção recolhida por padrão (`details`/`summary`). Abre sozinha quando a URL
 * aponta para ela (`#id`) e abre tudo na impressão.
 */
export function CollapsibleSection({
  id,
  title,
  eyebrow,
  description,
  summary,
  defaultOpen = false,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const openIfTargeted = () => {
      if (window.location.hash === `#${id}`) setOpen(true);
    };
    const openForPrint = () => setOpen(true);
    // Clicar num link para o `#id` já ativo não dispara `hashchange`.
    const openIfLinkTargets = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (link?.getAttribute("href") === `#${id}`) setOpen(true);
    };
    openIfTargeted();
    document.addEventListener("click", openIfLinkTargets);
    window.addEventListener("hashchange", openIfTargeted);
    window.addEventListener("beforeprint", openForPrint);
    return () => {
      document.removeEventListener("click", openIfLinkTargets);
      window.removeEventListener("hashchange", openIfTargeted);
      window.removeEventListener("beforeprint", openForPrint);
    };
  }, [id]);

  return (
    <section id={id} className={cn("scroll-mt-20", className)}>
      <details
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        className="group border-ink border-t-2"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 py-4 focus-visible:outline-2 focus-visible:outline-focus-ring [&::-webkit-details-marker]:hidden">
          <ChevronRight
            aria-hidden="true"
            className="mt-1.5 size-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
          />
          <span className="min-w-0">
            {eyebrow ? (
              <span className="eyebrow mb-1.5 block">{eyebrow}</span>
            ) : null}
            <h2>{title}</h2>
            {summary ? (
              <span className="mt-1.5 block text-mute text-sm leading-relaxed">
                {summary}
              </span>
            ) : null}
          </span>
        </summary>
        <div className="space-y-6 pb-6">
          {description ? (
            <p className="text-mute text-sm leading-relaxed">{description}</p>
          ) : null}
          {children}
        </div>
      </details>
    </section>
  );
}
