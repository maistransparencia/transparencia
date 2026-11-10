import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import { corDoGrafico, fmtCompact } from "@transparencia/ui";
import Link from "next/link";
import { SaldoCaixaResumoCard } from "./saldo-caixa-resumo-card";
import { SectionWithHeader } from "./section-with-header";

export interface DinheiroPublicoSectionProps {
  arrecadadoTitle: string;
  totalArrecadado: number;
  previstoTotal: number;
  percentualPrevisto: number;
  posicaoFinanceira?: SiconfiPosicaoFinanceiraDTO | null;
  ano: number;
  orcamentoDetailUrl: string;
  hasEntityFilter: boolean;
}

/** Hero fiscal rebaixado: total arrecadado e saldo em caixa, com atalho ao orçamento. */
export function DinheiroPublicoSection({
  arrecadadoTitle,
  totalArrecadado,
  previstoTotal,
  percentualPrevisto,
  posicaoFinanceira,
  ano,
  orcamentoDetailUrl,
  hasEntityFilter,
}: DinheiroPublicoSectionProps) {
  const larguraBarra = Math.min(100, Math.max(0, percentualPrevisto));

  return (
    <SectionWithHeader
      id="dinheiro-publico"
      title="Para onde vai o dinheiro público"
      description="O que a Prefeitura arrecadou e quanto tem disponível nas contas."
    >
      <div className="space-y-8">
        <div className="space-y-3">
          <p className="eyebrow">{arrecadadoTitle}</p>
          <p className="stat-value-lg">{fmtCompact(totalArrecadado)}</p>
          <div
            className="h-1.5 w-full overflow-hidden bg-track"
            role="progressbar"
            aria-valuenow={Math.round(larguraBarra)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${percentualPrevisto}% da previsão de arrecadação`}
          >
            <div
              className="h-full"
              style={{
                backgroundColor: corDoGrafico("brand"),
                width: `${larguraBarra}%`,
              }}
            />
          </div>
          <p className="caption">
            {percentualPrevisto}% da previsão de {fmtCompact(previstoTotal)}{" "}
            para o exercício.
          </p>
          <Link href={orcamentoDetailUrl}>Ver detalhes</Link>
        </div>

        <SaldoCaixaResumoCard
          posicaoFinanceira={posicaoFinanceira}
          ano={ano}
          detailUrl={`${orcamentoDetailUrl}#disponibilidade-caixa`}
          hasEntityFilter={hasEntityFilter}
        />
      </div>
    </SectionWithHeader>
  );
}
