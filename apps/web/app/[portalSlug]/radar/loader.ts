import {
  getEntidades,
  getPortalConfig,
  getRadarCivicoAlertas,
} from "@transparencia/db";
import { createCachedDataLoader } from "@/lib/cache";

export interface RadarSearchParams {
  entidades?: string;
}

export function requirePortalSlug(portalSlug: string): string {
  const normalized = portalSlug.trim();
  if (!normalized) {
    throw new Error("portalSlug vazio: o tenant deve ser informado.");
  }
  return normalized;
}

async function fetchRawRadarCoreData(portalSlug: string) {
  const tenantSlug = requirePortalSlug(portalSlug);
  const [portalConfig, entidades, alertas] = await Promise.all([
    getPortalConfig(tenantSlug),
    getEntidades(tenantSlug),
    getRadarCivicoAlertas(tenantSlug),
  ]);

  return {
    portalSlug: tenantSlug,
    portalConfig,
    entidades,
    alertas,
  };
}

const loadCachedRadarCoreData = createCachedDataLoader(
  fetchRawRadarCoreData,
  "radar",
);

export async function loadRadarData(
  portalSlug: string,
  searchParams: RadarSearchParams = {},
) {
  const tenantSlug = requirePortalSlug(portalSlug);
  const core = await loadCachedRadarCoreData(tenantSlug);

  return {
    ...core,
    entidade: searchParams.entidades,
  };
}

export async function fetchRawRadarData(
  portalSlug: string,
  searchParams: RadarSearchParams = {},
) {
  const tenantSlug = requirePortalSlug(portalSlug);
  const core = await fetchRawRadarCoreData(tenantSlug);

  return {
    ...core,
    entidade: searchParams.entidades,
  };
}

export type RawRadarData = Awaited<ReturnType<typeof loadRadarData>>;
