import {
  type FrescorFonteDTO,
  getFontesEmendas,
  getPortalConfig,
} from "@transparencia/db";
import { createCachedDataLoader } from "@/lib/cache";
import { loadSourceFreshness } from "@/lib/frescor-fontes";

export interface ComoAtualizamosRawData {
  portalSlug: string;
  frescorFontes: FrescorFonteDTO[];
  /** Nome e página oficial da Prefeitura do portal (fonte dos dados municipais). */
  portalUrl: string | null;
  portalNome: string | null;
  /** Órgão e página oficial do Estado que publica as emendas estaduais do portal. */
  fonteEmendasEstaduais: { nome: string; url: string } | null;
}

async function loadStateAmendmentsSource(portalSlug: string) {
  try {
    const fontes = await getFontesEmendas(
      portalSlug,
      new Date().getUTCFullYear(),
    );
    const estadual = fontes.find((fonte) => fonte.esfera === "estadual");
    return estadual ? { nome: estadual.orgao, url: estadual.url } : null;
  } catch {
    return null;
  }
}

async function fetchRawComoAtualizamosData(
  portalSlug: string,
): Promise<ComoAtualizamosRawData> {
  const tenantSlug = portalSlug.trim();
  if (!tenantSlug) {
    throw new Error("portalSlug vazio: o tenant deve ser informado.");
  }
  const [frescorFontes, portalConfig, fonteEmendasEstaduais] =
    await Promise.all([
      loadSourceFreshness(tenantSlug),
      getPortalConfig(tenantSlug).catch(() => null),
      loadStateAmendmentsSource(tenantSlug),
    ]);
  return {
    portalSlug: tenantSlug,
    frescorFontes,
    portalUrl: portalConfig?.portalUrl || null,
    portalNome: portalConfig?.displayName || null,
    fonteEmendasEstaduais,
  };
}

const UMA_HORA_EM_SEGUNDOS = 3600;

export const loadComoAtualizamosData = createCachedDataLoader(
  fetchRawComoAtualizamosData,
  "como-atualizamos",
  UMA_HORA_EM_SEGUNDOS,
);
