import { db } from "../client";

export const SITUACOES_SIOPE = ["encerrado", "parcial"] as const;

export type SituacaoSiope = (typeof SITUACOES_SIOPE)[number];

/** Indicadores do SIOPE de um exercício, declarados pelo município ao FNDE. */
export interface EducacaoSiopeAnoDTO {
  ano: number;
  /** Período mais avançado disponível (6 = 6º bimestre, fechamento). */
  periodo: number;
  situacao: SituacaoSiope;
  /** Indicador 4.9, em R$ da época. */
  investimentoPorAluno: number | null;
  /** Indicador 4.8, em R$ da época. */
  investimentoPorAlunoBasica: number | null;
  /** Indicador 4.1, em R$ da época. */
  investimentoPorAlunoInfantil: number | null;
  /** Indicador 4.2, em R$ da época. */
  investimentoPorAlunoFundamental: number | null;
  /** Indicador 1.1, em pontos percentuais (0 a 100). */
  percentualAplicadoMde: number | null;
  /** Indicador 1.2, em pontos percentuais. */
  percentualAplicadoFundebProfissionais: number | null;
  coletadoEm: string | null;
}

export interface EducacaoSiopeDTO {
  portalSlug: string;
  ano: number;
  /** Exercício pedido; `null` quando o mart não tem linha para ele. */
  atual: EducacaoSiopeAnoDTO | null;
  /** Todos os exercícios do portal, do mais antigo ao mais recente. */
  serie: EducacaoSiopeAnoDTO[];
}

export interface GetEducacaoSiopeParams {
  portalSlug: string;
  ano: number;
}

const numeroOuNulo = (valor: unknown): number | null =>
  valor === null || valor === undefined ? null : Number(valor);

const dataOuNulo = (valor: unknown): string | null => {
  if (valor === null || valor === undefined) return null;
  return valor instanceof Date ? valor.toISOString() : String(valor);
};

/**
 * Indicadores do SIOPE do portal: o exercício pedido e a série anual para histórico.
 *
 * Apenas mapeia as colunas do mart `fct_educacao_siope_metricas`; valor ausente
 * permanece `null` e a situação (`encerrado`/`parcial`) vem calculada pelo dbt.
 */
export async function getEducacaoSiope({
  portalSlug,
  ano,
}: GetEducacaoSiopeParams): Promise<EducacaoSiopeDTO> {
  const cleanSlug = portalSlug?.trim();
  if (!cleanSlug) {
    return { portalSlug: "", ano, atual: null, serie: [] };
  }

  const rows = await db
    .selectFrom("fct_educacao_siope_metricas")
    .select([
      "ano",
      "periodo",
      "situacao",
      "investimento_por_aluno",
      "investimento_por_aluno_basica",
      "investimento_por_aluno_infantil",
      "investimento_por_aluno_fundamental",
      "percentual_aplicado_mde",
      "percentual_aplicado_fundeb_profissionais",
      "coletado_em",
    ])
    .where("portal_slug", "=", cleanSlug)
    .orderBy("ano", "asc")
    .execute();

  const serie: EducacaoSiopeAnoDTO[] = rows.map((row) => ({
    ano: Number(row.ano),
    periodo: Number(row.periodo),
    situacao: row.situacao as SituacaoSiope,
    investimentoPorAluno: numeroOuNulo(row.investimento_por_aluno),
    investimentoPorAlunoBasica: numeroOuNulo(row.investimento_por_aluno_basica),
    investimentoPorAlunoInfantil: numeroOuNulo(
      row.investimento_por_aluno_infantil,
    ),
    investimentoPorAlunoFundamental: numeroOuNulo(
      row.investimento_por_aluno_fundamental,
    ),
    percentualAplicadoMde: numeroOuNulo(row.percentual_aplicado_mde),
    percentualAplicadoFundebProfissionais: numeroOuNulo(
      row.percentual_aplicado_fundeb_profissionais,
    ),
    coletadoEm: dataOuNulo(row.coletado_em),
  }));

  return {
    portalSlug: cleanSlug,
    ano,
    atual: serie.find((item) => item.ano === ano) ?? null,
    serie,
  };
}
