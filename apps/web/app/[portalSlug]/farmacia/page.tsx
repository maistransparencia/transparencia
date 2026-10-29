import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import { FarmaciaCabecalho } from "@/components/farmacia/farmacia-cabecalho";
import { FarmaciaFonteDados } from "@/components/farmacia/farmacia-fonte-dados";
import { FarmaciaIndicadores } from "@/components/farmacia/farmacia-indicadores";
import { FarmaciaIndiceAz } from "@/components/farmacia/farmacia-indice-az";
import { FarmaciaResultados } from "@/components/farmacia/farmacia-resultados";
import { FarmaciaSentinelas } from "@/components/farmacia/farmacia-sentinelas";
import { FarmaciaSusSentinelaBanner } from "@/components/farmacia/farmacia-sus-sentinela-banner";
import { createPortalMetadata } from "@/lib/metadata";
import { type FarmaciaSearchParams, loadFarmaciaData } from "./loader";
import {
  buildFarmaciaViewModel,
  ID_SECAO_INDICE,
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
    path: "/farmacia",
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
  const conforme = viewModel.status === "conforme";

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-9 pb-16 sm:gap-12">
      <div className="space-y-5">
        <FarmaciaCabecalho
          conforme={conforme}
          dataAtualizacao={viewModel.dataAtualizacao}
          action={viewModel.formAction}
          busca={viewModel.busca}
          exemplos={viewModel.exemplos}
        />
        {conforme && viewModel.hasBuscaCurta && (
          <p className="text-subtleText text-xs">
            Digite pelo menos 2 letras para buscar.
          </p>
        )}
        {conforme && (
          <FarmaciaIndicadores indicadores={viewModel.indicadores} />
        )}
      </div>

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

      {conforme && viewModel.indiceAz && (
        <FarmaciaIndiceAz
          indice={viewModel.indiceAz}
          idSecao={ID_SECAO_INDICE}
        />
      )}

      {conforme && viewModel.hasBusca && (
        <FarmaciaResultados
          busca={viewModel.busca}
          resumo={viewModel.resumoBusca}
          unidades={viewModel.unidades}
          remedios={viewModel.remedios}
          semLoteValido={viewModel.medicamentosSemLoteValido}
          marcadores={viewModel.mapMarkers}
        />
      )}

      {conforme && (
        <FarmaciaSentinelas
          essenciais={viewModel.essenciais}
          categorias={viewModel.categoriasEssenciais}
          totalUnidadesAtivas={viewModel.totalUnidadesAtivas}
        />
      )}

      {conforme && (
        <FarmaciaFonteDados
          dataAtualizacao={viewModel.dataAtualizacao}
          leiUrl={LEI_FARMACIA_SUS_URL}
          portalSlug={portalSlug}
        />
      )}
    </div>
  );
}
