import { getFarmaciaSus, getPortalConfig } from "@transparencia/db";
import { createCachedDataLoader } from "@/lib/cache";

export interface FarmaciaSearchParams {
  q?: string | string[];
  unidade?: string | string[];
  limite?: string | string[];
}

const FARMACIA_BUSCA_MAXIMO_CARACTERES = 80;

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export const FARMACIA_UNIDADES_POR_PAGINA = 10;
export const FARMACIA_LIMITE_MAXIMO_UNIDADES = 200;

export interface FarmaciaContext {
  busca: string;
  idUnidade: string | null;
  limiteUnidades: number;
}

export function parseFarmaciaContext(
  searchParams: FarmaciaSearchParams,
): FarmaciaContext {
  const limiteBruto = firstValue(searchParams.limite).trim();
  const parsedLimite = /^\d+$/.test(limiteBruto)
    ? Number(limiteBruto)
    : Number.NaN;
  const limiteUnidades =
    Number.isInteger(parsedLimite) && parsedLimite >= 1
      ? Math.min(parsedLimite, FARMACIA_LIMITE_MAXIMO_UNIDADES)
      : FARMACIA_UNIDADES_POR_PAGINA;

  return {
    busca: firstValue(searchParams.q)
      .trim()
      .slice(0, FARMACIA_BUSCA_MAXIMO_CARACTERES),
    idUnidade: firstValue(searchParams.unidade).trim() || null,
    limiteUnidades,
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
      idUnidade: context.idUnidade ?? undefined,
      limiteUnidades: context.limiteUnidades,
    }),
    getPortalConfig(tenantSlug),
  ]);

  return {
    portalSlug: tenantSlug,
    portalName: portalConfig?.displayName ?? "",
    context,
    farmacia,
  };
}

export const loadFarmaciaData = createCachedDataLoader(
  fetchRawFarmaciaData,
  "farmacia-sus",
  3600,
);
