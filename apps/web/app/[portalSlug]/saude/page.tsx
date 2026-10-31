import {
  AlertBox,
  Badge,
  fmtCompact,
  fmtPercent,
  Indicator,
  IndicatorPanel,
  KPICard,
  SectionHeader,
} from "@transparencia/ui";
import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { KPIGrid } from "@/components/kpi-grid";
import { SaudeContratacaoSection } from "@/components/saude-contratacao-section";
import { SaudeEmendasSection } from "@/components/saude-emendas-section";
import { SaudeHeroSection } from "@/components/saude-hero-section";
import { createPortalMetadata } from "@/lib/metadata";
import { loadSaudeData } from "./loader";
import { buildSaudeViewModel } from "./view-model";

const SaudeFontesDonut = nextDynamic(
  () =>
    import("@/components/saude-fontes-donut").then(
      (mod) => mod.SaudeFontesDonut,
    ),
  {
    loading: () => <div className="h-[280px] w-full animate-pulse bg-line2" />,
  },
);

const SaudeTrendChart = nextDynamic(
  () =>
    import("@/components/saude-trend-chart").then((mod) => mod.SaudeTrendChart),
  {
    loading: () => <div className="h-[320px] w-full animate-pulse bg-line2" />,
  },
);

export const dynamic = "force-dynamic";

interface SaudePageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ ano?: string; entidades?: string }>;
}

export async function generateMetadata({
  params,
}: SaudePageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Saúde", portalSlug, {
    description:
      "Transparência da aplicação de recursos na saúde pública municipal, repasses SUS, emendas parlamentares e gastos com saúde.",
    path: "/saude",
    keywords: [
      "saúde pública",
      "recursos da saúde",
      "SUS municipal",
      "gastos com saúde",
      "emendas da saúde",
    ],
  });
}

