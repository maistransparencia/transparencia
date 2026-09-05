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

export interface ContratosServicosVigentesRow {
  portalSlug: string;
  empresaId: string;
  ano: number;
  contratoNumero?: string;
  fornecedorNome: string;
  fornecedorCnpj?: string;
  objetoDescricao?: string;
  dataInicio?: string;
  vencimentoAtual?: string;
  valorAditado?: number;
  totalEmpenhado?: number;
  totalLiquidado?: number;
  totalPago?: number;
  statusExecucao?: "em_execucao" | "concluido" | "inexecutado";
}

export async function seedContratosServicosVigentes(
  row: ContratosServicosVigentesRow,
): Promise<void> {
  await db
    .insertInto("fct_contratos_servicos_vigentes")
    .values({
      contrato_servico_id: nextId("cs"),
      portal_slug: row.portalSlug,
      empresa_id: row.empresaId,
      ano: row.ano,
      contrato_numero: row.contratoNumero ?? "001/2025",
      fornecedor_nome: row.fornecedorNome,
      fornecedor_cnpj: row.fornecedorCnpj ?? "00.000.000/0001-00",
      objeto_descricao: row.objetoDescricao ?? "Serviços prestados",
      data_inicio: row.dataInicio ?? "2025-01-01",
      vencimento_atual: row.vencimentoAtual ?? "2025-12-31",
      valor_aditado: row.valorAditado ?? 0,
      total_empenhado: row.totalEmpenhado ?? 0,
      total_liquidado: row.totalLiquidado ?? 0,
      total_pago: row.totalPago ?? 0,
      status_execucao: row.statusExecucao ?? "em_execucao",
    })
    .execute();
}

export interface DimOrgaoRow {
  portalSlug: string;
  empresaId: string;
  orgaoNome: string;
}

export async function seedDimOrgao(row: DimOrgaoRow): Promise<void> {
  await db
    .insertInto("dim_orgao")
    .values({
      orgao_id: nextId("orgao"),
      portal_slug: row.portalSlug,
      empresa_id: row.empresaId,
      orgao_nome: row.orgaoNome,
    })
    .execute();
}

export interface DespesaRow {
  portalSlug: string;
  empresaId: string;
  ano: number;
  fonte: string;
  categoriaGastoSensivel?: string;
  empenhado?: number;
  liquidado?: number;
  pago?: number;
}

export async function seedDespesa(row: DespesaRow): Promise<void> {
  await db
    .insertInto("fct_despesas")
    .values({
      despesa_id: nextId("desp"),
      empenho_id: nextId("emp"),
      portal_slug: row.portalSlug,
      empresa_id: row.empresaId,
      ano: row.ano,
      fonte: row.fonte,
      categoria_gasto_sensivel: row.categoriaGastoSensivel ?? null,
      empenhado: row.empenhado ?? 0,
      liquidado: row.liquidado ?? 0,
      pago: row.pago ?? 0,
    })
    .execute();
}

export interface PessoalFolhaRow {
  portalSlug: string;
  empresaId: string;
  ano: number;
  totalFolha?: number;
  totalPago?: number;
  empenhado13?: number;
  empenhadoBruto13?: number;
  liquidado13?: number;
  pago13?: number;
  efetivosConfianca?: number;
  comissionadosExternos?: number;
  bin0_25k?: number;
  bin25k_5k?: number;
  bin5k_75k?: number;
  bin75k_10k?: number;
  bin10k_125k?: number;
  bin125k_15k?: number;
  bin15k_175k?: number;
  bin175k_20k?: number;
  binAcima20k?: number;
}

export async function seedPessoalFolha(row: PessoalFolhaRow): Promise<void> {
  await db
    .insertInto("fct_pessoal_folha_metricas")
    .values({
      pessoal_folha_metricas_id: nextId("pfm"),
      portal_slug: row.portalSlug,
      empresa_id: row.empresaId,
      ano: row.ano,
      total_folha: row.totalFolha ?? 0,
      total_pago: row.totalPago ?? 0,
      empenhado_13: row.empenhado13 ?? 0,
      empenhado_bruto_13: row.empenhadoBruto13 ?? 0,
      liquidado_13: row.liquidado13 ?? 0,
      pago_13: row.pago13 ?? 0,
      efetivos_confianca: row.efetivosConfianca ?? 0,
      comissionados_externos: row.comissionadosExternos ?? 0,
      bin_0_25k: row.bin0_25k ?? 0,
      bin_25k_5k: row.bin25k_5k ?? 0,
      bin_5k_75k: row.bin5k_75k ?? 0,
      bin_75k_10k: row.bin75k_10k ?? 0,
      bin_10k_125k: row.bin10k_125k ?? 0,
      bin_125k_15k: row.bin125k_15k ?? 0,
      bin_15k_175k: row.bin15k_175k ?? 0,
      bin_175k_20k: row.bin175k_20k ?? 0,
      bin_acima_20k: row.binAcima20k ?? 0,
    })
    .execute();
}

