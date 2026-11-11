import type { Metadata } from "next";
import { AberturaHome } from "@/components/abertura-home";
import { DinheiroPublicoSection } from "@/components/dinheiro-publico-section";
import { DinheiroQueEntraSection } from "@/components/dinheiro-que-entra-section";
import { MaisDetalhesSection } from "@/components/mais-detalhes-section";
import { SituacaoCidadeSection } from "@/components/situacao-cidade-section";
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
    <div className="space-y-12 bg-page md:space-y-16">
      {/* A abertura fica colada à primeira seção (32px), que é a resposta à pergunta do título. */}
      <div className="space-y-8">
        <AberturaHome
          title={viewModel.openingTitle}
          periodLabel={viewModel.periodLabel}
        />

        <SituacaoCidadeSection
          situacao={viewModel.situacaoHome}
          ano={viewModel.selectedYear}
          farmaciaStatus={viewModel.farmaciaStatus}
          minimoSaude={viewModel.minimoSaude}
          resumoObras={viewModel.resumoObras}
          educacaoResumo={viewModel.educacaoResumo}
          minimoEducacao={viewModel.minimoEducacao}
          saudeDetailUrl={viewModel.saudeDetailUrl}
          obrasDetailUrl={viewModel.obrasDetailUrl}
          educacaoDetailUrl={viewModel.educacaoDetailUrl}
          farmaciaDetailUrl={viewModel.farmaciaDetailUrl}
          farmaciaRequerimento={viewModel.farmaciaRequerimento}
          farmaciaTextoWhatsApp={viewModel.farmaciaTextoWhatsApp}
          farmaciaExemplos={viewModel.farmaciaExemplos}
          obrasMarkers={viewModel.obrasMiniMapMarkers}
          obrasCenter={viewModel.obrasMapCenter}
        />
      </div>

      {viewModel.decimoTerceiroHome ? (
        <DinheiroQueEntraSection {...viewModel.decimoTerceiroHome} />
      ) : null}

      <DinheiroPublicoSection
        arrecadadoTitle={viewModel.arrecadadoTitle}
        totalArrecadado={viewModel.totalArrecadado}
        previstoTotal={viewModel.previstoTotal}
        percentualPrevisto={viewModel.realizationPercent}
        posicaoFinanceira={viewModel.posicaoFinanceira}
        ano={viewModel.selectedYear}
        orcamentoDetailUrl={viewModel.orcamentoDetailUrl}
        hasEntityFilter={viewModel.hasEntityFilter}
      />

      <MaisDetalhesSection shortcuts={viewModel.detailShortcuts} />
    </div>
  );
}
