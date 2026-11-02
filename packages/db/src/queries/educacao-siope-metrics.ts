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

export const RESULTADOS_MINIMO_LEGAL = [
  "cumpriu",
  "abaixo",
  "parcial",
  "sem_dado",
] as const;

export type ResultadoMinimoLegal = (typeof RESULTADOS_MINIMO_LEGAL)[number];

/** Percentual aplicado frente ao mínimo legal vigente no exercício. */
export interface MinimoLegalDTO {
  /** Mínimo em pontos percentuais, vindo de `seed_constantes_fiscais`; `null` se não cadastrado. */
  limite: number | null;
  percentualAplicado: number | null;
  /** `parcial` no ano em andamento (sem veredito); `sem_dado` sem percentual ou sem limite. */
  resultado: ResultadoMinimoLegal;
  baseLegal: string | null;
  urlBaseLegal: string | null;
}

export interface EducacaoMinimosLegaisDTO {
  /** Indicador 1.1 frente ao mínimo de 25% (CF/88 Art. 212). */
  mde: MinimoLegalDTO;
  /** Indicador 1.2 frente ao piso do Fundeb para profissionais (Lei 14.113/2020 Art. 26). */
  fundebProfissionais: MinimoLegalDTO;
}

export interface EducacaoSiopeDTO {
  portalSlug: string;
  ano: number;
  /** Exercício pedido; `null` quando o mart não tem linha para ele. */
  atual: EducacaoSiopeAnoDTO | null;
  /** Mínimos legais do exercício pedido. */
  minimos: EducacaoMinimosLegaisDTO;
  /** Todos os exercícios do portal, do mais antigo ao mais recente. */
  serie: EducacaoSiopeAnoDTO[];
}

export interface GetEducacaoSiopeParams {
  portalSlug: string;
  ano: number;
}

const numeroOuNulo = (valor: unknown): number | null =>
  valor === null || valor === undefined ? null : Number(valor);

const CHAVES_MINIMOS_LEGAIS = {
  mde: "minimo_aplicacao_mde_percentual",
  fundebProfissionais: "minimo_fundeb_profissionais_percentual",
} as const;

interface LimiteLegalLinha {
  chave: string;
  valor_num: unknown;
  base_legal: string | null;
  url_base_legal: string | null;
}

const classificarMinimo = (
  linha: LimiteLegalLinha | undefined,
  percentualAplicado: number | null,
  situacao: SituacaoSiope | undefined,
): MinimoLegalDTO => {
  const limite = numeroOuNulo(linha?.valor_num);
  const resultado = ((): ResultadoMinimoLegal => {
    if (percentualAplicado === null || limite === null) return "sem_dado";
    if (situacao === "parcial") return "parcial";
    return percentualAplicado >= limite ? "cumpriu" : "abaixo";
  })();
  return {
    limite,
    percentualAplicado,
    resultado,
    baseLegal: linha?.base_legal ?? null,
    urlBaseLegal: linha?.url_base_legal ?? null,
  };
};

const classificarMinimos = (
  linhas: LimiteLegalLinha[],
  atual: EducacaoSiopeAnoDTO | null,
): EducacaoMinimosLegaisDTO => ({
  mde: classificarMinimo(
    linhas.find((item) => item.chave === CHAVES_MINIMOS_LEGAIS.mde),
    atual?.percentualAplicadoMde ?? null,
    atual?.situacao,
  ),
  fundebProfissionais: classificarMinimo(
    linhas.find(
      (item) => item.chave === CHAVES_MINIMOS_LEGAIS.fundebProfissionais,
    ),
    atual?.percentualAplicadoFundebProfissionais ?? null,
    atual?.situacao,
  ),
});

const dataOuNulo = (valor: unknown): string | null => {
  if (valor === null || valor === undefined) return null;
  return valor instanceof Date ? valor.toISOString() : String(valor);
};

/**
 * Indicadores do SIOPE do portal: o exercício pedido e a série anual para histórico.
 *
 * Mapeia as colunas do mart `fct_educacao_siope_metricas`; valor ausente permanece
 * `null` e a situação (`encerrado`/`parcial`) vem calculada pelo dbt. Os mínimos legais
 * (MDE e Fundeb) vêm de `seed_constantes_fiscais` e são comparados aqui, nunca na tela.
 */
export async function getEducacaoSiope({
  portalSlug,
  ano,
}: GetEducacaoSiopeParams): Promise<EducacaoSiopeDTO> {
  const cleanSlug = portalSlug?.trim();
  if (!cleanSlug) {
    return {
      portalSlug: "",
      ano,
      atual: null,
      minimos: classificarMinimos([], null),
      serie: [],
    };
  }

  const [rows, limites] = await Promise.all([
    db
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
      .execute(),
    db
      .selectFrom("seed_constantes_fiscais")
      .select(["chave", "valor_num", "base_legal", "url_base_legal"])
      .where("dominio", "=", "educacao")
      .where("chave", "in", Object.values(CHAVES_MINIMOS_LEGAIS))
      .where("ano_inicio", "<=", ano)
      .where("ano_fim", ">=", ano)
      .execute(),
  ]);

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

  const atual = serie.find((item) => item.ano === ano) ?? null;

  return {
    portalSlug: cleanSlug,
    ano,
    atual,
    minimos: classificarMinimos(limites, atual),
    serie,
  };
}
