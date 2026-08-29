interface MetricasDespesas {
  empenhado: number;
  liquidado: number;
  pago: number;
  taxaLiquidacao: number;
  taxaPagamento: number;
}

import {
  getAnaliseDespesasMetrics,
  getEntidades,
  getOpacidadeContabilMetrics,
  getPosicaoFiscalDetalhesMetrics,
  getRadarGastosSensiveisMetrics,
  getRestosAPagarResumoMetrics,
} from "@transparencia/db";
import { createCachedDataLoader } from "@/lib/cache";

export interface DespesasSearchParams {
  ano?: string;
  entidades?: string;
}

export interface DespesasContext {
  selectedYear: number;
  isCurrentYear: boolean;
  entidadesIds?: string[];
}

export function parseDespesasContext(
  searchParams: DespesasSearchParams,
): DespesasContext {
  const currentYear = new Date().getFullYear();
  const selectedYear = searchParams.ano
    ? Number(searchParams.ano)
    : currentYear;
  const entidadesIds = searchParams.entidades
    ? searchParams.entidades.split(",").filter(Boolean)
    : undefined;

  return {
    selectedYear,
    isCurrentYear: selectedYear === currentYear,
    entidadesIds,
  };
}

function requirePortalSlug(portalSlug: string): string {
  const normalized = portalSlug.trim();
  if (!normalized) {
    throw new Error("portalSlug vazio: o tenant deve ser informado.");
  }
  return normalized;
}

async function resolveEmpresaIds(
  portalSlug: string,
  entidadesIds?: string[],
): Promise<string[]> {
  if (entidadesIds && entidadesIds.length > 0) {
    return entidadesIds;
  }

  const entidades = await getEntidades(portalSlug);
  return entidades.map((entidade) => entidade.id).filter(Boolean);
}

function summarizeAnaliseDespesasMetrics(
  metrics: Awaited<ReturnType<typeof getAnaliseDespesasMetrics>>,
): MetricasDespesas {
  const totais = metrics.reduce(
    (acc, item) => {
      acc.empenhado += item.totalEmpenhado;
      acc.liquidado += item.totalLiquidado;
      acc.pago += item.totalPago;
      return acc;
    },
    { empenhado: 0, liquidado: 0, pago: 0 },
  );

  return {
    empenhado: totais.empenhado,
    liquidado: totais.liquidado,
    pago: totais.pago,
    taxaLiquidacao:
      totais.empenhado > 0 ? (totais.liquidado / totais.empenhado) * 100 : 0,
    taxaPagamento:
      totais.empenhado > 0 ? (totais.pago / totais.empenhado) * 100 : 0,
  };
}

function requireEmpresaIdsForMetrics(
  portalSlug: string,
  empresaIds: string[],
): string[] {
  if (empresaIds.length === 0) {
    throw new Error(
      `Nenhuma entidade encontrada para o portal ${portalSlug}; chamada de métricas abortada.`,
    );
  }
  return empresaIds;
}

async function fetchRawDespesasData(
  portalSlug: string,
  searchParams: DespesasSearchParams,
) {
  const tenantSlug = requirePortalSlug(portalSlug);
  const context = parseDespesasContext(searchParams);
  const { selectedYear, entidadesIds } = context;
  const empresaIds = requireEmpresaIdsForMetrics(
    tenantSlug,
    await resolveEmpresaIds(tenantSlug, entidadesIds),
  );

  const [
    analiseDespesasMetrics,
    radarGastosSensiveis,
    restosResumo,
    posicaoDetalhes,
    opacidadeContabil,
  ] = await Promise.all([
    getAnaliseDespesasMetrics(tenantSlug, selectedYear, empresaIds),
    getRadarGastosSensiveisMetrics(tenantSlug, selectedYear, empresaIds),
    getRestosAPagarResumoMetrics(tenantSlug, selectedYear, empresaIds),
    getPosicaoFiscalDetalhesMetrics(tenantSlug, selectedYear, empresaIds),
    getOpacidadeContabilMetrics(tenantSlug, selectedYear),
  ]);

  const metricasGerais = summarizeAnaliseDespesasMetrics(
    analiseDespesasMetrics,
  );

  const restosAnoAtual = posicaoDetalhes.restosPendentes.find(
    (r) => r.ano === selectedYear,
  );
  const liquidadoPendenteAnoAtual = restosAnoAtual
    ? Math.max(0, (restosAnoAtual.liquidado || 0) - (restosAnoAtual.pago || 0))
    : 0;

  const restosResumoEnriquecido = {
    ...restosResumo,
    totalPendente: posicaoDetalhes.restosPendentesTotal,
    totalLiquidadoPendente: liquidadoPendenteAnoAtual,
    fornecedoresAguardando:
      posicaoDetalhes.totalCredoresAdmAtual ??
      restosResumo.fornecedoresAguardando,
  };

  return {
    context,
    metricasGerais,
    radarGastosSensiveis,
    restosResumo: restosResumoEnriquecido,
    opacidadeContabil,
  };
}

export const loadDespesasData = createCachedDataLoader(
  fetchRawDespesasData,
  "despesas-v6",
);
