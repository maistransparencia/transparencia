import { db } from "../client";

export interface ReceitaExtraOrcamentariaItemDTO {
  receitaExtraId: string;
  portalSlug: string;
  ano: number;
  empresaId: string;
  descricao: string;
  valorArrecadado: number;
}

export async function getReceitasExtraOrcamentariasList(
  portalSlug: string,
  ano: number,
  empresaIds: string[],
): Promise<ReceitaExtraOrcamentariaItemDTO[]> {
  if (empresaIds.length === 0) return [];

  const rows = await db
    .selectFrom("fct_receita_extra_orcamentaria")
    .select([
      "receita_extra_id",
      "portal_slug",
      "ano",
      "empresa_id",
      "descricao",
      "valor_arrecadado",
    ])
    .where("portal_slug", "=", portalSlug)
    .where("ano", "=", ano)
    .where("empresa_id", "in", empresaIds)
    .orderBy("valor_arrecadado", "desc")
    .execute();

  return rows.map((row) => ({
    receitaExtraId: row.receita_extra_id,
    portalSlug: row.portal_slug,
    ano: Number(row.ano),
    empresaId: row.empresa_id,
    descricao: row.descricao,
    valorArrecadado: Number(row.valor_arrecadado ?? 0),
  }));
}

export interface ReceitaExtraOrcamentariaOrigemDTO {
  categoria: string;
  valorArrecadado: number;
  percentualDoTotal: number;
}

export async function getReceitaExtraOrcamentariaOrigem(
  portalSlug: string,
  ano: number,
  empresaIds: string[],
): Promise<ReceitaExtraOrcamentariaOrigemDTO[]> {
  if (empresaIds.length === 0) return [];

  const rows = await db
    .selectFrom("fct_receita_extra_orcamentaria_categoria")
    .select(["categoria", (eb) => eb.fn.sum("valor_arrecadado").as("valor")])
    .where("portal_slug", "=", portalSlug)
    .where("ano", "=", ano)
    .where("empresa_id", "in", empresaIds)
    .groupBy("categoria")
    .execute();

  const categorias = rows
    .map((row) => ({
      categoria: row.categoria,
      valorArrecadado: Number(row.valor ?? 0),
    }))
    .filter((item) => item.valorArrecadado !== 0);
  const total = categorias.reduce(
    (soma, item) => soma + item.valorArrecadado,
    0,
  );

  return categorias
    .map((item) => ({
      ...item,
      percentualDoTotal: total > 0 ? (item.valorArrecadado / total) * 100 : 0,
    }))
    .sort((a, b) => b.valorArrecadado - a.valorArrecadado);
}
