import { db } from "../client";

export type TipoExportacao = "gasto_sensivel" | "opacidade_99" | "funcao";

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
}

function formatDateEmpenho(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
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

  if (empresaIds && empresaIds.length === 0) {
    return [];
  }

  try {
    let query = db
      .selectFrom("fct_despesas")
      .select([
        "empenho_id",
        "data_empenho",
        "entidade_nome",
        "orgao_codigo",
        "fornecedor_nome",
        "fornecedor_cpf_cnpj",
        "descricao",
        "natureza_despesa_codigo",
        "empenhado",
        "liquidado",
        "pago",
        "categoria_gasto_sensivel",
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano)
      .where("fonte", "=", "exercicio");

    if (empresaIds && empresaIds.length > 0) {
      query = query.where("empresa_id", "in", empresaIds);
    }

    if (tipo === "gasto_sensivel") {
      if (categoria) {
        query = query.where("categoria_gasto_sensivel", "=", categoria);
      } else {
        query = query.where("categoria_gasto_sensivel", "is not", null);
      }
    } else if (tipo === "opacidade_99") {
      query = query.where((eb) =>
        eb.or([
          eb("natureza_despesa_codigo", "like", "%.99"),
          eb("elemento", "=", "99"),
        ]),
      );
    } else if (tipo === "funcao") {
      if (funcaoCodigo) {
        query = query.where("funcao", "=", funcaoCodigo);
      }
    }

    const rows = await query
      .orderBy("pago", "desc")
      .orderBy("data_empenho", "desc")
      .execute();

    return rows.map((r) => {
      const orgaoNome = String(
        r.entidade_nome || r.orgao_codigo || "Não informado",
      );
      const credorNome = String(r.fornecedor_nome ?? "Não informado");
      const credorCpfCnpj = r.fornecedor_cpf_cnpj
        ? String(r.fornecedor_cpf_cnpj)
        : null;
      const objetoDescricao = r.descricao ? String(r.descricao) : null;
      const naturezaCodigo = r.natureza_despesa_codigo
        ? String(r.natureza_despesa_codigo)
        : null;
      const categoriaSensivel = r.categoria_gasto_sensivel
        ? String(r.categoria_gasto_sensivel)
        : null;

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
      };
    });
  } catch {
    return [];
  }
}
