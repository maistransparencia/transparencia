import type React from "react";
import { cn } from "../utils/cn";

export interface SectionHeaderProps {
  /** Escopo ou categoria acima do título (ex.: "Consolidado Municipal"). */
  eyebrow?: React.ReactNode;
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
  eyebrow,
  title,
  description,
  action,
  as: Titulo = "h2",
  className,
}: SectionHeaderProps) {
  return (
    <header className={cn("border-ink border-t-2 pt-4 pb-5", className)}>
      {temConteudo(eyebrow) && <p className="eyebrow mb-1.5">{eyebrow}</p>}
      <div
        className={cn(
          "flex items-baseline justify-between gap-x-4 gap-y-1",
          // Com eyebrow, a ação é compacta (ícone) e fica na linha do título.
          !temConteudo(eyebrow) && "flex-wrap",
        )}
      >
        <Titulo className="text-ink min-w-0 font-serif text-xl font-semibold sm:text-2xl">
          {title}
        </Titulo>
        {temConteudo(action) && (
          <div className="shrink-0 text-sm">{action}</div>
        )}
      </div>
      {temConteudo(description) && (
        <p className="text-mute mt-1.5 text-sm leading-relaxed">
          {description}
        </p>
      )}
    </header>
  );
}
