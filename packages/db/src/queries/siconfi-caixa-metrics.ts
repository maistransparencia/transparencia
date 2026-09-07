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
  totalCaixaPrevidencia: number;
  totalRecursosPrevidencia: number;
  entidades: EntidadeSaldoCaixaDTO[];
  previdencia: EntidadeSaldoCaixaDTO[];
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

  // Agrupar linhas por entidade para consolidar grupos de destinação múltiplos (livre + vinculados) em um único card por entidade
  const entidadesAgrupadasMap = rows.reduce<Map<string, EntidadeSaldoCaixaDTO>>(
    (map, r) => {
      const chave = (r.entidade_nome ?? r.poder_orgao).trim().toLowerCase();
      const existente = map.get(chave);
      const saldoCaixa = Number(r.saldo_caixa_bancos ?? 0);
      const saldoLivres = Number(r.saldo_recursos_livres ?? 0);
      const saldoVinculados = Number(r.saldo_recursos_vinculados ?? 0);
      const mesRef = Number(r.mes_referencia);
      const dataRef = r.data_referencia ? String(r.data_referencia) : "";

      if (existente) {
        existente.cnpj = existente.cnpj ?? r.cnpj ?? null;
        existente.empresaId =
          existente.empresaId ?? (r.empresa_id ? String(r.empresa_id) : null);
        existente.saldoCaixaBancos = Number(
          (existente.saldoCaixaBancos + saldoCaixa).toFixed(2),
        );
        existente.saldoRecursosLivres = Number(
          (existente.saldoRecursosLivres + saldoLivres).toFixed(2),
        );
        existente.saldoRecursosVinculados = Number(
          (existente.saldoRecursosVinculados + saldoVinculados).toFixed(2),
        );
        existente.mesReferencia = Math.max(existente.mesReferencia, mesRef);
        existente.dataReferencia =
          dataRef > existente.dataReferencia
            ? dataRef
            : existente.dataReferencia;
        if (existente.grupoDestinacao !== r.grupo_destinacao) {
          existente.grupoDestinacao = "multiplos";
        }
      } else {
        map.set(chave, {
          poderOrgao: r.poder_orgao,
          entidadeNome: r.entidade_nome ?? null,
          cnpj: r.cnpj ?? null,
          empresaId: r.empresa_id ? String(r.empresa_id) : null,
          grupoDestinacao: r.grupo_destinacao,
          saldoCaixaBancos: Number(saldoCaixa.toFixed(2)),
          saldoRecursosLivres: Number(saldoLivres.toFixed(2)),
          saldoRecursosVinculados: Number(saldoVinculados.toFixed(2)),
          mesReferencia: mesRef,
          dataReferencia: dataRef,
        });
      }
      return map;
    },
    new Map(),
  );

  const todasEntidades = Array.from(entidadesAgrupadasMap.values()).sort(
    (a, b) => b.saldoCaixaBancos - a.saldoCaixaBancos,
  );

  const isPrevidencia = (ent: EntidadeSaldoCaixaDTO) => {
    const nome = (ent.entidadeNome ?? "").toLowerCase();
    return (
      ent.poderOrgao === "10132" ||
      ent.grupoDestinacao === "previdencia" ||
      nome.includes("previdência") ||
      nome.includes("previdencia") ||
      nome.includes("caprem")
    );
  };

  const entidades = todasEntidades.filter((ent) => !isPrevidencia(ent));
  const previdencia = todasEntidades.filter((ent) => isPrevidencia(ent));

  const somarTotais = (lista: EntidadeSaldoCaixaDTO[]) =>
    lista.reduce(
      (acc, ent) => ({
        caixaGeral: acc.caixaGeral + ent.saldoCaixaBancos,
        recursosLivres: acc.recursosLivres + ent.saldoRecursosLivres,
        recursosVinculados:
          acc.recursosVinculados + ent.saldoRecursosVinculados,
      }),
      { caixaGeral: 0, recursosLivres: 0, recursosVinculados: 0 },
    );

  const totaisExecutivo = somarTotais(entidades);
  const totaisPrevidencia = somarTotais(previdencia);

  const mesMaisRecente = todasEntidades.reduce(
    (max, ent) => Math.max(max, ent.mesReferencia),
    0,
  );

  const dataHomologacao = todasEntidades.reduce(
    (latest, ent) =>
      ent.dataReferencia > latest ? ent.dataReferencia : latest,
    "",
  );

  return {
    portalSlug,
    ano,
    mesMaisRecente,
    dataHomologacao,
    totalCaixaGeral: Number(totaisExecutivo.caixaGeral.toFixed(2)),
    totalRecursosLivres: Number(totaisExecutivo.recursosLivres.toFixed(2)),
    totalRecursosVinculados: Number(
      totaisExecutivo.recursosVinculados.toFixed(2),
    ),
    totalCaixaPrevidencia: Number(totaisPrevidencia.caixaGeral.toFixed(2)),
    totalRecursosPrevidencia: Number(
      totaisPrevidencia.recursosVinculados.toFixed(2),
    ),
    entidades,
    previdencia,
  };
}
