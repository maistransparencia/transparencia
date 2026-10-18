import {
  getObrasPorPortal,
  getPortalConfig,
  getResumoObrasPorPortal,
  type SituacaoObraFiltro,
} from "@transparencia/db";
import { createCachedDataLoader } from "@/lib/cache";

export interface ObrasSearchParams {
  ano?: string;
  status?: string;
  busca?: string;
}

export interface ObrasContext {
  selectedYear: number;
  isCurrentYear: boolean;
}

export function parseObrasContext(
  searchParams: ObrasSearchParams,
): ObrasContext {
  const currentYear = new Date().getFullYear();
  const parsed = searchParams.ano ? Number(searchParams.ano) : currentYear;
  const selectedYear =
    Number.isInteger(parsed) && parsed > 1900 ? parsed : currentYear;

  return {
    selectedYear,
    isCurrentYear: selectedYear === currentYear,
  };
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

export async function fetchRawObrasCoreData(
  portalSlug: string,
  selectedYear: number,
) {
  const tenantSlug = requirePortalSlug(portalSlug);

  const [portalConfig, resumo, obras] = await Promise.all([
    getPortalConfig(tenantSlug),
    getResumoObrasPorPortal(tenantSlug, { ano: selectedYear }),
    getObrasPorPortal(tenantSlug, { ano: selectedYear }),
  ]);

  return {
    portalSlug: tenantSlug,
    portalConfig,
    resumo,
    obras,
  };
}

export const loadCachedObrasCoreData = createCachedDataLoader(
  fetchRawObrasCoreData,
  "obras",
);

export async function loadObrasData(
  portalSlug: string,
  searchParams: ObrasSearchParams = {},
) {
  const tenantSlug = requirePortalSlug(portalSlug);
  const context = parseObrasContext(searchParams);
  const filtros = parseObrasSearchParams(searchParams);

  const coreData = await loadCachedObrasCoreData(
    tenantSlug,
    context.selectedYear,
  );

  return {
    ...coreData,
    context,
    filtros,
  };
}

export async function fetchRawObrasData(
  portalSlug: string,
  searchParams: ObrasSearchParams = {},
) {
  const tenantSlug = requirePortalSlug(portalSlug);
  const context = parseObrasContext(searchParams);
  const filtros = parseObrasSearchParams(searchParams);

  const coreData = await fetchRawObrasCoreData(
    tenantSlug,
    context.selectedYear,
  );

  return {
    ...coreData,
    context,
    filtros,
  };
}

export type RawObrasData = Awaited<ReturnType<typeof loadObrasData>>;
