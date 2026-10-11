import { KPICard } from "@transparencia/ui";
import { AlertTriangle, ExternalLink, HardHat, Info } from "lucide-react";
import type { Metadata } from "next";
import { KPIGrid } from "@/components/kpi-grid";
import { ObrasInteractiveSection } from "@/components/obras/obras-interactive-section";
import { createPortalMetadata } from "@/lib/metadata";
import { loadObrasData } from "./loader";
import { buildObrasViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface ObrasPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ status?: string; busca?: string }>;
}

export async function generateMetadata({
  params,
}: ObrasPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Obras Públicas", portalSlug, {
    description:
      "Acompanhamento e fiscalização cívica de obras públicas municipais, mapa interativo de impacto urbano, percentual de avanço físico e investimentos.",
    path: "/obras",
    keywords: [
      "obras públicas",
      "mapa de obras",
      "fiscalização de obras",
      "investimentos públicos",
      "obras municipais",
    ],
  });
}

export default async function ObrasPage({
  params,
  searchParams,
}: ObrasPageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;

  const rawData = await loadObrasData(portalSlug, resolvedSearchParams);
  const viewModel = buildObrasViewModel(rawData);
  const { kpis, municipioNome, municipioUf } = viewModel;

  return (
    <div className="space-y-8 pb-12">
      {/* Hero / Cabeçalho Cívico */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-700">
                <HardHat className="h-5 w-5" />
              </span>
              <h1 className="font-bold font-serif text-2xl text-slate-900 md:text-3xl">
                Obras Públicas & Impacto Urbano
              </h1>
            </div>
            <p className="mt-1 text-slate-600 text-sm">
              Mapeamento georreferenciado e fiscalização dos projetos e
              investimentos de infraestrutura em {municipioNome} ({municipioUf}
              ).
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            <span>Regulamentação: </span>
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              Lei nº 14.133/2021
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* KPIs Consolidados */}
        <KPIGrid columns={4}>
          <KPICard
            title="Total de Obras"
            value={kpis.totalObras}
            subtext={`${kpis.valorTotalInvestimentoCompacto} previstos`}
          />
          <KPICard
            title="Em Execução"
            value={kpis.emExecucao}
            subtext="Obras ativas no território"
            accent={kpis.emExecucao > 0}
          />
          <KPICard
            title="Paralisadas"
            value={
              <span
                className={
                  kpis.paralisadas > 0
                    ? "font-bold text-rose-600"
                    : "text-slate-900"
                }
              >
                {kpis.paralisadas}
              </span>
            }
            subtext={
              kpis.paralisadas > 0 ? (
                <span className="flex items-center gap-1 font-medium text-rose-700">
                  <AlertTriangle className="h-3 w-3" /> Requer atenção cívica
                </span>
              ) : (
                "Nenhuma obra paralisada"
              )
            }
          />
          <KPICard
            title="Concluídas"
            value={kpis.concluidas}
            subtext={`Avanço médio: ${kpis.percentualMedioExecucaoFormatado}`}
          />
        </KPIGrid>
      </div>

      {/* Seção Interativa com Filtros, Mapa e Lista */}
      <section className="space-y-4">
        <ObrasInteractiveSection viewModel={viewModel} />
      </section>
    </div>
  );
}
