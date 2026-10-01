import {
  getHistoriaPrevidenciaMetrics,
  getPortalConfig,
  getPrevidenciaActuarialTrendMetrics,
  getPrevidenciaCadprevMetrics,
  getPrevidenciaEntidadesMetrics,
  getPrevidenciaNaturezaMetrics,
  getSiconfiPosicaoFinanceira,
} from "@transparencia/db";
import { createCachedDataLoader } from "@/lib/cache";

export interface PrevidenciaSearchParams {
  ano?: string;
  empresa?: string;
}

export interface PrevidenciaContext {
  selectedYear: number;
  isCurrentYear: boolean;
}

export function parsePrevidenciaContext(
  searchParams?: PrevidenciaSearchParams,
): PrevidenciaContext {
  const currentYear = new Date().getFullYear();
  const parsed = searchParams?.ano ? Number(searchParams.ano) : currentYear;
  const selectedYear =
    Number.isInteger(parsed) && parsed > 1900 ? parsed : currentYear;

  return {
    selectedYear,
    isCurrentYear: selectedYear === currentYear,
  };
}

function requirePortalSlug(portalSlug: string): string {
  const normalized = portalSlug.trim();
  if (!normalized) {
    throw new Error("portalSlug vazio: o tenant deve ser informado.");
  }
  if (normalized === "porciuncula") {
    return "porciuncula_prefeitura";
  }
  return normalized;
}

async function fetchRawPrevidenciaData(
  portalSlug: string,
  searchParams: PrevidenciaSearchParams,
) {
  const tenantSlug = requirePortalSlug(portalSlug);
  const context = parsePrevidenciaContext(searchParams);

  const [
    previdenciaMetrics,
    entidadesMetrics,
    naturezaMetrics,
    actuarialTrend,
    cadprevParcelamentos,
    portalConfig,
    posicaoFinanceira,
  ] = await Promise.all([
    getHistoriaPrevidenciaMetrics(tenantSlug, context.selectedYear),
    getPrevidenciaEntidadesMetrics(tenantSlug, context.selectedYear),
    getPrevidenciaNaturezaMetrics(tenantSlug, context.selectedYear),
    getPrevidenciaActuarialTrendMetrics(tenantSlug),
    getPrevidenciaCadprevMetrics(tenantSlug, context.selectedYear),
    getPortalConfig(tenantSlug),
    getSiconfiPosicaoFinanceira(tenantSlug, context.selectedYear),
  ]);

  const totalEmpenhado = previdenciaMetrics?.totalEmpenhado ?? 0;
  const totalLiquidado = previdenciaMetrics?.totalLiquidado ?? 0;
  const totalPago = previdenciaMetrics?.totalPago ?? 0;
  const totalAporteExigido = previdenciaMetrics?.totalAporteExigido ?? 0;
  const totalAporteQuitado = previdenciaMetrics?.totalAporteQuitado ?? 0;
  const totalEmpenhadoPatronal =
    previdenciaMetrics?.totalEmpenhadoPatronal ?? 0;
  const totalLiquidadoPatronal =
    previdenciaMetrics?.totalLiquidadoPatronal ?? 0;
  const totalPagoPatronal = previdenciaMetrics?.totalPagoPatronal ?? 0;
  const totalAmortizacaoDivida =
    previdenciaMetrics?.totalAmortizacaoDivida ?? 0;
  const totalCaspPlanoSaude = previdenciaMetrics?.totalCaspPlanoSaude ?? 0;
  const servidoresEfetivos = previdenciaMetrics?.servidoresEfetivos ?? 0;
  const servidoresTemporarios = previdenciaMetrics?.servidoresTemporarios ?? 0;

  const romboAporteNaoRepassado = Math.max(
    0,
    totalAporteExigido - totalAporteQuitado,
  );
  const romboPatronalNaoRepassado = Math.max(
    0,
    totalLiquidadoPatronal - totalPagoPatronal,
  );
  const taxaAdimplenciaAporte =
    totalAporteExigido > 0
      ? (totalAporteQuitado / totalAporteExigido) * 100
      : 100;
  const currentYear = new Date().getFullYear();
  const mesesDecorridos =
    context.selectedYear < currentYear
      ? 12
      : Math.max(1, new Date().getMonth() + 1);
  const deficitMedioMensal =
    romboPatronalNaoRepassado > 0
      ? romboPatronalNaoRepassado / mesesDecorridos
      : 0;

  const currTrend = actuarialTrend.find((t) => t.ano === context.selectedYear);
  const prevTrend = actuarialTrend.find(
    (t) => t.ano === context.selectedYear - 1,
  );
  const prevAmort = prevTrend?.amortizacaoDivida ?? 0;
  const currAmort = currTrend?.amortizacaoDivida ?? totalAmortizacaoDivida;
  const variacaoAmortizacaoPct = (() => {
    if (prevAmort > 0) {
      return ((currAmort - prevAmort) / prevAmort) * 100;
    }
    if (currAmort > 0) {
      return 100;
    }
    return 0;
  })();

  const previdencia = {
    entidades: entidadesMetrics,
    natureza: naturezaMetrics,
    cadprevParcelamentos,
    actuarialTrend,
    totalEmpenhado,
    totalLiquidado,
    totalPago,
    taxaExecucao: totalEmpenhado > 0 ? totalPago / totalEmpenhado : 0,
    totalAporteAtuarial: totalAporteExigido,
    totalDividaResgatada: totalAmortizacaoDivida,
    totalCaspPlanoSaude,
    actuarialRisk: {
      totalAporteExigido,
      totalAporteQuitado,
      romboAporteNaoRepassado,
      taxaAdimplenciaAporte,
      totalEmpenhadoPatronal,
      totalLiquidadoPatronal,
      totalPagoPatronal,
      romboPatronalNaoRepassado,
      deficitMedioMensal,
      totalAmortizacaoDivida,
      variacaoAmortizacaoPct,
      servidoresEfetivos,
      servidoresTemporariosComissionados: servidoresTemporarios,
      razaoTemporariosEfetivosPct:
        servidoresEfetivos > 0
          ? (servidoresTemporarios / servidoresEfetivos) * 100
          : 0,
    },
  };

  return {
    context,
    portalConfig,
    previdencia,
    caprem: previdencia,
    posicaoFinanceira,
  };
}

export const loadPrevidenciaData = createCachedDataLoader(
  fetchRawPrevidenciaData,
  "previdencia",
);
