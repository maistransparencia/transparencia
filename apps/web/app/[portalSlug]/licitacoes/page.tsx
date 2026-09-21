import { cn, fmtCurrency, fmtPercent, KPICard } from "@transparencia/ui";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { ContratosServicosVigentesSection } from "@/components/contratos-servicos-vigentes-section";
import { KPIGrid } from "@/components/kpi-grid";
import { LicitacoesEmAndamentoSection } from "@/components/licitacoes-em-andamento-section";
import { LicitacoesSearchBar } from "@/components/licitacoes-search-bar";
import { LicitacoesTable } from "@/components/licitacoes-table";
import { createPortalMetadata } from "@/lib/metadata";
import { loadLicitacoesData } from "./loader";
import { buildLicitacoesViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface LicitacoesPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ ano?: string; entidades?: string }>;
}

export async function generateMetadata({
  params,
}: LicitacoesPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Licitações", portalSlug, {
    description:
      "Consulta e transparência dos processos licitatórios, contratos públicos e modalidades de contratação municipal.",
    path: "/licitacoes",
    keywords: [
      "licitações municipais",
      "contratos públicos",
      "pregão eletrônico",
      "concorrência",
      "dispensa de licitação",
      "inexigibilidade",
      "compras públicas",
    ],
  });
}

