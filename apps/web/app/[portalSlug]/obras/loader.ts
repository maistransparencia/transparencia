import {
  getObrasPorPortal,
  getPortalConfig,
  getResumoObrasPorPortal,
  type SituacaoObraFiltro,
} from "@transparencia/db";
import { createCachedDataLoader } from "@/lib/cache";

export interface ObrasSearchParams {
  status?: string;
  busca?: string;
}

export function parseObrasSearchParams(params: ObrasSearchParams): {
  status: SituacaoObraFiltro;
  busca?: string;
} {
  const rawStatus = (params.status ?? "").toLowerCase().trim();
  const validStatuses: SituacaoObraFiltro[] = [
    "todas",
    "em_execucao",
    "paralisada",
    "concluida",
    "cadastrada",
    "cancelada",
  ];
  const status: SituacaoObraFiltro = validStatuses.includes(
    rawStatus as SituacaoObraFiltro,
  )
    ? (rawStatus as SituacaoObraFiltro)
    : "todas";

  const rawBusca = (params.busca ?? "").trim();
  const busca = rawBusca.length >= 2 ? rawBusca : undefined;

  return { status, busca };
}

export function requirePortalSlug(portalSlug: string): string {
  const normalized = portalSlug.trim();
  if (!normalized) {
    throw new Error("portalSlug vazio: o tenant deve ser informado.");
  }
  return normalized;
}

export async function fetchRawObrasData(
  portalSlug: string,
  searchParams: ObrasSearchParams = {},
) {
  const tenantSlug = requirePortalSlug(portalSlug);
  const filtros = parseObrasSearchParams(searchParams);

  const [portalConfig, resumo, obras] = await Promise.all([
    getPortalConfig(tenantSlug),
    getResumoObrasPorPortal(tenantSlug),
    getObrasPorPortal(tenantSlug),
  ]);

  return {
    portalSlug: tenantSlug,
    portalConfig,
    filtros,
    resumo,
    obras,
  };
}

export type RawObrasData = Awaited<ReturnType<typeof fetchRawObrasData>>;

export const loadObrasData = createCachedDataLoader(fetchRawObrasData, "obras");
