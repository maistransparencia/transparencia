import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import { fmtCompact, ThresholdMeter } from "@transparencia/ui";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CLASSE_ACAO_DESTAQUE } from "./destaque-linha";
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
          <ThresholdMeter
            value={larguraBarra}
            label="Arrecadado em relação à previsão do exercício"
            valueText={`${percentualPrevisto}% da previsão de arrecadação`}
          />
          <p className="caption">
            {percentualPrevisto}% da previsão de {fmtCompact(previstoTotal)}{" "}
            para o exercício.
          </p>
          <Link href={orcamentoDetailUrl} className={CLASSE_ACAO_DESTAQUE}>
            <span>Ver detalhes</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
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
