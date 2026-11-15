import { db } from "../client";

export interface SaudeRedeAnoDTO {
  ano: number;
  /** Competência do CNES (AAAAMM) usada nos leitos; nula quando o CNES não respondeu no ano. */
  competenciaLeitos: number | null;
  competenciaProfissionais: number | null;
  totalLeitosExistentes: number | null;
  totalLeitosSus: number | null;
  totalProfissionais: number | null;
  totalProfissionaisSus: number | null;
  populacaoResidente: number | null;
  /** Ano da população usada na divisão. */
  anoPopulacaoReferencia: number | null;
  /** Verdadeiro quando a população do ano não existe na fonte e foi usada a do último ano disponível. */
  populacaoEstimada: boolean;
  /** Dado derivado (divisão por população); nulo significa "sem dado", nunca zero. */
  leitosExistentesPorMilMoradores: number | null;
  leitosSusPorMilMoradores: number | null;
  profissionaisPorMilMoradores: number | null;
  profissionaisSusPorMilMoradores: number | null;
  /** Data (AAAA-MM-DD) da coleta na API do Ministério da Saúde. */
  dataColeta: string | null;
}

export interface SaudeRedePorMilMoradoresDTO {
  portalSlug: string;
  anoMin: number;
  anoMax: number;
  /** Série por ano, do mais antigo ao mais recente. */
  serie: SaudeRedeAnoDTO[];
}

const numberOrNull = (valor: unknown): number | null =>
  valor === null || valor === undefined ? null : Number(valor);

const isoDate = (valor: unknown): string | null => {
  if (valor === null || valor === undefined) return null;
  return valor instanceof Date
    ? valor.toISOString().slice(0, 10)
    : String(valor).slice(0, 10);
};

/**
 * Leitos e profissionais de saúde por mil moradores, ano a ano (CNES e população residente do
 * Ministério da Saúde). Retorna `null` quando o portal não tem nenhum ano com dado no mart (anos sem leitos nem profissionais ficam fora).
 * O intervalo de anos vem dos dados reais; não há régua numérica de referência.
 */
export async function getSaudeRedePorMilMoradores(
  portalSlug: string,
): Promise<SaudeRedePorMilMoradoresDTO | null> {
  const cleanSlug = portalSlug?.trim();
  if (!cleanSlug) return null;

  const todasAsLinhas = await db
    .selectFrom("fct_saude_rede_por_mil_moradores_metricas")
    .selectAll()
    .where("portal_slug", "=", cleanSlug)
    .orderBy("ano", "asc")
    .execute();

  // Ano em que a fonte não trouxe leitos nem profissionais não entra na série.
  const rows = todasAsLinhas.filter(
    (row) =>
      row.total_leitos_existentes !== null ||
      row.total_leitos_sus !== null ||
      row.total_profissionais !== null ||
      row.total_profissionais_sus !== null,
  );

  if (rows.length === 0) return null;

  const serie: SaudeRedeAnoDTO[] = rows.map((row) => ({
    ano: Number(row.ano),
    competenciaLeitos: numberOrNull(row.competencia_leitos),
    competenciaProfissionais: numberOrNull(row.competencia_profissionais),
    totalLeitosExistentes: numberOrNull(row.total_leitos_existentes),
    totalLeitosSus: numberOrNull(row.total_leitos_sus),
    totalProfissionais: numberOrNull(row.total_profissionais),
    totalProfissionaisSus: numberOrNull(row.total_profissionais_sus),
    populacaoResidente: numberOrNull(row.populacao_residente),
    anoPopulacaoReferencia: numberOrNull(row.ano_populacao_referencia),
    populacaoEstimada: Boolean(row.populacao_estimada),
    leitosExistentesPorMilMoradores: numberOrNull(
      row.leitos_existentes_por_mil_moradores,
    ),
    leitosSusPorMilMoradores: numberOrNull(row.leitos_sus_por_mil_moradores),
    profissionaisPorMilMoradores: numberOrNull(
      row.profissionais_por_mil_moradores,
    ),
    profissionaisSusPorMilMoradores: numberOrNull(
      row.profissionais_sus_por_mil_moradores,
    ),
    dataColeta: isoDate(row.data_coleta),
  }));

  return {
    portalSlug: cleanSlug,
    anoMin: serie[0].ano,
    anoMax: serie[serie.length - 1].ano,
    serie,
  };
}
