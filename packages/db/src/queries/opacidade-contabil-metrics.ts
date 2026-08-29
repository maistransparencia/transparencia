import { db } from "../client";
import type { CategoriaGastoSensivel } from "./despesas-metrics";

export interface OpacidadeMetricasExercicioDTO {
  portalSlug: string;
  ano: number;
  totalEmpenhos: number;
  empenhosResidual99: number;
  empenhosDesvioSensivel99: number;
  taxaEmpenhosOpacidadePct: number;
  totalPago: number;
  pagoResidual99: number;
  pagoDesvioSensivel99: number;
  taxaValorOpacidadePct: number;
  taxaDesvioSensivelPct: number;
  classificacaoRisco: "normal" | "atencao" | "critico";
}

export interface OpacidadeCredorDTO {
  credorCodigo: string;
  credorNome: string;
  totalEmpenhos: number;
  totalPago: number;
  pagoDesvioSensivel: number;
  categoriaPredominante:
    | CategoriaGastoSensivel
    | "sem_classificacao_especifica";
  amostraObjeto: string;
  ranking: number;
}

export interface BaseLegalOpacidadeDTO {
  chave: string;
  descricao: string;
  baseLegal: string;
  urlBaseLegal: string | null;
}

export interface LimiaresOpacidadeDTO {
  limiteAtencaoPct: number;
  limiteCriticoPct: number;
}

export interface OpacidadeContabilMetricsDTO {
  portalSlug: string;
  ano: number;
  exercicioAtual: OpacidadeMetricasExercicioDTO;
  historico: OpacidadeMetricasExercicioDTO[];
  topCredores: OpacidadeCredorDTO[];
  limiares: LimiaresOpacidadeDTO;
  basesLegais: BaseLegalOpacidadeDTO[];
}

/**
 * Retorna as métricas de opacidade contábil (subitens residuais .99),
 * comparativo histórico e top credores com desvios sensíveis para o portal e ano especificados.
 */
export async function getOpacidadeContabilMetrics(
  portalSlug: string,
  ano: number,
): Promise<OpacidadeContabilMetricsDTO | null> {
  const [metricasRows, credoresRows, constantesRows] = await Promise.all([
    db
      .selectFrom("fct_opacidade_contabil_metricas")
      .select([
        "portal_slug",
        "ano",
        "total_empenhos",
        "empenhos_residual_99",
        "empenhos_desvio_sensivel_99",
        "taxa_empenhos_opacidade_pct",
        "total_pago",
        "pago_residual_99",
        "pago_desvio_sensivel_99",
        "taxa_valor_opacidade_pct",
        "taxa_desvio_sensivel_pct",
        "classificacao_risco",
      ])
      .where("portal_slug", "=", portalSlug)
      .orderBy("ano", "asc")
      .execute(),

    db
      .selectFrom("fct_opacidade_contabil_credores")
      .select([
        "ano",
        "credor_codigo",
        "credor_nome",
        "total_empenhos",
        "total_pago",
        "pago_desvio_sensivel",
        "categoria_predominante",
        "amostra_objeto",
        "ranking",
      ])
      .where("portal_slug", "=", portalSlug)
      .orderBy("ranking", "asc")
      .execute(),

    db
      .selectFrom("seed_constantes_fiscais")
      .select([
        "chave",
        "descricao",
        "base_legal",
        "url_base_legal",
        "valor_num",
      ])
      .where("dominio", "=", "opacidade")
      .where("ano_inicio", "<=", ano)
      .where("ano_fim", ">=", ano)
      .execute(),
  ]);

  if (metricasRows.length === 0) return null;

  const historico: OpacidadeMetricasExercicioDTO[] = metricasRows.map((r) => ({
    portalSlug: r.portal_slug,
    ano: Number(r.ano),
    totalEmpenhos: Number(r.total_empenhos ?? 0),
    empenhosResidual99: Number(r.empenhos_residual_99 ?? 0),
    empenhosDesvioSensivel99: Number(r.empenhos_desvio_sensivel_99 ?? 0),
    taxaEmpenhosOpacidadePct: Number(r.taxa_empenhos_opacidade_pct ?? 0),
    totalPago: Number(r.total_pago ?? 0),
    pagoResidual99: Number(r.pago_residual_99 ?? 0),
    pagoDesvioSensivel99: Number(r.pago_desvio_sensivel_99 ?? 0),
    taxaValorOpacidadePct: Number(r.taxa_valor_opacidade_pct ?? 0),
    taxaDesvioSensivelPct: Number(r.taxa_desvio_sensivel_pct ?? 0),
    classificacaoRisco: (r.classificacao_risco ?? "normal") as
      | "normal"
      | "atencao"
      | "critico",
  }));

  const exercicioAtual =
    historico.find((h) => h.ano === ano) ?? historico[historico.length - 1];

  const topCredores: OpacidadeCredorDTO[] = credoresRows
    .filter((c) => Number(c.ano) === exercicioAtual.ano)
    .map((c) => ({
      credorCodigo: c.credor_codigo,
      credorNome: c.credor_nome,
      totalEmpenhos: Number(c.total_empenhos ?? 0),
      totalPago: Number(c.total_pago ?? 0),
      pagoDesvioSensivel: Number(c.pago_desvio_sensivel ?? 0),
      categoriaPredominante:
        c.categoria_predominante ?? "sem_classificacao_especifica",
      amostraObjeto: c.amostra_objeto,
      ranking: Number(c.ranking),
    }));

  const limiteAtencaoConst = constantesRows.find(
    (c) => c.chave === "opacidade_limite_atencao_pct",
  );
  const limiteCriticoConst = constantesRows.find(
    (c) => c.chave === "opacidade_limite_critico_pct",
  );

  const limiares: LimiaresOpacidadeDTO = {
    limiteAtencaoPct: Number(limiteAtencaoConst?.valor_num ?? 15.0),
    limiteCriticoPct: Number(limiteCriticoConst?.valor_num ?? 30.0),
  };

  const basesLegais: BaseLegalOpacidadeDTO[] = constantesRows
    .filter((c) => c.base_legal != null)
    .map((c) => ({
      chave: c.chave,
      descricao: c.descricao ?? "",
      baseLegal: c.base_legal ?? "",
      urlBaseLegal: c.url_base_legal ?? null,
    }));

  return {
    portalSlug,
    ano,
    exercicioAtual,
    historico,
    topCredores,
    limiares,
    basesLegais,
  };
}
