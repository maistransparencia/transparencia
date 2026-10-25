import {
  getFarmaciaLotesAVencer,
  getFarmaciaSentinelas,
  getFarmaciaSus,
  getPortalConfig,
} from "@transparencia/db";
import { createCachedDataLoader } from "@/lib/cache";

export interface FarmaciaSearchParams {
  q?: string | string[];
}

const FARMACIA_BUSCA_MAXIMO_CARACTERES = 80;
/** A busca traz todas as unidades com o remédio: o mapa e as duas visões dependem do conjunto completo. */
export const FARMACIA_LIMITE_UNIDADES_BUSCA = 200;

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export interface FarmaciaContext {
  busca: string;
}

export function parseFarmaciaContext(
  searchParams: FarmaciaSearchParams,
): FarmaciaContext {
  return {
    busca: firstValue(searchParams.q)
      .trim()
      .slice(0, FARMACIA_BUSCA_MAXIMO_CARACTERES),
  };
}

async function fetchRawFarmaciaData(
  portalSlug: string,
  searchParams: FarmaciaSearchParams,
) {
  const tenantSlug = portalSlug.trim();
  if (!tenantSlug) {
    throw new Error("portalSlug vazio: o tenant deve ser informado.");
  }
  const context = parseFarmaciaContext(searchParams);

  const [farmacia, portalConfig] = await Promise.all([
    getFarmaciaSus(tenantSlug, {
      busca: context.busca,
      limiteUnidades: FARMACIA_LIMITE_UNIDADES_BUSCA,
    }),
    getPortalConfig(tenantSlug),
  ]);

  // Sentinelas só fazem sentido quando há estoque vigente (estado conforme).
  // O bloco é opcional: falha dele não derruba a busca.
  const sentinelasVazias = {
    totalUnidadesAtivas: 0,
    indicadores: {
      totalEssenciais: 0,
      essenciaisNoEstoque: 0,
      essenciaisSomenteCombinacao: 0,
      essenciaisSemRegistro: 0,
    },
    sentinelas: [],
  };
  const sentinelas =
    farmacia.status === "conforme"
      ? await getFarmaciaSentinelas(tenantSlug).catch(() => sentinelasVazias)
      : sentinelasVazias;

  // Lotes a vencer dependem de validade informada; falha da query só omite o card.
  const lotesAVencer =
    farmacia.status === "conforme"
      ? await getFarmaciaLotesAVencer(tenantSlug).catch(() => null)
      : null;

  return {
    portalSlug: tenantSlug,
    portalName: portalConfig?.displayName ?? "",
    context,
    farmacia,
    sentinelas,
    lotesAVencer,
  };
}

export const loadFarmaciaData = createCachedDataLoader(
  fetchRawFarmaciaData,
  "farmacia-sus",
  3600,
);
