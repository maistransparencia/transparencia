import {
  fmtCompact,
  fmtNumber,
  fmtPercent,
  Indicator,
  IndicatorPanel,
  ThresholdMeter,
} from "@transparencia/ui";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { DecimoTerceiroCard } from "@/components/decimo-terceiro-card";
import { PageEyebrow } from "@/components/page-eyebrow";
import { PessoalRegimeSection } from "@/components/pessoal-regime-section";
import { ProventosDistributionChart } from "@/components/proventos-distribution-chart";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
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
    barraLimitesLrf,
    notaFonteLrf,
    percentualExibido,
    rgf,
    periodoRgfRotulo,
    chefiasTrend,
    totalFolhaTrend,
  } = viewModel;

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-2">
        <PageEyebrow>
          Administrativo · Exercício {selectedYear}
          {isCurrentYear && partialPeriod ? ` (parcial, ${partialPeriod})` : ""}
        </PageEyebrow>
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

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <section
          className="space-y-3 md:col-span-2"
          data-testid="pessoal-lrf-destaque"
        >
          <p className="eyebrow">{folhaKpi.title}</p>
          <p
            className={`stat-value-lg ${folhaKpi.alert ? "text-warn-text" : "text-brand-text"}`}
          >
            {fmtPercent(percentualExibido)}
          </p>
          {barraLimitesLrf && (
            <ThresholdMeter
              value={percentualExibido}
              threshold={
                barraLimitesLrf.exibirMarcadores
                  ? barraLimitesLrf.teto
                  : undefined
              }
              secondaryThreshold={
                barraLimitesLrf.exibirMarcadores
                  ? barraLimitesLrf.prudencial
                  : undefined
              }
              label="Gasto com pessoal sobre a receita"
              valueText={`${fmtPercent(percentualExibido)} da receita${barraLimitesLrf.exibirMarcadores ? `; teto de ${barraLimitesLrf.tetoTexto}; limite prudencial de ${barraLimitesLrf.prudencialTexto}` : ""}`}
            />
          )}
          <p className="caption space-y-0.5">
            {barraLimitesLrf?.exibirMarcadores && (
              <span className="flex flex-wrap items-center gap-x-4">
                <span className="flex items-center gap-x-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-0.5 bg-ink"
                  />
                  Teto: {barraLimitesLrf.tetoTexto}
                </span>
                <span className="flex items-center gap-x-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-0.5 bg-warn-fill"
                  />
                  Limite prudencial: {barraLimitesLrf.prudencialTexto}
                </span>
              </span>
            )}
            {(folhaKpi.subtext || folhaTrend) && (
              <span className="flex flex-wrap gap-x-3">
                {folhaKpi.subtext && <span>{folhaKpi.subtext}</span>}
                {folhaTrend && (
                  <span
                    className={`font-semibold ${folhaTrend.isPositive ? "text-ok-text" : "text-danger-text"}`}
                  >
                    {folhaTrend.value}
                  </span>
                )}
              </span>
            )}
            <span className="block">{notaFonteLrf}</span>
            {rgf ? (
              <span className="block">
                Fonte:{" "}
                <a
                  href={FONTES_OFICIAIS.siconfi.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {FONTES_OFICIAIS.siconfi.nome} (Tesouro Nacional)
                </a>
                , Relatório de Gestão Fiscal. Os números de &ldquo;Ver
                detalhes&rdquo; vêm do mesmo relatório.
              </span>
            ) : null}
          </p>
          {rgf ? (
            <details className="group" data-testid="pessoal-lrf-detalhes">
              <summary className="flex min-h-11 cursor-pointer select-none items-center gap-1 font-medium text-mute2 text-xs hover:text-ink">
                Ver detalhes
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <dl className="grid gap-4 pt-2 sm:grid-cols-2">
                <div>
                  <dt className="eyebrow">
                    Gasto com pessoal em 12 meses ({periodoRgfRotulo})
                  </dt>
                  <dd>{fmtCompact(rgf.despesaPessoal12Meses)}</dd>
                </div>
                <div>
                  <dt className="eyebrow">
                    Receita-base do limite (receita corrente líquida ajustada)
                  </dt>
                  <dd>{fmtCompact(rgf.receitaCorrenteLiquidaAjustada)}</dd>
                </div>
              </dl>
            </details>
          ) : null}
        </section>
        <section
          className="panel panel-top space-y-2 self-start"
          data-testid="pessoal-destaque"
        >
          <p className="eyebrow">Total pago em folha em {selectedYear}</p>
          <p className="stat-value">{fmtCompact(currentYearRow.totalFolha)}</p>
          <p className="caption flex flex-wrap gap-x-3">
            <span>
              {isCurrentYear
                ? `Soma dos proventos brutos da folha de pagamento da Prefeitura no período (${partialPeriod || "até agora"}).`
                : "Soma dos proventos brutos da folha de pagamento da Prefeitura no ano."}
            </span>
            {!isCurrentYear && totalFolhaTrend && (
              <span>{totalFolhaTrend.value}</span>
            )}
          </p>
          {rgf ? (
            <p className="caption">
              Serve para acompanhar o que sai a cada mês. O limite da lei usa
              outra conta (12 meses, com encargos do empregador), por isso o
              valor é diferente.{" "}
              <a
                href="https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art18"
                target="_blank"
                rel="noopener noreferrer"
              >
                Lei de Responsabilidade Fiscal, art. 18
                <ExternalLink className="ml-1 inline h-3 w-3 shrink-0" />
              </a>
            </p>
          ) : null}
        </section>
      </div>

      <IndicatorPanel>
        <Indicator
          label="Chefias ocupadas por concursados"
          value={pctChefias !== null ? fmtPercent(pctChefias) : "N/D"}
          note="das funções de chefia do município são de servidores concursados"
          trend={chefiasTrend}
        />
        <Indicator
          label="Total de servidores"
          value={fmtNumber(totalServidores)}
          note="no quadro de pessoal, por regime jurídico"
          trend={servidoresTrend}
        />
      </IndicatorPanel>
      {folhaTrend || chefiasTrend ? (
        <p className="caption">
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
