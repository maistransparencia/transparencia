import { sql } from "kysely";
import { db } from "../client";

export interface HistoriaPrevidenciaMetricsDTO {
  previdenciaHistoriaId: string;
  historiaCapremId: string; // Alias retrocompatível
  portalSlug: string;
  ano: number;
  totalAporteExigido: number;
  totalAporteQuitado: number;
  taxaAdimplenciaAporte: number;
  totalEmpenhadoPatronal: number;
  totalLiquidadoPatronal: number;
  totalPagoPatronal: number;
  romboPatronalNaoRepassado: number;
  totalAmortizacaoDivida: number;
  totalCaspPlanoSaude: number;
  totalEmpenhado: number;
  totalLiquidado: number;
  totalPago: number;
  servidoresEfetivos: number;
  servidoresTemporarios: number;
}

/**
 * Retorna as métricas da história previdenciária para o portal e ano especificados.
 *
 * Consolida as métricas do RPPS e retorna `null` caso não haja registros.
 */
export async function getHistoriaPrevidenciaMetrics(
  portalSlug: string,
  ano: number,
): Promise<HistoriaPrevidenciaMetricsDTO | null> {
  const result = await db
    .selectFrom("fct_previdencia_historia_metricas")
    .selectAll()
    .where("portal_slug", "=", portalSlug)
    .where("ano", "=", ano)
    .executeTakeFirst();

  if (!result) return null;

  return {
    previdenciaHistoriaId: result.previdencia_historia_id as string,
    historiaCapremId: result.previdencia_historia_id as string,
    portalSlug: result.portal_slug,
    ano: Number(result.ano),
    totalAporteExigido: Number(result.total_aporte_exigido ?? 0),
    totalAporteQuitado: Number(result.total_aporte_quitado ?? 0),
    taxaAdimplenciaAporte: Number(result.taxa_adimplencia_aporte ?? 0),
    totalEmpenhadoPatronal: Number(result.total_empenhado_patronal ?? 0),
    totalLiquidadoPatronal: Number(result.total_liquidado_patronal ?? 0),
    totalPagoPatronal: Number(result.total_pago_patronal ?? 0),
    romboPatronalNaoRepassado: Number(result.rombo_patronal_nao_repassado ?? 0),
    totalAmortizacaoDivida: Number(result.total_amortizacao_divida ?? 0),
    totalCaspPlanoSaude: Number(result.total_casp_plano_saude ?? 0),
    totalEmpenhado: Number(result.total_empenhado ?? 0),
    totalLiquidado: Number(result.total_liquidado ?? 0),
    totalPago: Number(result.total_pago ?? 0),
    servidoresEfetivos: Number(result.servidores_efetivos ?? 0),
    servidoresTemporarios: Number(result.servidores_temporarios ?? 0),
  } satisfies HistoriaPrevidenciaMetricsDTO;
}

export interface EntityPrevidenciaDTO {
  entidade: string;
  empenhado: number;
  liquidado: number;
  pago: number;
  taxaExecucao: number;
}

export async function getPrevidenciaEntidadesMetrics(
  portalSlug: string,
  ano: number,
): Promise<EntityPrevidenciaDTO[]> {
  try {
    const rows = await db
      .selectFrom("fct_previdencia_entidades_metricas")
      .select(["entidade", "empenhado", "liquidado", "pago", "taxa_execucao"])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano)
      .orderBy("empenhado", "desc")
      .execute();

    return rows.map((r) => ({
      entidade: r.entidade ?? "",
      empenhado: Number(r.empenhado ?? 0),
      liquidado: Number(r.liquidado ?? 0),
      pago: Number(r.pago ?? 0),
      taxaExecucao: Number(r.taxa_execucao ?? 0),
    }));
  } catch {
    return [];
  }
}

export interface PrevidenciaNaturezaMetricDTO {
  elemento: string;
  naturezaDespesa?: string;
  descricao: string;
  destino: string;
  empenhado: number;
  liquidado: number;
  pago: number;
  dataEmpenho?: string;
}

