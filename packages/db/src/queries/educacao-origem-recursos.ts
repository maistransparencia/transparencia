import { db } from "../client";

export const GRUPOS_FONTE_RECURSO_EDUCACAO = [
  "fundeb",
  "fundeb_complementacao_uniao",
  "salario_educacao",
  "pnae",
  "pnate",
  "outros_fnde",
  "royalties",
  "outras_receitas",
  "nao_detalhado",
] as const;

export type GrupoFonteRecursoEducacao =
  (typeof GRUPOS_FONTE_RECURSO_EDUCACAO)[number];

export interface EducacaoOrigemRecursoComposicaoDTO {
  codigoNatureza: string;
  descricaoNatureza: string;
  totalArrecadado: number;
}

export interface EducacaoOrigemRecursoHistoricoDTO {
  ano: number;
  totalArrecadado: number;
}

export interface EducacaoOrigemRecursoDTO {
  grupoFonte: GrupoFonteRecursoEducacao;
  totalArrecadado: number;
  /** Participação da fonte no total do ano, em pontos percentuais (0 a 100). */
  percentualTotal: number;
  historicoAnual: EducacaoOrigemRecursoHistoricoDTO[];
  composicao: EducacaoOrigemRecursoComposicaoDTO[];
}

export interface EducacaoOrigemRecursosDTO {
  portalSlug: string;
  ano: number;
  nomeOrgao: string | null;
  anoMin: number | null;
  anoMax: number | null;
  /** Ano em andamento (ano da última extração), quando possui linhas no mart. */
  anoParcial: number | null;
  /** Mês (1 a 12) da última extração, quando há ano parcial. */
  mesReferencia: number | null;
  totalArrecadado: number;
  fontes: EducacaoOrigemRecursoDTO[];
}

export interface GetEducacaoOrigemRecursosParams {
  portalSlug: string;
  ano: number;
}

interface OrigemRecursoRow {
  ano: number;
  grupoFonte: GrupoFonteRecursoEducacao;
  codigoNatureza: string;
  descricaoNatureza: string;
  arrecadadoReceita: number;
}

const somar = (valores: number[]): number =>
  valores.reduce((acumulado, valor) => acumulado + valor, 0);

const arredondarCentavos = (valor: number): number =>
  Math.round(valor * 100) / 100;

function agruparPor<T, K extends string | number>(
  itens: T[],
  chave: (item: T) => K,
): Map<K, T[]> {
  return itens.reduce((mapa, item) => {
    const key = chave(item);
    return new Map(mapa).set(key, [...(mapa.get(key) ?? []), item]);
  }, new Map<K, T[]>());
}

function montarHistorico(
  linhas: OrigemRecursoRow[],
): EducacaoOrigemRecursoHistoricoDTO[] {
  return [...agruparPor(linhas, (linha) => linha.ano).entries()]
    .map(([ano, doAno]) => ({
      ano,
      totalArrecadado: arredondarCentavos(
        somar(doAno.map((linha) => linha.arrecadadoReceita)),
      ),
    }))
    .sort((a, b) => a.ano - b.ano);
}

function montarComposicao(
  linhas: OrigemRecursoRow[],
): EducacaoOrigemRecursoComposicaoDTO[] {
  return [...agruparPor(linhas, (linha) => linha.codigoNatureza).entries()]
    .map(([codigoNatureza, doCodigo]) => ({
      codigoNatureza,
      descricaoNatureza: doCodigo[0]?.descricaoNatureza ?? "",
      totalArrecadado: arredondarCentavos(
        somar(doCodigo.map((linha) => linha.arrecadadoReceita)),
      ),
    }))
    .filter((item) => item.totalArrecadado !== 0)
    .sort(
      (a, b) =>
        b.totalArrecadado - a.totalArrecadado ||
        a.codigoNatureza.localeCompare(b.codigoNatureza),
    );
}

const PADRAO_DATA_EXTRACAO = /^(\d{4})-(\d{2})-\d{2}/;

