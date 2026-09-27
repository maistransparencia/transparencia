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
    orgaoNome: row.orgao_nome != null ? String(row.orgao_nome) : undefined,
    ano: rowAno,
    contratoNumero:
      row.contrato_numero != null ? String(row.contrato_numero) : undefined,
    licitacaoNumero:
      row.licitacao_numero != null ? String(row.licitacao_numero) : undefined,
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
      .leftJoin("fct_contratos as c", (join) =>
        join
          .onRef("c.portal_slug", "=", "csv.portal_slug")
          .onRef("c.empresa_id", "=", "csv.empresa_id")
          .onRef("c.contrato_numero", "=", "csv.contrato_numero"),
      )
      .leftJoin(
        db
          .selectFrom("fct_despesas")
          .select([
            "portal_slug",
            "empresa_id",
            "ano",
            sql<string>`split_part(licitacao_numero, '/', 1)`.as(
              "licitacao_clean",
            ),
            sql<string>`regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')`.as(
              "cnpj_clean",
            ),
            sql<string>`string_agg(distinct fonte_recurso_desc, '; ') filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != '')`.as(
              "fontes_recursos",
            ),
            sql<string>`(array_agg(fonte_recurso_desc order by empenhado_liquido desc) filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != ''))[1]`.as(
              "fonte_principal",
            ),
            sql<string>`(array_agg(funcao_nome order by empenhado_liquido desc) filter (where funcao_nome is not null))[1]`.as(
              "funcao_nome",
            ),
            sql<string>`(array_agg(programa_nome order by empenhado_liquido desc) filter (where programa_nome is not null))[1]`.as(
              "programa_nome",
            ),
            sql<string>`(array_agg(projeto_atividade_nome order by empenhado_liquido desc) filter (where projeto_atividade_nome is not null))[1]`.as(
              "projeto_atividade_nome",
            ),
          ])
          .where("licitacao_numero", "is not", null)
          .where("fonte_recurso_desc", "is not", null)
          .groupBy([
            "portal_slug",
            "empresa_id",
            "ano",
            sql`split_part(licitacao_numero, '/', 1)`,
            sql`regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')`,
          ])
          .as("fd"),
        (join) =>
          join
            .onRef("fd.portal_slug", "=", "csv.portal_slug")
            .onRef("fd.empresa_id", "=", "csv.empresa_id")
            .onRef("fd.ano", "=", "csv.ano")
            .onRef(sql`fd.licitacao_clean`, "=", "c.licitacao_numero")
            .onRef(
              sql`fd.cnpj_clean`,
              "=",
              sql`regexp_replace(csv.fornecedor_cnpj, '[^\d]', '', 'g')`,
            ),
      )
      .leftJoin(
        db
          .selectFrom("fct_despesas")
          .select([
            "portal_slug",
            "empresa_id",
            sql<string>`split_part(licitacao_numero, '/', 1)`.as(
              "licitacao_clean",
            ),
            sql<string>`regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')`.as(
              "cnpj_clean",
            ),
            sql<string>`string_agg(distinct fonte_recurso_desc, '; ') filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != '')`.as(
              "fontes_recursos",
            ),
            sql<string>`(array_agg(fonte_recurso_desc order by empenhado_liquido desc) filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != ''))[1]`.as(
              "fonte_principal",
            ),
            sql<string>`(array_agg(funcao_nome order by empenhado_liquido desc) filter (where funcao_nome is not null))[1]`.as(
              "funcao_nome",
            ),
            sql<string>`(array_agg(programa_nome order by empenhado_liquido desc) filter (where programa_nome is not null))[1]`.as(
              "programa_nome",
            ),
            sql<string>`(array_agg(projeto_atividade_nome order by empenhado_liquido desc) filter (where projeto_atividade_nome is not null))[1]`.as(
              "projeto_atividade_nome",
            ),
          ])
          .where("licitacao_numero", "is not", null)
          .where("fonte_recurso_desc", "is not", null)
          .groupBy([
            "portal_slug",
            "empresa_id",
            sql`split_part(licitacao_numero, '/', 1)`,
            sql`regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')`,
          ])
          .as("fd_all"),
        (join) =>
          join
            .onRef("fd_all.portal_slug", "=", "csv.portal_slug")
            .onRef("fd_all.empresa_id", "=", "csv.empresa_id")
            .onRef(sql`fd_all.licitacao_clean`, "=", "c.licitacao_numero")
            .onRef(
              sql`fd_all.cnpj_clean`,
              "=",
              sql`regexp_replace(csv.fornecedor_cnpj, '[^\d]', '', 'g')`,
            ),
      )
      .leftJoin(
        db
          .selectFrom("fct_despesas")
          .select([
            "portal_slug",
            "empresa_id",
            "ano",
            sql<string>`regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')`.as(
              "cnpj_clean",
            ),
            sql<string>`string_agg(distinct fonte_recurso_desc, '; ') filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != '')`.as(
              "fontes_recursos",
            ),
            sql<string>`(array_agg(fonte_recurso_desc order by empenhado_liquido desc) filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != ''))[1]`.as(
              "fonte_principal",
            ),
            sql<string>`(array_agg(funcao_nome order by empenhado_liquido desc) filter (where funcao_nome is not null))[1]`.as(
              "funcao_nome",
            ),
            sql<string>`(array_agg(programa_nome order by empenhado_liquido desc) filter (where programa_nome is not null))[1]`.as(
              "programa_nome",
            ),
            sql<string>`(array_agg(projeto_atividade_nome order by empenhado_liquido desc) filter (where projeto_atividade_nome is not null))[1]`.as(
              "projeto_atividade_nome",
            ),
          ])
          .where("licitacao_numero", "is", null)
          .where("fonte_recurso_desc", "is not", null)
          .groupBy([
            "portal_slug",
            "empresa_id",
            "ano",
            sql`regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')`,
          ])
          .as("fd_sem_lic"),
        (join) =>
          join
            .onRef("fd_sem_lic.portal_slug", "=", "csv.portal_slug")
            .onRef("fd_sem_lic.empresa_id", "=", "csv.empresa_id")
            .onRef("fd_sem_lic.ano", "=", "csv.ano")
            .onRef(
              sql`fd_sem_lic.cnpj_clean`,
              "=",
              sql`regexp_replace(csv.fornecedor_cnpj, '[^\d]', '', 'g')`,
            ),
      )
      .select([
        "csv.contrato_servico_id",
        "csv.portal_slug",
        "csv.empresa_id",
        "o.orgao_nome",
        "csv.ano",
        "csv.contrato_numero",
        "c.licitacao_numero",
        sql<string>`coalesce(fd.fonte_principal, fd_all.fonte_principal, fd_sem_lic.fonte_principal)`.as(
          "fonte_principal",
        ),
        sql<string>`coalesce(fd.fontes_recursos, fd_all.fontes_recursos, fd_sem_lic.fontes_recursos)`.as(
          "fontes_recursos",
        ),
        sql<string>`coalesce(fd.programa_nome, fd_all.programa_nome, fd_sem_lic.programa_nome)`.as(
          "programa_nome",
        ),
        sql<string>`coalesce(fd.projeto_atividade_nome, fd_all.projeto_atividade_nome, fd_sem_lic.projeto_atividade_nome)`.as(
          "projeto_atividade_nome",
        ),
        sql<string>`coalesce(fd.funcao_nome, fd_all.funcao_nome, fd_sem_lic.funcao_nome)`.as(
          "funcao_nome",
        ),
        "csv.fornecedor_nome",
        "csv.fornecedor_cnpj",
        "csv.objeto_descricao",
        "csv.data_inicio",
        "csv.vencimento_atual",
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
    let query = db
      .selectFrom("fct_contratos_servicos_vigentes as csv")
      .leftJoin("dim_orgao as o", (join) =>
        join
          .onRef("o.portal_slug", "=", "csv.portal_slug")
          .onRef("o.empresa_id", "=", "csv.empresa_id"),
      )
      .leftJoin("fct_contratos as c", (join) =>
        join
          .onRef("c.portal_slug", "=", "csv.portal_slug")
          .onRef("c.empresa_id", "=", "csv.empresa_id")
          .onRef("c.contrato_numero", "=", "csv.contrato_numero"),
      )
      .leftJoin(
        db
          .selectFrom("fct_despesas")
          .select([
            "portal_slug",
            "empresa_id",
            "ano",
            sql<string>`split_part(licitacao_numero, '/', 1)`.as(
              "licitacao_clean",
            ),
            sql<string>`regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')`.as(
              "cnpj_clean",
            ),
            sql<string>`string_agg(distinct fonte_recurso_desc, '; ') filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != '')`.as(
              "fontes_recursos",
            ),
            sql<string>`(array_agg(fonte_recurso_desc order by empenhado_liquido desc) filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != ''))[1]`.as(
              "fonte_principal",
            ),
            sql<string>`(array_agg(funcao_nome order by empenhado_liquido desc) filter (where funcao_nome is not null))[1]`.as(
              "funcao_nome",
            ),
            sql<string>`(array_agg(programa_nome order by empenhado_liquido desc) filter (where programa_nome is not null))[1]`.as(
              "programa_nome",
            ),
            sql<string>`(array_agg(projeto_atividade_nome order by empenhado_liquido desc) filter (where projeto_atividade_nome is not null))[1]`.as(
              "projeto_atividade_nome",
            ),
          ])
          .where("licitacao_numero", "is not", null)
          .where("fonte_recurso_desc", "is not", null)
          .groupBy([
            "portal_slug",
            "empresa_id",
            "ano",
            sql`split_part(licitacao_numero, '/', 1)`,
            sql`regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')`,
          ])
          .as("fd"),
        (join) =>
          join
            .onRef("fd.portal_slug", "=", "csv.portal_slug")
            .onRef("fd.empresa_id", "=", "csv.empresa_id")
            .onRef("fd.ano", "=", "csv.ano")
            .onRef(sql`fd.licitacao_clean`, "=", "c.licitacao_numero")
            .onRef(
              sql`fd.cnpj_clean`,
              "=",
              sql`regexp_replace(csv.fornecedor_cnpj, '[^\d]', '', 'g')`,
            ),
      )
      .leftJoin(
        db
          .selectFrom("fct_despesas")
          .select([
            "portal_slug",
            "empresa_id",
            sql<string>`split_part(licitacao_numero, '/', 1)`.as(
              "licitacao_clean",
            ),
            sql<string>`regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')`.as(
              "cnpj_clean",
            ),
            sql<string>`string_agg(distinct fonte_recurso_desc, '; ') filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != '')`.as(
              "fontes_recursos",
            ),
            sql<string>`(array_agg(fonte_recurso_desc order by empenhado_liquido desc) filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != ''))[1]`.as(
              "fonte_principal",
            ),
            sql<string>`(array_agg(funcao_nome order by empenhado_liquido desc) filter (where funcao_nome is not null))[1]`.as(
              "funcao_nome",
            ),
            sql<string>`(array_agg(programa_nome order by empenhado_liquido desc) filter (where programa_nome is not null))[1]`.as(
              "programa_nome",
            ),
            sql<string>`(array_agg(projeto_atividade_nome order by empenhado_liquido desc) filter (where projeto_atividade_nome is not null))[1]`.as(
              "projeto_atividade_nome",
            ),
          ])
          .where("licitacao_numero", "is not", null)
          .where("fonte_recurso_desc", "is not", null)
          .groupBy([
            "portal_slug",
            "empresa_id",
            sql`split_part(licitacao_numero, '/', 1)`,
            sql`regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')`,
          ])
          .as("fd_all"),
        (join) =>
          join
            .onRef("fd_all.portal_slug", "=", "csv.portal_slug")
            .onRef("fd_all.empresa_id", "=", "csv.empresa_id")
            .onRef(sql`fd_all.licitacao_clean`, "=", "c.licitacao_numero")
            .onRef(
              sql`fd_all.cnpj_clean`,
              "=",
              sql`regexp_replace(csv.fornecedor_cnpj, '[^\d]', '', 'g')`,
            ),
      )
      .leftJoin(
        db
          .selectFrom("fct_despesas")
          .select([
            "portal_slug",
            "empresa_id",
            "ano",
            sql<string>`regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')`.as(
              "cnpj_clean",
            ),
            sql<string>`string_agg(distinct fonte_recurso_desc, '; ') filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != '')`.as(
              "fontes_recursos",
            ),
            sql<string>`(array_agg(fonte_recurso_desc order by empenhado_liquido desc) filter (where fonte_recurso_desc is not null and trim(fonte_recurso_desc) != ''))[1]`.as(
              "fonte_principal",
            ),
            sql<string>`(array_agg(funcao_nome order by empenhado_liquido desc) filter (where funcao_nome is not null))[1]`.as(
              "funcao_nome",
            ),
            sql<string>`(array_agg(programa_nome order by empenhado_liquido desc) filter (where programa_nome is not null))[1]`.as(
              "programa_nome",
            ),
            sql<string>`(array_agg(projeto_atividade_nome order by empenhado_liquido desc) filter (where projeto_atividade_nome is not null))[1]`.as(
              "projeto_atividade_nome",
            ),
          ])
          .where("licitacao_numero", "is", null)
          .where("fonte_recurso_desc", "is not", null)
          .groupBy([
            "portal_slug",
            "empresa_id",
            "ano",
            sql`regexp_replace(fornecedor_cpf_cnpj, '[^\d]', '', 'g')`,
          ])
          .as("fd_sem_lic"),
        (join) =>
          join
            .onRef("fd_sem_lic.portal_slug", "=", "csv.portal_slug")
            .onRef("fd_sem_lic.empresa_id", "=", "csv.empresa_id")
            .onRef("fd_sem_lic.ano", "=", "csv.ano")
            .onRef(
              sql`fd_sem_lic.cnpj_clean`,
              "=",
              sql`regexp_replace(csv.fornecedor_cnpj, '[^\d]', '', 'g')`,
            ),
      )
      .select([
        "csv.contrato_servico_id",
        "csv.portal_slug",
        "csv.empresa_id",
        "o.orgao_nome",
        "csv.ano",
        "csv.contrato_numero",
        "c.licitacao_numero",
        sql<string>`coalesce(fd.fonte_principal, fd_all.fonte_principal, fd_sem_lic.fonte_principal)`.as(
          "fonte_principal",
        ),
        sql<string>`coalesce(fd.fontes_recursos, fd_all.fontes_recursos, fd_sem_lic.fontes_recursos)`.as(
          "fontes_recursos",
        ),
        sql<string>`coalesce(fd.programa_nome, fd_all.programa_nome, fd_sem_lic.programa_nome)`.as(
          "programa_nome",
        ),
        sql<string>`coalesce(fd.projeto_atividade_nome, fd_all.projeto_atividade_nome, fd_sem_lic.projeto_atividade_nome)`.as(
          "projeto_atividade_nome",
        ),
        sql<string>`coalesce(fd.funcao_nome, fd_all.funcao_nome, fd_sem_lic.funcao_nome)`.as(
          "funcao_nome",
        ),
        "csv.fornecedor_nome",
        "csv.fornecedor_cnpj",
        "csv.objeto_descricao",
        "csv.data_inicio",
        "csv.vencimento_atual",
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

    if (ano !== undefined && !Number.isNaN(ano)) {
      query = query.where("csv.ano", "=", ano);
    }

    const row = await query.orderBy("csv.ano", "desc").executeTakeFirst();

    if (!row) {
      return null;
    }

    return mapRowToContratoServicoVigente(row as ContratoRow);
  } catch {
    return null;
  }
}
