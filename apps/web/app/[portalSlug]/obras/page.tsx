import type { Metadata } from "next";
import { ObrasHeroSection } from "@/components/obras/obras-hero-section";
import { ObrasInteractiveSection } from "@/components/obras/obras-interactive-section";
import { ObrasParalisadasSection } from "@/components/obras/obras-paralisadas-section";
import { createPortalMetadata } from "@/lib/metadata";
import { loadObrasData } from "./loader";
import { buildObrasViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface ObrasPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<{ ano?: string; status?: string; busca?: string }>;
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

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Narrative & KPIs no padrão de temas */}
      <ObrasHeroSection
        ano={viewModel.selectedYear}
        isCurrentYear={viewModel.isCurrentYear}
        partialPeriod={viewModel.partialPeriod}
        municipioNome={viewModel.municipioNome}
        kpis={viewModel.kpis}
      />

      {/* Seção Interativa: Onde estão as obras (Filtros, Lista e Mapa Leaflet Lado a Lado) */}
      <ObrasInteractiveSection viewModel={viewModel} />

      {/* Seção Dedicada de Obras Paralisadas (se houver) */}
      <ObrasParalisadasSection obras={viewModel.paralisadasObras} />
    </div>
  );
}
