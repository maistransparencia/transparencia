import {
  type EducacaoContratoDTO,
  type EducacaoMediasEstaduais,
  type EducacaoMetricDTO,
  type EmendasEducacaoStatsDTO,
  type EtapaEnsino,
  getEducacaoContratos,
  getEducacaoEmendasMetrics,
  getEducacaoMediasEstaduais,
  getEducacaoMetrics,
  getPortalConfig,
  getResumoEducacao,
  type ResumoEducacaoDTO,
} from "@transparencia/db";
import { createCachedDataLoader } from "@/lib/cache";

export interface EducacaoSearchParams {
  ano?: string;
  etapa?: string;
  contratoNumero?: string;
  busca?: string;
  categoria?: string;
}

export interface EducacaoContext {
  selectedYear: number;
  isCurrentYear: boolean;
  selectedEtapa: EtapaEnsino;
}

export function parseEducacaoContext(
  searchParams: EducacaoSearchParams,
  defaultYear: number,
): EducacaoContext {
  const currentYear = new Date().getFullYear();
  const parsed = searchParams.ano ? Number(searchParams.ano) : defaultYear;
  const selectedYear =
    Number.isInteger(parsed) && parsed > 1900 ? parsed : defaultYear;

  const selectedEtapa: EtapaEnsino = (() => {
    if (searchParams.etapa === "anosFinais") {
      return "anosFinais";
    }
    return "anosIniciais";
  })();

  return {
    selectedYear,
    isCurrentYear: selectedYear === currentYear,
    selectedEtapa,
  };
}

export function requirePortalSlug(portalSlug: string): string {
  const normalized = (portalSlug ?? "").trim();
  if (!normalized) {
    throw new Error("portalSlug vazio: o tenant deve ser informado.");
  }
  return normalized;
}

export interface RawEducacaoData {
  portalSlug: string;
  portalConfig: Awaited<ReturnType<typeof getPortalConfig>>;
  allMetrics: EducacaoMetricDTO[];
  resumo: ResumoEducacaoDTO | null;
  contratos: EducacaoContratoDTO[];
  mediasEstaduais: EducacaoMediasEstaduais;
  emendas: EmendasEducacaoStatsDTO;
}

export async function fetchRawEducacaoCoreData(
  portalSlug: string,
  targetAno?: number,
): Promise<RawEducacaoData> {
  const tenantSlug = requirePortalSlug(portalSlug);

  const [
    portalConfig,
    allMetrics,
    resumo,
    contratos,
    mediasEstaduais,
    emendas,
  ] = await Promise.all([
    getPortalConfig(tenantSlug),
    getEducacaoMetrics(tenantSlug),
    getResumoEducacao(tenantSlug, targetAno),
    getEducacaoContratos(tenantSlug, targetAno),
    getEducacaoMediasEstaduais(tenantSlug),
    getEducacaoEmendasMetrics(
      tenantSlug,
      targetAno ?? new Date().getFullYear(),
    ),
  ]);

  return {
    portalSlug: tenantSlug,
    portalConfig,
    allMetrics,
    resumo,
    contratos,
    mediasEstaduais,
    emendas,
  };
}

export const loadCachedEducacaoCoreData = createCachedDataLoader(
  fetchRawEducacaoCoreData,
  "educacao",
);

export async function loadEducacaoData(
  portalSlug: string,
  searchParams: EducacaoSearchParams = {},
) {
  const tenantSlug = requirePortalSlug(portalSlug);
  const currentYear = new Date().getFullYear();

  const parsedYear = searchParams.ano ? Number(searchParams.ano) : undefined;
  const selectedYear =
    parsedYear !== undefined &&
    Number.isInteger(parsedYear) &&
    parsedYear > 1900
      ? parsedYear
      : currentYear;

  const raw = await loadCachedEducacaoCoreData(tenantSlug, selectedYear);

  const context = parseEducacaoContext(searchParams, selectedYear);

  return {
    ...raw,
    context,
    searchParams,
  };
}
