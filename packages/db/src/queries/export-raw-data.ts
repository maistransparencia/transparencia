import { db } from "../client";

export type TipoExportacao =
  | "gasto_sensivel"
  | "opacidade_99"
  | "funcao"
  | "saldo_caixa_siconfi";

export interface RawExportOptions {
  portalSlug: string;
  ano: number;
  empresaIds?: string[];
  tipo: TipoExportacao;
  categoria?: string;
  funcaoCodigo?: string;
}

export interface RawDespesaRecordDTO {
  numeroEmpenho: string;
  dataEmpenho: string | null;
  orgaoNome: string;
  credorNome: string;
  credorCpfCnpj: string | null;
  objetoDescricao: string | null;
  naturezaCodigo: string | null;
  valorEmpenhado: number;
  valorLiquidado: number;
  valorPago: number;
  categoriaSensivel: string | null;
  categoriaSugerida: string | null;
  naturezaCodigoSugerido: string | null;
}

function formatDateEmpenho(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value.toISOString().slice(0, 10);
  }
  const dateString = String(value).trim();
  if (!dateString) return null;
  return dateString.slice(0, 10);
}

/**
 * Consulta registros brutos de despesas para exportação direta em CSV (Show Your Work).
 * Garante paridade matemática exata centavo a centavo com os cards e métricas analíticas.
 */
export async function getRawDespesasExportRecords(
  options: RawExportOptions,
): Promise<RawDespesaRecordDTO[]> {
  const { portalSlug, ano, empresaIds, tipo, categoria, funcaoCodigo } =
    options;

  if (tipo !== "opacidade_99" && empresaIds && empresaIds.length === 0) {
    return [];
  }

  try {
    let query = db
      .selectFrom("fct_despesas as d")
      .leftJoin("dim_orgao as o", (join) =>
        join
          .onRef("o.portal_slug", "=", "d.portal_slug")
          .onRef("o.empresa_id", "=", "d.empresa_id"),
      )
      .select([
        "d.empenho_id",
        "d.data_empenho",
        "o.orgao_nome",
        "d.orgao_codigo",
        "d.fornecedor_nome",
        "d.fornecedor_cpf_cnpj",
        "d.descricao",
        "d.natureza_despesa_codigo",
        "d.empenhado",
        "d.liquidado",
        "d.pago",
        "d.categoria_gasto_sensivel",
        "d.categoria_objeto_sugerida",
        "d.natureza_despesa_codigo_sugerido",
      ])
      .where("d.portal_slug", "=", portalSlug)
      .where("d.ano", "=", ano)
      .where("d.fonte", "=", "exercicio");

    if (tipo !== "opacidade_99" && empresaIds && empresaIds.length > 0) {
      query = query.where("d.empresa_id", "in", empresaIds);
    }

    if (tipo === "gasto_sensivel") {
      if (categoria) {
        query = query.where("d.categoria_gasto_sensivel", "=", categoria);
      } else {
        query = query.where("d.categoria_gasto_sensivel", "is not", null);
      }
    } else if (tipo === "opacidade_99") {
      query = query.where((eb) =>
        eb.or([
          eb("d.natureza_despesa_codigo", "like", "%.99"),
          eb("d.elemento", "=", "99"),
        ]),
      );
    } else if (tipo === "funcao") {
      if (funcaoCodigo) {
        query = query.where("d.funcao", "=", funcaoCodigo);
      }
    }

    const rows = await query
      .orderBy("d.pago", "desc")
      .orderBy("d.data_empenho", "desc")
      .execute();

    return rows.map((r) => {
      const orgaoNome = (r.orgao_nome ||
        r.orgao_codigo ||
        "Não informado") as string;
      const credorNome = (r.fornecedor_nome ?? "Não informado") as string;
      const credorCpfCnpj = (r.fornecedor_cpf_cnpj ?? null) as string | null;
      const objetoDescricao = (r.descricao ?? null) as string | null;
      const naturezaCodigo = (r.natureza_despesa_codigo ?? null) as
        | string
        | null;
      const categoriaSensivel = (r.categoria_gasto_sensivel ?? null) as
        | string
        | null;
      const categoriaSugerida = (r.categoria_objeto_sugerida ?? null) as
        | string
        | null;
      const naturezaCodigoSugerido = (r.natureza_despesa_codigo_sugerido ??
        null) as string | null;

      return {
        numeroEmpenho: String(r.empenho_id ?? ""),
        dataEmpenho: formatDateEmpenho(r.data_empenho),
        orgaoNome,
        credorNome,
        credorCpfCnpj,
        objetoDescricao,
        naturezaCodigo,
        valorEmpenhado: Number(r.empenhado ?? 0),
        valorLiquidado: Number(r.liquidado ?? 0),
        valorPago: Number(r.pago ?? 0),
        categoriaSensivel,
        categoriaSugerida,
        naturezaCodigoSugerido,
      };
    });
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: log de erro crítico para rastreabilidade
    console.error("[getRawDespesasExportRecords] Erro na consulta:", error);
    throw error;
  }
}

