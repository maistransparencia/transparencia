import { fmtCompact, fmtPercent, SectionHeader } from "@transparencia/ui";
import type { Metadata } from "next";
import { ExecucaoOrgaosTable } from "@/components/execucao-orgaos-table";
import { FunnelExecucaoHorizontal } from "@/components/funil-execucao-horizontal";
import { GastoPorFuncaoBars } from "@/components/gasto-por-funcao-bars";
import { PageEyebrow } from "@/components/page-eyebrow";
import { SaldoCaixaEntidadesSection } from "@/components/saldo-caixa-entidades-section";
import { createPortalMetadata } from "@/lib/metadata";
import { loadOrcamentoData } from "./loader";
import { buildOrcamentoViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface OrcamentoPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ ano?: string; entidades?: string }>;
}

export async function generateMetadata({
  params,
}: OrcamentoPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Orçamento", portalSlug, {
    description:
      "Acompanhamento da execução orçamentária municipal, dotação atualizada, empenho, liquidação e pagamento.",
    path: "/orcamento",
    keywords: [
      "execução orçamentária",
      "orçamento municipal",
      "dotação orçamentária",
      "empenhos",
      "contas públicas",
    ],
  });
}

export default async function OrcamentoPage({
  params,
  searchParams,
}: OrcamentoPageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const rawData = await loadOrcamentoData(portalSlug, resolvedSearchParams);
  const viewModel = buildOrcamentoViewModel(rawData);

  const {
    selectedYear,
    isCurrentYear,
    partialPeriod,
    items,
    totalDotacao,
    totalPago,
    percentualPago,
    funnelStages,
    funcItems,
    execucaoAnoAnterior,
    restosPagosNoAno,
  } = viewModel;

  const temOrcamento = totalDotacao > 0;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <PageEyebrow>
          Administrativo · Exercício {selectedYear}
          {isCurrentYear && partialPeriod ? ` (parcial, ${partialPeriod})` : ""}
        </PageEyebrow>
        <h1>Execução Orçamentária</h1>
        <p className="text-mute2 text-sm leading-relaxed">
          Todo ano a prefeitura tem um orçamento: o limite do que pode gastar.
          Aqui você acompanha quanto desse limite já foi reservado, entregue e
          pago.
        </p>
      </div>

      <section className="space-y-2" data-testid="orcamento-destaque">
        <p className="eyebrow">Orçamento já pago</p>
        {temOrcamento ? (
          <>
            <p className="stat-value-lg text-brand-text">
              {fmtPercent(percentualPago, 0)}
            </p>
            <p className="caption">
              {fmtCompact(totalPago)} pagos de {fmtCompact(totalDotacao)}{" "}
              autorizados em {selectedYear}
            </p>
          </>
        ) : (
          <>
            <p className="stat-value-lg">—</p>
            <p className="caption">
              Ainda não há orçamento autorizado registrado para {selectedYear}.
            </p>
          </>
        )}
      </section>

      {restosPagosNoAno > 0 ? (
        <p
          className="text-mute2 text-sm leading-relaxed"
          data-testid="orcamento-restos-pagos"
        >
          Em {selectedYear}, a prefeitura também pagou{" "}
          {fmtCompact(restosPagosNoAno)} por contas de anos anteriores (restos a
          pagar). Esse valor não está no percentual acima, que considera só o
          orçamento de {selectedYear}.
        </p>
      ) : null}

      {execucaoAnoAnterior.percentualPago !== null ? (
        <p
          className="text-mute2 text-sm leading-relaxed"
          data-testid="orcamento-ano-anterior"
        >
          Para comparar: em {execucaoAnoAnterior.anoAnterior}, o ano inteiro
          terminou com {fmtPercent(execucaoAnoAnterior.percentualPago, 0)} do
          orçamento pago. Os pagamentos variam de mês para mês.
        </p>
      ) : null}

      <section className="space-y-4">
        <SectionHeader
          title="Do orçamento ao pagamento"
          description="Até onde o dinheiro do orçamento já avançou."
        />
        <FunnelExecucaoHorizontal stages={funnelStages} />
      </section>

      {funcItems.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            title="Quanto foi pago em cada área"
            description="Valor já pago em cada área de atuação da prefeitura, como saúde e educação."
          />
          <GastoPorFuncaoBars items={funcItems} />
        </section>
      )}

      <section className="space-y-4">
        <SectionHeader
          title="Execução por secretaria e fundo"
          description="Quanto cada uma recebeu de orçamento e quanto já reservou e pagou."
        />
        <ExecucaoOrgaosTable items={items} />
      </section>

      {/* Disponibilidade Financeira em Caixa (SICONFI / STN) */}
      {viewModel.posicaoFinanceira && (
        <div id="disponibilidade-caixa">
          <SaldoCaixaEntidadesSection
            posicaoFinanceira={viewModel.posicaoFinanceira}
            evolucaoMensal={viewModel.evolucaoMensal}
            ano={selectedYear}
            portalSlug={portalSlug}
            hasEntityFilter={viewModel.hasEntityFilter}
          />
        </div>
      )}
    </div>
  );
}
