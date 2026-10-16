import { db } from "../client";

export type EtapaEnsino = "anosIniciais" | "anosFinais";

export function toEtapaEnsino(dbVal: string): EtapaEnsino {
  if (dbVal === "anos_finais" || dbVal === "anosFinais") {
    return "anosFinais";
  }
  return "anosIniciais";
}

export function toDbEtapaEnsino(
  etapa: EtapaEnsino | "anos_iniciais" | "anos_finais",
): "anos_iniciais" | "anos_finais" {
  if (etapa === "anosFinais" || etapa === "anos_finais") {
    return "anos_finais";
  }
  return "anos_iniciais";
}

function toNumberOrNull(val: unknown): number | null {
  if (val === null || val === undefined) {
    return null;
  }
  const num = Number(val);
  if (Number.isNaN(num)) {
    return null;
  }
  return num;
}

function toIntegerOrNull(val: unknown): number | null {
  if (val === null || val === undefined) {
    return null;
  }
  const num = Number.parseInt(String(val), 10);
  if (Number.isNaN(num)) {
    return null;
  }
  return num;
}

export function toBooleanOrNull(val: unknown): boolean | null {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === "boolean") {
    return val;
  }
  if (typeof val === "string") {
    const lower = val.trim().toLowerCase();
    if (lower === "true" || lower === "t" || lower === "1") {
      return true;
    }
    if (lower === "false" || lower === "f" || lower === "0") {
      return false;
    }
    return null;
  }
  if (typeof val === "number") {
    if (val === 1) return true;
    if (val === 0) return false;
    return null;
  }
  return Boolean(val);
}

export interface EducacaoMetricDTO {
  educacaoMetricaId: string;
  portalSlug: string;
  codIbge: number;
  ano: number;
  rede: string;
  etapaEnsino: EtapaEnsino;
  notaIdeb: number | null;
  metaIdeb: number | null;
  atingiuMeta: boolean | null;
  saebMatematica: number | null;
  saebLinguaPortuguesa: number | null;
  indicadorFluxoAprovacao: number | null;
  crescimentoPontosIdeb: number | null;
  variacaoSaebMatematica: number | null;
  variacaoSaebPortugues: number | null;
  despesaLiquidadaEducacao: number | null;
  totalMatriculasRedeMunicipal: number | null;
  custoAnualPorAluno: number | null;
}

export interface ResumoEducacaoDTO {
  portalSlug: string;
  ano: number;
  notaIdeb: number | null;
  metaIdeb: number | null;
  atingiuMeta: boolean | null;
  crescimentoPontosIdeb: number | null;
  saebMatematica: number | null;
  saebLinguaPortuguesa: number | null;
  indicadorFluxoAprovacao: number | null;
  despesaLiquidadaEducacao: number | null;
  totalMatriculasRedeMunicipal: number | null;
  custoAnualPorAluno: number | null;
  anosIniciais: EducacaoMetricDTO | null;
  anosFinais: EducacaoMetricDTO | null;
}

export interface GetEducacaoMetricsOptions {
  ano?: number;
  etapaEnsino?: EtapaEnsino;
}

function mapRowToEducacaoMetricDTO(
  row: Record<string, unknown>,
): EducacaoMetricDTO {
  return {
    educacaoMetricaId: String(row.educacao_metrica_id ?? ""),
    portalSlug: String(row.portal_slug ?? ""),
    codIbge: toIntegerOrNull(row.cod_ibge) ?? 0,
    ano: toIntegerOrNull(row.ano) ?? 0,
    rede: String(row.rede ?? "municipal"),
    etapaEnsino: toEtapaEnsino(String(row.etapa_ensino ?? "")),
    notaIdeb: toNumberOrNull(row.nota_ideb),
    metaIdeb: toNumberOrNull(row.meta_ideb),
    atingiuMeta: toBooleanOrNull(row.atingiu_meta_flag),
    saebMatematica: toNumberOrNull(row.saeb_matematica),
    saebLinguaPortuguesa: toNumberOrNull(row.saeb_lingua_portuguesa),
    indicadorFluxoAprovacao: toNumberOrNull(row.indicador_fluxo_aprovacao),
    crescimentoPontosIdeb: toNumberOrNull(row.crescimento_pontos_ideb),
    variacaoSaebMatematica: toNumberOrNull(row.variacao_saeb_matematica),
    variacaoSaebPortugues: toNumberOrNull(row.variacao_saeb_portugues),
    despesaLiquidadaEducacao: toNumberOrNull(row.despesa_liquidada_educacao),
    totalMatriculasRedeMunicipal: toIntegerOrNull(
      row.total_matriculas_rede_municipal,
    ),
    custoAnualPorAluno: toNumberOrNull(row.custo_anual_por_aluno),
  };
}

