import { fmtCompact, fmtNumber, fmtPercent, KPICard } from "@transparencia/ui";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { DecimoTerceiroCard } from "@/components/decimo-terceiro-card";
import { KPIGrid } from "@/components/kpi-grid";
import { PessoalRegimeSection } from "@/components/pessoal-regime-section";
import { ProventosDistributionChart } from "@/components/proventos-distribution-chart";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { createPortalMetadata } from "@/lib/metadata";
import { loadPessoalData } from "./loader";
import { buildPessoalViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface PessoalPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ ano?: string; entidades?: string }>;
}

export async function generateMetadata({
  params,
}: PessoalPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Pessoal", portalSlug, {
    description:
      "Informações sobre folha de pagamento municipal, despesas com pessoal, remunerações e distribuição por órgãos.",
    path: "/pessoal",
    keywords: [
      "folha de pagamento",
      "despesas com pessoal",
      "servidores públicos",
      "remuneração municipal",
      "gastos com pessoal",
    ],
  });
}

export default async function PessoalPage({
  params,
  searchParams,
}: PessoalPageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const rawData = await loadPessoalData(portalSlug, resolvedSearchParams);
  const viewModel = buildPessoalViewModel(rawData);
  const {
    selectedYear,
    isCurrentYear,
    partialPeriod,
    pctChefias,
    decimo13,
    distribuicaoProventos,
    regimeMetrics,
    totalDivergencias,
    servidoresDivergentes,
    currentYearRow,
    headerDescription,
    limitesLrfDescricao,
    totalServidores,
    servidoresTrend,
    folhaKpi,
    folhaTrend,
    chefiasTrend,
    totalFolhaTrend,
  } = viewModel;

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-2">
        <p className="eyebrow text-brand-text!">
          ADMINISTRATIVO · EXERCÍCIO {selectedYear}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </p>
        <h1>Folha de Pagamento</h1>
        <p className="text-mute2 text-sm leading-relaxed">
          {headerDescription}
          {limitesLrfDescricao ? (
            <>
              {" "}
              A{" "}
              <a
                href={urlLegislacao("lrf", "art20")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-brand-text underline underline-offset-2"
              >
                <span>Lei de Responsabilidade Fiscal</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>{" "}
              {limitesLrfDescricao}
            </>
          ) : null}
        </p>
      </div>

      <section className="space-y-2" data-testid="pessoal-destaque">
        <p className="eyebrow">Total pago em folha</p>
        <p className="stat-value-lg text-brand-text">
          {fmtCompact(currentYearRow.totalFolha)}
        </p>
        <p className="caption flex flex-wrap gap-x-3">
          <span>proventos brutos, {selectedYear}</span>
          {!isCurrentYear && totalFolhaTrend && (
            <span>{totalFolhaTrend.value}</span>
          )}
        </p>
      </section>

      <KPIGrid columns={3} variant="divisoria">
        <KPICard
          variant="divisoria"
          title={folhaKpi.title}
          value={fmtPercent(currentYearRow.percentualFolha)}
          subtext={folhaKpi.subtext}
          trend={folhaTrend}
          alert={folhaKpi.alert}
        />
        <KPICard
          variant="divisoria"
          title="Chefias ocupadas por concursados"
          value={pctChefias !== null ? fmtPercent(pctChefias) : "N/D"}
          subtext="das funções de chefia do município são de servidores concursados"
          trend={chefiasTrend}
        />
        <KPICard
          variant="divisoria"
          title="Total de servidores"
          value={fmtNumber(totalServidores)}
          subtext="no quadro de pessoal, por regime jurídico"
          trend={servidoresTrend}
        />
      </KPIGrid>
      {folhaTrend || chefiasTrend ? (
        <p className="caption -mt-4">
          p.p. significa pontos percentuais, a diferença entre dois percentuais.
          Por exemplo, de 40% para 46% são 6 p.p.
        </p>
      ) : null}

      {/* Personnel by Legal Regime and Appointment Type */}
      <PessoalRegimeSection
        data={regimeMetrics}
        ano={selectedYear}
        portalSlug={portalSlug}
        totalDivergencias={totalDivergencias}
        servidoresDivergentes={servidoresDivergentes}
      />

      {/* Proventos Distribution Histogram Chart */}
      <ProventosDistributionChart data={distribuicaoProventos} />

      {/* 13º Salário Card */}
      {decimo13 ? (
        <DecimoTerceiroCard
          empenhado={decimo13.empenhado}
          pago={decimo13.pago}
          pctPago={decimo13.pctPago}
        />
      ) : (
        <div className="border-line border-y py-6 text-center text-mute2 text-sm">
          Sem dados de 13º salário para {selectedYear}.
        </div>
      )}
    </div>
  );
}
