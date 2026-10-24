import { sql } from "kysely";
import { db } from "../client";

export type StatusConformidadeFarmacia = "conforme" | "apagao" | "indisponivel";

export interface FarmaciaSusMedicamentoDTO {
  nomeMedicamento: string;
  quantidadeEstoque: number;
  dataPosicaoEstoque: string | null;
}

export interface FarmaciaSusUnidadeDTO {
  idUnidade: string;
  nomeUnidade: string;
  enderecoUnidade: string | null;
  telefoneUnidade: string | null;
  latitudeUnidade: number | null;
  longitudeUnidade: number | null;
  medicamentos: FarmaciaSusMedicamentoDTO[];
}

export interface ResumoFarmaciaSusDTO {
  status: StatusConformidadeFarmacia;
  dataColeta: string | null;
  dataPosicaoMaisRecente: string | null;
  diasDesdePosicaoMaisRecente: number | null;
}

export interface FarmaciaSusDTO extends ResumoFarmaciaSusDTO {
  totalUnidades: number;
  unidades: FarmaciaSusUnidadeDTO[];
}

export interface GetFarmaciaSusFiltros {
  busca?: string;
  idUnidade?: string;
  limiteUnidades?: number;
  offsetUnidades?: number;
}

const LIMITE_UNIDADES_PADRAO = 10;
const TAMANHO_MINIMO_BUSCA = 2;

const STATUS_VALIDOS: readonly StatusConformidadeFarmacia[] = [
  "conforme",
  "apagao",
  "indisponivel",
];

const ID_UNIDADE_SQL = sql<string>`coalesce(codigo_cnes, nome_unidade, id_registro)`;

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
  return /^\d{4}-\d{2}-\d{2}/.test(str) ? str.slice(0, 10) : null;
}

function toNumberOrNull(val: unknown): number | null {
  if (val == null) return null;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : null;
}

function toValidCoordinate(latitude: unknown, longitude: unknown) {
  const lat = toNumberOrNull(latitude);
  const lng = toNumberOrNull(longitude);
  const valida = lat != null && lng != null && !(lat === 0 && lng === 0);
  return {
    latitudeUnidade: valida ? lat : null,
    longitudeUnidade: valida ? lng : null,
  };
}

