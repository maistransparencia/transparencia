import {
  AlertBox,
  cn,
  fmtCompact,
  fmtPercent,
  KPICard,
} from "@transparencia/ui";
import type { Metadata } from "next";
import { KPIGrid } from "@/components/kpi-grid";
import { SaudeContratacaoSection } from "@/components/saude-contratacao-section";
import { SaudeEmendasSection } from "@/components/saude-emendas-section";
import { SaudeFontesDonut } from "@/components/saude-fontes-donut";
import { SaudeHeroSection } from "@/components/saude-hero-section";
import { SaudeTrendChart } from "@/components/saude-trend-chart";
import { createPortalMetadata } from "@/lib/metadata";
import { classifyHhi, loadSaudeData } from "./loader";
import { buildSaudeViewModel } from "./view-model";

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
    saude.emendasStats?.totalAutorizado ||
    saude.fontesReceita?.emendasParlamentares ||
    0;
  const totalEmpenhado = saude.emendasStats?.totalEmpenhado ?? 0;
  const taxaEmpenho = saude.emendasStats?.taxaEmpenho ?? 0;
  const hasEmendas = totalEmendas > 0;

  const emendasSubtext = (() => {
    if (!hasEmendas) {
      return "Sem emendas no exercício";
    }
    if (totalEmpenhado === 0) {
      return (
        <span className="font-semibold text-amber-700">
          Nenhum valor empenhado
        </span>
      );
    }
    return `${fmtCompact(totalEmpenhado)} empenhados (${fmtPercent(taxaEmpenho * 100)})`;
  })();

  const concentracao =
    saude.farmaceutica?.concentracao ??
    classifyHhi(saude.farmaceutica?.hhi ?? 0);

  const badgeColorClasses = (() => {
    if (concentracao.nivel === "alta") {
      return "text-rose-700 bg-rose-50 border-rose-200";
    }
    if (concentracao.nivel === "moderada") {
      return "text-amber-700 bg-amber-50 border-amber-200";
    }
    return "text-emerald-700 bg-emerald-50 border-emerald-200";
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

        {/* Hero KPIs com KPIGrid e KPICard */}
        <KPIGrid columns={4}>
          <KPICard
            title="Emendas na Saúde"
            value={fmtCompact(totalEmendas)}
            subtext={emendasSubtext}
            accent={hasEmendas && taxaEmpenho >= 0.7}
          />
          <KPICard
            title="Contratos vinculados"
            value={saude.orcamento.contratosVinculadosCount}
          />
          <KPICard
            title="Fornecedores ativos"
            value={saude.orcamento.fornecedoresAtivosCount}
          />
          <KPICard
            title="Medicamentos e Insumos"
            value={fmtCompact(saude.orcamento.medicamentosInsumos)}
          />
        </KPIGrid>
      </div>

      {/* Alerta de Subexecução se aplicável (apenas exercícios encerrados) */}
      {saude.orcamento.alertaSubExecucao && (
        <AlertBox type="warning" title="Alerta de Subexecução Orçamentária">
          A execução da Saúde encerrou o exercício abaixo de 70% da dotação
          aprovada.
        </AlertBox>
      )}

      {/* Seção 2: O que entrou no Fundo (Existente) */}
      <section className="space-y-6 border-[#1a1d21] border-t-2 pt-8">
        <h2 className="font-bold font-serif text-2xl text-slate-900">
          O que entrou
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <SaudeFontesDonut data={saude.fontesReceita} ano={selectedYear} />
          </div>
          <div className="flex flex-col gap-4">
            <KPICard
              title="Repasses da Prefeitura ao Fundo"
              value={fmtCompact(saude.fontesReceita.repassesPrefeitura)}
            />
            <KPICard
              title="Emendas parlamentares"
              value={fmtCompact(saude.fontesReceita.emendasParlamentares)}
            />
          </div>
        </div>
      </section>

      {/* Seção 3: Empenhado no ano (Existente) */}
      <section className="space-y-6 border-[#1a1d21] border-t-2 pt-8">
        <h2 className="font-bold font-serif text-2xl text-slate-900">
          Empenhado no ano
        </h2>
        <SaudeTrendChart
          data={saude.executionTrend}
          selectedYear={selectedYear}
        />
      </section>

      {/* Seção 4: Como o Fundo contrata (Novo) */}
      <SaudeContratacaoSection
        portalSlug={portalSlug}
        orcamento={saude.orcamento}
        licitacoesSaude={saude.licitacoesSaude}
      />

      {/* Seção 5: Insumos e assistência farmacêutica (Existente) */}
      <section className="space-y-6 border-[#1a1d21] border-t-2 pt-8">
        <h2 className="font-bold font-serif text-2xl text-slate-900">
          Insumos e assistência farmacêutica
        </h2>
        <KPIGrid columns={3}>
          <KPICard
            title="Medicamentos e insumos"
            value={fmtCompact(saude.farmaceutica.medicamentosInsumos)}
            subtext={`${fmtCompact(saude.farmaceutica.medicamentosInsumosPago)} pagos (Subfunção 10.303)`}
          />
          <KPICard
            title="Judicialização da saúde"
            value={
              <span className="font-bold text-amber-700">
                {fmtCompact(saude.farmaceutica.judicializacao)}
              </span>
            }
            subtext={`${fmtCompact(saude.farmaceutica.judicializacaoPago)} pagos (sentenças judiciais)`}
          />
          <KPICard
            title="Concentração de Fornecedores"
            value={
              <span className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold text-sm",
                    badgeColorClasses,
                  )}
                >
                  {concentracao.label}
                </span>
                <span
                  className="font-mono text-[11px] text-slate-400"
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
      />
    </div>
  );
}
