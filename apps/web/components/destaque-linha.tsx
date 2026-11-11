import { Badge, type BadgeVariant } from "@transparencia/ui";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { FonteOficial } from "@/lib/constants/fontes-oficiais";

export type DestaqueTom = "positivo" | "atencao" | "alerta" | "neutro";

const VARIANTE_BADGE_POR_TOM: Record<DestaqueTom, BadgeVariant> = {
  positivo: "success",
  atencao: "warning",
  alerta: "danger",
  neutro: "default",
};

const CLASSES_ICONE_POR_TOM: Record<DestaqueTom, string> = {
  positivo: "bg-ok-fill/10 text-ok-text",
  atencao: "bg-warn-fill/10 text-warn-text",
  alerta: "bg-danger-fill/10 text-danger-text",
  neutro: "bg-line2/40 text-mute2",
};

export interface DestaqueLinhaProps {
  ariaLabel: string;
  icone: LucideIcon;
  titulo: string;
  badgeTexto: string;
  tom: DestaqueTom;
  contexto: ReactNode;
  /** Fonte oficial do dado, exibida como link após o contexto. */
  fonte?: FonteOficial;
  /** Dado principal da linha (valor, evolução ou campo de busca). */
  dado?: ReactNode;
  /** Ação da linha (link ou botão). */
  acao?: ReactNode;
  className?: string;
}

/**
 * Linha compacta da seção "Em destaque": ícone, título com badge, uma frase de
 * contexto, dado principal e ação. Empilha em 2 ou 3 níveis no mobile.
 */
export function DestaqueLinha({
  ariaLabel,
  icone: Icone,
  titulo,
  badgeTexto,
  tom,
  contexto,
  fonte,
  dado,
  acao,
  className = "",
}: DestaqueLinhaProps) {
  return (
    <section
      aria-label={ariaLabel}
      data-testid="destaque-linha"
      data-tom={tom}
      className={`flex flex-col gap-3 border-line border-t py-4 sm:min-h-[72px] sm:flex-row sm:items-center sm:gap-4 ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
        <span
          aria-hidden="true"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${CLASSES_ICONE_POR_TOM[tom]}`}
        >
          <Icone className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3>{titulo}</h3>
            <Badge
              data-testid="destaque-badge"
              variant={VARIANTE_BADGE_POR_TOM[tom]}
            >
              {badgeTexto}
            </Badge>
          </div>
          <p className="mt-0.5 text-mute2 text-xs leading-snug sm:text-sm">
            {contexto}
            {fonte && (
              <>
                {" "}
                Fonte:{" "}
                <a
                  href={fonte.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2 hover:text-ink"
                >
                  {fonte.nome}
                </a>
                .
              </>
            )}
          </p>
        </div>
      </div>
      {(dado || acao) && (
        <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          {dado}
          {acao}
        </div>
      )}
    </section>
  );
}

export const CLASSE_ACAO_DESTAQUE =
  "inline-flex min-h-11 items-center gap-1 whitespace-nowrap font-semibold text-brand text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
