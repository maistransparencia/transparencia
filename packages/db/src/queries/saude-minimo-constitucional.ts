import { db } from "../client";

export const SITUACOES_SAUDE_MINIMO = [
  "encerrado",
  "parcial",
  "sem_dado",
] as const;

export type SituacaoSaudeMinimo = (typeof SITUACOES_SAUDE_MINIMO)[number];

export const RESULTADOS_SAUDE_MINIMO = [
  "cumpriu",
  "abaixo",
  "parcial",
  "indeterminado",
  "sem_dado",
] as const;

/**
 * `indeterminado`: o SIOPS tem o percentual, mas as duas vias de coleta divergem e o mart
 * não afirma cumprimento; a tela cita só o valor oficial e não compara com o mínimo.
 */
export type ResultadoSaudeMinimo = (typeof RESULTADOS_SAUDE_MINIMO)[number];

/** Indicadores do SIOPS de um exercício, calculados pelo Ministério da Saúde com dados da Prefeitura. */
export interface SaudeMinimoAnoDTO {
  ano: number;
  /** Período mais avançado disponível (6 = 6º bimestre, fechamento). */
  periodo: number;
  situacao: SituacaoSaudeMinimo;
  /** Indicador 3.2 do SIOPS, em pontos percentuais (15.00, não 0.15). */
  percentualAplicadoSaude: number | null;
  /** Indicador 2.1, em R$ da época. */
  despesaSaudePorHabitante: number | null;
  /** Indicador 3.1, em pontos percentuais. */
  percentualTransferenciasSaude: number | null;
  receitaImpostosTransferenciasConstitucionais: number | null;
  despesaRecursosProprios: number | null;
  despesaTotalSaude: number | null;
  divergenciaEntreVias: boolean;
  indicadoresDivergentes: string[];
  /** Quando o portal consultou o SIOPS (ISO); não é a data de transmissão da Prefeitura. */
  coletadoEm: string | null;
}

export interface SaudeMinimoLegalDTO {
  /** Mínimo em pontos percentuais, vindo do seed; `null` se não cadastrado para o ano. */
  limite: number | null;
  percentualAplicado: number | null;
  resultado: ResultadoSaudeMinimo;
  /** `true` só para ano encerrado com percentual e mínimo: é quando a tela pode comparar. */
  comparavel: boolean;
  /** Meses do ano cobertos pelo valor parcial; `null` fora do ano em andamento. */
  mesesCobertos: number | null;
  baseLegal: string | null;
  urlBaseLegal: string | null;
}

export interface SaudeMinimoConstitucionalDTO {
  portalSlug: string;
  ano: number;
  /** Exercício pedido; `null` quando o mart não tem linha para ele (nunca vira zero). */
  atual: SaudeMinimoAnoDTO | null;
  minimo: SaudeMinimoLegalDTO;
  /** Exercícios encerrados com percentual, do ano inicial do portal até o ano pedido. */
  serie: SaudeMinimoAnoDTO[];
  anoInicial: number | null;
  anoFinal: number | null;
}

export interface GetSaudeMinimoConstitucionalParams {
  portalSlug: string;
  ano: number;
  /** Primeiro ano do portal; a série não inclui anos anteriores. */
  anoInicial?: number | null;
}

const CHAVE_MINIMO_SAUDE = "minimo_aplicacao_saude_percentual";

const numeroOuNulo = (valor: unknown): number | null =>
  valor === null || valor === undefined ? null : Number(valor);

const dataOuNulo = (valor: unknown): string | null => {
  if (valor === null || valor === undefined) return null;
  return valor instanceof Date ? valor.toISOString() : String(valor);
};

interface SaudeMinimoLinha {
  ano: unknown;
  periodo: unknown;
  situacao: unknown;
  percentual_aplicado_saude: unknown;
  minimo_aplicacao_saude_percentual: unknown;
  cumpre_minimo: boolean | null;
  despesa_saude_por_habitante: unknown;
  percentual_transferencias_saude: unknown;
  receita_impostos_transferencias_constitucionais: unknown;
  despesa_recursos_proprios: unknown;
  despesa_total_saude: unknown;
  divergencia_entre_vias: boolean | null;
  indicadores_divergentes: string | null;
  coletado_em: unknown;
}

const mapearAno = (linha: SaudeMinimoLinha): SaudeMinimoAnoDTO => ({
  ano: Number(linha.ano),
  periodo: Number(linha.periodo),
  situacao: linha.situacao as SituacaoSaudeMinimo,
  percentualAplicadoSaude: numeroOuNulo(linha.percentual_aplicado_saude),
  despesaSaudePorHabitante: numeroOuNulo(linha.despesa_saude_por_habitante),
  percentualTransferenciasSaude: numeroOuNulo(
    linha.percentual_transferencias_saude,
  ),
  receitaImpostosTransferenciasConstitucionais: numeroOuNulo(
    linha.receita_impostos_transferencias_constitucionais,
  ),
  despesaRecursosProprios: numeroOuNulo(linha.despesa_recursos_proprios),
  despesaTotalSaude: numeroOuNulo(linha.despesa_total_saude),
  divergenciaEntreVias: linha.divergencia_entre_vias === true,
  indicadoresDivergentes: linha.indicadores_divergentes
    ? linha.indicadores_divergentes.split(",")
    : [],
  coletadoEm: dataOuNulo(linha.coletado_em),
});