function escapeLikePattern(termo: string): string {
  return termo.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function isPortalSlugValido(portalSlug: unknown): portalSlug is string {
  return typeof portalSlug === "string" && portalSlug.trim() !== "";
}

const RESUMO_INDISPONIVEL: ResumoFarmaciaSusDTO = {
  status: "indisponivel",
  dataColeta: null,
  dataPosicaoMaisRecente: null,
  diasDesdePosicaoMaisRecente: null,
};

/**
 * Status de conformidade da Farmácia SUS (Lei 14.654/2023) lido do mart
 * `fct_farmacia_estoque`. Portal sem linha no mart equivale a `indisponivel`.
 */
export async function getResumoFarmaciaSus(
  portalSlug: string,
): Promise<ResumoFarmaciaSusDTO> {
  if (!isPortalSlugValido(portalSlug)) return RESUMO_INDISPONIVEL;

  const row = await db
    .selectFrom("fct_farmacia_estoque")
    .select([
      "status_conformidade",
      "data_coleta",
      "data_posicao_mais_recente",
      "dias_desde_posicao_mais_recente",
    ])
    .where("portal_slug", "=", portalSlug.trim())
    .limit(1)
    .executeTakeFirst();

  if (!row) return RESUMO_INDISPONIVEL;

  const status = STATUS_VALIDOS.includes(row.status_conformidade)
    ? (row.status_conformidade as StatusConformidadeFarmacia)
    : "indisponivel";

  return {
    status,
    dataColeta: toIsoDateString(row.data_coleta),
    dataPosicaoMaisRecente: toIsoDateString(row.data_posicao_mais_recente),
    diasDesdePosicaoMaisRecente: toNumberOrNull(
      row.dias_desde_posicao_mais_recente,
    ),
  };
}

/**
 * Estoque da Farmácia SUS agrupado por unidade. Sem `busca` (mínimo de 2
 * caracteres) nenhuma unidade é retornada: a busca começa vazia por padrão.
 */
export async function getFarmaciaSus(
  portalSlug: string,
  filtros?: GetFarmaciaSusFiltros,
): Promise<FarmaciaSusDTO> {
  const resumo = await getResumoFarmaciaSus(portalSlug);
  const termo = filtros?.busca?.trim() ?? "";

  if (resumo.status !== "conforme" || termo.length < TAMANHO_MINIMO_BUSCA) {
    return { ...resumo, totalUnidades: 0, unidades: [] };
  }

  const cleanSlug = portalSlug.trim();
  const limite = Math.max(
    1,
    Math.floor(filtros?.limiteUnidades ?? LIMITE_UNIDADES_PADRAO),
  );
  const offset = Math.max(0, Math.floor(filtros?.offsetUnidades ?? 0));
  const idUnidade = filtros?.idUnidade?.trim();

  const linhasBase = () => {
    const consulta = db
      .selectFrom("fct_farmacia_estoque")
      .where("portal_slug", "=", cleanSlug)
      .where("status_conformidade", "=", "conforme")
      .where(
        sql<boolean>`unaccent(lower(coalesce(nome_medicamento, ''))) LIKE '%' || unaccent(lower(${escapeLikePattern(termo)})) || '%' ESCAPE '\\'`,
      );
    return idUnidade
      ? consulta.where(sql<boolean>`${ID_UNIDADE_SQL} = ${idUnidade}`)
      : consulta;
  };

  const unidadesPagina = await linhasBase()
    .select([
      ID_UNIDADE_SQL.as("id_unidade"),
      sql<string>`min(coalesce(nome_unidade, ''))`.as("nome_unidade_ordem"),
      sql<string>`count(*) over ()`.as("total_unidades"),
    ])
    .groupBy(ID_UNIDADE_SQL)
    .orderBy("nome_unidade_ordem")
    .orderBy("id_unidade")
    .limit(limite)
    .offset(offset)
    .execute();

  if (unidadesPagina.length === 0) {
    return { ...resumo, totalUnidades: 0, unidades: [] };
  }

  const ids = unidadesPagina.map((u) => u.id_unidade);

  // A fonte publica um registro por lote; o cidadão quer o total por medicamento.
  const nomeMedicamentoNormalizado = sql<string>`btrim(regexp_replace(coalesce(nome_medicamento, ''), '\\s+', ' ', 'g'))`;
  const linhas = await linhasBase()
    .select([
      ID_UNIDADE_SQL.as("id_unidade"),
      "nome_unidade",
      "endereco_unidade",
      "telefone_unidade",
      "latitude_unidade",
      "longitude_unidade",
      nomeMedicamentoNormalizado.as("nome_medicamento"),
      sql<string>`sum(quantidade_estoque)`.as("quantidade_estoque"),
      sql<Date | string | null>`max(data_posicao_estoque)`.as(
        "data_posicao_estoque",
      ),
    ])
    .where(sql<boolean>`${ID_UNIDADE_SQL} in (${sql.join(ids)})`)
    .groupBy([
      ID_UNIDADE_SQL,
      "nome_unidade",
      "endereco_unidade",
      "telefone_unidade",
      "latitude_unidade",
      "longitude_unidade",
      nomeMedicamentoNormalizado,
    ])
    .orderBy("nome_medicamento")
    .execute();

  const unidades = unidadesPagina.map((pagina): FarmaciaSusUnidadeDTO => {
    const linhasUnidade = linhas.filter(
      (l) => l.id_unidade === pagina.id_unidade,
    );
    const primeira = linhasUnidade[0];
    return {
      idUnidade: pagina.id_unidade,
      nomeUnidade: primeira?.nome_unidade ?? pagina.id_unidade,
      enderecoUnidade: primeira?.endereco_unidade ?? null,
      telefoneUnidade: primeira?.telefone_unidade ?? null,
      ...toValidCoordinate(
        primeira?.latitude_unidade,
        primeira?.longitude_unidade,
      ),
      medicamentos: linhasUnidade.map((l) => ({
        nomeMedicamento: l.nome_medicamento ?? "",
        quantidadeEstoque: toNumberOrNull(l.quantidade_estoque) ?? 0,
        dataPosicaoEstoque: toIsoDateString(l.data_posicao_estoque),
      })),
    };
  });

  return {
    ...resumo,
    totalUnidades: Number(unidadesPagina[0].total_unidades),
    unidades,
  };
}

export interface FarmaciaSentinelaDTO {
  codigoPrincipioAtivo: string;
  nomePrincipioAtivo: string;
  grupoTerapeutico: string;
  ordemExibicao: number;
  unidadesComRegistro: number;
}

export interface FarmaciaSentinelasDTO {
  totalUnidadesAtivas: number;
  sentinelas: FarmaciaSentinelaDTO[];
}

const SENTINELAS_VAZIO: FarmaciaSentinelasDTO = {
  totalUnidadesAtivas: 0,
  sentinelas: [],
};

/**
 * Disponibilidade dos medicamentos-sentinela (RENAME 2024) lida do mart
 * `fct_farmacia_sentinela_disponibilidade`: quantas das unidades ativas
 * informaram estoque de cada princípio ativo. Portal sem linhas devolve vazio.
 */
export async function getFarmaciaSentinelas(
  portalSlug: string,
): Promise<FarmaciaSentinelasDTO> {
  if (!isPortalSlugValido(portalSlug)) return SENTINELAS_VAZIO;

  const linhas = await db
    .selectFrom("fct_farmacia_sentinela_disponibilidade")
    .select([
      "codigo_principio_ativo",
      sql<string>`min(nome_principio_ativo)`.as("nome_principio_ativo"),
      sql<string>`min(grupo_terapeutico)`.as("grupo_terapeutico"),
      sql<number>`min(ordem_exibicao)`.as("ordem_exibicao"),
      sql<number>`count(*)`.as("total_unidades_ativas"),
      sql<number>`count(*) filter (where status_disponibilidade = 'com_registro_estoque')`.as(
        "unidades_com_registro",
      ),
    ])
    .where("portal_slug", "=", portalSlug.trim())
    .groupBy(["portal_slug", "codigo_principio_ativo"])
    .orderBy("ordem_exibicao")
    .orderBy("codigo_principio_ativo")
    .execute();

  if (linhas.length === 0) return SENTINELAS_VAZIO;

  return {
    totalUnidadesAtivas: Math.max(
      ...linhas.map((l) => toNumberOrNull(l.total_unidades_ativas) ?? 0),
    ),
    sentinelas: linhas.map((l) => ({
      codigoPrincipioAtivo: l.codigo_principio_ativo,
      nomePrincipioAtivo: l.nome_principio_ativo,
      grupoTerapeutico: l.grupo_terapeutico,
      ordemExibicao: toNumberOrNull(l.ordem_exibicao) ?? 0,
      unidadesComRegistro: toNumberOrNull(l.unidades_com_registro) ?? 0,
    })),
  };
}