function lerDataExtracao(valor: unknown): { ano: number; mes: number } | null {
  const partes = PADRAO_DATA_EXTRACAO.exec(String(valor ?? "").trim());
  if (!partes) return null;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  return mes >= 1 && mes <= 12 ? { ano, mes } : null;
}

/**
 * Origem dos recursos do(s) órgão(s) de Educação do portal: receitas orçamentárias
 * arrecadadas no ano, agrupadas por fonte, com participação, série anual e composição.
 *
 * Retorna `null` quando o portal não possui órgão de Educação identificado.
 * Somente fontes com valor no ano entram em `fontes`, em ordem fixa por grupo.
 */
export async function getEducacaoOrigemRecursos({
  portalSlug,
  ano,
}: GetEducacaoOrigemRecursosParams): Promise<EducacaoOrigemRecursosDTO | null> {
  const cleanSlug = portalSlug?.trim();
  if (!cleanSlug) {
    return null;
  }

  const orgaos = await db
    .selectFrom("dim_orgao")
    .select("orgao_nome")
    .where("portal_slug", "=", cleanSlug)
    .where("orgao_nome", "ilike", "%edu%")
    .orderBy("orgao_nome", "asc")
    .execute();

  if (orgaos.length === 0) {
    return null;
  }

  const metadado = await db
    .selectFrom("dim_metadata")
    .select("value")
    .where("portal_slug", "=", cleanSlug)
    .where("key", "=", "last_extracted_at")
    .executeTakeFirst();

  const rows = await db
    .selectFrom("fct_educacao_origem_recursos_metricas")
    .select([
      "ano",
      "grupo_fonte",
      "codigo_natureza",
      "descricao_natureza",
      "arrecadado_receita",
    ])
    .where("portal_slug", "=", cleanSlug)
    .execute();

  const linhas: OrigemRecursoRow[] = rows.map((row) => ({
    ano: Number(row.ano),
    grupoFonte: row.grupo_fonte as GrupoFonteRecursoEducacao,
    codigoNatureza: String(row.codigo_natureza),
    descricaoNatureza: String(row.descricao_natureza ?? row.codigo_natureza),
    arrecadadoReceita: Number(row.arrecadado_receita ?? 0),
  }));

  const anos = linhas.map((linha) => linha.ano);
  const extracao = lerDataExtracao(metadado?.value);
  const parcial = extracao && anos.includes(extracao.ano) ? extracao : null;
  const porGrupo = agruparPor(linhas, (linha) => linha.grupoFonte);

  const fontesDoAno = GRUPOS_FONTE_RECURSO_EDUCACAO.map((grupoFonte) => {
    const doGrupo = porGrupo.get(grupoFonte) ?? [];
    const doAno = doGrupo.filter((linha) => linha.ano === ano);
    return {
      grupoFonte,
      doGrupo,
      doAno,
      total: arredondarCentavos(
        somar(doAno.map((linha) => linha.arrecadadoReceita)),
      ),
    };
  }).filter((fonte) => fonte.total > 0);

  const totalArrecadado = arredondarCentavos(
    somar(fontesDoAno.map((fonte) => fonte.total)),
  );

  const fontes: EducacaoOrigemRecursoDTO[] = fontesDoAno.map((fonte) => ({
    grupoFonte: fonte.grupoFonte,
    totalArrecadado: fonte.total,
    percentualTotal:
      totalArrecadado > 0 ? (fonte.total / totalArrecadado) * 100 : 0,
    historicoAnual: montarHistorico(fonte.doGrupo),
    composicao:
      fonte.grupoFonte === "nao_detalhado" ? [] : montarComposicao(fonte.doAno),
  }));

  return {
    portalSlug: cleanSlug,
    ano,
    nomeOrgao: [
      ...new Set(orgaos.map((orgao) => String(orgao.orgao_nome))),
    ].join(" / "),
    anoMin: anos.length > 0 ? Math.min(...anos) : null,
    anoMax: anos.length > 0 ? Math.max(...anos) : null,
    anoParcial: parcial?.ano ?? null,
    mesReferencia: parcial?.mes ?? null,
    totalArrecadado,
    fontes,
  };
}
