import { db } from "../client";

export type SituacaoFrescor =
  | "coleta_em_dia"
  | "coleta_atrasada"
  | "nao_monitorado";

export interface FrescorFonteDTO {
  fonte: string;
  descricaoDados: string;
  frequenciaEsperada: string;
  /** Timestamp ISO da última coleta; nulo quando a fonte não é monitorada. */
  ultimaColetaEm: string | null;
  /** Mede quando o portal buscou a fonte, não quando a fonte publicou dado novo. */
  situacao: SituacaoFrescor;
}

export interface FrescorFonteLinha {
  fonte: string;
  descricao_dados: string;
  frequencia_esperada: string;
  situacao_monitoramento: string;
  ultima_coleta_em: Date | string | null;
  tolerancia_dias: number | null;
}

const MILISSEGUNDOS_POR_DIA = 86_400_000;

function diasDeCalendario(dataReferencia: string, ultimaColetaEm: Date) {
  const diaDaColeta = ultimaColetaEm.toISOString().slice(0, 10);
  return Math.round(
    (Date.parse(dataReferencia) - Date.parse(diaDaColeta)) /
      MILISSEGUNDOS_POR_DIA,
  );
}

function situacaoDaFonte(
  linha: FrescorFonteLinha,
  ultimaColetaEm: Date | null,
  dataReferencia: string,
): SituacaoFrescor {
  if (linha.situacao_monitoramento !== "monitorado" || !ultimaColetaEm) {
    return "nao_monitorado";
  }
  if (linha.tolerancia_dias === null) return "coleta_em_dia";
  return diasDeCalendario(dataReferencia, ultimaColetaEm) >
    linha.tolerancia_dias
    ? "coleta_atrasada"
    : "coleta_em_dia";
}

/**
 * Situação da coleta de cada fonte contra a data de referência (AAAA-MM-DD).
 * Dias decorridos usam a data UTC da coleta; a tolerância absorve o fuso.
 */
export function montarFrescorFontes(
  linhas: FrescorFonteLinha[],
  dataReferencia: string,
): FrescorFonteDTO[] {
  if (Number.isNaN(Date.parse(dataReferencia))) {
    throw new Error(`dataReferencia inválida: ${dataReferencia}`);
  }
  return linhas.map((linha) => {
    const monitorada = linha.situacao_monitoramento === "monitorado";
    const ultimaColetaEm =
      monitorada && linha.ultima_coleta_em
        ? new Date(linha.ultima_coleta_em)
        : null;
    return {
      fonte: linha.fonte,
      descricaoDados: linha.descricao_dados,
      frequenciaEsperada: linha.frequencia_esperada,
      ultimaColetaEm: ultimaColetaEm?.toISOString() ?? null,
      situacao: situacaoDaFonte(linha, ultimaColetaEm, dataReferencia),
    };
  });
}

export async function getFrescorFontes(
  portalSlug: string,
  dataReferencia: string,
): Promise<FrescorFonteDTO[]> {
  if (typeof portalSlug !== "string" || portalSlug.trim() === "") return [];

  const linhas = (await db
    .selectFrom("fct_coletas_por_fonte")
    .select([
      "fonte",
      "descricao_dados",
      "frequencia_esperada",
      "situacao_monitoramento",
      "ultima_coleta_em",
      "tolerancia_dias",
    ])
    .where("portal_slug", "=", portalSlug)
    .orderBy("fonte")
    .execute()) as FrescorFonteLinha[];

  return montarFrescorFontes(linhas, dataReferencia);
}
