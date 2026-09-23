import { sql } from "kysely";
import { db } from "../client";

export type StatusExecucaoContrato =
  | "em_execucao"
  | "concluido"
  | "inexecutado";

export interface ContratoServicoVigente {
  contratoServicoId?: string;
  portalSlug: string;
  empresaId?: string;
  ano?: number;
  contratoNumero?: string;
  fornecedorNome: string;
  fornecedorCnpj: string;
  objetoDescricao: string;
  dataInicio: string | null;
  vencimentoAtual: string | null;
  valorAditado?: number;
  totalEmpenhado: number;
  totalLiquidado: number;
  totalPago: number;
  saldoPendente: number;
  percentualPago: number;
  statusExecucao: StatusExecucaoContrato;
}

function toIsoDateString(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const str = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return null;
}

type ContratoRow = {
  contrato_servico_id?: string | number | null;
  portal_slug?: string | null;
  empresa_id?: string | number | null;
  ano?: string | number | null;
  contrato_numero?: string | null;
  fornecedor_nome?: string | null;
  fornecedor_cnpj?: string | null;
  objeto_descricao?: string | null;
  data_inicio?: string | Date | null;
  vencimento_atual?: string | Date | null;
  valor_aditado?: string | number | null;
  total_empenhado?: string | number | null;
  total_liquidado?: string | number | null;
  total_pago?: string | number | null;
  status_execucao?: string | null;
};

function mapRowToContratoServicoVigente(
  row: ContratoRow,
): ContratoServicoVigente {
  const totalEmpenhado = Number(row.total_empenhado ?? 0);
  const totalLiquidado = Number(row.total_liquidado ?? 0);
  const totalPago = Number(row.total_pago ?? 0);
  const valorAditado = Number(row.valor_aditado ?? 0);
  const saldoPendente = Math.max(0, totalEmpenhado - totalPago);
  const percentualPago =
    totalEmpenhado > 0 ? (totalPago / totalEmpenhado) * 100 : 0;

  const vencimentoAtualStr = toIsoDateString(row.vencimento_atual);
  const rowAno = Number(row.ano ?? 0);
  const rawStatus = row.status_execucao ? String(row.status_execucao) : "";
  const statusExecucao: StatusExecucaoContrato = (() => {
    if (rawStatus === "inexecutado") return "inexecutado";
    if (rawStatus === "concluido") return "concluido";
    return "em_execucao";
  })();

  return {
    contratoServicoId:
      row.contrato_servico_id != null
        ? String(row.contrato_servico_id)
        : undefined,
    portalSlug: row.portal_slug != null ? String(row.portal_slug) : "",
    empresaId: row.empresa_id != null ? String(row.empresa_id) : undefined,
    ano: rowAno,
    contratoNumero:
      row.contrato_numero != null ? String(row.contrato_numero) : undefined,
    fornecedorNome:
      row.fornecedor_nome != null ? String(row.fornecedor_nome) : "",
    fornecedorCnpj:
      row.fornecedor_cnpj != null ? String(row.fornecedor_cnpj) : "",
    objetoDescricao:
      row.objeto_descricao != null ? String(row.objeto_descricao) : "",
    dataInicio: toIsoDateString(row.data_inicio),
    vencimentoAtual: vencimentoAtualStr,
    valorAditado: valorAditado > 0 ? valorAditado : undefined,
    totalEmpenhado,
    totalLiquidado,
    totalPago,
    saldoPendente,
    percentualPago,
    statusExecucao,
  };
}

export async function getContratosServicosVigentes(
  portalSlug: string,
  ano: number,
  empresaIds?: string[],
): Promise<ContratoServicoVigente[]> {
  try {
    let query = db
      .selectFrom("fct_contratos_servicos_vigentes")
      .select([
        "contrato_servico_id",
        "portal_slug",
        "empresa_id",
        "ano",
        "contrato_numero",
        "fornecedor_nome",
        "fornecedor_cnpj",
        "objeto_descricao",
        "data_inicio",
        "vencimento_atual",
        "valor_aditado",
        "total_empenhado",
        "total_liquidado",
        "total_pago",
        "status_execucao",
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano);

    if (empresaIds && empresaIds.length > 0) {
      query = query.where("empresa_id", "in", empresaIds);
    }

    const rows = await query.orderBy("total_empenhado", "desc").execute();
    return rows.map((row) => mapRowToContratoServicoVigente(row));
  } catch {
    return [];
  }
}

export async function getContratoByNumero(
  portalSlug: string,
  contratoNumeroOuId: string,
  ano?: number,
): Promise<ContratoServicoVigente | null> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === "" ||
    !contratoNumeroOuId ||
    typeof contratoNumeroOuId !== "string" ||
    contratoNumeroOuId.trim() === ""
  ) {
    return null;
  }

  const cleanSlug = portalSlug.trim();
  const cleanTerm = contratoNumeroOuId.trim();
  const ltrimmedTerm = cleanTerm.replace(/^0+/, "");
  const canLtrim = ltrimmedTerm.length > 0;

  try {
    let query = db
      .selectFrom("fct_contratos_servicos_vigentes")
      .select([
        "contrato_servico_id",
        "portal_slug",
        "empresa_id",
        "ano",
        "contrato_numero",
        "fornecedor_nome",
        "fornecedor_cnpj",
        "objeto_descricao",
        "data_inicio",
        "vencimento_atual",
        "valor_aditado",
        "total_empenhado",
        "total_liquidado",
        "total_pago",
        "status_execucao",
      ])
      .where("portal_slug", "=", cleanSlug)
      .where((eb) =>
        eb.or([
          eb("contrato_numero", "=", cleanTerm),
          eb("contrato_servico_id", "=", cleanTerm),
          ...(canLtrim
            ? [
                sql<boolean>`contrato_numero is not null and ltrim(contrato_numero, '0') = ${ltrimmedTerm}`,
              ]
            : []),
        ]),
      );

    if (ano !== undefined && !Number.isNaN(ano)) {
      query = query.where("ano", "=", ano);
    }

    const row = await query.orderBy("ano", "desc").executeTakeFirst();

    if (!row) {
      return null;
    }

    return mapRowToContratoServicoVigente(row);
  } catch {
    return null;
  }
}
