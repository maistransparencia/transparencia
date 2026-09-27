import { sql } from "kysely";
import { db } from "../client";

export interface ContratoRecursoDTO {
  contratoRecursoId: string;
  contratoId: string;
  portalSlug: string;
  ano: number;
  empresaId: string;
  orgaoId: string | null;
  orgaoNome: string;
  contratoNumero: string | null;
  licitacaoNumero: string | null;
  fornecedorNome: string | null;
  fornecedorCpfCnpj: string | null;
  valorContrato: number;
  valorAditado: number;
  totalEmpenhado: number;
  totalLiquidado: number;
  totalPago: number;
  saldoAPagar: number;
  fontePrincipal?: string;
  fontesRecursos: string;
  principalFuncao: string;
  principalPrograma?: string | null;
  principalAcao?: string | null;
}

export interface GetContratosRecursosParams {
  portalSlug: string;
  ano?: number;
  empresaIds?: string[];
  licitacaoNumero?: string;
  limit?: number;
}

export interface GetContratoDetalheParams {
  portalSlug: string;
  contratoNumeroOuId: string;
  ano?: number;
}

type ContratoRecursoRow = {
  contrato_recurso_id: string;
  contrato_id: string;
  portal_slug: string;
  ano: number;
  empresa_id: string;
  orgao_id: string | null;
  orgao_nome: string | null;
  contrato_numero: string | null;
  licitacao_numero: string | null;
  fornecedor_nome: string | null;
  fornecedor_cpf_cnpj: string | null;
  valor_contrato: string | number | null;
  valor_aditado: string | number | null;
  total_empenhado: string | number | null;
  total_liquidado: string | number | null;
  total_pago: string | number | null;
  saldo_a_pagar: string | number | null;
  fonte_principal?: string | null;
  fontes_recursos: string | null;
  principal_funcao: string | null;
  principal_programa?: string | null;
  principal_acao?: string | null;
};

function mapRowToContratoRecursoDTO(
  row: ContratoRecursoRow,
): ContratoRecursoDTO {
  return {
    contratoRecursoId: String(row.contrato_recurso_id),
    contratoId: String(row.contrato_id),
    portalSlug: String(row.portal_slug),
    ano: Number(row.ano),
    empresaId: String(row.empresa_id),
    orgaoId: row.orgao_id != null ? String(row.orgao_id) : null,
    orgaoNome:
      row.orgao_nome != null
        ? String(row.orgao_nome)
        : "Órgão não identificado",
    contratoNumero:
      row.contrato_numero != null ? String(row.contrato_numero) : null,
    licitacaoNumero:
      row.licitacao_numero != null ? String(row.licitacao_numero) : null,
    fornecedorNome:
      row.fornecedor_nome != null ? String(row.fornecedor_nome) : null,
    fornecedorCpfCnpj:
      row.fornecedor_cpf_cnpj != null ? String(row.fornecedor_cpf_cnpj) : null,
    valorContrato: Number(row.valor_contrato ?? 0),
    valorAditado: Number(row.valor_aditado ?? 0),
    totalEmpenhado: Number(row.total_empenhado ?? 0),
    totalLiquidado: Number(row.total_liquidado ?? 0),
    totalPago: Number(row.total_pago ?? 0),
    saldoAPagar: Number(row.saldo_a_pagar ?? 0),
    fontePrincipal:
      row.fonte_principal != null ? String(row.fonte_principal) : undefined,
    fontesRecursos:
      row.fontes_recursos != null
        ? String(row.fontes_recursos)
        : "Recursos Próprios / Ordinários",
    principalFuncao:
      row.principal_funcao != null
        ? String(row.principal_funcao)
        : "Administração Geral",
    principalPrograma:
      row.principal_programa != null ? String(row.principal_programa) : null,
    principalAcao:
      row.principal_acao != null ? String(row.principal_acao) : null,
  };
}

