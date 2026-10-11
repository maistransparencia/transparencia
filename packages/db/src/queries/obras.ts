import { sql } from "kysely";
import { db } from "../client";

export type SituacaoObra =
  | "em_execucao"
  | "paralisada"
  | "concluida"
  | "cadastrada"
  | "cancelada"
  | (string & {});

export type SituacaoObraFiltro =
  | "todas"
  | "em_execucao"
  | "paralisada"
  | "concluida"
  | "cadastrada"
  | "cancelada";

export interface ObraDTO {
  idProjeto: string;
  portalSlug: string;
  nomeObra: string;
  situacao: SituacaoObra;
  orgaoResponsavel: string | null;
  valorInvestimentoPrevisto: number;
  percentualExecucaoFisica: number | null;
  dataUltimaMedicao: string | null;
  latitude: number | null;
  longitude: number | null;
  motivoParalisacao: string | null;
  dataInicioPrevista: string | null;
  dataFimPrevista: string | null;
}

export interface GetObrasFiltros {
  status?: SituacaoObraFiltro;
  busca?: string;
  ano?: number;
  limite?: number;
  offset?: number;
}

export interface ResumoObrasDTO {
  totalObras: number;
  emExecucao: number;
  paralisadas: number;
  concluidas: number;
  cadastradas: number;
  canceladas: number;
  valorTotalInvestimento: number;
  valorEmExecucao: number;
  valorParalisadas: number;
  valorConcluidas: number;
  valorCadastradas: number;
  percentualMedioExecucaoFisica: number | null;
  obrasSemMedicaoCount: number;
}

const OBRA_SELECT_COLUMNS = [
  "portal_slug",
  "id_projeto",
  "nome_obra",
  "situacao",
  "orgao_responsavel",
  "valor_investimento_previsto",
  "percentual_execucao_fisica",
  "data_ultima_medicao",
  "latitude",
  "longitude",
  "motivo_paralisacao",
  "data_inicio_prevista",
  "data_fim_prevista",
] as const;

function toIsoDateString(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return null;
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, "0");
    const day = String(val.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return null;
}

type ObraRow = {
  portal_slug?: string | null;
  id_projeto?: string | null;
  nome_obra?: string | null;
  situacao?: string | null;
  orgao_responsavel?: string | null;
  valor_investimento_previsto?: string | number | null;
  percentual_execucao_fisica?: string | number | null;
  data_ultima_medicao?: string | Date | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  motivo_paralisacao?: string | null;
  data_inicio_prevista?: string | Date | null;
  data_fim_prevista?: string | Date | null;
};

function mapRowToObraDTO(row: ObraRow): ObraDTO {
  const valorInvestimentoPrevisto =
    row.valor_investimento_previsto != null
      ? Number(row.valor_investimento_previsto)
      : 0;

  const percentualExecucaoFisica =
    row.percentual_execucao_fisica != null
      ? Number(row.percentual_execucao_fisica)
      : null;

  const rawLat = row.latitude != null ? Number(row.latitude) : null;
  const rawLng = row.longitude != null ? Number(row.longitude) : null;

  const isFiniteCoords =
    rawLat != null &&
    rawLng != null &&
    !Number.isNaN(rawLat) &&
    !Number.isNaN(rawLng);

  // Longitude no Brasil é estritamente negativa entre -75° e -34°.
  // Latitude no Brasil fica entre -35° e +6°.
  // Rejeita dummy (0,0), valores positivos (ex: África/Oceanos) e dados corrompidos
  // onde a latitude foi espelhada ou copiada no campo de longitude (abs(lat) == abs(lon)).
  const isValidBrazilianCoord =
    isFiniteCoords &&
    !(rawLat === 0 && rawLng === 0) &&
    rawLng < -34 &&
    rawLng > -75 &&
    rawLat > -35 &&
    rawLat < 6 &&
    Math.abs(Math.abs(rawLat) - Math.abs(rawLng)) >= 0.001;

  const latitude = isValidBrazilianCoord ? rawLat : null;
  const longitude = isValidBrazilianCoord ? rawLng : null;

  const situacao = (row.situacao ?? "cadastrada") as SituacaoObra;

  return {
    idProjeto: row.id_projeto != null ? String(row.id_projeto) : "",
    portalSlug: row.portal_slug != null ? String(row.portal_slug) : "",
    nomeObra: row.nome_obra != null ? String(row.nome_obra) : "",
    situacao,
    orgaoResponsavel:
      row.orgao_responsavel != null ? String(row.orgao_responsavel) : null,
    valorInvestimentoPrevisto: Number.isNaN(valorInvestimentoPrevisto)
      ? 0
      : valorInvestimentoPrevisto,
    percentualExecucaoFisica:
      percentualExecucaoFisica != null &&
      !Number.isNaN(percentualExecucaoFisica)
        ? percentualExecucaoFisica
        : null,
    dataUltimaMedicao: toIsoDateString(row.data_ultima_medicao),
    latitude,
    longitude,
    motivoParalisacao:
      row.motivo_paralisacao != null ? String(row.motivo_paralisacao) : null,
    dataInicioPrevista: toIsoDateString(row.data_inicio_prevista),
    dataFimPrevista: toIsoDateString(row.data_fim_prevista),
  };
}

