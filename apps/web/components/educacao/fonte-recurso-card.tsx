import type {
  EducacaoOrigemRecursoDTO,
  GrupoFonteRecursoEducacao,
} from "@transparencia/db";
import { cn, fmtCompact } from "@transparencia/ui";
import {
  COR_FONTE_RECURSO,
  formatPercentualInteiro,
  ROTULO_FONTE_RECURSO,
} from "./fonte-recurso-utils";

export interface FonteRecursoCardProps {
  grupoFonte: GrupoFonteRecursoEducacao;
  fonte: EducacaoOrigemRecursoDTO | null;
  onOpen: (grupoFonte: GrupoFonteRecursoEducacao) => void;
  parcial?: boolean;
  className?: string;
}

export function FonteRecursoCard({
  grupoFonte,
  fonte,
  onOpen,
  parcial = false,
  className,
}: FonteRecursoCardProps) {
  const vazia = fonte === null;
  const rotulo = ROTULO_FONTE_RECURSO[grupoFonte];
  const percentual = fonte
    ? formatPercentualInteiro(fonte.percentualTotal)
    : "";
  const valor = fonte ? fmtCompact(fonte.totalArrecadado) : "—";
  const nomeAcessivel = vazia
    ? `${rotulo}, sem receita no exercício`
    : `${rotulo}, ${valor}, ${percentual} do total${parcial ? ", valor parcial do ano" : ""}`;

  return (
    <button
      type="button"
      aria-disabled={vazia}
      aria-label={nomeAcessivel}
      onClick={vazia ? undefined : () => onOpen(grupoFonte)}
      data-testid={`fonte-card-${grupoFonte}`}
      className={cn(
        "flex min-h-11 w-full flex-col gap-2 border-line border-t p-4 text-left transition-colors",
        vazia
          ? "cursor-default opacity-60"
          : "cursor-pointer hover:border-brand-fill/40 focus-visible:border-brand-fill/40 focus-visible:outline-2 focus-visible:outline-brand-fill",
        className,
      )}
    >
      <span className="flex items-center gap-2 font-semibold text-mute text-xs uppercase tracking-wider">
        <span
          aria-hidden="true"
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full",
            COR_FONTE_RECURSO[grupoFonte],
          )}
        />
        {rotulo}
      </span>
      <span
        className={cn(
          "font-serif text-xl sm:text-2xl",
          vazia ? "text-mute2" : "text-ink",
        )}
      >
        {valor}
      </span>
      <span className="text-mute text-xs">
        {vazia
          ? "Sem receita no exercício"
          : `${percentual} do total${parcial ? " · parcial" : ""}`}
      </span>
      {!vazia && (
        <span className="font-medium text-brand-text text-xs">
          Ver detalhes ›
        </span>
      )}
    </button>
  );
}