export async function getPrevidenciaNaturezaMetrics(
  portalSlug: string,
  ano: number,
): Promise<PrevidenciaNaturezaMetricDTO[]> {
  try {
    const rows = await db
      .selectFrom("fct_previdencia_natureza_metricas")
      .select([
        "elemento",
        "natureza_despesa as naturezaDespesa",
        "destino",
        "descricao",
        "data_empenho as dataEmpenho",
        "empenhado",
        "liquidado",
        "pago",
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano)
      .orderBy("empenhado", "desc")
      .execute();

    if (rows.length > 0) {
      return rows.map((r) => {
        let cleanDate: string | undefined;
        if (r.dataEmpenho) {
          cleanDate =
            r.dataEmpenho instanceof Date
              ? r.dataEmpenho.toISOString().split("T")[0]
              : String(r.dataEmpenho).split("T")[0];
        }
        return {
          elemento: r.elemento ?? "",
          naturezaDespesa: r.naturezaDespesa ?? undefined,
          descricao:
            r.naturezaDespesa ||
            (r.elemento ? `Elemento ${r.elemento}` : "Despesa Previdenciária"),
          destino: r.destino ?? "encargo_patronal_geral",
          empenhado: Number(r.empenhado ?? 0),
          liquidado: Number(r.liquidado ?? 0),
          pago: Number(r.pago ?? 0),
          dataEmpenho: cleanDate,
        };
      });
    }
  } catch {
    // Fallback para fct_despesas caso a tabela fct_previdencia_natureza_metricas ainda não esteja disponível
  }

  try {
    const rows = await db
      .selectFrom("fct_despesas as d")
      .leftJoin(
        "dim_elemento_despesa as dim",
        "d.elemento",
        "dim.elemento_codigo",
      )
      .select([
        "d.empenho_id as empenhoId",
        "d.elemento",
        sql<string>`coalesce(dim.elemento_descricao, d.natureza_despesa, '')`.as(
          "naturezaDespesa",
        ),
        "d.fornecedor_nome as fornecedorNome",
        "d.descricao",
        "d.data_empenho as dataEmpenho",
        sql<number>`cast(coalesce(sum(d.empenhado_liquido), 0) as numeric)`.as(
          "empenhado",
        ),
        sql<number>`cast(coalesce(sum(d.liquidado), 0) as numeric)`.as(
          "liquidado",
        ),
        sql<number>`cast(coalesce(sum(d.pago), 0) as numeric)`.as("pago"),
      ])
      .where("d.portal_slug", "=", portalSlug)
      .where("d.ano", "=", ano)
      .where((eb) =>
        eb.or([
          eb("d.elemento", "in", ["13", "71", "97"]),
          eb("d.orgao_codigo", "=", "1061"),
          eb("d.credor_id", "=", "1061"),
          eb("d.fornecedor_nome", "ilike", "%CAPREM%"),
          eb("d.fornecedor_nome", "ilike", "%CASP%"),
          eb("d.fornecedor_cpf_cnpj", "=", "07.573.075/0001-00"),
          eb("d.descricao", "ilike", "%CAPREM%"),
          eb("d.descricao", "ilike", "%CASP%"),
        ]),
      )
      .where((eb) =>
        eb.or([
          eb("d.tipo_empenho", "is", null),
          eb("d.tipo_empenho", "!=", "AN"),
        ]),
      )
      .groupBy([
        "d.empenho_id",
        "d.elemento",
        "dim.elemento_descricao",
        "d.natureza_despesa",
        "d.fornecedor_nome",
        "d.descricao",
        "d.data_empenho",
      ])
      .orderBy("empenhado", "desc")
      .execute();

    return rows.map((r) => {
      const elemento = r.elemento ?? "";
      const fornecedor = r.fornecedorNome ?? "";
      const descText = r.descricao ?? "";
      const naturezaDesc =
        r.naturezaDespesa ||
        (elemento ? `Elemento ${elemento}` : "Despesa Previdenciária");
      let destino = "encargo_patronal_geral";

      if (
        fornecedor.toLowerCase().includes("casp") ||
        descText.toLowerCase().includes("casp") ||
        naturezaDesc.toLowerCase().includes("casp")
      ) {
        destino = "plano_saude_casp";
      } else if (elemento === "97") {
        destino = "aporte_atuarial_rpps";
      } else if (elemento === "71") {
        destino = "amortizacao_divida_rpps";
      } else if (
        naturezaDesc.toLowerCase().includes("inss") ||
        naturezaDesc.toLowerCase().includes("rgps")
      ) {
        destino = "inss_rgps";
      } else if (
        elemento === "13" ||
        fornecedor.toLowerCase().includes("caprem") ||
        descText.toLowerCase().includes("caprem") ||
        fornecedor.toLowerCase().includes("ipamn") ||
        descText.toLowerCase().includes("ipamn") ||
        fornecedor.toLowerCase().includes("funprev") ||
        descText.toLowerCase().includes("funprev") ||
        fornecedor.toLowerCase().includes("rpps") ||
        descText.toLowerCase().includes("rpps")
      ) {
        destino = "rpps_contribuicao_patronal";
      }

      let cleanDate: string | undefined;
      if (r.dataEmpenho) {
        cleanDate =
          r.dataEmpenho instanceof Date
            ? r.dataEmpenho.toISOString().split("T")[0]
            : String(r.dataEmpenho).split("T")[0];
      }

      return {
        elemento,
        descricao: naturezaDesc,
        destino,
        empenhado: Number(r.empenhado ?? 0),
        liquidado: Number(r.liquidado ?? 0),
        pago: Number(r.pago ?? 0),
        dataEmpenho: cleanDate,
      };
    });
  } catch {
    return [];
  }
}

export interface PrevidenciaActuarialTrendDTO {
  ano: number;
  aporteExigido: number;
  aporteQuitado: number;
  taxaAdimplencia: number;
  amortizacaoDivida: number;
  patrimonioFinanceiroTotal?: number | null;
  inconsistenciaDeclaracaoFlag?: boolean;
  variacaoPatrimonioAbs?: number | null;
  variacaoPatrimonioPct?: number | null;
}

export async function getPrevidenciaActuarialTrendMetrics(
  portalSlug: string,
): Promise<PrevidenciaActuarialTrendDTO[]> {
  try {
    const rows = await db
      .selectFrom("fct_previdencia_patrimonio_historico_metricas as p")
      .leftJoin("fct_previdencia_tendencia_atuarial_metricas as t", (join) =>
        join
          .onRef("t.portal_slug", "=", "p.portal_slug")
          .onRef("t.ano", "=", "p.ano"),
      )
      .select([
        "p.ano",
        "t.aporte_exigido as aporteExigido",
        "t.aporte_quitado as aporteQuitado",
        "t.taxa_adimplencia as taxaAdimplencia",
        "t.amortizacao_divida as amortizacaoDivida",
        "p.patrimonio_total as patrimonioTotal",
        "p.inconsistencia_declaracao_flag as inconsistenciaDeclaracaoFlag",
        "p.variacao_abs as variacaoAbs",
        "p.variacao_pct as variacaoPct",
      ])
      .where("p.portal_slug", "=", portalSlug)
      .orderBy("p.ano", "asc")
      .execute();

    if (rows.length > 0) {
      return rows.map((r) => ({
        ano: Number(r.ano),
        aporteExigido: Number(r.aporteExigido ?? 0),
        aporteQuitado: Number(r.aporteQuitado ?? 0),
        taxaAdimplencia: Number(r.taxaAdimplencia ?? 100),
        amortizacaoDivida: Number(r.amortizacaoDivida ?? 0),
        patrimonioFinanceiroTotal:
          r.patrimonioTotal != null ? Number(r.patrimonioTotal) : null,
        inconsistenciaDeclaracaoFlag: Boolean(
          r.inconsistenciaDeclaracaoFlag ?? false,
        ),
        variacaoPatrimonioAbs:
          r.variacaoAbs != null ? Number(r.variacaoAbs) : null,
        variacaoPatrimonioPct:
          r.variacaoPct != null ? Number(r.variacaoPct) : null,
      }));
    }
  } catch {
    // Fallback para fct_despesas caso a tabela ainda não exista no DB
  }

  try {
    const rows = await db
      .selectFrom("fct_despesas")
      .select([
        "ano",
        sql<number>`cast(coalesce(sum(case when elemento = '97' then empenhado_liquido else 0 end), 0) as numeric)`.as(
          "aporte_exigido",
        ),
        sql<number>`cast(coalesce(sum(case when elemento = '97' then pago else 0 end), 0) as numeric)`.as(
          "aporte_quitado",
        ),
        sql<number>`cast(coalesce(sum(case when elemento = '71' then pago else 0 end), 0) as numeric)`.as(
          "amortizacao_divida",
        ),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", ">=", 2021)
      .where("elemento", "in", ["97", "71"])
      .where((eb) =>
        eb.or([eb("tipo_empenho", "is", null), eb("tipo_empenho", "!=", "AN")]),
      )
      .groupBy("ano")
      .orderBy("ano", "asc")
      .execute();

    return rows.map((r) => {
      const exigido = Number(r.aporte_exigido ?? 0);
      const quitado = Number(r.aporte_quitado ?? 0);
      return {
        ano: Number(r.ano),
        aporteExigido: exigido,
        aporteQuitado: quitado,
        taxaAdimplencia: exigido > 0 ? (quitado / exigido) * 100 : 100,
        amortizacaoDivida: Number(r.amortizacao_divida ?? 0),
        patrimonioFinanceiroTotal: null,
        inconsistenciaDeclaracaoFlag: false,
        variacaoPatrimonioAbs: null,
        variacaoPatrimonioPct: null,
      };
    });
  } catch {
    return [];
  }
}

export interface PrevidenciaPatrimonioHistoricoDTO {
  previdenciaPatrimonioHistoricoId: string;
  capremPatrimonioHistoricoId: string; // Alias retrocompatível
  portalSlug: string;
  ano: number;
  mesReferencia: number;
  saldoCaixa: number;
  saldoAplicacoes: number;
  patrimonioTotal: number;
  inconsistenciaDeclaracaoFlag: boolean;
  variacaoAbs: number | null;
  variacaoPct: number | null;
}

export async function getPrevidenciaPatrimonioHistoricoMetrics(
  portalSlug: string,
): Promise<PrevidenciaPatrimonioHistoricoDTO[]> {
  try {
    const rows = await db
      .selectFrom("fct_previdencia_patrimonio_historico_metricas")
      .select([
        "previdencia_patrimonio_historico_id as previdenciaPatrimonioHistoricoId",
        "portal_slug as portalSlug",
        "ano",
        "mes_referencia as mesReferencia",
        "saldo_caixa as saldoCaixa",
        "saldo_aplicacoes as saldoAplicacoes",
        "patrimonio_total as patrimonioTotal",
        "inconsistencia_declaracao_flag as inconsistenciaDeclaracaoFlag",
        "variacao_abs as variacaoAbs",
        "variacao_pct as variacaoPct",
      ])
      .where("portal_slug", "=", portalSlug)
      .orderBy("ano", "asc")
      .execute();

    return rows.map((r) => ({
      previdenciaPatrimonioHistoricoId: r.previdenciaPatrimonioHistoricoId,
      capremPatrimonioHistoricoId: r.previdenciaPatrimonioHistoricoId,
      portalSlug: r.portalSlug,
      ano: Number(r.ano),
      mesReferencia: Number(r.mesReferencia),
      saldoCaixa: Number(r.saldoCaixa ?? 0),
      saldoAplicacoes: Number(r.saldoAplicacoes ?? 0),
      patrimonioTotal: Number(r.patrimonioTotal ?? 0),
      inconsistenciaDeclaracaoFlag: Boolean(r.inconsistenciaDeclaracaoFlag),
      variacaoAbs: r.variacaoAbs != null ? Number(r.variacaoAbs) : null,
      variacaoPct: r.variacaoPct != null ? Number(r.variacaoPct) : null,
    }));
  } catch {
    return [];
  }
}

export interface CadprevParcelamentoItemDTO {
  numeroCadprev: string;
  descricao: string;
  elemento: string;
  empenhado: number;
  pago: number;
  dataEmpenho?: string;
}

function toCadprevDTO(r: {
  empenhoId: string | null;
  descricao: string | null;
  dataEmpenho: unknown;
  empenhado: number | string;
  pago: number | string;
}): CadprevParcelamentoItemDTO {
  const match = r.descricao
    ? r.descricao.match(/CADPREV\s*(?:N[º°]?\s*)?([\d/]+)/i)
    : null;
  const cadprevStr = (() => {
    if (match) return `CADPREV Nº ${match[1]}`;
    if (r.empenhoId) return `Empenho ${r.empenhoId}`;
    return "N/A";
  })();
  let cleanDate: string | undefined;
  if (r.dataEmpenho) {
    cleanDate =
      r.dataEmpenho instanceof Date
        ? r.dataEmpenho.toISOString().split("T")[0]
        : String(r.dataEmpenho).split("T")[0];
  }
  return {
    numeroCadprev: cadprevStr,
    descricao:
      r.descricao ?? "Parcelamento de Dívida Previdenciária (Elemento 71)",
    elemento: "71",
    empenhado: Number(r.empenhado ?? 0),
    pago: Number(r.pago ?? 0),
    dataEmpenho: cleanDate,
  };
}

export async function getPrevidenciaCadprevMetrics(
  portalSlug: string,
  ano: number,
): Promise<CadprevParcelamentoItemDTO[]> {
  try {
    const rows = await db
      .selectFrom("fct_previdencia_cadprev_metricas")
      .select([
        "empenho_id as empenhoId",
        "descricao",
        "data_empenho as dataEmpenho",
        "empenhado",
        "pago",
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano)
      .orderBy("empenhado", "desc")
      .execute();

    return rows.map(toCadprevDTO);
  } catch {
    // Fallback para fct_despesas caso a tabela fct_previdencia_cadprev_metricas ainda não tenha sido criada via dbt run
  }

  try {
    const rows = await db
      .selectFrom("fct_despesas")
      .select([
        "empenho_id as empenhoId",
        "descricao",
        "data_empenho as dataEmpenho",
        sql<number>`cast(coalesce(sum(empenhado_liquido), 0) as numeric)`.as(
          "empenhado",
        ),
        sql<number>`cast(coalesce(sum(pago), 0) as numeric)`.as("pago"),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano)
      .where("elemento", "=", "71")
      .where((eb) =>
        eb.or([eb("tipo_empenho", "is", null), eb("tipo_empenho", "!=", "AN")]),
      )
      .groupBy(["empenho_id", "descricao", "data_empenho"])
      .orderBy("empenhado", "desc")
      .execute();

    return rows.map(toCadprevDTO);
  } catch {
    return [];
  }
}

// ==========================================
// Aliases retrocompatíveis (Caprem)
// ==========================================
export type HistoriaCapremMetricsDTO = HistoriaPrevidenciaMetricsDTO;
export const getHistoriaCapremMetrics = getHistoriaPrevidenciaMetrics;

export type EntityCapremDTO = EntityPrevidenciaDTO;
export const getCapremEntidadesMetrics = getPrevidenciaEntidadesMetrics;

export type CapremNaturezaMetricDTO = PrevidenciaNaturezaMetricDTO;
export const getCapremNaturezaMetrics = getPrevidenciaNaturezaMetrics;

export type CapremActuarialTrendDTO = PrevidenciaActuarialTrendDTO;
export const getCapremActuarialTrendMetrics =
  getPrevidenciaActuarialTrendMetrics;

export type CapremPatrimonioHistoricoDTO = PrevidenciaPatrimonioHistoricoDTO;
export const getCapremPatrimonioHistoricoMetrics =
  getPrevidenciaPatrimonioHistoricoMetrics;

export const getCapremCadprevMetrics = getPrevidenciaCadprevMetrics;
