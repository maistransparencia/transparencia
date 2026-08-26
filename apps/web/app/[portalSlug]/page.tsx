import type { Metadata } from "next";
import { CardsSecundariosVisaoGeral } from "@/components/cards-secundarios-visao-geral";
import { HeroFiscalCard } from "@/components/hero-fiscal-card";
import { PipelineExecucao } from "@/components/pipeline-execucao";
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

  return (
    <div className="space-y-9">
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

      <PipelineExecucao
        stages={viewModel.pipelineStages}
        detailUrl={viewModel.orcamentoDetailUrl}
      />

      <CardsSecundariosVisaoGeral
        despesas={viewModel.despesasCardData}
        licitacoes={viewModel.licitacoesCardData}
        pessoal={viewModel.pessoalCardData}
      />
    </div>
  );
}
