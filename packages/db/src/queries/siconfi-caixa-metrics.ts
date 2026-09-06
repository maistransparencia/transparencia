import { db } from "../client";

export interface EntidadeSaldoCaixaDTO {
  poderOrgao: string;
  entidadeNome: string | null;
  cnpj: string | null;
  empresaId: string | null;
  grupoDestinacao: string;
  saldoCaixaBancos: number;
  saldoRecursosLivres: number;
  saldoRecursosVinculados: number;
  mesReferencia: number;
  dataReferencia: string;
}

export interface SiconfiPosicaoFinanceiraDTO {
  portalSlug: string;
  ano: number;
  mesMaisRecente: number;
  dataHomologacao: string;
  totalCaixaGeral: number;
  totalRecursosLivres: number;
  totalRecursosVinculados: number;
  entidades: EntidadeSaldoCaixaDTO[];
}

export async function getSiconfiPosicaoFinanceira(
  portalSlug: string,
  ano: number,
  mes?: number,
): Promise<SiconfiPosicaoFinanceiraDTO | null> {
  if (mes !== undefined && (!Number.isInteger(mes) || mes < 1 || mes > 12)) {
    return null;
  }

  const query = (() => {
    const baseQuery = db
      .selectFrom("fct_saldo_caixa_siconfi")
      .select([
        "portal_slug",
        "ano",
        "mes_referencia",
        "poder_orgao",
        "grupo_destinacao",
        "empresa_id",
        "orgao_id",
        "orgao_nome",
        "entidade_nome",
        "cnpj",
        "data_referencia",
        "saldo_caixa_bancos",
        "saldo_recursos_livres",
        "saldo_recursos_vinculados",
        "ultima_competencia_flag",
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano);

    if (mes !== undefined) {
      return baseQuery.where("mes_referencia", "=", mes);
    }
    return baseQuery.where("ultima_competencia_flag", "=", true);
  })();

  const rows = await query.orderBy("saldo_caixa_bancos", "desc").execute();

  if (rows.length === 0) return null;

  const entidades: EntidadeSaldoCaixaDTO[] = rows.map((r) => ({
    poderOrgao: r.poder_orgao,
    entidadeNome: r.entidade_nome ?? null,
    cnpj: r.cnpj ?? null,
    empresaId: r.empresa_id ? String(r.empresa_id) : null,
    grupoDestinacao: r.grupo_destinacao,
    saldoCaixaBancos: Number(r.saldo_caixa_bancos ?? 0),
    saldoRecursosLivres: Number(r.saldo_recursos_livres ?? 0),
    saldoRecursosVinculados: Number(r.saldo_recursos_vinculados ?? 0),
    mesReferencia: Number(r.mes_referencia),
    dataReferencia: r.data_referencia ? String(r.data_referencia) : "",
  }));

  const totais = entidades.reduce(
    (acc, ent) => ({
      caixaGeral: acc.caixaGeral + ent.saldoCaixaBancos,
      recursosLivres: acc.recursosLivres + ent.saldoRecursosLivres,
      recursosVinculados: acc.recursosVinculados + ent.saldoRecursosVinculados,
    }),
    { caixaGeral: 0, recursosLivres: 0, recursosVinculados: 0 },
  );

  const mesMaisRecente = entidades.reduce(
    (max, ent) => Math.max(max, ent.mesReferencia),
    0,
  );

  const dataHomologacao = entidades.reduce(
    (latest, ent) =>
      ent.dataReferencia > latest ? ent.dataReferencia : latest,
    "",
  );

  return {
    portalSlug,
    ano,
    mesMaisRecente,
    dataHomologacao,
    totalCaixaGeral: Number(totais.caixaGeral.toFixed(2)),
    totalRecursosLivres: Number(totais.recursosLivres.toFixed(2)),
    totalRecursosVinculados: Number(totais.recursosVinculados.toFixed(2)),
    entidades,
  };
}