export interface RawSaldoCaixaSiconfiRecordDTO {
  ano: number;
  mesReferencia: number;
  dataReferencia: string | null;
  poderOrgao: string;
  entidadeNome: string | null;
  cnpj: string | null;
  grupoDestinacao: string;
  saldoCaixaBancos: number;
  saldoRecursosLivres: number;
  saldoRecursosVinculados: number;
}

export interface RawSaldoCaixaExportOptions {
  portalSlug: string;
  ano: number;
  mes?: number;
  entidades?: string;
}

/**
 * Consulta registros brutos de saldo em caixa e bancos do SICONFI/MSC para exportação direta em CSV (Show Your Work).
 */
export async function getRawSaldoCaixaSiconfiExportRecords(
  options: RawSaldoCaixaExportOptions,
): Promise<RawSaldoCaixaSiconfiRecordDTO[]> {
  const { portalSlug, ano, mes, entidades } = options;

  try {
    let query = db
      .selectFrom("fct_saldo_caixa_siconfi")
      .select([
        "ano",
        "mes_referencia",
        "data_referencia",
        "poder_orgao",
        "entidade_nome",
        "cnpj",
        "grupo_destinacao",
        "saldo_caixa_bancos",
        "saldo_recursos_livres",
        "saldo_recursos_vinculados",
        "ultima_competencia_flag",
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano);

    if (mes !== undefined) {
      query = query.where("mes_referencia", "=", mes);
    } else {
      query = query.where("ultima_competencia_flag", "=", true);
    }

    if (entidades === "executivo") {
      query = query.where("poder_orgao", "!=", "10132");
    } else if (entidades === "previdencia" || entidades === "caprem") {
      query = query.where("poder_orgao", "=", "10132");
    }

    const rows = await query
      .orderBy("poder_orgao", "asc")
      .orderBy("entidade_nome", "asc")
      .orderBy("saldo_caixa_bancos", "desc")
      .execute();

    return rows.map((r) => ({
      ano: Number(r.ano),
      mesReferencia: Number(r.mes_referencia),
      dataReferencia: r.data_referencia ? String(r.data_referencia) : null,
      poderOrgao: r.poder_orgao,
      entidadeNome: r.entidade_nome ?? null,
      cnpj: r.cnpj ?? null,
      grupoDestinacao: r.grupo_destinacao,
      saldoCaixaBancos: Number(r.saldo_caixa_bancos ?? 0),
      saldoRecursosLivres: Number(r.saldo_recursos_livres ?? 0),
      saldoRecursosVinculados: Number(r.saldo_recursos_vinculados ?? 0),
    }));
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: log de erro crítico para rastreabilidade
    console.error(
      "[getRawSaldoCaixaSiconfiExportRecords] Erro na consulta:",
      error,
    );
    throw error;
  }
}
