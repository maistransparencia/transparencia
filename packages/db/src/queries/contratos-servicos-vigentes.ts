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
  orgaoNome?: string | null;
  ano?: number;
  contratoNumero?: string;
  licitacaoNumero?: string | null;
  licitacaoAno?: number | null;
  fontePrincipal?: string | null;
  fontesRecursos?: string | null;
  programaNome?: string | null;
  projetoAtividadeNome?: string | null;
  funcaoNome?: string | null;
  fornecedorNome: string;
  fornecedorCnpj: string;
  objetoDescricao: string;
  dataInicio: string | null;
  vencimentoAtual: string | null;
  valorContrato?: number;
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
  orgao_nome?: string | null;
  ano?: string | number | null;
  contrato_numero?: string | null;
  licitacao_numero?: string | null;
  licitacao_ano?: string | number | null;
  fonte_principal?: string | null;
  fontes_recursos?: string | null;
  programa_nome?: string | null;
  projeto_atividade_nome?: string | null;
  funcao_nome?: string | null;
  fornecedor_nome?: string | null;
  fornecedor_cnpj?: string | null;
  objeto_descricao?: string | null;
  data_inicio?: string | Date | null;
  vencimento_atual?: string | Date | null;
  valor_contrato?: string | number | null;
  valor_aditado?: string | number | null;
  total_empenhado?: string | number | null;
  total_liquidado?: string | number | null;
  total_pago?: string | number | null;
  status_execucao?: string | null;
};

