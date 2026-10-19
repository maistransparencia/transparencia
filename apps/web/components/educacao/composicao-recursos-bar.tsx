import type { EducacaoOrigemRecursoDTO } from "@transparencia/db";
import { cn } from "@transparencia/ui";
import {
  COR_FONTE_RECURSO,
  formatPercentualInteiro,
  LIMIAR_SEGMENTO_AGRUPADO,
  ROTULO_FONTE_RECURSO,
} from "./fonte-recurso-utils";

export interface ComposicaoRecursosBarProps {
  fontes: EducacaoOrigemRecursoDTO[];
}

interface SegmentoBarra {
  chave: string;
  rotulo: string;
  percentual: number;
  corClasse: string;
}

function montarSegmentos(fontes: EducacaoOrigemRecursoDTO[]): SegmentoBarra[] {
  const ordenadas = [...fontes].sort(
    (a, b) => b.percentualTotal - a.percentualTotal,
  );
  const principais = ordenadas.filter(
    (fonte) => fonte.percentualTotal >= LIMIAR_SEGMENTO_AGRUPADO,
  );
  const menores = ordenadas.filter(
    (fonte) => fonte.percentualTotal < LIMIAR_SEGMENTO_AGRUPADO,
  );
  const somaMenores = menores.reduce(
    (acc, fonte) => acc + fonte.percentualTotal,
    0,
  );
  const outrasJaPrincipal = principais.some(
    (fonte) => fonte.grupoFonte === "outras_receitas",
  );
  const segmentos = principais.map((fonte) => ({
    chave: fonte.grupoFonte,
    rotulo: ROTULO_FONTE_RECURSO[fonte.grupoFonte],
    percentual:
      fonte.grupoFonte === "outras_receitas"
        ? fonte.percentualTotal + somaMenores
        : fonte.percentualTotal,
    corClasse: COR_FONTE_RECURSO[fonte.grupoFonte],
  }));
  if (menores.length === 0 || outrasJaPrincipal) return segmentos;
  return [
    ...segmentos,
    {
      chave: "outras",
      rotulo: "Outras",
      percentual: somaMenores,
      corClasse: COR_FONTE_RECURSO.outras_receitas,
    },
  ];
}

export function ComposicaoRecursosBar({ fontes }: ComposicaoRecursosBarProps) {
  const segmentos = montarSegmentos(fontes);
  const vazia = segmentos.length === 0;
  const descricao = vazia
    ? "Sem receitas registradas no exercício"
    : segmentos
        .map(
          (segmento) =>
            `${segmento.rotulo} ${formatPercentualInteiro(segmento.percentual)}`,
        )
        .join(", ");

  return (
    <div className="space-y-2">
      <div
        role="img"
        aria-label={`Composição das receitas por fonte: ${descricao}`}
        data-testid="composicao-recursos-bar"
        className={cn(
          "flex h-3 w-full gap-px overflow-hidden rounded-full bg-slate-100",
          vazia && "opacity-60",
        )}
      >
        {segmentos.map((segmento) => (
          <span
            key={segmento.chave}
            className={cn("block h-full", segmento.corClasse)}
            style={{ width: `${segmento.percentual}%` }}
          />
        ))}
      </div>
      {!vazia && (
        <ul className="hidden flex-wrap gap-x-4 gap-y-1 sm:flex">
          {segmentos.map((segmento) => (
            <li
              key={segmento.chave}
              className="flex items-center gap-1.5 text-[11px] text-slate-500"
            >
              <span
                aria-hidden="true"
                className={cn("h-2 w-2 rounded-full", segmento.corClasse)}
              />
              {segmento.rotulo} · {formatPercentualInteiro(segmento.percentual)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
