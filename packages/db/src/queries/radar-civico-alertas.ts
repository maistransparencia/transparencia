import { sql } from "kysely";
import { db } from "../client";

export type GrauSeveridade = "critico" | "alto" | "moderado";

export type TipoAnomalia =
  | "explosao_comissionados"
  | "rombo_caixa"
  | "pico_despesa_homologa"
  | "concentracao_dispensa"
  | "opacidade_gastos_genericos"
  | "inadimplencia_aporte_rpps"
  | "retencao_patronal_rpps"
  | "desconto_nulo_pregao"
  | "desagio_extremo_inexequibilidade"
  | "inconsistencia_vinculo_pessoal"
  | "dependencia_transferencias"
  | (string & {});

export interface RadarCivicoAlertaDTO {
  anomaliaId: string;
  portalSlug: string;
  ano: number;
  tipoAnomalia: TipoAnomalia;
  dimensaoReferencia: string;
  grauSeveridade: GrauSeveridade;
  desvioPercentual: number;
  valorObservado: number;
  valorEsperado: number;
  mesInicial: number;
  mesFinal: number;
  licitacaoNumero: string | null;
  metodoDeteccao: string | null;
}

export interface GetRadarCivicoAlertasOptions {
  ano?: number;
  severidadeMinima?: GrauSeveridade;
  limite?: number;
}

/**
 * Retorna a lista de severidades aceitas com base na severidade mínima requerida.
 */
function getSeveridadesPermitidas(severidadeMinima?: GrauSeveridade): string[] {
  if (severidadeMinima === "critico") {
    return ["critico"];
  }
  if (severidadeMinima === "alto") {
    return ["critico", "alto"];
  }
  if (severidadeMinima === "moderado") {
    return ["critico", "alto", "moderado"];
  }
  return ["critico", "alto", "moderado"];
}

/**
 * Retorna as anomalias fiscais detectadas a partir do mart `fct_anomalias_fiscais_metricas`,
 * ordenadas prioritariamente por severidade decrescente (critico > alto > moderado)
 * e pela magnitude do impacto (desvioPercentual decrescente).
 */
export async function getRadarCivicoAlertas(
  portalSlug: string,
  options?: GetRadarCivicoAlertasOptions,
): Promise<RadarCivicoAlertaDTO[]> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === ""
  ) {
    return [];
  }

  const cleanSlug = portalSlug.trim();

  if (options?.ano !== undefined && Number.isNaN(options.ano)) {
    return [];
  }

  let query = db
    .selectFrom("fct_anomalias_fiscais_metricas")
    .select([
      "anomalia_id",
      "portal_slug",
      "ano",
      "tipo_anomalia",
      "dimensao_referencia",
      "grau_severidade",
      "desvio_percentual",
      "valor_observado",
      "valor_esperado",
      "mes_inicial",
      "mes_final",
      "licitacao_numero",
      "metodo_deteccao",
    ])
    .where("portal_slug", "=", cleanSlug);

  if (options?.ano !== undefined) {
    query = query.where("ano", "=", options.ano);
  }

  if (options?.severidadeMinima) {
    const severidades = getSeveridadesPermitidas(options.severidadeMinima);
    query = query.where("grau_severidade", "in", severidades);
  }

  query = query
    .orderBy("ano", "desc")
    .orderBy(
      sql`CASE tipo_anomalia WHEN 'rombo_caixa' THEN 1 ELSE 0 END`,
      "desc",
    )
    .orderBy(
      sql`CASE grau_severidade WHEN 'critico' THEN 3 WHEN 'alto' THEN 2 WHEN 'moderado' THEN 1 ELSE 0 END`,
      "desc",
    )
    .orderBy(sql`COALESCE(abs(desvio_percentual), 0)`, "desc")
    .orderBy("anomalia_id", "asc");

  if (
    typeof options?.limite === "number" &&
    Number.isInteger(options.limite) &&
    options.limite > 0
  ) {
    query = query.limit(options.limite);
  }

  const rows = await query.execute();

  return rows.map((r) => ({
    anomaliaId: String(r.anomalia_id),
    portalSlug: String(r.portal_slug),
    ano: Number(r.ano),
    tipoAnomalia: r.tipo_anomalia as TipoAnomalia,
    dimensaoReferencia: String(r.dimensao_referencia),
    grauSeveridade: r.grau_severidade as GrauSeveridade,
    desvioPercentual: parseFloat(String(r.desvio_percentual ?? "0")) || 0,
    valorObservado: parseFloat(String(r.valor_observado ?? "0")) || 0,
    valorEsperado: parseFloat(String(r.valor_esperado ?? "0")) || 0,
    mesInicial: Number(r.mes_inicial),
    mesFinal: Number(r.mes_final),
    licitacaoNumero: r.licitacao_numero ? String(r.licitacao_numero) : null,
    metodoDeteccao: r.metodo_deteccao ? String(r.metodo_deteccao) : null,
  }));
}

export interface GetRadarAnomaliasCountOptions {
  portalSlug: string;
  ano?: number;
}

export interface GetRadarAnomaliasCountByYearOptions {
  portalSlug: string;
}

/**
 * Retorna a contagem atômica de anomalias fiscais com grau de severidade 'critico'
 * para o portal e exercício especificados.
 */
export async function getRadarAnomaliasCount(
  options: GetRadarAnomaliasCountOptions,
): Promise<number> {
  const { portalSlug, ano } = options ?? {};
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === ""
  ) {
    return 0;
  }

  if (
    ano !== undefined &&
    (typeof ano !== "number" ||
      !Number.isInteger(ano) ||
      Math.abs(ano) > 2147483647)
  ) {
    return 0;
  }

  const cleanSlug = portalSlug.trim();

  let query = db
    .selectFrom("fct_anomalias_fiscais_metricas")
    .select(sql<number>`count(*)::int`.as("total"))
    .where("portal_slug", "=", cleanSlug)
    .where("grau_severidade", "=", "critico");

  if (ano !== undefined) {
    query = query.where("ano", "=", ano);
  }

  const row = await query.executeTakeFirst();
  return Number(row?.total ?? 0);
}

/**
 * Retorna um mapa consolidado com a contagem de anomalias fiscais críticas
 * agrupadas por ano para o portal informado.
 */
export async function getRadarAnomaliasCountByYear(
  options: GetRadarAnomaliasCountByYearOptions,
): Promise<Record<number, number>> {
  const { portalSlug } = options ?? {};
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === ""
  ) {
    return {};
  }

  const cleanSlug = portalSlug.trim();

  const rows = await db
    .selectFrom("fct_anomalias_fiscais_metricas")
    .select(["ano", sql<number>`count(*)::int`.as("total")])
    .where("portal_slug", "=", cleanSlug)
    .where("grau_severidade", "=", "critico")
    .groupBy("ano")
    .execute();

  return Object.fromEntries(
    rows.map((r) => [Number(r.ano), Number(r.total ?? 0)]),
  );
}
