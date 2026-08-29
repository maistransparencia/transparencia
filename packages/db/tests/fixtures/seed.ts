import { randomUUID } from "node:crypto";
import { db } from "../../src/client";

/**
 * Cada arquivo de spec deve criar seu próprio slug via `createFixturePortalSlug()`
 * e usá-lo em todos os seeds/queries/cleanup daquele arquivo. O vitest roda
 * arquivos de teste em paralelo (workers/processos distintos) contra o mesmo
 * Postgres; um slug fixo compartilhado faria o cleanup de um arquivo apagar
 * dados que outro arquivo ainda está usando.
 */
export function createFixturePortalSlug(): string {
  return `fixture_test_${randomUUID()}`;
}

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

export interface PosicaoFiscalRow {
  portalSlug: string;
  empresaId: string;
  ano: number;
  totalArrecadado?: number;
  despesasPagas?: number;
  restosLiquidadosNoAno?: number;
  restosPagosNoAno?: number;
  restosPendentesAdmAnterior?: number;
  restosPendentesAdmAtual?: number;
  saldoEstimado?: number;
}

export async function seedPosicaoFiscal(row: PosicaoFiscalRow): Promise<void> {
  await db
    .insertInto("fct_posicao_fiscal_metricas")
    .values({
      posicao_fiscal_id: nextId("pf"),
      portal_slug: row.portalSlug,
      empresa_id: row.empresaId,
      ano: row.ano,
      total_arrecadado: row.totalArrecadado ?? 0,
      despesas_pagas: row.despesasPagas ?? 0,
      restos_liquidados_no_ano: row.restosLiquidadosNoAno ?? 0,
      restos_pagos_no_ano: row.restosPagosNoAno ?? 0,
      restos_pendentes_adm_anterior: row.restosPendentesAdmAnterior ?? 0,
      restos_pendentes_adm_atual: row.restosPendentesAdmAtual ?? 0,
      saldo_estimado: row.saldoEstimado ?? 0,
    })
    .execute();
}

export interface OrcamentoFuncionalRow {
  portalSlug: string;
  empresaId: string;
  ano: number;
  funcaoNome: string;
  subfuncaoNome: string;
  dotacaoAtualizada?: number;
  empenhado?: number;
  liquidado?: number;
  pago?: number;
}

export async function seedOrcamentoFuncional(
  row: OrcamentoFuncionalRow,
): Promise<void> {
  await db
    .insertInto("fct_orcamento_funcional_metricas")
    .values({
      orcamento_funcional_id: nextId("of"),
      portal_slug: row.portalSlug,
      empresa_id: row.empresaId,
      ano: row.ano,
      funcao_nome: row.funcaoNome,
      subfuncao_nome: row.subfuncaoNome,
      dotacao_atualizada: row.dotacaoAtualizada ?? 0,
      empenhado: row.empenhado ?? 0,
      liquidado: row.liquidado ?? 0,
      pago: row.pago ?? 0,
    })
    .execute();
}

export interface HistoriaCapremRow {
  portalSlug: string;
  ano: number;
  totalAporteExigido?: number;
  totalAporteQuitado?: number;
  taxaAdimplenciaAporte?: number;
  totalEmpenhadoPatronal?: number;
  totalLiquidadoPatronal?: number;
  totalPagoPatronal?: number;
  romboPatronalNaoRepassado?: number;
  totalAmortizacaoDivida?: number;
  totalCaspPlanoSaude?: number;
  totalEmpenhado?: number;
  totalLiquidado?: number;
  totalPago?: number;
  servidoresEfetivos?: number;
  servidoresTemporarios?: number;
}

export async function seedHistoriaCaprem(
  row: HistoriaCapremRow,
): Promise<void> {
  await db
    .insertInto("fct_historia_caprem_metricas")
    .values({
      historia_caprem_id: nextId("hc"),
      portal_slug: row.portalSlug,
      ano: row.ano,
      total_aporte_exigido: row.totalAporteExigido ?? 0,
      total_aporte_quitado: row.totalAporteQuitado ?? 0,
      taxa_adimplencia_aporte: row.taxaAdimplenciaAporte ?? 0,
      total_empenhado_patronal: row.totalEmpenhadoPatronal ?? 0,
      total_liquidado_patronal: row.totalLiquidadoPatronal ?? 0,
      total_pago_patronal: row.totalPagoPatronal ?? 0,
      rombo_patronal_nao_repassado: row.romboPatronalNaoRepassado ?? 0,
      total_amortizacao_divida: row.totalAmortizacaoDivida ?? 0,
      total_casp_plano_saude: row.totalCaspPlanoSaude ?? 0,
      total_empenhado: row.totalEmpenhado ?? 0,
      total_liquidado: row.totalLiquidado ?? 0,
      total_pago: row.totalPago ?? 0,
      servidores_efetivos: row.servidoresEfetivos ?? 0,
      servidores_temporarios: row.servidoresTemporarios ?? 0,
    })
    .execute();
}

