import {
  type ContratoServicoVigente,
  getContratosServicosVigentes,
} from "./contratos-servicos-vigentes";
import { getEntidades, getPortalConfig } from "./metadata";
import {
  getOpacidadeContabilMetrics,
  type OpacidadeContabilMetricsDTO,
} from "./opacidade-contabil-metrics";
import {
  getPosicaoFiscalMetrics,
  type PosicaoFiscalMetricsDTO,
} from "./posicao-fiscal-metrics";

export interface RadarDigestMetricsDTO {
  portalSlug: string;
  ano: number;
  posicaoFiscal: {
    totalArrecadado: number;
    despesasPagas: number;
    restosPagosNoAno: number;
    saldoEstimado: number;
  } | null;
  opacidade: {
    taxaValorOpacidadePct: number;
    classificacaoRisco: "normal" | "atencao" | "critico";
    pagoResidual99: number;
    pagoDesvioSensivel99: number;
    totalPago: number;
  } | null;
  destaquesContratos: Array<{
    fornecedorNome: string;
    objetoDescricao: string;
    totalPago: number;
    statusExecucao: string;
  }>;
  destaquesCredoresOpacidade: Array<{
    credorNome: string;
    totalPago: number;
    categoriaPredominante: string;
  }>;
}

function mapPosicaoFiscal(metrics: PosicaoFiscalMetricsDTO | null) {
  if (!metrics) return null;
  return {
    totalArrecadado: metrics.totalArrecadado,
    despesasPagas: metrics.despesasPagas,
    restosPagosNoAno: metrics.restosPagosNoAno,
    saldoEstimado: metrics.saldoEstimado,
  };
}

function mapOpacidade(metrics: OpacidadeContabilMetricsDTO | null) {
  if (!metrics?.exercicioAtual) return null;
  return {
    taxaValorOpacidadePct: metrics.exercicioAtual.taxaValorOpacidadePct,
    classificacaoRisco: metrics.exercicioAtual.classificacaoRisco,
    pagoResidual99: metrics.exercicioAtual.pagoResidual99,
    pagoDesvioSensivel99: metrics.exercicioAtual.pagoDesvioSensivel99,
    totalPago: metrics.exercicioAtual.totalPago,
  };
}

function mapDestaquesContratos(contratos: ContratoServicoVigente[]) {
  return contratos
    .slice()
    .sort((a, b) => b.totalPago - a.totalPago)
    .slice(0, 5)
    .map((c) => ({
      fornecedorNome: c.fornecedorNome,
      objetoDescricao: c.objetoDescricao,
      totalPago: c.totalPago,
      statusExecucao: c.statusExecucao,
    }));
}

function mapDestaquesCredores(metrics: OpacidadeContabilMetricsDTO | null) {
  if (!metrics?.topCredores) return [];
  return metrics.topCredores.slice(0, 5).map((credor) => ({
    credorNome: credor.credorNome,
    totalPago: credor.totalPago,
    categoriaPredominante: credor.categoriaPredominante,
  }));
}

/**
 * Retorna as métricas agregadas do Radar Cívico Municipal para o portal e ano informados.
 * Compõe internamente posição fiscal, índice de opacidade (.99) e destaques de contratos/credores.
 */
export async function getRadarDigestMetrics(
  portalSlug: string,
  ano?: number,
): Promise<RadarDigestMetricsDTO | null> {
  const targetAno = ano ?? new Date().getFullYear();

  const entidades = await getEntidades(portalSlug);
  let empresaIds = entidades.map((e) => e.id).filter(Boolean);

  if (empresaIds.length === 0) {
    const config = await getPortalConfig(portalSlug);
    if (config?.empresaPadrao) {
      empresaIds = [config.empresaPadrao];
    }
  }

  const [posicaoFiscalRaw, opacidadeRaw, contratosRaw] = await Promise.all([
    empresaIds.length > 0
      ? getPosicaoFiscalMetrics(portalSlug, targetAno, empresaIds)
      : null,
    getOpacidadeContabilMetrics(portalSlug, targetAno),
    getContratosServicosVigentes(
      portalSlug,
      targetAno,
      empresaIds.length > 0 ? empresaIds : undefined,
    ),
  ]);

  const posicaoFiscal = mapPosicaoFiscal(posicaoFiscalRaw);
  const opacidade = mapOpacidade(opacidadeRaw);
  const destaquesContratos = mapDestaquesContratos(contratosRaw ?? []);
  const destaquesCredoresOpacidade = mapDestaquesCredores(opacidadeRaw);

  const hasData =
    posicaoFiscal !== null ||
    opacidade !== null ||
    destaquesContratos.length > 0 ||
    destaquesCredoresOpacidade.length > 0;

  if (!hasData) {
    return null;
  }

  return {
    portalSlug,
    ano: targetAno,
    posicaoFiscal,
    opacidade,
    destaquesContratos,
    destaquesCredoresOpacidade,
  };
}