/**
 * Retorna as obras públicas consolidadas a partir do mart `fct_obras`,
 * ordenadas prioritariamente por valor de investimento previsto decrescente (nulls last).
 */
export async function getObrasPorPortal(
  portalSlug: string,
  filtros?: GetObrasFiltros,
): Promise<ObraDTO[]> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === ""
  ) {
    return [];
  }

  const cleanSlug = portalSlug.trim();

  let query = db
    .selectFrom("fct_obras")
    .select(OBRA_SELECT_COLUMNS)
    .where("portal_slug", "=", cleanSlug);

  if (filtros?.status && filtros.status !== "todas") {
    query = query.where("situacao", "=", filtros.status);
  }

  if (filtros?.ano !== undefined && Number.isInteger(filtros.ano)) {
    query = query.where((eb) =>
      eb.or([
        sql`extract(year from data_inicio_prevista) <= ${filtros.ano}`,
        sql`data_inicio_prevista is null`,
      ]),
    );
  }

  if (filtros?.busca && filtros.busca.trim().length >= 2) {
    const termo = filtros.busca.trim();
    query = query.where((eb) =>
      eb.or([
        sql`unaccent(lower(coalesce(id_projeto, ''))) LIKE '%' || unaccent(lower(${termo})) || '%'`,
        sql`unaccent(lower(coalesce(nome_obra, ''))) LIKE '%' || unaccent(lower(${termo})) || '%'`,
        sql`unaccent(lower(coalesce(orgao_responsavel, ''))) LIKE '%' || unaccent(lower(${termo})) || '%'`,
      ]),
    );
  }

  query = query
    .orderBy(sql`valor_investimento_previsto desc nulls last`)
    .orderBy("id_projeto", "asc");

  if (
    filtros?.limite !== undefined &&
    Number.isInteger(filtros.limite) &&
    filtros.limite > 0
  ) {
    query = query.limit(filtros.limite);
  }

  if (
    filtros?.offset !== undefined &&
    Number.isInteger(filtros.offset) &&
    filtros.offset >= 0
  ) {
    query = query.offset(filtros.offset);
  }

  const rows = await query.execute();

  return rows.map(mapRowToObraDTO);
}

/**
 * Retorna o detalhe de uma obra específica pelo seu identificador único de projeto e portal.
 */
export async function getObraDetalhe(
  portalSlug: string,
  idProjeto: string,
): Promise<ObraDTO | null> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === "" ||
    !idProjeto ||
    typeof idProjeto !== "string" ||
    idProjeto.trim() === ""
  ) {
    return null;
  }

  const cleanSlug = portalSlug.trim();
  const cleanId = idProjeto.trim();

  const row = await db
    .selectFrom("fct_obras")
    .select(OBRA_SELECT_COLUMNS)
    .where("portal_slug", "=", cleanSlug)
    .where("id_projeto", "=", cleanId)
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  return mapRowToObraDTO(row);
}

/**
 * Retorna o resumo consolidado de obras públicas por município a partir do mart `fct_obras`.
 */
