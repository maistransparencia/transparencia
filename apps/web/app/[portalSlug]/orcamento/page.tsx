import {
  DenseTable,
  fmtCompact,
  KPICard,
  SectionHeader,
  toTitleCase,
} from "@transparencia/ui";
import type { Metadata } from "next";
import { FunnelExecucaoHorizontal } from "@/components/funil-execucao-horizontal";
import { GastoPorFuncaoBars } from "@/components/gasto-por-funcao-bars";
import { KPIGrid } from "@/components/kpi-grid";
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
    totalEmpenhado,
    totalLiquidado,
    totalPago,
    empPct,
    liqPct,
    pagPct,
    funnelStages,
    funcItems,
    orgaosCols,
  } = viewModel;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="eyebrow">
          ADMINISTRATIVO · EXERCÍCIO {selectedYear}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </p>
        <h1>Execução Orçamentária</h1>
        <p className="lead">
          Cada real passa por quatro estágios legais antes de sair do caixa:{" "}
          <strong className="font-semibold text-ink">reservar</strong>{" "}
          (empenho),{" "}
          <strong className="font-semibold text-ink">
            confirmar a entrega
          </strong>{" "}
          (liquidação) e{" "}
          <strong className="font-semibold text-ink">pagar</strong>. Veja quanto
          do orçamento já avançou em cada etapa.
        </p>
      </div>

      <KPIGrid columns={4} variant="divisoria">
        <KPICard
          variant="divisoria"
          title="Dotação Atualizada"
          value={fmtCompact(totalDotacao)}
          subtext="100% autorizado"
          accent
        />
        <KPICard
          variant="divisoria"
          title="Empenhado"
          value={fmtCompact(totalEmpenhado)}
          subtext={`${empPct.toFixed(0)}% da dotação`}
        />
        <KPICard
          variant="divisoria"
          title="Liquidado"
          value={fmtCompact(totalLiquidado)}
          subtext={`${liqPct.toFixed(0)}% da dotação`}
        />
        <KPICard
          variant="divisoria"
          title="Pago"
          value={fmtCompact(totalPago)}
          subtext={`${pagPct.toFixed(0)}% da dotação`}
        />
      </KPIGrid>

      {/* Funil da Execução */}
      <FunnelExecucaoHorizontal stages={funnelStages} />

      {funcItems.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            title="Para onde vai o gasto, por função"
            description="valor pago por função"
          />
          <GastoPorFuncaoBars items={funcItems} />
        </section>
      )}

      <section className="space-y-4">
        <SectionHeader title="Execução por Órgão e Unidade Gestora" />
        <DenseTable
          data={items.map((item) => ({
            ...item,
            descricao: toTitleCase(item.descricao),
          }))}
          columns={orgaosCols}
          searchableKeys={["descricao"]}
        />
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
