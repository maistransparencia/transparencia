import {
  AlertBox,
  fmtCompact,
  fmtCurrency,
  fmtNumber,
  fmtPercent,
  Indicator,
  IndicatorPanel,
} from "@transparencia/ui";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { ContratosServicosVigentesSection } from "@/components/contratos-servicos-vigentes-section";
import { LicitacoesEmAndamentoSection } from "@/components/licitacoes-em-andamento-section";
import { LicitacoesSearchBar } from "@/components/licitacoes-search-bar";
import { LicitacoesTable } from "@/components/licitacoes-table";
import { LicitacoesTempoNaPagina } from "@/components/licitacoes-tempo-na-pagina";
import { PageEyebrow } from "@/components/page-eyebrow";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { createPortalMetadata } from "@/lib/metadata";
import { loadLicitacoesData } from "./loader";
import { buildLicitacoesViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface LicitacoesPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{
    ano?: string;
    entidades?: string;
    q?: string | string[];
  }>;
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
  const termoBruto = Array.isArray(resolvedSearchParams.q)
    ? resolvedSearchParams.q[0]
    : resolvedSearchParams.q;
  const termoInicial = termoBruto?.trim().slice(0, 100) || undefined;
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
    quantidadeLicitacoesAtivas,
    quantidadeContratosVigentes,
    totalEmpenhadoContratosVigentes,
  } = viewModel;

  return (
    <div className="space-y-8 pb-10">
      <LicitacoesTempoNaPagina />
      {/* Header & Subtitle */}
      <div className="space-y-2">
        <PageEyebrow>
          Administrativo · Exercício {selectedYear}
          {isCurrentYear && partialPeriod ? ` (parcial, ${partialPeriod})` : ""}
        </PageEyebrow>
        <h1>Licitações e Contratos</h1>
        <p className="max-w-4xl text-mute2 text-xs leading-relaxed sm:text-sm">
          Contratos sem licitação são comuns e frequentemente legais — dispensas
          de baixo valor e inexigibilidades são permitidas por lei. O ponto de
          atenção são os contratos{" "}
          <strong className="font-semibold text-ink">
            acima de {fmtCurrency(limiteDispensaComprasServicos)} sem licitação
          </strong>
          , que exigem justificativa formal.
        </p>
      </div>

      <LicitacoesSearchBar
        portalSlug={portalSlug}
        ano={selectedYear}
        termoInicial={termoInicial}
      />

      <section className="space-y-6" data-testid="licitacoes-destaque">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2" data-testid="licitacoes-destaque-ativas">
            <p className="eyebrow">
              {isCurrentYear
                ? "Quantas licitações estão ativas agora?"
                : `Quantas licitações estiveram ativas em ${selectedYear}?`}
            </p>
            <p className="stat-value-lg text-brand-text">
              {fmtNumber(quantidadeLicitacoesAtivas)}
            </p>
            <p className="caption">
              {quantidadeLicitacoesAtivas > 0
                ? "licitações ativas, abertas ou em andamento"
                : isCurrentYear
                  ? "nenhuma licitação ativa no momento"
                  : `nenhuma licitação ativa em ${selectedYear}`}
            </p>
          </div>
          <div
            className="space-y-2"
            data-testid="licitacoes-destaque-empenhado"
          >
            <p className="eyebrow">
              {isCurrentYear
                ? "Quanto já foi reservado"
                : "Quanto foi reservado"}{" "}
              para pagar contratos vigentes em {selectedYear}?
            </p>
            {quantidadeContratosVigentes > 0 ? (
              <>
                <p className="stat-value-lg text-brand-text">
                  {fmtCompact(totalEmpenhadoContratosVigentes)}
                </p>
                <p className="caption">
                  reservado (empenhado) em contratos vigentes em {selectedYear}
                </p>
              </>
            ) : (
              <p className="caption">
                sem contratos vigentes em {selectedYear}
              </p>
            )}
          </div>
        </div>

        <IndicatorPanel>
          <Indicator
            label="Taxa de Contratação Direta"
            value={fmtPercent(taxaContratacaoDireta)}
          />
          <Indicator
            label="Acima do limite s/ licitação"
            value={acimaLimiteGaps.length}
            tone={acimaLimiteGaps.length > 0 ? "warn" : "default"}
          />
          <Indicator label="Sem processo licitatório" value={gaps.length} />
          <Indicator
            label="Adesões de ata (carona)"
            value={adesao.quantidade}
          />
          <Indicator
            label="Empenhos via ata externa"
            value={adesaoExterna.quantidade}
          />
        </IndicatorPanel>
      </section>

      {hasAnomaliaDispensa && (
        <div className="space-y-3">
          <AlertBox type="info" title="Muitas compras sem concorrência">
            {isFilteredByEntidade
              ? `Nas entidades selecionadas em ${selectedYear}, boa parte do valor das compras foi contratada diretamente, sem licitação aberta.`
              : `Em ${selectedYear}, uma parte grande das compras da prefeitura foi feita diretamente, sem licitação aberta. Isso é permitido em alguns casos, mas pede conferência.`}
          </AlertBox>
          <details className="group">
            <summary className="flex cursor-pointer select-none items-center gap-2 font-semibold text-ink text-sm">
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-mute2 transition-transform group-open:rotate-180"
              />
              <span>Ver detalhes</span>
            </summary>
            <div className="mt-3 space-y-2 text-ink text-sm leading-relaxed">
              <p>
                {isFilteredByEntidade
                  ? `Nas entidades selecionadas, ${fmtPercent(taxaContratacaoDireta)} do valor apurado foi contratado por dispensa, inexigibilidade ou adesão a ata`
                  : `Contratações diretas somam ${fmtPercent(taxaContratacaoDireta)} do valor apurado em ${selectedYear}${
                      alertaDispensa?.valorObservado != null
                        ? ` e ${fmtPercent(alertaDispensa.valorObservado)} dos processos`
                        : ""
                    }, por dispensa, inexigibilidade ou adesão a ata`}
                {alertaDispensa?.valorEsperado != null
                  ? ` (média histórica de referência: ${fmtPercent(alertaDispensa.valorEsperado)})`
                  : ""}
                .
              </p>
              <p>
                Compras sem concorrência aberta exigem justificativa formal,
                conforme a Lei Federal nº 14.133/2021:{" "}
                <a
                  href={urlLegislacao("lei14133", "art74")}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Art. 74 da Lei Federal nº 14.133/2021 (Inexigibilidade)"
                  className="inline-flex items-center gap-0.5 font-medium text-brand-text underline underline-offset-2 hover:text-ink"
                >
                  Art. 74 (Inexigibilidade)
                  <ExternalLink
                    className="ml-0.5 inline h-3 w-3"
                    aria-hidden="true"
                  />
                </a>
                {", "}
                <a
                  href={urlLegislacao("lei14133", "art75")}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Art. 75 da Lei Federal nº 14.133/2021 (Dispensa)"
                  className="inline-flex items-center gap-0.5 font-medium text-brand-text underline underline-offset-2 hover:text-ink"
                >
                  Art. 75 (Dispensa)
                  <ExternalLink
                    className="ml-0.5 inline h-3 w-3"
                    aria-hidden="true"
                  />
                </a>
                {" e "}
                <a
                  href={urlLegislacao("lei14133", "art86")}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Art. 86 da Lei Federal nº 14.133/2021 (Adesão a Ata)"
                  className="inline-flex items-center gap-0.5 font-medium text-brand-text underline underline-offset-2 hover:text-ink"
                >
                  Art. 86 (Adesão a Ata)
                  <ExternalLink
                    className="ml-0.5 inline h-3 w-3"
                    aria-hidden="true"
                  />
                </a>
                .
              </p>
            </div>
          </details>
        </div>
      )}

      {/* Warning Alert Banner - Fracionamento */}
      {numCasosFracionamento > 0 && (
        <div className="flex items-start gap-3 rounded-md bg-warn-fill/10 p-4 text-ink text-xs sm:text-sm">
          <span className="mt-0.5 shrink-0 text-base">⚠️</span>
          <div>
            <span className="font-bold text-warn-text">
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
        portalSlug={portalSlug}
        ano={selectedYear}
      />

      {/* Section: Contratos de Serviços Vigentes */}
      <ContratosServicosVigentesSection
        contratos={contratosServicosVigentes}
        portalSlug={portalSlug}
        ano={selectedYear}
      />

      {/* Section 2: Contratos acima do limite, sem licitação */}
      <section className="space-y-4">
        <div className="border-ink border-t-2 pt-8">
          <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
            <h2>Contratos acima do limite, sem licitação</h2>
            <span className="font-medium text-mute3 text-xs">
              {acimaLimiteGaps.length} contratos · exige justificativa formal
            </span>
          </div>

          <p className="mb-4 text-mute2 text-xs leading-relaxed sm:text-sm">
            Cada linha merece análise da justificativa oficial. Quando o mesmo
            fornecedor aparece várias vezes com valores próximos ao teto de{" "}
            {fmtCurrency(limiteDispensaComprasServicos)}, pode indicar{" "}
            <strong className="font-semibold text-ink">fracionamento</strong>.
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
