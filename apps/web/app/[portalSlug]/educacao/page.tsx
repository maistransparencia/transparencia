import type { Metadata } from "next";
import { EducacaoContratosSection } from "@/components/educacao/educacao-contratos-section";
import { EducacaoFiscalSection } from "@/components/educacao/educacao-fiscal-section";
import { EducacaoHeroSection } from "@/components/educacao/educacao-hero-section";
import { EducacaoHistoricoSection } from "@/components/educacao/educacao-historico-section";
import { SaudeEmendasSection } from "@/components/saude-emendas-section";
import { createPortalMetadata } from "@/lib/metadata";
import { loadEducacaoData } from "./loader";
import { buildEducacaoViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface EducacaoPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{
    ano?: string;
    etapa?: string;
    contratoNumero?: string;
    busca?: string;
    categoria?: string;
  }>;
}

export async function generateMetadata({
  params,
}: EducacaoPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Educação Básica", portalSlug, {
    description:
      "Acompanhamento cívico do desempenho educacional (IDEB, SAEB e fluxo escolar), despesa liquidada na educação e contratos da educação.",
    path: "/educacao",
    keywords: [
      "educação",
      "IDEB",
      "SAEB",
      "merenda escolar PNAE",
      "transporte escolar PNATE",
    ],
  });
}

export default async function EducacaoPage({
  params,
  searchParams,
}: EducacaoPageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;

  const rawData = await loadEducacaoData(portalSlug, resolvedSearchParams);
  const viewModel = buildEducacaoViewModel(rawData);

  return (
    <div className="space-y-10 pb-16">
      {/* Bloco 1: Hero Narrative com Troféu Cívico do Ciclo 2025 e KPIs */}
      <EducacaoHeroSection
        selectedYear={viewModel.selectedYear}
        trofeuCivico={viewModel.trofeuCivico}
      />

      {/* Bloco 2: Linha do Tempo e Gráfico Histórico do IDEB */}
      <EducacaoHistoricoSection
        historico={viewModel.historico}
        initialEtapa={viewModel.selectedEtapa}
        municipioUf={viewModel.municipioUf}
      />

      {/* Bloco 3: Despesa na Educação vs. IDEB */}
      <EducacaoFiscalSection fiscal={viewModel.fiscal} />

      {/* Bloco 4: Contratos e Compras da Educação (PNAE, PNATE e Manutenção) */}
      <EducacaoContratosSection
        contratos={viewModel.contratos}
        totaisPorCategoria={viewModel.contratosResumo.totaisPorCategoria}
        initialContratoNumero={resolvedSearchParams.contratoNumero}
        portalSlug={viewModel.portalSlug}
        ano={viewModel.selectedYear}
      />

      {/* Bloco 5: Emendas parlamentares destinadas à Educação */}
      {viewModel.emendas.lista.length > 0 && (
        <SaudeEmendasSection
          ano={viewModel.selectedYear}
          emendasStats={viewModel.emendas}
          portalSlug={viewModel.portalSlug}
          titulo="Emendas parlamentares destinadas à Educação"
          descricao="Recursos que deputados e senadores destinaram à educação do município."
        />
      )}
    </div>
  );
}
