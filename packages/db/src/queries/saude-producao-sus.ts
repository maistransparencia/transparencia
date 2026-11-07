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
  /** Verdadeiro quando alguma medida com dado no ano tem menos de 12 competências. */
  anoIncompleto: boolean;
  populacaoResidente: number | null;
  anoPopulacaoReferencia: number | null;
  populacaoEstimada: boolean;
  /** Dado derivado (divisão por população). */
  procedimentosAmbulatoriaisPorMilMoradores: number | null;
  internacoesPorMilMoradores: number | null;
  /** Data (AAAA-MM-DD) da coleta na API do Ministério da Saúde. */
  dataColeta: string | null;
}

/** Ano que a tela destaca para uma medida e o ano completo anterior usado na comparação. */
export interface SaudeProducaoSusReferenciaDTO {
  /** Ano completo mais recente com dado; sem ano completo, o mais recente com dado (incompleto). */
  ano: number;
  completo: boolean;
  /** Competência (AAAAMM) mais recente carregada no ano de referência. */
  ultimaCompetencia: number | null;
  /** Ano completo anterior com dado; nulo quando a referência é incompleta ou não há anterior. */
  anoAnterior: number | null;
}

export interface SaudeProducaoSusAnoEmAndamentoDTO {
  ano: number;
  /** Competência (AAAAMM) mais recente carregada no ano em andamento. */
  ateCompetencia: number;
}

export interface SaudeProducaoSusDTO {
  portalSlug: string;
  anoMin: number;
  anoMax: number;
  referenciaAmbulatorial: SaudeProducaoSusReferenciaDTO | null;
  referenciaInternacoes: SaudeProducaoSusReferenciaDTO | null;
  /** Só o ano corrente, e só quando alguma medida com dado nele ainda não tem as 12 competências. */
  anoEmAndamento: SaudeProducaoSusAnoEmAndamentoDTO | null;
  /** Nenhum ano trouxe internações nesta fonte (estado "sem dado nesta fonte"). */
  semInternacoes: boolean;
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

interface MedidaProducao {
  porMil: (ano: SaudeProducaoSusAnoDTO) => number | null;
  completo: (ano: SaudeProducaoSusAnoDTO) => boolean;
  ultimaCompetencia: (ano: SaudeProducaoSusAnoDTO) => number | null;
}

function buildReferencia(
  serie: SaudeProducaoSusAnoDTO[],
  { porMil, completo, ultimaCompetencia }: MedidaProducao,
): SaudeProducaoSusReferenciaDTO | null {
  const comDado = [...serie].reverse().filter((ano) => porMil(ano) !== null);
  const escolhido = comDado.find(completo) ?? comDado[0];
  if (!escolhido) return null;
  const anterior = completo(escolhido)
    ? comDado.find((ano) => ano.ano < escolhido.ano && completo(ano))
    : undefined;
  return {
    ano: escolhido.ano,
    completo: completo(escolhido),
    ultimaCompetencia: ultimaCompetencia(escolhido),
    anoAnterior: anterior?.ano ?? null,
  };
}

function buildAnoEmAndamento(
  serie: SaudeProducaoSusAnoDTO[],
  anoAtual: number,
): SaudeProducaoSusAnoEmAndamentoDTO | null {
  const ano = serie.find((item) => item.ano === anoAtual);
  if (!ano?.anoIncompleto) return null;
  return {
    ano: ano.ano,
    ateCompetencia: Math.max(
      ano.ultimaCompetenciaAmbulatorial ?? 0,
      ano.ultimaCompetenciaInternacoes ?? 0,
    ),
  };
}

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
    anoIncompleto:
      (row.competencias_ambulatoriais !== null &&
        !row.ano_completo_ambulatorial) ||
      (row.competencias_internacoes !== null && !row.ano_completo_internacoes),
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
    referenciaAmbulatorial: buildReferencia(serie, {
      porMil: (ano) => ano.procedimentosAmbulatoriaisPorMilMoradores,
      completo: (ano) => ano.anoCompletoAmbulatorial,
      ultimaCompetencia: (ano) => ano.ultimaCompetenciaAmbulatorial,
    }),
    referenciaInternacoes: buildReferencia(serie, {
      porMil: (ano) => ano.internacoesPorMilMoradores,
      completo: (ano) => ano.anoCompletoInternacoes,
      ultimaCompetencia: (ano) => ano.ultimaCompetenciaInternacoes,
    }),
    anoEmAndamento: buildAnoEmAndamento(serie, new Date().getFullYear()),
    semInternacoes: serie.every((ano) => ano.totalInternacoes === null),
    serie,
  };
}