/**
 * Retorna as métricas educacionais históricas (IDEB, Saeb, fluxo e execução financeira)
 * para um determinado portal municipal, com suporte a filtros opcionais por ano e etapa de ensino.
 */
export async function getEducacaoMetrics(
  portalSlug: string,
  options?: GetEducacaoMetricsOptions,
): Promise<EducacaoMetricDTO[]> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === ""
  ) {
    return [];
  }

  const cleanSlug = portalSlug.trim();

  let query = db
    .selectFrom("fct_educacao_metricas")
    .selectAll()
    .where("portal_slug", "=", cleanSlug);

  if (options?.ano !== undefined && options.ano !== null) {
    query = query.where("ano", "=", options.ano);
  }

  if (options?.etapaEnsino !== undefined && options.etapaEnsino !== null) {
    const dbEtapa = toDbEtapaEnsino(options.etapaEnsino);
    query = query.where("etapa_ensino", "=", dbEtapa);
  }

  query = query.orderBy("ano", "asc").orderBy("etapa_ensino", "desc");

  const rows = await query.execute();

  return rows.map(mapRowToEducacaoMetricDTO);
}

/**
 * Retorna o resumo executivo das métricas educacionais para o ano mais recente disponível
 * (ou ano específico solicitado), consolidando Anos Iniciais e Anos Finais para a homepage.
 */
export async function getResumoEducacao(
  portalSlug: string,
  ano?: number,
): Promise<ResumoEducacaoDTO | null> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === ""
  ) {
    return null;
  }

  const cleanSlug = portalSlug.trim();

  let targetAno: number;

  if (ano !== undefined && ano !== null) {
    targetAno = ano;
  } else {
    const latestRow = await db
      .selectFrom("fct_educacao_metricas")
      .select("ano")
      .where("portal_slug", "=", cleanSlug)
      .orderBy("ano", "desc")
      .limit(1)
      .executeTakeFirst();

    if (!latestRow || latestRow.ano == null) {
      return null;
    }
    targetAno = Number(latestRow.ano);
  }

  const metrics = await getEducacaoMetrics(cleanSlug, { ano: targetAno });

  if (metrics.length === 0) {
    return null;
  }

  const anosIniciais =
    metrics.find((m) => m.etapaEnsino === "anosIniciais") ?? null;
  const anosFinais =
    metrics.find((m) => m.etapaEnsino === "anosFinais") ?? null;

  const primary = anosIniciais ?? anosFinais ?? metrics[0];
  const secondary = primary === anosIniciais ? anosFinais : anosIniciais;

  return {
    portalSlug: cleanSlug,
    ano: targetAno,
    notaIdeb: primary.notaIdeb ?? secondary?.notaIdeb ?? null,
    metaIdeb: primary.metaIdeb ?? secondary?.metaIdeb ?? null,
    atingiuMeta: primary.atingiuMeta ?? secondary?.atingiuMeta ?? null,
    crescimentoPontosIdeb:
      primary.crescimentoPontosIdeb ?? secondary?.crescimentoPontosIdeb ?? null,
    saebMatematica: primary.saebMatematica ?? secondary?.saebMatematica ?? null,
    saebLinguaPortuguesa:
      primary.saebLinguaPortuguesa ?? secondary?.saebLinguaPortuguesa ?? null,
    indicadorFluxoAprovacao:
      primary.indicadorFluxoAprovacao ??
      secondary?.indicadorFluxoAprovacao ??
      null,
    despesaLiquidadaEducacao:
      primary.despesaLiquidadaEducacao ??
      secondary?.despesaLiquidadaEducacao ??
      null,
    totalMatriculasRedeMunicipal:
      primary.totalMatriculasRedeMunicipal ??
      secondary?.totalMatriculasRedeMunicipal ??
      null,
    custoAnualPorAluno:
      primary.custoAnualPorAluno ?? secondary?.custoAnualPorAluno ?? null,
    anosIniciais,
    anosFinais,
  };
}