export async function getResumoObrasPorPortal(
  portalSlug: string,
  filtros?: { ano?: number },
): Promise<ResumoObrasDTO> {
  const zerado: ResumoObrasDTO = {
    totalObras: 0,
    emExecucao: 0,
    paralisadas: 0,
    concluidas: 0,
    cadastradas: 0,
    canceladas: 0,
    valorTotalInvestimento: 0,
    valorEmExecucao: 0,
    valorParalisadas: 0,
    valorConcluidas: 0,
    valorCadastradas: 0,
    percentualMedioExecucaoFisica: null,
    obrasSemMedicaoCount: 0,
  };

  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === ""
  ) {
    return zerado;
  }

  const cleanSlug = portalSlug.trim();

  let query = db
    .selectFrom("fct_obras")
    .select([
      sql<number>`count(*)::int`.as("total_obras"),
      sql<number>`count(*) filter (where situacao = 'em_execucao')::int`.as(
        "em_execucao",
      ),
      sql<number>`count(*) filter (where situacao = 'paralisada')::int`.as(
        "paralisadas",
      ),
      sql<number>`count(*) filter (where situacao = 'concluida')::int`.as(
        "concluidas",
      ),
      sql<number>`count(*) filter (where situacao = 'cadastrada')::int`.as(
        "cadastradas",
      ),
      sql<number>`count(*) filter (where situacao = 'cancelada')::int`.as(
        "canceladas",
      ),
      sql<string | number>`coalesce(sum(valor_investimento_previsto), 0)`.as(
        "valor_total_investimento",
      ),
      sql<
        string | number
      >`coalesce(sum(valor_investimento_previsto) filter (where situacao = 'em_execucao'), 0)`.as(
        "valor_em_execucao",
      ),
      sql<
        string | number
      >`coalesce(sum(valor_investimento_previsto) filter (where situacao = 'paralisada'), 0)`.as(
        "valor_paralisadas",
      ),
      sql<
        string | number
      >`coalesce(sum(valor_investimento_previsto) filter (where situacao = 'concluida'), 0)`.as(
        "valor_concluidas",
      ),
      sql<
        string | number
      >`coalesce(sum(valor_investimento_previsto) filter (where situacao = 'cadastrada'), 0)`.as(
        "valor_cadastradas",
      ),
      sql<number>`count(*) filter (where data_ultima_medicao is null and percentual_execucao_fisica is null)::int`.as(
        "obras_sem_medicao",
      ),
      sql<
        string | number | null
      >`avg(percentual_execucao_fisica) filter (where situacao in ('em_execucao', 'paralisada', 'concluida'))`.as(
        "percentual_medio_execucao_fisica",
      ),
    ])
    .where("portal_slug", "=", cleanSlug);

  if (filtros?.ano !== undefined && Number.isInteger(filtros.ano)) {
    query = query.where((eb) =>
      eb.or([
        sql`extract(year from data_inicio_prevista) <= ${filtros.ano}`,
        sql`data_inicio_prevista is null`,
      ]),
    );
  }

  const res = await query.executeTakeFirst();

  if (!res || Number(res.total_obras ?? 0) === 0) {
    return zerado;
  }

  const rawAvg =
    res.percentual_medio_execucao_fisica != null
      ? Number(res.percentual_medio_execucao_fisica)
      : null;

  const percentualMedioExecucaoFisica =
    rawAvg != null && !Number.isNaN(rawAvg) ? Number(rawAvg.toFixed(2)) : null;

  return {
    totalObras: Number(res.total_obras ?? 0),
    emExecucao: Number(res.em_execucao ?? 0),
    paralisadas: Number(res.paralisadas ?? 0),
    concluidas: Number(res.concluidas ?? 0),
    cadastradas: Number(res.cadastradas ?? 0),
    canceladas: Number(res.canceladas ?? 0),
    valorTotalInvestimento: Number(
      Number(res.valor_total_investimento ?? 0).toFixed(2),
    ),
    valorEmExecucao: Number(Number(res.valor_em_execucao ?? 0).toFixed(2)),
    valorParalisadas: Number(Number(res.valor_paralisadas ?? 0).toFixed(2)),
    valorConcluidas: Number(Number(res.valor_concluidas ?? 0).toFixed(2)),
    valorCadastradas: Number(Number(res.valor_cadastradas ?? 0).toFixed(2)),
    percentualMedioExecucaoFisica,
    obrasSemMedicaoCount: Number(res.obras_sem_medicao ?? 0),
  };
}