function mapRowToContratoServicoVigente(
  row: ContratoRow,
): ContratoServicoVigente {
  const valorContrato = Number(row.valor_contrato ?? 0);
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
    orgaoNome: row.orgao_nome != null ? String(row.orgao_nome) : undefined,
    ano: rowAno,
    contratoNumero:
      row.contrato_numero != null ? String(row.contrato_numero) : undefined,
    licitacaoNumero:
      row.licitacao_numero != null ? String(row.licitacao_numero) : undefined,
    licitacaoAno:
      row.licitacao_ano != null && !Number.isNaN(Number(row.licitacao_ano))
        ? Number(row.licitacao_ano)
        : undefined,
    fontePrincipal:
      row.fonte_principal != null ? String(row.fonte_principal) : undefined,
    fontesRecursos:
      row.fontes_recursos != null ? String(row.fontes_recursos) : undefined,
    programaNome:
      row.programa_nome != null ? String(row.programa_nome) : undefined,
    projetoAtividadeNome:
      row.projeto_atividade_nome != null
        ? String(row.projeto_atividade_nome)
        : undefined,
    funcaoNome: row.funcao_nome != null ? String(row.funcao_nome) : undefined,
    fornecedorNome:
      row.fornecedor_nome != null ? String(row.fornecedor_nome) : "",
    fornecedorCnpj:
      row.fornecedor_cnpj != null ? String(row.fornecedor_cnpj) : "",
    objetoDescricao:
      row.objeto_descricao != null ? String(row.objeto_descricao) : "",
    dataInicio: toIsoDateString(row.data_inicio),
    vencimentoAtual: vencimentoAtualStr,
    valorContrato: valorContrato > 0 ? valorContrato : undefined,
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
      .selectFrom("fct_contratos_servicos_vigentes as csv")
      .leftJoin("dim_orgao as o", (join) =>
        join
          .onRef("o.portal_slug", "=", "csv.portal_slug")
          .onRef("o.empresa_id", "=", "csv.empresa_id"),
      )
      .leftJoin(
        db
          .selectFrom("fct_contratos")
          .select([
            "portal_slug",
            "empresa_id",
            "contrato_numero",
            "ano",
            "modalidade",
            "licitacao_numero",
            "valor_contrato",
            sql<number>`row_number() over (partition by portal_slug, empresa_id, contrato_numero order by ano asc)`.as(
              "rn",
            ),
          ])
          .as("c"),
        (join) =>
          join
            .onRef("c.portal_slug", "=", "csv.portal_slug")
            .onRef("c.empresa_id", "=", "csv.empresa_id")
            .onRef("c.contrato_numero", "=", "csv.contrato_numero")
            .on("c.rn", "=", 1),
      )
      .leftJoin(
        db
          .selectFrom("fct_contratos_recursos")
          .select([
            "portal_slug",
            "empresa_id",
            "contrato_numero",
            "orgao_nome",
            "licitacao_numero",
            "fonte_principal",
            "fontes_recursos",
            "principal_programa",
            "principal_acao",
            "principal_funcao",
            "valor_contrato",
            sql<number>`row_number() over (partition by portal_slug, empresa_id, contrato_numero order by ano desc)`.as(
              "rn",
            ),
          ])
          .as("cr"),
        (join) =>
          join
            .onRef("cr.portal_slug", "=", "csv.portal_slug")
            .onRef("cr.empresa_id", "=", "csv.empresa_id")
            .onRef("cr.contrato_numero", "=", "csv.contrato_numero")
            .on("cr.rn", "=", 1),
      )
      .select([
        "csv.contrato_servico_id",
        "csv.portal_slug",
        "csv.empresa_id",
        sql<string>`coalesce(cr.orgao_nome, o.orgao_nome, 'Órgão não identificado')`.as(
          "orgao_nome",
        ),
        "csv.ano",
        "csv.contrato_numero",
        sql<string>`coalesce(cr.licitacao_numero, c.licitacao_numero)`.as(
          "licitacao_numero",
        ),
        sql<number>`(select l.ano from fct_licitacoes l where l.portal_slug = csv.portal_slug and l.empresa_id = csv.empresa_id and l.licitacao_numero = coalesce(cr.licitacao_numero, c.licitacao_numero) order by case when c.modalidade is not null and lower(l.modalidade) = lower(c.modalidade) then 0 when c.modalidade is not null and ((lower(c.modalidade) like '%concorrencia%' and lower(l.modalidade) like '%concorrencia%') or (lower(c.modalidade) like '%dispensa%' and lower(l.modalidade) like '%dispensa%') or (lower(c.modalidade) like '%pregao%' and lower(l.modalidade) like '%pregao%') or (lower(c.modalidade) like '%tomada%' and lower(l.modalidade) like '%tomada%')) then 1 else 2 end, case when l.ano <= coalesce(c.ano, csv.ano) then 0 else 1 end, case when l.ano <= coalesce(c.ano, csv.ano) then coalesce(c.ano, csv.ano) - l.ano else 100 + (l.ano - coalesce(c.ano, csv.ano)) end asc, l.ano desc limit 1)`.as(
          "licitacao_ano",
        ),
        "cr.fonte_principal",
        "cr.fontes_recursos",
        "cr.principal_programa as programa_nome",
        "cr.principal_acao as projeto_atividade_nome",
        "cr.principal_funcao as funcao_nome",
        "csv.fornecedor_nome",
        "csv.fornecedor_cnpj",
        "csv.objeto_descricao",
        "csv.data_inicio",
        "csv.vencimento_atual",
        sql<number>`coalesce(cr.valor_contrato, c.valor_contrato, 0)`.as(
          "valor_contrato",
        ),
        "csv.valor_aditado",
        "csv.total_empenhado",
        "csv.total_liquidado",
        "csv.total_pago",
        "csv.status_execucao",
      ])
      .where("csv.portal_slug", "=", portalSlug)
      .where("csv.ano", "=", ano);

    if (empresaIds && empresaIds.length > 0) {
      query = query.where("csv.empresa_id", "in", empresaIds);
    }

    const rows = await query
      .orderBy("csv.total_pago", "asc")
      .orderBy(sql`csv.total_empenhado - csv.total_pago`, "desc")
      .execute();

    return rows.map((r) => mapRowToContratoServicoVigente(r as ContratoRow));
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
    portalSlug.trim() === "" ||
    !contratoNumeroOuId ||
    contratoNumeroOuId.trim() === ""
  ) {
    return null;
  }

  const cleanSlug = portalSlug.trim();
  const cleanTerm = contratoNumeroOuId.trim();
  const ltrimmedTerm = cleanTerm.replace(/^0+/, "");
  const canLtrim = ltrimmedTerm.length > 0;

  try {
    const query = db
      .selectFrom("fct_contratos_servicos_vigentes as csv")
      .leftJoin("dim_orgao as o", (join) =>
        join
          .onRef("o.portal_slug", "=", "csv.portal_slug")
          .onRef("o.empresa_id", "=", "csv.empresa_id"),
      )
      .leftJoin(
        db
          .selectFrom("fct_contratos")
          .select([
            "portal_slug",
            "empresa_id",
            "contrato_numero",
            "ano",
            "modalidade",
            "licitacao_numero",
            "valor_contrato",
            sql<number>`row_number() over (partition by portal_slug, empresa_id, contrato_numero order by ano asc)`.as(
              "rn",
            ),
          ])
          .as("c"),
        (join) =>
          join
            .onRef("c.portal_slug", "=", "csv.portal_slug")
            .onRef("c.empresa_id", "=", "csv.empresa_id")
            .onRef("c.contrato_numero", "=", "csv.contrato_numero")
            .on("c.rn", "=", 1),
      )
      .leftJoin(
        db
          .selectFrom("fct_contratos_recursos")
          .select([
            "portal_slug",
            "empresa_id",
            "contrato_numero",
            "orgao_nome",
            "licitacao_numero",
            "fonte_principal",
            "fontes_recursos",
            "principal_programa",
            "principal_acao",
            "principal_funcao",
            "valor_contrato",
            sql<number>`row_number() over (partition by portal_slug, empresa_id, contrato_numero order by ano desc)`.as(
              "rn",
            ),
          ])
          .as("cr"),
        (join) =>
          join
            .onRef("cr.portal_slug", "=", "csv.portal_slug")
            .onRef("cr.empresa_id", "=", "csv.empresa_id")
            .onRef("cr.contrato_numero", "=", "csv.contrato_numero")
            .on("cr.rn", "=", 1),
      )
      .select([
        "csv.contrato_servico_id",
        "csv.portal_slug",
        "csv.empresa_id",
        sql<string>`coalesce(cr.orgao_nome, o.orgao_nome, 'Órgão não identificado')`.as(
          "orgao_nome",
        ),
        "csv.ano",
        "csv.contrato_numero",
        sql<string>`coalesce(cr.licitacao_numero, c.licitacao_numero)`.as(
          "licitacao_numero",
        ),
        sql<number>`(select l.ano from fct_licitacoes l where l.portal_slug = csv.portal_slug and l.empresa_id = csv.empresa_id and l.licitacao_numero = coalesce(cr.licitacao_numero, c.licitacao_numero) order by case when c.modalidade is not null and lower(l.modalidade) = lower(c.modalidade) then 0 when c.modalidade is not null and ((lower(c.modalidade) like '%concorrencia%' and lower(l.modalidade) like '%concorrencia%') or (lower(c.modalidade) like '%dispensa%' and lower(l.modalidade) like '%dispensa%') or (lower(c.modalidade) like '%pregao%' and lower(l.modalidade) like '%pregao%') or (lower(c.modalidade) like '%tomada%' and lower(l.modalidade) like '%tomada%')) then 1 else 2 end, case when l.ano <= coalesce(c.ano, csv.ano) then 0 else 1 end, case when l.ano <= coalesce(c.ano, csv.ano) then coalesce(c.ano, csv.ano) - l.ano else 100 + (l.ano - coalesce(c.ano, csv.ano)) end asc, l.ano desc limit 1)`.as(
          "licitacao_ano",
        ),
        "cr.fonte_principal",
        "cr.fontes_recursos",
        "cr.principal_programa as programa_nome",
        "cr.principal_acao as projeto_atividade_nome",
        "cr.principal_funcao as funcao_nome",
        "csv.fornecedor_nome",
        "csv.fornecedor_cnpj",
        "csv.objeto_descricao",
        "csv.data_inicio",
        "csv.vencimento_atual",
        sql<number>`coalesce(cr.valor_contrato, c.valor_contrato, 0)`.as(
          "valor_contrato",
        ),
        "csv.valor_aditado",
        "csv.total_empenhado",
        "csv.total_liquidado",
        "csv.total_pago",
        "csv.status_execucao",
      ])
      .where("csv.portal_slug", "=", cleanSlug)
      .where((eb) =>
        eb.or([
          eb("csv.contrato_numero", "=", cleanTerm),
          eb("csv.contrato_servico_id", "=", cleanTerm),
          ...(canLtrim
            ? [
                sql<boolean>`csv.contrato_numero is not null and ltrim(csv.contrato_numero, '0') = ${ltrimmedTerm}`,
              ]
            : []),
        ]),
      );

    const baseQuery = query;

    let row =
      ano !== undefined && !Number.isNaN(ano)
        ? await baseQuery
            .where("csv.ano", "=", ano)
            .orderBy("csv.ano", "desc")
            .limit(1)
            .executeTakeFirst()
        : await baseQuery
            .orderBy("csv.ano", "desc")
            .limit(1)
            .executeTakeFirst();

    if (!row && ano !== undefined && !Number.isNaN(ano)) {
      // Fallback: se o contrato ocorreu em outro exercício (ex: plurianual ou deep-link sem ano exato), busca pelo mais recente
      row = await baseQuery
        .orderBy("csv.ano", "desc")
        .limit(1)
        .executeTakeFirst();
    }

    if (!row) {
      return null;
    }

    return mapRowToContratoServicoVigente(row as ContratoRow);
  } catch {
    return null;
  }
}
