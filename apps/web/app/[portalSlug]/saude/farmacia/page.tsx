import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import { FarmaciaBuscaForm } from "@/components/farmacia/farmacia-busca-form";
import { FarmaciaResultados } from "@/components/farmacia/farmacia-resultados";
import { FarmaciaSeloTransparencia } from "@/components/farmacia/farmacia-selo-transparencia";
import { FarmaciaSentinelas } from "@/components/farmacia/farmacia-sentinelas";
import { FarmaciaSusSentinelaBanner } from "@/components/farmacia/farmacia-sus-sentinela-banner";
import { createPortalMetadata } from "@/lib/metadata";
import { type FarmaciaSearchParams, loadFarmaciaData } from "./loader";
import {
  buildFarmaciaViewModel,
  LEI_FARMACIA_SUS_URL,
  LEI_ORGANICA_SAUDE_URL,
} from "./view-model";

export const dynamic = "force-dynamic";

interface FarmaciaPageProps {
  params: Promise<{ portalSlug: string }>;
  searchParams: Promise<FarmaciaSearchParams>;
}

export async function generateMetadata({
  params,
}: FarmaciaPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Farmácia SUS", portalSlug, {
    description:
      "Consulte em qual unidade de saúde há o remédio que você procura e acompanhe a divulgação do estoque de medicamentos prevista na Lei 14.654/2023.",
    path: "/saude/farmacia",
    keywords: [
      "farmácia SUS",
      "estoque de medicamentos",
      "remédios no posto de saúde",
      "Lei 14.654/2023",
    ],
  });
}

export default async function FarmaciaPage({
  params,
  searchParams,
}: FarmaciaPageProps) {
  const { portalSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const rawData = await loadFarmaciaData(portalSlug, resolvedSearchParams);
  const viewModel = buildFarmaciaViewModel(rawData);
  const formAction = `/${viewModel.portalSlug}/saude/farmacia`;

  return (
    <div className="space-y-8 pb-12">
      <header className="space-y-3">
        <h1 className="font-bold font-serif text-3xl text-ink">Farmácia SUS</h1>
        {viewModel.status === "conforme" && (
          <FarmaciaSeloTransparencia
            dataAtualizacao={viewModel.dataAtualizacao}
          />
        )}
      </header>

      {viewModel.status === "indisponivel" && (
        <div className="flex flex-col items-center rounded-xl border border-[#e7e9ee] border-dashed bg-slate-50/50 p-6 text-center">
          <AlertCircle
            className="mb-2 h-6 w-6 text-subtleText/60"
            aria-hidden="true"
          />
          <p className="font-medium text-ink text-sm">
            As informações sobre o estoque de medicamentos não estão disponíveis
            no momento.
          </p>
        </div>
      )}

      {viewModel.status === "apagao" && (
        <FarmaciaSusSentinelaBanner
          leiUrl={LEI_FARMACIA_SUS_URL}
          leiOrganicaUrl={LEI_ORGANICA_SAUDE_URL}
          diasDesdePosicaoMaisRecente={viewModel.diasDesdePosicaoMaisRecente}
          requerimento={viewModel.requerimento}
          textoWhatsApp={viewModel.textoWhatsApp}
        />
      )}

      {viewModel.status === "conforme" && (
        <section className="space-y-4" aria-label="Busca de medicamentos">
          <FarmaciaBuscaForm
            action={formAction}
            defaultValue={viewModel.busca}
          />
          {viewModel.hasBuscaCurta && (
            <p className="text-subtleText text-xs">
              Digite pelo menos 2 letras para buscar.
            </p>
          )}
          {viewModel.hasBusca && (
            <FarmaciaResultados
              busca={viewModel.busca}
              unidades={viewModel.unidades}
              mapMarkers={viewModel.mapMarkers}
              hasMaisUnidades={viewModel.hasMaisUnidades}
              maisUnidadesHref={viewModel.maisUnidadesHref}
              unidadeFiltrada={viewModel.idUnidadeFiltrada != null}
              limparFiltroUnidadeHref={viewModel.limparFiltroUnidadeHref}
            />
          )}
        </section>
      )}

      {viewModel.status === "conforme" && (
        <FarmaciaSentinelas
          grupos={viewModel.gruposSentinelas}
          totalUnidadesAtivas={viewModel.totalUnidadesAtivas}
        />
      )}
    </div>
  );
}