export default async function SaudePage({
  params,
  searchParams,
}: SaudePageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const rawData = await loadSaudeData(portalSlug, resolvedSearchParams);
  const viewModel = buildSaudeViewModel(rawData);
  const { selectedYear, isCurrentYear, partialPeriod, saude } = viewModel;

  const totalEmendas =
    saude.emendasStats?.totalAutorizado ??
    saude.fontesReceita?.emendasParlamentares ??
    0;
  const totalEmpenhado = saude.emendasStats?.totalEmpenhado ?? 0;
  const taxaEmpenho = saude.emendasStats?.taxaEmpenho ?? 0;
  const hasEmendas = totalEmendas > 0;

  const emendasSubtext = (() => {
    if (!hasEmendas) {
      return "Nenhuma emenda destinada no exercício";
    }
    if (totalEmpenhado === 0) {
      return (
        <span className="font-semibold text-warn-text">
          Nenhum valor empenhado
        </span>
      );
    }
    return `${fmtCompact(totalEmpenhado)} empenhados (${fmtPercent(taxaEmpenho * 100)})`;
  })();

  const concentracao = saude.farmaceutica?.concentracao ?? {
    hhi: 0,
    nivel: "baixa" as const,
    label: "Não aplicável",
    descricao:
      "Sem registros de aquisições de insumos ou contratos no exercício",
  };

  const varianteConcentracao = (() => {
    if (concentracao.nivel === "alta") return "danger" as const;
    if (concentracao.nivel === "moderada") return "warning" as const;
    return "success" as const;
  })();

  return (
    <div className="space-y-12 pb-12">
      {/* Seção 1: Hero (Novo) */}
      <div className="space-y-8">
        <SaudeHeroSection
          ano={selectedYear}
          isCurrentYear={isCurrentYear}
          partialPeriod={partialPeriod}
          orcamento={saude.orcamento}
          fontesReceita={saude.fontesReceita}
        />

        <IndicatorPanel columns={4}>
          <Indicator
            label="Emendas na saúde"
            value={fmtCompact(totalEmendas)}
            note={emendasSubtext}
          />
          <Indicator
            label="Contratos vinculados"
            value={saude.orcamento.contratosVinculadosCount}
          />
          <Indicator
            label="Fornecedores ativos"
            value={saude.orcamento.fornecedoresAtivosCount}
          />
          <Indicator
            label="Medicamentos e insumos"
            value={fmtCompact(saude.orcamento.medicamentosInsumos)}
          />
        </IndicatorPanel>
      </div>

      {/* Alerta de Subexecução se aplicável (apenas exercícios encerrados) */}
      {saude.orcamento.alertaSubExecucao && (
        <AlertBox type="warning" title="Alerta de Subexecução Orçamentária">
          A execução da Saúde encerrou o exercício abaixo de 70% da dotação
          aprovada.
        </AlertBox>
      )}

      {/* Seção 2: O que entrou no Fundo (Existente) */}
      <section className="space-y-6">
        <SectionHeader title="O que entrou" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <SaudeFontesDonut data={saude.fontesReceita} ano={selectedYear} />
          </div>
          <div className="flex flex-col gap-4">
            <KPICard
              variant="divisoria"
              title="Repasses da Prefeitura ao Fundo"
              value={fmtCompact(saude.fontesReceita.repassesPrefeitura)}
            />
            <KPICard
              variant="divisoria"
              title="Emendas parlamentares"
              value={fmtCompact(saude.fontesReceita.emendasParlamentares)}
            />
          </div>
        </div>
      </section>

      {/* Seção 3: Empenhado no ano (Existente) */}
      <section className="space-y-6">
        <SectionHeader title="Empenhado no ano" />
        <SaudeTrendChart
          data={saude.executionTrend}
          selectedYear={selectedYear}
        />
      </section>

      {/* Seção 4: Como o Fundo contrata (Novo) */}
      <SaudeContratacaoSection
        portalSlug={portalSlug}
        ano={selectedYear}
        orcamento={saude.orcamento}
        licitacoesSaude={saude.licitacoesSaude}
        licitacoesEmAndamento={saude.licitacoesEmAndamento}
      />

      {/* Seção 5: Insumos e assistência farmacêutica (Existente) */}
      <section className="space-y-6">
        <SectionHeader title="Insumos e assistência farmacêutica" />
        <KPIGrid columns={3} variant="divisoria">
          <KPICard
            variant="divisoria"
            title="Medicamentos e insumos"
            value={fmtCompact(saude.farmaceutica.medicamentosInsumos)}
            subtext={`${fmtCompact(saude.farmaceutica.medicamentosInsumosPago)} pagos (Subfunção 10.303)`}
          />
          <KPICard
            variant="divisoria"
            title="Judicialização da saúde"
            value={
              <span className="font-bold text-warn-text">
                {fmtCompact(saude.farmaceutica.judicializacao)}
              </span>
            }
            subtext={`${fmtCompact(saude.farmaceutica.judicializacaoPago)} pagos (sentenças judiciais)`}
          />
          <KPICard
            variant="divisoria"
            title="Concentração de Fornecedores"
            value={
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant={varianteConcentracao}>
                  {concentracao.label}
                </Badge>
                <span
                  className="caption"
                  title="Metodologia CADE/STN: Índice Herfindahl-Hirschman (HHI). Abaixo de 1.500: baixa concentração; 1.500 a 2.500: moderada; acima de 2.500: alta concentração."
                >
                  Índice HHI: {concentracao.hhi.toLocaleString("pt-BR")}
                </span>
              </span>
            }
            subtext={concentracao.descricao}
          />
        </KPIGrid>
      </section>

      {/* Seção 6: Emendas parlamentares destinadas à Saúde (Existente, com mais detalhes) */}
      <SaudeEmendasSection
        ano={selectedYear}
        emendasStats={saude.emendasStats}
        portalSlug={portalSlug}
      />
    </div>
  );
}
