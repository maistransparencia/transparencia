import type { Metadata } from "next";
import { CardsSecundariosVisaoGeral } from "@/components/cards-secundarios-visao-geral";
import { EducacaoResumoCard } from "@/components/educacao-resumo-card";
import { FarmaciaResumoCard } from "@/components/farmacia/farmacia-resumo-card";
import { HeroFiscalCard } from "@/components/hero-fiscal-card";
import { ObrasResumoCard } from "@/components/obras-resumo-card";
import { PipelineExecucao } from "@/components/pipeline-execucao";
import { RadarCivicoFeed } from "@/components/radar-civico-feed";
import { SaldoCaixaResumoCard } from "@/components/saldo-caixa-resumo-card";
import { temEducacaoDestaque } from "@/lib/educacao-destaque";
import { createPortalMetadata } from "@/lib/metadata";
import { loadVisaoGeralData } from "./loader";
import { buildVisaoGeralViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface VisaoGeralPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ ano?: string; entidades?: string }>;
}

export async function generateMetadata({
  params,
}: VisaoGeralPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Visão Geral", portalSlug, {
    description:
      "Visão geral da posição fiscal e financeira do município, incluindo arrecadação, despesas e saldo orçamentário.",
    path: "",
    keywords: [
      "posição fiscal",
      "visão geral",
      "contas públicas",
      "execução orçamentária",
    ],
  });
}

export default async function VisaoGeralPage({
  params,
  searchParams,
}: VisaoGeralPageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;

  const rawData = await loadVisaoGeralData(portalSlug, resolvedSearchParams);
  const viewModel = buildVisaoGeralViewModel(rawData);

  const temDestaques =
    viewModel.farmaciaStatus !== "indisponivel" ||
    temEducacaoDestaque(viewModel.educacaoResumo) ||
    Boolean(viewModel.resumoObras);

  return (
    <div className="space-y-16 bg-page md:space-y-[104px]">
      <HeroFiscalCard
        portalName={viewModel.portalName}
        periodText={viewModel.periodText}
        headline={viewModel.heroHeadline}
        summary={viewModel.heroSummary}
        arrecadadoTitle={viewModel.arrecadadoTitle}
        totalArrecadado={viewModel.totalArrecadado}
        previstoTotal={viewModel.previstoTotal}
        realizationPercent={viewModel.realizationPercent}
        originBreakdown={viewModel.originBreakdown}
      />

      {temDestaques && (
        <section
          aria-label="Em destaque"
          className="space-y-16 md:space-y-[104px]"
        >
          <FarmaciaResumoCard
            status={viewModel.farmaciaStatus}
            detailUrl={viewModel.farmaciaDetailUrl}
            requerimento={viewModel.farmaciaRequerimento}
            textoWhatsApp={viewModel.farmaciaTextoWhatsApp}
            exemplos={viewModel.farmaciaExemplos}
          />
          {viewModel.resumoObras && (
            <ObrasResumoCard
              resumo={viewModel.resumoObras}
              detailUrl={viewModel.obrasDetailUrl}
              markers={viewModel.obrasMiniMapMarkers}
              center={viewModel.obrasMapCenter}
            />
          )}
          {temEducacaoDestaque(viewModel.educacaoResumo) && (
            <EducacaoResumoCard
              resumo={viewModel.educacaoResumo}
              detailUrl={viewModel.educacaoDetailUrl}
            />
          )}
        </section>
      )}

      <RadarCivicoFeed
        items={viewModel.radarCivicoFeedData}
        portalName={viewModel.portalName}
        portalSlug={portalSlug}
        ano={viewModel.selectedYear}
      />

      <div className="space-y-8">
        <PipelineExecucao
          stages={viewModel.pipelineStages}
          detailUrl={viewModel.orcamentoDetailUrl}
        />

        <SaldoCaixaResumoCard
          posicaoFinanceira={viewModel.posicaoFinanceira}
          ano={viewModel.selectedYear}
          detailUrl={`${viewModel.orcamentoDetailUrl}#disponibilidade-caixa`}
          hasEntityFilter={viewModel.hasEntityFilter}
        />
      </div>

      <CardsSecundariosVisaoGeral
        despesas={viewModel.despesasCardData}
        licitacoes={viewModel.licitacoesCardData}
        pessoal={viewModel.pessoalCardData}
      />
    </div>
  );
}
