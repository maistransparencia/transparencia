import { CollapsibleSection, SectionHeader } from "@transparencia/ui";
import type React from "react";

interface SectionWithHeaderProps {
  id?: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Com resumo, a seção nasce recolhida e o resumo fica visível. */
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  ariaLabel?: string;
  children: React.ReactNode;
}

/** Seção com cabeçalho; recolhida quando recebe `summary`, aberta sem ele. */
export function SectionWithHeader({
  id,
  eyebrow,
  title,
  description,
  summary,
  defaultOpen,
  ariaLabel,
  children,
}: SectionWithHeaderProps) {
  if (summary && id) {
    return (
      <CollapsibleSection
        id={id}
        eyebrow={eyebrow}
        title={title}
        description={description}
        summary={summary}
        defaultOpen={defaultOpen}
      >
        {children}
      </CollapsibleSection>
    );
  }
  return (
    <section id={id} aria-label={ariaLabel} className="space-y-6">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      {children}
    </section>
  );
}
