import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { FonteOficial } from "@/lib/constants/fontes-oficiais";

export type DestaqueTom = "positivo" | "atencao" | "alerta" | "neutro";

const CLASSES_BADGE_POR_TOM: Record<DestaqueTom, string> = {
  positivo: "border-emerald-200 bg-emerald-50 text-emerald-800",
  atencao: "border-amber-300 bg-amber-50 text-amber-900",
  alerta: "border-rose-200 bg-rose-50 text-rose-900",
  neutro: "border-slate-200 bg-slate-100 text-slate-700",
};

const CLASSES_ICONE_POR_TOM: Record<DestaqueTom, string> = {
  positivo: "bg-emerald-50 text-emerald-700",
  atencao: "bg-amber-100 text-amber-800",
  alerta: "bg-rose-50 text-rose-700",
  neutro: "bg-slate-100 text-slate-600",
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
      className={`flex flex-col gap-3 rounded-2xl border border-[#e7e9ee] bg-white p-3 shadow-sm sm:min-h-[72px] sm:flex-row sm:items-center sm:gap-4 sm:px-4 ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
        <span
          aria-hidden="true"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${CLASSES_ICONE_POR_TOM[tom]}`}
        >
          <Icone className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-bold text-ink text-sm tracking-tight sm:text-base">
              {titulo}
            </h3>
            <span
              data-testid="destaque-badge"
              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-xs ${CLASSES_BADGE_POR_TOM[tom]}`}
            >
              {badgeTexto}
            </span>
          </div>
          <p className="mt-0.5 text-subtleText text-xs leading-snug sm:text-sm">
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
  "inline-flex min-h-11 items-center gap-1 whitespace-nowrap font-semibold text-accent text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