export interface PessoalDepartamentoRow {
  portalSlug: string;
  empresaId: string;
  ano: number;
  descricao: string;
  totalPago?: number;
}

export async function seedPessoalDepartamento(
  row: PessoalDepartamentoRow,
): Promise<void> {
  await db
    .insertInto("fct_pessoal_departamento_metricas")
    .values({
      departamento_metricas_id: nextId("pdm"),
      portal_slug: row.portalSlug,
      empresa_id: row.empresaId,
      ano: row.ano,
      descricao: row.descricao,
      total_pago: row.totalPago ?? 0,
    })
    .execute();
}

export interface FontesReceitaRow {
  portalSlug: string;
  empresaId: string;
  ano: number;
  receitaPropriaPrevisto?: number;
  receitaPropriaArrecadado?: number;
  transferenciasUniaoPrevisto?: number;
  transferenciasUniaoArrecadado?: number;
  transferenciasEstadoPrevisto?: number;
  transferenciasEstadoArrecadado?: number;
  receitaExtraOrcamentariaArrecadado?: number;
  totalPrevisto?: number;
  totalArrecadado?: number;
  pctPropria?: number;
  alertaDependencia?: boolean;
  fpmArrecadado?: number;
  icmsArrecadado?: number;
  issIptuArrecadado?: number;
  emendasPixArrecadado?: number;
  emendasIndividuaisArrecadado?: number;
  emendasTotalArrecadado?: number;
  emendasTotalEmpenhado?: number;
}

export async function seedFontesReceita(row: FontesReceitaRow): Promise<void> {
  await db
    .insertInto("fct_fontes_receita_metricas")
    .values({
      fontes_receita_id: nextId("fr"),
      portal_slug: row.portalSlug,
      empresa_id: row.empresaId,
      ano: row.ano,
      receita_propria_previsto: row.receitaPropriaPrevisto ?? 0,
      receita_propria_arrecadado: row.receitaPropriaArrecadado ?? 0,
      transferencias_uniao_previsto: row.transferenciasUniaoPrevisto ?? 0,
      transferencias_uniao_arrecadado: row.transferenciasUniaoArrecadado ?? 0,
      transferencias_estado_previsto: row.transferenciasEstadoPrevisto ?? 0,
      transferencias_estado_arrecadado: row.transferenciasEstadoArrecadado ?? 0,
      receita_extra_orcamentaria_arrecadado:
        row.receitaExtraOrcamentariaArrecadado ?? 0,
      total_previsto: row.totalPrevisto ?? 0,
      total_arrecadado: row.totalArrecadado ?? 0,
      pct_propria: row.pctPropria ?? 0,
      alerta_dependencia: row.alertaDependencia ?? false,
      fpm_arrecadado: row.fpmArrecadado ?? 0,
      icms_arrecadado: row.icmsArrecadado ?? 0,
      iss_iptu_arrecadado: row.issIptuArrecadado ?? 0,
      emendas_pix_arrecadado: row.emendasPixArrecadado ?? 0,
      emendas_individuais_arrecadado: row.emendasIndividuaisArrecadado ?? 0,
      emendas_total_arrecadado: row.emendasTotalArrecadado ?? 0,
      emendas_total_empenhado: row.emendasTotalEmpenhado ?? 0,
    })
    .execute();
}

/** Remove tudo que os `seed*` acima inseriram para o `portalSlug` dado. */
export async function cleanupFixtures(portalSlug: string): Promise<void> {
  await db
    .deleteFrom("fct_despesas")
    .where("portal_slug", "=", portalSlug)
    .execute();
  await db
    .deleteFrom("dim_orgao")
    .where("portal_slug", "=", portalSlug)
    .execute();
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
  await db
    .deleteFrom("fct_contratos_servicos_vigentes")
    .where("portal_slug", "=", portalSlug)
    .execute();
  await db
    .deleteFrom("fct_pessoal_folha_metricas")
    .where("portal_slug", "=", portalSlug)
    .execute();
  await db
    .deleteFrom("fct_pessoal_departamento_metricas")
    .where("portal_slug", "=", portalSlug)
    .execute();
  await db
    .deleteFrom("fct_fontes_receita_metricas")
    .where("portal_slug", "=", portalSlug)
    .execute();
}
