import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import { fmtCompact, ThresholdMeter } from "@transparencia/ui";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CLASSE_ACAO_DESTAQUE } from "./destaque-linha";
import { SaldoCaixaResumoCard } from "./saldo-caixa-resumo-card";
import { SectionWithHeader } from "./section-with-header";

export interface OrcamentoPagoSectionProps {
  pagoTitle: string;
  totalPago: number;
  totalDotacao: number;
  percentualPago: number;
  anoEmAndamento: boolean;
  anoAnterior: number;
  percentualPagoAnoAnterior: number | null;
  posicaoFinanceira?: SiconfiPosicaoFinanceiraDTO | null;
  ano: number;
  orcamentoDetailUrl: string;
  hasEntityFilter: boolean;
}

/** Despesa do ano: quanto do orçamento autorizado já foi pago e o saldo nas contas. */
export function OrcamentoPagoSection({
  pagoTitle,
  totalPago,
  totalDotacao,
  percentualPago,
  anoEmAndamento,
  anoAnterior,
  percentualPagoAnoAnterior,
  posicaoFinanceira,
  ano,
  orcamentoDetailUrl,
  hasEntityFilter,
}: OrcamentoPagoSectionProps) {
  const larguraBarra = Math.min(100, Math.max(0, percentualPago));

  return (
    <SectionWithHeader
      id="orcamento-pago"
      title="Para onde vai o dinheiro público"
      description="Quanto do orçamento a Prefeitura já pagou e quanto tem disponível nas contas."
    >
      <div className="space-y-8">
        <div className="space-y-3">
          <p className="eyebrow">{pagoTitle}</p>
          {totalDotacao > 0 ? (
            <>
              <p className="stat-value-lg">{fmtCompact(totalPago)}</p>
              <ThresholdMeter
                value={larguraBarra}
                label="Pago em relação ao orçamento autorizado"
                valueText={`${percentualPago}% do orçamento autorizado`}
              />
              <p className="caption">
                {percentualPago}% dos {fmtCompact(totalDotacao)} que a
                Prefeitura foi autorizada a gastar em {ano}.
                {anoEmAndamento
                  ? " Ano em andamento: os pagamentos se acumulam até dezembro."
                  : ""}
              </p>
              {percentualPagoAnoAnterior !== null ? (
                <p className="caption">
                  Para comparar: em {anoAnterior}, o ano inteiro terminou com{" "}
                  {percentualPagoAnoAnterior}% do orçamento pago.
                </p>
              ) : null}
            </>
          ) : (
            <p className="caption">
              Ainda não há orçamento autorizado registrado para {ano}.
            </p>
          )}
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