/**
 * Retorna lista analítica de contratos enriquecida com o órgão responsável
 * e suas respectivas fontes de recursos orçamentários.
 */
export async function getContratosComRecursos(
  params: GetContratosRecursosParams,
): Promise<ContratoRecursoDTO[]> {
  const cleanSlug = (params.portalSlug ?? "").trim();
  if (!cleanSlug) return [];

  try {
    let query = db
      .selectFrom("fct_contratos_recursos")
      .select([
        "contrato_recurso_id",
        "contrato_id",
        "portal_slug",
        "ano",
        "empresa_id",
        "orgao_id",
        "orgao_nome",
        "contrato_numero",
        "licitacao_numero",
        "fornecedor_nome",
        "fornecedor_cpf_cnpj",
        "valor_contrato",
        "valor_aditado",
        "total_empenhado",
        "total_liquidado",
        "total_pago",
        "saldo_a_pagar",
        "fonte_principal",
        "fontes_recursos",
        "principal_funcao",
        "principal_programa",
        "principal_acao",
      ])
      .where("portal_slug", "=", cleanSlug);

    if (params.ano !== undefined && !Number.isNaN(params.ano)) {
      query = query.where("ano", "=", params.ano);
    }

    if (params.empresaIds && params.empresaIds.length > 0) {
      query = query.where("empresa_id", "in", params.empresaIds);
    }

    if (params.licitacaoNumero) {
      query = query.where("licitacao_numero", "=", params.licitacaoNumero);
    }

    query = query
      .orderBy("total_empenhado", "desc")
      .orderBy("valor_contrato", "desc")
      .orderBy("contrato_numero", "asc");

    if (params.limit && params.limit > 0) {
      query = query.limit(params.limit);
    }

    const rows = await query.execute();
    return rows.map((r) => mapRowToContratoRecursoDTO(r as ContratoRecursoRow));
  } catch {
    return [];
  }
}

/**
 * Retorna o detalhe orçamentário e contratual de um contrato específico
 * pelo seu número de contrato ou ID surrogate.
 */
export async function getContratoRecursosDetalhe(
  params: GetContratoDetalheParams,
): Promise<ContratoRecursoDTO | null> {
  const cleanSlug = (params.portalSlug ?? "").trim();
  const cleanTerm = (params.contratoNumeroOuId ?? "").trim();
  if (!cleanSlug || !cleanTerm) return null;

  const ltrimmedTerm = cleanTerm.replace(/^0+/, "");
  const canLtrim = ltrimmedTerm.length > 0;

  try {
    let query = db
      .selectFrom("fct_contratos_recursos")
      .select([
        "contrato_recurso_id",
        "contrato_id",
        "portal_slug",
        "ano",
        "empresa_id",
        "orgao_id",
        "orgao_nome",
        "contrato_numero",
        "licitacao_numero",
        "fornecedor_nome",
        "fornecedor_cpf_cnpj",
        "valor_contrato",
        "valor_aditado",
        "total_empenhado",
        "total_liquidado",
        "total_pago",
        "saldo_a_pagar",
        "fonte_principal",
        "fontes_recursos",
        "principal_funcao",
        "principal_programa",
        "principal_acao",
      ])
      .where("portal_slug", "=", cleanSlug)
      .where((eb) =>
        eb.or([
          eb("contrato_numero", "=", cleanTerm),
          eb("contrato_id", "=", cleanTerm),
          eb("contrato_recurso_id", "=", cleanTerm),
          ...(canLtrim
            ? [
                sql<boolean>`contrato_numero is not null and ltrim(contrato_numero, '0') = ${ltrimmedTerm}`,
              ]
            : []),
        ]),
      );

    if (params.ano !== undefined && !Number.isNaN(params.ano)) {
      query = query.where("ano", "=", params.ano);
    }

    const row = await query.orderBy("ano", "desc").executeTakeFirst();
    if (!row) return null;

    return mapRowToContratoRecursoDTO(row as ContratoRecursoRow);
  } catch {
    return null;
  }
}