export default async function LicitacoesPage({
  params,
  searchParams,
}: LicitacoesPageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const rawData = await loadLicitacoesData(portalSlug, resolvedSearchParams);
  const viewModel = buildLicitacoesViewModel(rawData);

  const {
    selectedYear,
    isCurrentYear,
    partialPeriod,
    gaps,
    adesao,
    adesaoExterna,
    acimaLimiteGaps,
    limiteDispensaComprasServicos,
    fracionamentoVendorsMap,
    numCasosFracionamento,
    contratosServicosVigentes,
    licitacoesEmAndamento,
    itensByLicitacao,
    alertaDispensa,
    taxaContratacaoDireta,
    hasAnomaliaDispensa,
    isFilteredByEntidade,
  } = viewModel;

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Subtitle */}
      <div>
        <span className="inline-block font-semibold text-accent text-xs uppercase tracking-wider">
          ADMINISTRATIVO · EXERCÍCIO {selectedYear}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </span>
        <h1 className="font-bold font-serif text-3xl text-slate-900">
          Licitações e Contratos
        </h1>
        <p className="mt-2 max-w-4xl text-slate-600 text-xs leading-relaxed sm:text-sm">
          Contratos sem licitação são comuns e frequentemente legais — dispensas
          de baixo valor e inexigibilidades são permitidas por lei. O ponto de
          atenção são os contratos{" "}
          <strong className="font-semibold text-slate-900">
            acima de {fmtCurrency(limiteDispensaComprasServicos)} sem licitação
          </strong>
          , que exigem justificativa formal.
        </p>

        {/* Global Spotlight Search Bar */}
        <div className="mt-5 max-w-2xl">
          <LicitacoesSearchBar portalSlug={portalSlug} ano={selectedYear} />
        </div>
      </div>

      <KPIGrid columns={5}>
        <KPICard
          title="Taxa de Contratação Direta"
          value={fmtPercent(taxaContratacaoDireta)}
          accent
        />
        <KPICard
          title="Acima do limite s/ licitação"
          value={
            <span
              className={cn(acimaLimiteGaps.length > 0 && "text-amber-600")}
            >
              {acimaLimiteGaps.length}
            </span>
          }
          alert={acimaLimiteGaps.length > 0}
          accent={false}
        />
        <KPICard title="Sem processo licitatório" value={gaps.length} />
        <KPICard title="Adesões de ata (carona)" value={adesao.quantidade} />
        <KPICard
          title="Empenhos via ata externa"
          value={adesaoExterna.quantidade}
        />
      </KPIGrid>

      {/* Warning Alert Banner - Concentração de Dispensas */}
      {hasAnomaliaDispensa && (
        <div className="flex items-start gap-3 rounded-xl border-amber-500 border-l-4 bg-[#fffaf0] p-4 text-[#7b341e] text-xs shadow-2xs sm:text-sm">
          <div>
            <span className="font-bold text-[#9c4221]">
              Alerta de Concentração de Contratações Diretas:
            </span>{" "}
            {(() => {
              if (isFilteredByEntidade) {
                return (
                  <>
                    Nas entidades selecionadas em {selectedYear},{" "}
                    {fmtPercent(taxaContratacaoDireta)} do volume apurado de
                    compras públicas foi contratado diretamente por dispensa,
                    inexigibilidade ou adesão a ata
                    {alertaDispensa?.valorEsperado != null
                      ? ` (referência histórica municipal: ${fmtPercent(alertaDispensa.valorEsperado)})`
                      : ""}
                    .
                  </>
                );
              }
              return (
                <>
                  No consolidado municipal de {selectedYear}, embora as
                  contratações diretas representem{" "}
                  <strong>{fmtPercent(taxaContratacaoDireta)}</strong> do volume
                  financeiro apurado (card acima),{" "}
                  {alertaDispensa?.valorObservado != null ? (
                    <>
                      <strong>
                        {fmtPercent(alertaDispensa.valorObservado)}
                      </strong>{" "}
                      dos processos de compras públicas foram realizados
                      diretamente
                    </>
                  ) : (
                    "foram realizadas diretamente"
                  )}{" "}
                  por dispensa, inexigibilidade ou adesão a ata
                  {alertaDispensa?.valorEsperado != null
                    ? ` (média histórica de referência: ${fmtPercent(alertaDispensa.valorEsperado)} dos processos)`
                    : ""}
                  .
                </>
              );
            })()} Embora legais em hipóteses específicas, compras sem
            concorrência aberta exigem justificativa formal e estrita
            conformidade com a Lei Federal nº 14.133/2021:{" "}
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art74"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Art. 74 da Lei Federal nº 14.133/2021 (Inexigibilidade)"
              className="inline-flex items-center gap-0.5 font-semibold underline hover:text-[#9c4221]"
            >
              Art. 74 (Inexigibilidade)
              <ExternalLink
                className="ml-0.5 inline h-3 w-3"
                aria-hidden="true"
              />
            </a>
            {", "}
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art75"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Art. 75 da Lei Federal nº 14.133/2021 (Dispensa)"
              className="inline-flex items-center gap-0.5 font-semibold underline hover:text-[#9c4221]"
            >
              Art. 75 da Lei Federal nº 14.133/2021 (Dispensa)
              <ExternalLink
                className="ml-0.5 inline h-3 w-3"
                aria-hidden="true"
              />
            </a>
            {" e "}
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art86"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Art. 86 da Lei Federal nº 14.133/2021 (Adesão a Ata)"
              className="inline-flex items-center gap-0.5 font-semibold underline hover:text-[#9c4221]"
            >
              Art. 86 (Adesão a Ata)
              <ExternalLink
                className="ml-0.5 inline h-3 w-3"
                aria-hidden="true"
              />
            </a>
            .
          </div>
        </div>
      )}

      {/* Warning Alert Banner - Fracionamento */}
      {numCasosFracionamento > 0 && (
        <div className="flex items-start gap-3 rounded-xl border-amber-500 border-l-4 bg-[#fffaf0] p-4 text-[#7b341e] text-xs shadow-2xs sm:text-sm">
          <span className="mt-0.5 shrink-0 text-base">⚠️</span>
          <div>
            <span className="font-bold text-[#9c4221]">
              {numCasosFracionamento}{" "}
              {numCasosFracionamento === 1 ? "caso" : "casos"} de possível
              fracionamento.
            </span>{" "}
            Fornecedores com 3+ contratos próximos ao limite de dispensa no
            mesmo órgão, sugerindo divisão artificial de compras para evitar
            licitação.
          </div>
        </div>
      )}

      {/* Section: Licitações Abertas e em Andamento */}
      <LicitacoesEmAndamentoSection
        licitacoes={licitacoesEmAndamento}
        itensByLicitacao={itensByLicitacao}
      />

      {/* Section: Contratos de Serviços Vigentes */}
      <ContratosServicosVigentesSection contratos={contratosServicosVigentes} />

      {/* Section 2: Contratos acima do limite, sem licitação */}
      <section className="space-y-4">
        <div className="border-ink border-t-2 pt-8">
          <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
            <h2 className="font-bold font-serif text-slate-900 text-xl">
              Contratos acima do limite, sem licitação
            </h2>
            <span className="font-medium text-slate-400 text-xs">
              {acimaLimiteGaps.length} contratos · exige justificativa formal
            </span>
          </div>

          <p className="mb-4 text-slate-600 text-xs leading-relaxed sm:text-sm">
            Cada linha merece análise da justificativa oficial. Quando o mesmo
            fornecedor aparece várias vezes com valores próximos ao teto de{" "}
            {fmtCurrency(limiteDispensaComprasServicos)}, pode indicar{" "}
            <strong className="font-semibold text-slate-900">
              fracionamento
            </strong>
            .
          </p>
        </div>

        <LicitacoesTable
          data={acimaLimiteGaps}
          fracionamentoVendors={fracionamentoVendorsMap}
        />
      </section>
    </div>
  );
}
