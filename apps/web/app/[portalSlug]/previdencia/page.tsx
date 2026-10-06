import {
  DenseTable,
  fmtCompact,
  fmtCurrency,
  fmtPercent,
  KPICard,
} from "@transparencia/ui";
import { Landmark } from "lucide-react";
import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { BarChartH } from "@/components/bar-chart-h";
import { KPIGrid } from "@/components/kpi-grid";
import { PrevidenciaActuarialRiskSection } from "@/components/previdencia-actuarial-risk-section";
import { PrevidenciaHeroSection } from "@/components/previdencia-hero-section";
import { PrevidenciaPatrimonioHistoricoSection } from "@/components/previdencia-patrimonio-historico-section";
import { PrevidenciaSaldoCaixaCard } from "@/components/previdencia-saldo-caixa-card";
import { SectionHeader } from "@/components/section-header";
import { createPortalMetadata, getCachedPortalConfig } from "@/lib/metadata";
import { loadPrevidenciaData } from "./loader";
import { buildPrevidenciaViewModel } from "./view-model";

const PrevidenciaEntidadesDonut = nextDynamic(
  () =>
    import("@/components/previdencia-entidades-donut").then(
      (mod) => mod.PrevidenciaEntidadesDonut,
    ),
  {
    loading: () => (
      <div className="h-[280px] w-full animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
    ),
  },
);

export const dynamic = "force-dynamic";

interface PrevidenciaPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ ano?: string; empresa?: string }>;
}

export async function generateMetadata({
  params,
}: PrevidenciaPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  const portalConfig = await getCachedPortalConfig(portalSlug);
  const isHabilitado = portalConfig?.previdencia?.habilitado !== false;
  const sigla = portalConfig?.previdencia?.sigla || "Previdência";
  const nome = portalConfig?.previdencia?.nome || "Previdência Municipal";

  if (!isHabilitado) {
    return createPortalMetadata("Previdência", portalSlug, {
      description:
        "O município não possui Regime Próprio de Previdência Social (RPPS) ativo ou municipalizado.",
      path: "/previdencia",
      keywords: ["previdência", "RPPS", "RGPS", "INSS"],
    });
  }

  return createPortalMetadata(`${sigla}`, portalSlug, {
    description: `Prestação de contas e saúde atuarial do fundo previdenciário municipal (${sigla} - ${nome}), contribuições patronais e dos servidores.`,
    path: "/previdencia",
    keywords: [
      sigla,
      nome,
      "previdência municipal",
      "fundo previdenciário",
      "contribuição previdenciária",
      "saúde atuarial",
      "RPPS",
    ],
  });
}