const classificarResultado = (
  linha: SaudeMinimoLinha | undefined,
  limite: number | null,
): ResultadoSaudeMinimo => {
  if (!linha) return "sem_dado";
  const percentual = numeroOuNulo(linha.percentual_aplicado_saude);
  if (percentual === null || limite === null) return "sem_dado";
  if (linha.situacao === "parcial") return "parcial";
  if (linha.situacao !== "encerrado") return "sem_dado";
  if (linha.cumpre_minimo === null) return "indeterminado";
  return linha.cumpre_minimo ? "cumpriu" : "abaixo";
};

const dtoVazio = (ano: number): SaudeMinimoConstitucionalDTO => ({
  portalSlug: "",
  ano,
  atual: null,
  minimo: {
    limite: null,
    percentualAplicado: null,
    resultado: "sem_dado",
    comparavel: false,
    mesesCobertos: null,
    baseLegal: null,
    urlBaseLegal: null,
  },
  serie: [],
  anoInicial: null,
  anoFinal: null,
});

/**
 * Mínimo constitucional de saúde do portal: o exercício pedido, a régua legal e a série anual.
 *
 * Fonte: mart `fct_saude_minimo_constitucional` (indicadores do SIOPS). O cálculo próprio
 * (`fct_saude_minimo_conferencia`) não entra aqui. Ausência de linha ou de percentual é
 * `sem_dado`, nunca zero; o ano em andamento é `parcial` e não é comparado com o mínimo.
 */
export async function getSaudeMinimoConstitucional({
  portalSlug,
  ano,
  anoInicial: anoInicialPortal,
}: GetSaudeMinimoConstitucionalParams): Promise<SaudeMinimoConstitucionalDTO> {
  const cleanSlug = portalSlug?.trim();
  if (!cleanSlug) return dtoVazio(ano);

  const [linhas, limites] = await Promise.all([
    db
      .selectFrom("fct_saude_minimo_constitucional")
      .select([
        "ano",
        "periodo",
        "situacao",
        "percentual_aplicado_saude",
        "minimo_aplicacao_saude_percentual",
        "cumpre_minimo",
        "despesa_saude_por_habitante",
        "percentual_transferencias_saude",
        "receita_impostos_transferencias_constitucionais",
        "despesa_recursos_proprios",
        "despesa_total_saude",
        "divergencia_entre_vias",
        "indicadores_divergentes",
        "coletado_em",
      ])
      .where("portal_slug", "=", cleanSlug)
      .orderBy("ano", "asc")
      .execute() as Promise<SaudeMinimoLinha[]>,
    db
      .selectFrom("seed_constantes_fiscais")
      .select(["valor_num", "base_legal", "url_base_legal"])
      .where("dominio", "=", "saude")
      .where("chave", "=", CHAVE_MINIMO_SAUDE)
      .where("ano_inicio", "<=", ano)
      .where("ano_fim", ">=", ano)
      .orderBy("ano_inicio", "desc")
      .limit(1)
      .execute(),
  ]);

  const linhaAtual = linhas.find((linha) => Number(linha.ano) === ano);
  const limite =
    numeroOuNulo(linhaAtual?.minimo_aplicacao_saude_percentual) ??
    numeroOuNulo(limites[0]?.valor_num);

  const serie = linhas
    .map(mapearAno)
    .filter(
      (item) =>
        item.situacao === "encerrado" &&
        item.percentualAplicadoSaude !== null &&
        item.ano <= ano &&
        item.ano >= (anoInicialPortal ?? item.ano),
    );
  const resultado = classificarResultado(linhaAtual, limite);

  return {
    portalSlug: cleanSlug,
    ano,
    atual: linhaAtual ? mapearAno(linhaAtual) : null,
    minimo: {
      limite,
      percentualAplicado: numeroOuNulo(linhaAtual?.percentual_aplicado_saude),
      resultado,
      comparavel: resultado === "cumpriu" || resultado === "abaixo",
      mesesCobertos:
        resultado === "parcial" && linhaAtual
          ? Number(linhaAtual.periodo) * 2
          : null,
      baseLegal: limites[0]?.base_legal ?? null,
      urlBaseLegal: limites[0]?.url_base_legal ?? null,
    },
    serie,
    anoInicial: serie.length > 0 ? serie[0].ano : null,
    anoFinal: serie.length > 0 ? serie[serie.length - 1].ano : null,
  };
}
