import {
  getEntidades,
  getPortalConfig,
  getRadarCivicoAlertas,
} from "@transparencia/db";

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

export async function loadRadarData(
  portalSlug: string,
  searchParams: RadarSearchParams = {},
) {
  const tenantSlug = requirePortalSlug(portalSlug);
  const [portalConfig, entidades, alertas] = await Promise.all([
    getPortalConfig(tenantSlug),
    getEntidades(tenantSlug),
    getRadarCivicoAlertas(tenantSlug, {
      entidade: searchParams.entidades,
    }),
  ]);

  return {
    portalSlug: tenantSlug,
    portalConfig,
    entidades,
    alertas,
  };
}
