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
  saldoCaixaAnoAnterior?: number | null;
  variacaoAnualPercentual?: number | null;
  saldoDescobertoFlag: boolean;
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
  totalCaixaGeralAnoAnterior?: number | null;
  variacaoAnualPercentual?: number | null;
  hasSaldoDescoberto: boolean;
  entidades: EntidadeSaldoCaixaDTO[];
  previdencia: EntidadeSaldoCaixaDTO[];
}

function agruparEntidades(
  rowsList: Array<{
    poder_orgao: string;
    entidade_nome: string | null;
    cnpj: string | null;
    empresa_id: string | null;
    grupo_destinacao: string;
    saldo_caixa_bancos: string | number | null;
    saldo_recursos_livres: string | number | null;
    saldo_recursos_vinculados: string | number | null;
    mes_referencia: number;
    data_referencia: string | Date | null;
  }>,
): Map<string, EntidadeSaldoCaixaDTO> {
  return rowsList.reduce<Map<string, EntidadeSaldoCaixaDTO>>((map, r) => {
    const nomeTratado = (() => {
      if (
        r.poder_orgao === "10131" &&
        (r.grupo_destinacao === "previdencia" ||
          (r.entidade_nome ?? "").toLowerCase().trim() === "previdencia")
      ) {
        return "Recursos Previdenciários (Prefeitura)";
      }
      return r.entidade_nome ?? r.poder_orgao;
    })();

    const chave = `${r.poder_orgao}_${nomeTratado.trim().toLowerCase()}`;
    const existente = map.get(chave);
    const saldoCaixa = Number(r.saldo_caixa_bancos ?? 0);
    const saldoLivres = Number(r.saldo_recursos_livres ?? 0);
    const saldoVinculados = Number(r.saldo_recursos_vinculados ?? 0);
    const mesRef = Number(r.mes_referencia);
    const dataRef = r.data_referencia ? String(r.data_referencia) : "";

    if (existente) {
      const novoSaldoCaixa = Number(
        (existente.saldoCaixaBancos + saldoCaixa).toFixed(2),
      );
      const novoSaldoLivres = Number(
        (existente.saldoRecursosLivres + saldoLivres).toFixed(2),
      );
      const novoSaldoVinculados = Number(
        (existente.saldoRecursosVinculados + saldoVinculados).toFixed(2),
      );

      map.set(chave, {
        ...existente,
        cnpj: existente.cnpj ?? r.cnpj ?? null,
        empresaId:
          existente.empresaId ?? (r.empresa_id ? String(r.empresa_id) : null),
        saldoCaixaBancos: novoSaldoCaixa,
        saldoRecursosLivres: novoSaldoLivres,
        saldoRecursosVinculados: novoSaldoVinculados,
        mesReferencia: Math.max(existente.mesReferencia, mesRef),
        dataReferencia:
          dataRef > existente.dataReferencia
            ? dataRef
            : existente.dataReferencia,
        grupoDestinacao:
          existente.grupoDestinacao !== r.grupo_destinacao
            ? "multiplos"
            : existente.grupoDestinacao,
        saldoDescobertoFlag:
          novoSaldoCaixa < 0 || novoSaldoLivres < 0 || novoSaldoVinculados < 0,
      });
    } else {
      map.set(chave, {
        poderOrgao: r.poder_orgao,
        entidadeNome: nomeTratado,
        cnpj: r.cnpj ?? null,
        empresaId: r.empresa_id ? String(r.empresa_id) : null,
        grupoDestinacao: r.grupo_destinacao,
        saldoCaixaBancos: Number(saldoCaixa.toFixed(2)),
        saldoRecursosLivres: Number(saldoLivres.toFixed(2)),
        saldoRecursosVinculados: Number(saldoVinculados.toFixed(2)),
        mesReferencia: mesRef,
        dataReferencia: dataRef,
        saldoDescobertoFlag:
          saldoCaixa < 0 || saldoLivres < 0 || saldoVinculados < 0,
      });
    }
    return map;
  }, new Map());
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
      .where("ano", "in", [ano, ano - 1]);

    if (mes !== undefined) {
      return baseQuery.where("mes_referencia", "=", mes);
    }
    return baseQuery.where("ultima_competencia_flag", "=", true);
  })();

  const allRows = await query.orderBy("saldo_caixa_bancos", "desc").execute();

  const rowsAtual = allRows.filter((r) => Number(r.ano) === ano);
  if (rowsAtual.length === 0) return null;

  const rowsAnterior = allRows.filter((r) => Number(r.ano) === ano - 1);

  const entidadesAgrupadasMap = agruparEntidades(rowsAtual);
  const entidadesAnteriorMap = agruparEntidades(rowsAnterior);

  const isPrevidencia = (ent: EntidadeSaldoCaixaDTO) =>
    ent.poderOrgao === "10132";

  const todasEntidades = Array.from(entidadesAgrupadasMap.entries())
    .map(([chave, ent]) => {
      const anterior = entidadesAnteriorMap.get(chave);
      const saldoAnterior = anterior ? anterior.saldoCaixaBancos : null;
      const variacaoAnualPercentual = (() => {
        if (saldoAnterior === null || saldoAnterior === 0) return null;
        const diff = ent.saldoCaixaBancos - saldoAnterior;
        return Number(((diff / Math.abs(saldoAnterior)) * 100).toFixed(1));
      })();

      return {
        ...ent,
        saldoCaixaAnoAnterior: saldoAnterior,
        variacaoAnualPercentual,
      };
    })
    .sort((a, b) => b.saldoCaixaBancos - a.saldoCaixaBancos);

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

  // Totais do ano anterior para comparação macro
  const entidadesAnteriorLista = Array.from(
    entidadesAnteriorMap.values(),
  ).filter((ent) => !isPrevidencia(ent));
  const totaisExecutivoAnterior = somarTotais(entidadesAnteriorLista);
  const totalCaixaGeralAnoAnterior =
    rowsAnterior.length > 0
      ? Number(totaisExecutivoAnterior.caixaGeral.toFixed(2))
      : null;

  const variacaoAnualGeralPct = (() => {
    if (
      totalCaixaGeralAnoAnterior === null ||
      totalCaixaGeralAnoAnterior === 0
    ) {
      return null;
    }
    const diff = totaisExecutivo.caixaGeral - totalCaixaGeralAnoAnterior;
    return Number(
      ((diff / Math.abs(totalCaixaGeralAnoAnterior)) * 100).toFixed(1),
    );
  })();

  const mesMaisRecente = todasEntidades.reduce(
    (max, ent) => Math.max(max, ent.mesReferencia),
    0,
  );

  const dataHomologacao = todasEntidades.reduce(
    (latest, ent) =>
      ent.dataReferencia > latest ? ent.dataReferencia : latest,
    "",
  );

  const hasSaldoDescoberto =
    entidades.some((e) => e.saldoDescobertoFlag) ||
    totaisExecutivo.recursosLivres < 0 ||
    totaisExecutivo.recursosVinculados < 0;

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
    totalCaixaGeralAnoAnterior,
    variacaoAnualPercentual: variacaoAnualGeralPct,
    hasSaldoDescoberto,
    entidades,
    previdencia,
  };
}
