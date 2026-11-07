import { db } from "../client";

export interface SaudeProducaoSusAnoDTO {
  ano: number;
  /** Quantos meses de SIA entraram no ano; nulo quando o SIA não trouxe nada. */
  competenciasAmbulatoriais: number | null;
  /** Quantos meses de SIH entraram no ano; nulo é "sem dado nesta fonte". */
  competenciasInternacoes: number | null;
  /** Competência (AAAAMM) mais recente de SIA/SIH carregada no ano. */
  ultimaCompetenciaAmbulatorial: number | null;
  ultimaCompetenciaInternacoes: number | null;
  /** Dado nulo significa "sem dado", nunca zero. */
  totalProcedimentosAmbulatoriais: number | null;
  totalInternacoes: number | null;
  /** Verdadeiro só com as 12 competências do ano; ano incompleto não se compara com ano cheio. */
  anoCompletoAmbulatorial: boolean;
  anoCompletoInternacoes: boolean;
  populacaoResidente: number | null;
  anoPopulacaoReferencia: number | null;
  populacaoEstimada: boolean;
  /** Dado derivado (divisão por população). */
  procedimentosAmbulatoriaisPorMilMoradores: number | null;
  internacoesPorMilMoradores: number | null;
  /** Data (AAAA-MM-DD) da coleta na API do Ministério da Saúde. */
  dataColeta: string | null;
}

export interface SaudeProducaoSusDTO {
  portalSlug: string;
  anoMin: number;
  anoMax: number;
  /** Série por ano, do mais antigo ao mais recente. */
  serie: SaudeProducaoSusAnoDTO[];
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
 * Produção do SUS na cidade (procedimentos ambulatoriais do SIA e internações do SIH), ano a ano e por mil
 * moradores. É a produção registrada e paga pelo SUS, não todo o atendimento da cidade. Retorna `null`
 * quando o portal não tem nenhum ano no mart. Intervalo de anos vindo dos dados; sem régua numérica.
 */
export async function getSaudeProducaoSus(
  portalSlug: string,
): Promise<SaudeProducaoSusDTO | null> {
  const cleanSlug = portalSlug?.trim();
  if (!cleanSlug) return null;

  const rows = await db
    .selectFrom("fct_saude_producao_sus_metricas")
    .selectAll()
    .where("portal_slug", "=", cleanSlug)
    .orderBy("ano", "asc")
    .execute();

  if (rows.length === 0) return null;

  const serie: SaudeProducaoSusAnoDTO[] = rows.map((row) => ({
    ano: Number(row.ano),
    competenciasAmbulatoriais: numberOrNull(row.competencias_ambulatoriais),
    competenciasInternacoes: numberOrNull(row.competencias_internacoes),
    ultimaCompetenciaAmbulatorial: numberOrNull(
      row.ultima_competencia_ambulatorial,
    ),
    ultimaCompetenciaInternacoes: numberOrNull(
      row.ultima_competencia_internacoes,
    ),
    totalProcedimentosAmbulatoriais: numberOrNull(
      row.total_procedimentos_ambulatoriais,
    ),
    totalInternacoes: numberOrNull(row.total_internacoes),
    anoCompletoAmbulatorial: Boolean(row.ano_completo_ambulatorial),
    anoCompletoInternacoes: Boolean(row.ano_completo_internacoes),
    populacaoResidente: numberOrNull(row.populacao_residente),
    anoPopulacaoReferencia: numberOrNull(row.ano_populacao_referencia),
    populacaoEstimada: Boolean(row.populacao_estimada),
    procedimentosAmbulatoriaisPorMilMoradores: numberOrNull(
      row.procedimentos_ambulatoriais_por_mil_moradores,
    ),
    internacoesPorMilMoradores: numberOrNull(row.internacoes_por_mil_moradores),
    dataColeta: isoDate(row.data_coleta),
  }));

  return {
    portalSlug: cleanSlug,
    anoMin: serie[0].ano,
    anoMax: serie[serie.length - 1].ano,
    serie,
  };
}