export interface OpacidadeMetricasRow {
  portalSlug: string;
  ano: number;
  totalEmpenhos?: number;
  empenhosResidual99?: number;
  empenhosDesvioSensivel99?: number;
  taxaEmpenhosOpacidadePct?: number;
  totalPago?: number;
  pagoResidual99?: number;
  pagoDesvioSensivel99?: number;
  taxaValorOpacidadePct?: number;
  taxaDesvioSensivelPct?: number;
  classificacaoRisco?: string;
}

export async function seedOpacidadeMetricas(
  row: OpacidadeMetricasRow,
): Promise<void> {
  await db
    .insertInto("fct_opacidade_contabil_metricas")
    .values({
      opacidade_metricas_id: nextId("om"),
      portal_slug: row.portalSlug,
      ano: row.ano,
      total_empenhos: row.totalEmpenhos ?? 0,
      empenhos_residual_99: row.empenhosResidual99 ?? 0,
      empenhos_desvio_sensivel_99: row.empenhosDesvioSensivel99 ?? 0,
      taxa_empenhos_opacidade_pct: row.taxaEmpenhosOpacidadePct ?? 0,
      total_pago: row.totalPago ?? 0,
      pago_residual_99: row.pagoResidual99 ?? 0,
      pago_desvio_sensivel_99: row.pagoDesvioSensivel99 ?? 0,
      taxa_valor_opacidade_pct: row.taxaValorOpacidadePct ?? 0,
      taxa_desvio_sensivel_pct: row.taxaDesvioSensivelPct ?? 0,
      classificacao_risco: row.classificacaoRisco ?? "normal",
    })
    .execute();
}

export interface OpacidadeCredorRow {
  portalSlug: string;
  ano: number;
  credorCodigo: string;
  credorNome: string;
  totalEmpenhos?: number;
  totalPago?: number;
  pagoDesvioSensivel?: number;
  categoriaPredominante?: string;
  amostraObjeto?: string;
  ranking?: number;
}

export async function seedOpacidadeCredor(
  row: OpacidadeCredorRow,
): Promise<void> {
  await db
    .insertInto("fct_opacidade_contabil_credores")
    .values({
      opacidade_credor_id: nextId("oc"),
      portal_slug: row.portalSlug,
      ano: row.ano,
      credor_codigo: row.credorCodigo,
      credor_nome: row.credorNome,
      total_empenhos: row.totalEmpenhos ?? 0,
      total_pago: row.totalPago ?? 0,
      pago_desvio_sensivel: row.pagoDesvioSensivel ?? 0,
      categoria_predominante:
        row.categoriaPredominante ?? "sem_classificacao_especifica",
      amostra_objeto: row.amostraObjeto ?? "Despesa em subitem residual",
      ranking: row.ranking ?? 1,
    })
    .execute();
}

export interface OpacidadeElementoRow {
  portalSlug: string;
  ano: number;
  elementoCodigo: string;
  elementoDescricao: string;
  categoriaMacro?: string;
  tipoResidual?: "evitavel" | "estrutural";
  totalEmpenhos?: number;
  totalPago?: number;
  percentualDoResidual99?: number;
  ranking?: number;
}

export async function seedOpacidadeElemento(
  row: OpacidadeElementoRow,
): Promise<void> {
  await db
    .insertInto("fct_opacidade_contabil_elementos")
    .values({
      opacidade_elemento_id: nextId("oe"),
      portal_slug: row.portalSlug,
      ano: row.ano,
      elemento_codigo: row.elementoCodigo,
      elemento_descricao: row.elementoDescricao,
      categoria_macro: row.categoriaMacro ?? "Serviços de Terceiros",
      tipo_residual: row.tipoResidual ?? "evitavel",
      total_empenhos: row.totalEmpenhos ?? 0,
      total_pago: row.totalPago ?? 0,
      percentual_do_residual_99: row.percentualDoResidual99 ?? 0,
      ranking: row.ranking ?? 1,
    })
    .execute();
}

/** Remove tudo que os `seed*` acima inseriram para o `portalSlug` dado. */
export async function cleanupFixtures(portalSlug: string): Promise<void> {
  await db
    .deleteFrom("fct_posicao_fiscal_metricas")
    .where("portal_slug", "=", portalSlug)
    .execute();
  await db
    .deleteFrom("fct_orcamento_funcional_metricas")
    .where("portal_slug", "=", portalSlug)
    .execute();
  await db
    .deleteFrom("fct_historia_caprem_metricas")
    .where("portal_slug", "=", portalSlug)
    .execute();
  await db
    .deleteFrom("fct_opacidade_contabil_metricas")
    .where("portal_slug", "=", portalSlug)
    .execute();
  await db
    .deleteFrom("fct_opacidade_contabil_credores")
    .where("portal_slug", "=", portalSlug)
    .execute();
  await db
    .deleteFrom("fct_opacidade_contabil_elementos")
    .where("portal_slug", "=", portalSlug)
    .execute();
}