export default async function PrevidenciaPage({
  params,
  searchParams,
}: PrevidenciaPageProps) {
  const { portalSlug } = await params;
  const sParams = await searchParams;
  const rawData = await loadPrevidenciaData(portalSlug, sParams);
  const viewModel = buildPrevidenciaViewModel(rawData);
  const {
    selectedYear,
    isCurrentYear,
    previdencia,
    naturezaCols,
    naturezaChartData,
    previdenciaSigla,
    previdenciaNome,
    portalConfig,
  } = viewModel;

  if (
    portalConfig?.previdencia &&
    portalConfig.previdencia.habilitado === false
  ) {
    return (
      <div className="space-y-6 pb-12">
        <SectionHeader
          title={`Previdência Municipal (${previdenciaSigla})`}
          description="Informações sobre o regime previdenciário municipal."
        />
        <div className="rounded-xl border border-borderLine bg-white p-8 text-center">
          <Landmark
            className="mx-auto h-10 w-10 text-mutedText"
            strokeWidth={1.5}
          />
          <h3 className="mt-4 font-semibold text-lg text-slate-800">
            Município sem Regime Próprio de Previdência Social (RPPS) ativo
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-slate-600 text-sm">
            Os servidores públicos deste município estão vinculados ao Regime
            Geral de Previdência Social (RGPS / INSS) ou não possuem autarquia
            previdenciária própria habilitada.
          </p>
        </div>
      </div>
    );
  }

  const safeSigla = previdenciaSigla.toLowerCase().replace(/[^a-z0-9_-]/g, "_");

  return (
    <div className="space-y-12 pb-12">
      {/* Seção 1: Hero Especializado do Tema */}
      <PrevidenciaHeroSection
        ano={selectedYear}
        isCurrentYear={isCurrentYear}
        totalEmpenhado={previdencia.totalEmpenhado}
        totalLiquidado={previdencia.totalLiquidado}
        totalPago={previdencia.totalPago}
        taxaExecucao={previdencia.taxaExecucao}
        totalAporteAtuarial={previdencia.totalAporteAtuarial}
        totalDividaResgatada={previdencia.totalDividaResgatada}
        previdenciaSigla={previdenciaSigla}
        previdenciaNome={previdenciaNome}
        dataExtracao={
          viewModel.portalConfig?.dataExtracaoDate ??
          viewModel.portalConfig?.dataExtracao
        }
      />

      {/* Seção 2: KPIs de Alto Nível (Grid Limpo de 4 Colunas) */}
      <KPIGrid columns={4}>
        <KPICard
          title="Total Empenhado"
          value={fmtCompact(previdencia.totalEmpenhado)}
          subtext="Compromissos previdenciários"
          accent
        />
        <KPICard
          title="Total Repassado / Pago"
          value={fmtCompact(previdencia.totalPago)}
          subtext="Efetivamente transferido"
        />
        <KPICard
          title="Aporte Déficit Atuarial"
          value={fmtCompact(previdencia.totalAporteAtuarial)}
          subtext="Elemento 97 (Equilíbrio RPPS)"
        />
        <KPICard
          title="Índice de Adimplência"
          value={fmtPercent(previdencia.taxaExecucao * 100)}
          subtext="% Quitado do Empenhado"
        />
      </KPIGrid>

      {previdencia.entidades.length > 0 && (
        <section className="">
          <PrevidenciaEntidadesDonut
            data={previdencia.entidades}
            ano={selectedYear}
            previdenciaSigla={previdenciaSigla}
          />
        </section>
      )}

      {/* Seção de Disponibilidade em Caixa e Aplicações do RPPS (SICONFI / STN) */}
      <PrevidenciaSaldoCaixaCard
        posicaoFinanceira={viewModel.posicaoFinanceira}
        ano={selectedYear}
        portalSlug={portalSlug}
        previdenciaSigla={previdenciaSigla}
      />

      {/* Seção: Trajetória do Patrimônio Financeiro da Previdência */}
      {viewModel.patrimonioHistoricoResumo && (
        <PrevidenciaPatrimonioHistoricoSection
          resumo={viewModel.patrimonioHistoricoResumo}
          selectedYear={selectedYear}
          previdenciaSigla={previdenciaSigla}
        />
      )}

      {/* Seção: Acordos de Parcelamento e Dívidas Previdenciárias (CADPREV / Ministério da Previdência) */}
      <PrevidenciaActuarialRiskSection
        ano={selectedYear}
        trend={previdencia.actuarialTrend}
        cadprev={previdencia.cadprevParcelamentos}
        previdenciaSigla={previdenciaSigla}
      />

      {/* Seção 5: Composição Contábil dos Repasses (Gráfico Barras + Tabela Paginada) */}
      {previdencia.natureza.length > 0 && (
        <section className="space-y-6">
          <SectionHeader
            title="Composição Contábil dos Repasses"
            description="Detalhamento das obrigações por elemento de despesa (Contribuições patronais ordinárias, aportes de equilíbrio atuarial, amortização de dívidas e previdência)"
          />

          {naturezaChartData.length > 0 && (
            <div className="space-y-4 rounded-xl border border-borderLine bg-white p-5">
              <div className="flex items-center justify-between border-gray-100 border-b pb-3">
                <h4 className="font-semibold font-serif text-slate-800 text-sm">
                  Distribuição por Destino Contábil e Regime ({selectedYear})
                </h4>
                <span className="font-medium text-slate-500 text-xs">
                  Total Repassado: {fmtCurrency(previdencia.totalPago)}
                </span>
              </div>
              <BarChartH data={naturezaChartData} />
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-semibold font-serif text-slate-800 text-sm">
              Detalhamento de Lançamentos Contábeis (Paginado)
            </h4>
            <DenseTable
              data={previdencia.natureza.map((item) => ({
                ...item,
                descricao: `${item.elemento} - ${item.descricao}`,
              }))}
              columns={naturezaCols}
              searchableKeys={["descricao", "elemento", "destino"]}
              pageSize={10}
              sortable
              exportFilename={`lancamentos_contabeis_${safeSigla}_${selectedYear}.csv`}
            />
          </div>
        </section>
      )}
    </div>
  );
}
