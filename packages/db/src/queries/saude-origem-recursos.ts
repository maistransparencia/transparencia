import { db } from "../client";

export const GRUPOS_FONTE_RECURSO_SAUDE = [
  "uniao",
  "estado",
  "outras_receitas",
  "nao_detalhado",
] as const;

export type GrupoFonteRecursoSaude =
  (typeof GRUPOS_FONTE_RECURSO_SAUDE)[number];

export interface SaudeOrigemRecursoComposicaoDTO {
  codigoNatureza: string;
  descricaoNatureza: string;
  totalArrecadado: number;
}

export interface SaudeOrigemRecursoHistoricoDTO {
  ano: number;
  totalArrecadado: number;
}

export interface SaudeOrigemRecursoDTO {
  grupoFonte: GrupoFonteRecursoSaude;
  totalArrecadado: number;
  /** Participação da fonte no total do ano, em pontos percentuais (0 a 100). */
  percentualTotal: number;
  historicoAnual: SaudeOrigemRecursoHistoricoDTO[];
  composicao: SaudeOrigemRecursoComposicaoDTO[];
}

export interface SaudeOrigemRecursosDTO {
  portalSlug: string;
  ano: number;
  nomeOrgao: string | null;
  anoMin: number | null;
  anoMax: number | null;
  /** Ano em andamento (ano da última extração), quando possui linhas no mart. */
  anoParcial: number | null;
  /** Mês (1 a 12) da última extração, quando há ano parcial. */
  mesReferencia: number | null;
  /** Data (AAAA-MM-DD) da última coleta no portal da cidade; nula quando não registrada. */
  dataColeta: string | null;
  totalArrecadado: number;
  fontes: SaudeOrigemRecursoDTO[];
}

export interface GetSaudeOrigemRecursosParams {
  portalSlug: string;
  ano: number;
  /** Primeiro ano exibido para o município; anos anteriores ficam de fora. */
  anoInicial?: number | null;
}

interface OrigemRecursoRow {
  ano: number;
  grupoFonte: GrupoFonteRecursoSaude;
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
): SaudeOrigemRecursoHistoricoDTO[] {
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
): SaudeOrigemRecursoComposicaoDTO[] {
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

function lerDataExtracao(
  valor: unknown,
): { ano: number; mes: number; data: string } | null {
  const partes = PADRAO_DATA_EXTRACAO.exec(String(valor ?? "").trim());
  if (!partes) return null;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  return mes >= 1 && mes <= 12 ? { ano, mes, data: partes[0] } : null;
}

/**
 * Quanto a União e o Estado repassam ao(s) fundo(s) de Saúde do portal: receitas orçamentárias
 * arrecadadas no ano, agrupadas por esfera, com participação, série anual e composição.
 *
 * Retorna `null` quando o portal não possui órgão de Saúde identificado ou receitas no mart, nunca zero.
 * Somente fontes com valor no ano entram em `fontes`, em ordem fixa por grupo.
 */
export async function getSaudeOrigemRecursos({
  portalSlug,
  ano,
  anoInicial,
}: GetSaudeOrigemRecursosParams): Promise<SaudeOrigemRecursosDTO | null> {
  const cleanSlug = portalSlug?.trim();
  if (!cleanSlug) {
    return null;
  }

  const metadado = await db
    .selectFrom("dim_metadata")
    .select("value")
    .where("portal_slug", "=", cleanSlug)
    .where("key", "=", "last_extracted_at")
    .executeTakeFirst();

  const rows = await db
    .selectFrom("fct_saude_origem_recursos_metricas")
    .select([
      "orgao_nome",
      "ano",
      "grupo_fonte",
      "codigo_natureza",
      "descricao_natureza",
      "arrecadado_receita",
    ])
    .where("portal_slug", "=", cleanSlug)
    .execute();

  const linhas: OrigemRecursoRow[] = rows
    .filter((row) => Number(row.ano) >= (anoInicial ?? Number(row.ano)))
    .map((row) => ({
      ano: Number(row.ano),
      grupoFonte: row.grupo_fonte as GrupoFonteRecursoSaude,
      codigoNatureza: String(row.codigo_natureza),
      descricaoNatureza: String(row.descricao_natureza ?? row.codigo_natureza),
      arrecadadoReceita: Number(row.arrecadado_receita ?? 0),
    }));

  if (linhas.length === 0) {
    return null;
  }

  const anos = linhas.map((linha) => linha.ano);
  const extracao = lerDataExtracao(metadado?.value);
  const parcial = extracao && anos.includes(extracao.ano) ? extracao : null;
  const porGrupo = agruparPor(linhas, (linha) => linha.grupoFonte);

  const fontesDoAno = GRUPOS_FONTE_RECURSO_SAUDE.map((grupoFonte) => {
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

  const fontes: SaudeOrigemRecursoDTO[] = fontesDoAno.map((fonte) => ({
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
      ...new Set(
        rows.flatMap((row) => (row.orgao_nome ? [String(row.orgao_nome)] : [])),
      ),
    ]
      .sort()
      .join(" / "),
    anoMin: anos.length > 0 ? Math.min(...anos) : null,
    anoMax: anos.length > 0 ? Math.max(...anos) : null,
    anoParcial: parcial?.ano ?? null,
    mesReferencia: parcial?.mes ?? null,
    dataColeta: extracao?.data ?? null,
    totalArrecadado,
    fontes,
  };
}
