import type React from "react";
import { cn } from "../utils/cn";

export interface SectionHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Link ou botão alinhado à direita do título. */
  action?: React.ReactNode;
  /** Nível semântico do título (padrão `h2`). */
  as?: "h1" | "h2" | "h3";
  className?: string;
}

const temConteudo = (conteudo: React.ReactNode) =>
  conteudo !== undefined &&
  conteudo !== null &&
  conteudo !== false &&
  conteudo !== "" &&
  conteudo !== 0;

export function SectionHeader({
  title,
  description,
  action,
  as: Titulo = "h2",
  className,
}: SectionHeaderProps) {
  return (
    <header className={cn("border-ink border-t-2 pt-4 pb-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Titulo className="font-semibold font-serif text-ink text-xl sm:text-2xl">
          {title}
        </Titulo>
        {temConteudo(action) && (
          <div className="shrink-0 text-sm">{action}</div>
        )}
      </div>
      {temConteudo(description) && (
        <p className="mt-1.5 max-w-3xl text-mute2 text-sm leading-relaxed">
          {description}
        </p>
      )}
    </header>
  );
}
