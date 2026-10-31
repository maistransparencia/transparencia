import {
  type EducacaoContratoDTO,
  type EducacaoExecucaoAnualDTO,
  type EducacaoMediasEstaduais,
  type EducacaoMetricDTO,
  type EducacaoOrigemRecursosDTO,
  type EducacaoRankingEstadualDTO,
  type EmendasEducacaoStatsDTO,
  type EtapaEnsino,
  type FornecedorExecucaoItemDTO,
  getEducacaoContratos,
  getEducacaoEmendasMetrics,
  getEducacaoExecucaoAnual,
  getEducacaoMediasEstaduais,
  getEducacaoMetrics,
  getEducacaoOrigemRecursos,
  getEducacaoRankingEstadual,
  getPortalConfig,
  getResumoEducacao,
  getTopFornecedoresEducacaoMetrics,
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
  origemRecursos: EducacaoOrigemRecursosDTO | null;
  execucaoAnual: EducacaoExecucaoAnualDTO[];
  topFornecedores: FornecedorExecucaoItemDTO[];
  rankingAnosIniciais: EducacaoRankingEstadualDTO | null;
  rankingAnosFinais: EducacaoRankingEstadualDTO | null;
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
    origemRecursos,
    execucaoAnual,
    topFornecedores,
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
    getEducacaoOrigemRecursos({
      portalSlug: tenantSlug,
      ano: targetAno ?? new Date().getFullYear(),
    }),
    getEducacaoExecucaoAnual(tenantSlug),
    getTopFornecedoresEducacaoMetrics({
      portalSlug: tenantSlug,
      year: targetAno ?? new Date().getFullYear(),
      limit: 5,
    }),
  ]);

  const [rankingAnosIniciais, rankingAnosFinais] = await Promise.all(
    (["anosIniciais", "anosFinais"] as const).map((etapaEnsino) =>
      getEducacaoRankingEstadual(tenantSlug, {
        ano: resumo?.[etapaEnsino]?.ano,
        etapaEnsino,
      }),
    ),
  );

  return {
    portalSlug: tenantSlug,
    portalConfig,
    allMetrics,
    resumo,
    contratos,
    mediasEstaduais,
    emendas,
    origemRecursos,
    execucaoAnual,
    topFornecedores,
    rankingAnosIniciais,
    rankingAnosFinais,
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
