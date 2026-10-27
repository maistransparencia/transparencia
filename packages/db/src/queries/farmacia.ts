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
  totalQuantidadeEstoque: number;
  medicamentos: FarmaciaSusMedicamentoDTO[];
}

export interface FarmaciaSusRemedioUnidadeDTO {
  idUnidade: string;
  quantidadeEstoque: number;
}

export interface FarmaciaSusRemedioDTO {
  nomeMedicamento: string;
  totalQuantidadeEstoque: number;
  totalUnidadesComEstoque: number;
  unidades: FarmaciaSusRemedioUnidadeDTO[];
}

export interface ResumoFarmaciaSusDTO {
  status: StatusConformidadeFarmacia;
  dataColeta: string | null;
  dataPosicaoMaisRecente: string | null;
  diasDesdePosicaoMaisRecente: number | null;
}

export interface FarmaciaSusDTO extends ResumoFarmaciaSusDTO {
  totalUnidades: number;
  totalQuantidadeEstoque: number;
  totalApresentacoes: number;
  unidades: FarmaciaSusUnidadeDTO[];
  remedios: FarmaciaSusRemedioDTO[];
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

// A fonte publica um registro por lote e com espaços irregulares no nome.
const NOME_MEDICAMENTO_NORMALIZADO_SQL = sql<string>`btrim(regexp_replace(coalesce(nome_medicamento, ''), '\\s+', ' ', 'g'))`;

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

const BUSCA_VAZIA = {
  totalUnidades: 0,
  totalQuantidadeEstoque: 0,
  totalApresentacoes: 0,
  unidades: [],
  remedios: [],
};

/** Agrupa o estoque por remédio, do maior total para o menor. */
export function agruparFarmaciaPorRemedio(
  unidades: FarmaciaSusUnidadeDTO[],
): FarmaciaSusRemedioDTO[] {
  const porNome = unidades
    .flatMap((u) =>
      u.medicamentos.map((m) => ({
        nomeMedicamento: m.nomeMedicamento,
        idUnidade: u.idUnidade,
        quantidadeEstoque: m.quantidadeEstoque,
      })),
    )
    .reduce<Map<string, FarmaciaSusRemedioUnidadeDTO[]>>(
      (acc, item) =>
        new Map(acc).set(item.nomeMedicamento, [
          ...(acc.get(item.nomeMedicamento) ?? []),
          {
            idUnidade: item.idUnidade,
            quantidadeEstoque: item.quantidadeEstoque,
          },
        ]),
      new Map(),
    );

  return [...porNome.entries()]
    .map(([nomeMedicamento, itens]): FarmaciaSusRemedioDTO => {
      const unidadesOrdenadas = [...itens].sort(
        (a, b) => b.quantidadeEstoque - a.quantidadeEstoque,
      );
      return {
        nomeMedicamento,
        totalQuantidadeEstoque: unidadesOrdenadas.reduce(
          (soma, i) => soma + i.quantidadeEstoque,
          0,
        ),
        totalUnidadesComEstoque: new Set(
          unidadesOrdenadas.map((i) => i.idUnidade),
        ).size,
        unidades: unidadesOrdenadas,
      };
    })
    .sort(
      (a, b) =>
        b.totalQuantidadeEstoque - a.totalQuantidadeEstoque ||
        a.nomeMedicamento.localeCompare(b.nomeMedicamento),
    );
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
  const termo = (filtros?.busca ?? "").trim().replace(/\s+/g, " ");

  if (resumo.status !== "conforme" || termo.length < TAMANHO_MINIMO_BUSCA) {
    return { ...resumo, ...BUSCA_VAZIA };
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
        sql<boolean>`unaccent(lower(${NOME_MEDICAMENTO_NORMALIZADO_SQL})) LIKE '%' || unaccent(lower(${escapeLikePattern(termo)})) || '%' ESCAPE '\\'`,
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
    return { ...resumo, ...BUSCA_VAZIA };
  }

  const ids = unidadesPagina.map((u) => u.id_unidade);

  // O cidadão quer o total por medicamento, não por lote.
  const nomeMedicamentoNormalizado = NOME_MEDICAMENTO_NORMALIZADO_SQL;
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

  const unidades = unidadesPagina
    .map((pagina): FarmaciaSusUnidadeDTO => {
      const linhasUnidade = linhas.filter(
        (l) => l.id_unidade === pagina.id_unidade,
      );
      const primeira = linhasUnidade[0];
      const medicamentos = linhasUnidade.map((l) => ({
        nomeMedicamento: l.nome_medicamento ?? "",
        quantidadeEstoque: toNumberOrNull(l.quantidade_estoque) ?? 0,
        dataPosicaoEstoque: toIsoDateString(l.data_posicao_estoque),
      }));
      return {
        idUnidade: pagina.id_unidade,
        nomeUnidade: primeira?.nome_unidade ?? pagina.id_unidade,
        enderecoUnidade: primeira?.endereco_unidade ?? null,
        telefoneUnidade: primeira?.telefone_unidade ?? null,
        ...toValidCoordinate(
          primeira?.latitude_unidade,
          primeira?.longitude_unidade,
        ),
        totalQuantidadeEstoque: medicamentos.reduce(
          (soma, m) => soma + m.quantidadeEstoque,
          0,
        ),
        medicamentos,
      };
    })
    .sort(
      (a, b) =>
        b.totalQuantidadeEstoque - a.totalQuantidadeEstoque ||
        a.nomeUnidade.localeCompare(b.nomeUnidade),
    );

  const remedios = agruparFarmaciaPorRemedio(unidades);

  return {
    ...resumo,
    totalUnidades: Number(unidadesPagina[0].total_unidades),
    totalQuantidadeEstoque: unidades.reduce(
      (soma, u) => soma + u.totalQuantidadeEstoque,
      0,
    ),
    totalApresentacoes: remedios.length,
    unidades,
    remedios,
  };
}

export interface FarmaciaIndiceMedicamentoDTO {
  nomeMedicamento: string;
  unidadesComEstoque: number;
}

export interface FarmaciaIndiceLetraDTO {
  letra: string;
  totalMedicamentos: number;
  medicamentos: FarmaciaIndiceMedicamentoDTO[];
}

export interface FarmaciaIndiceDTO {
  status: StatusConformidadeFarmacia;
  totalUnidades: number;
  /** Todas as letras que têm ao menos um medicamento, em ordem alfabética. */
  letrasDisponiveis: string[];
  totalLetras: number;
  letras: FarmaciaIndiceLetraDTO[];
}

export interface GetFarmaciaIndiceFiltros {
  /** Quando informada, devolve só esta letra; sem ela, as primeiras `limiteLetras` letras. */
  letra?: string;
  limiteLetras?: number;
  limiteMedicamentosPorLetra?: number;
}

const LIMITE_LETRAS_INDICE_PADRAO = 6;
const LIMITE_MEDICAMENTOS_POR_LETRA_RESUMO = 3;
const LIMITE_MEDICAMENTOS_LETRA_SELECIONADA = 25;
const LETRA_NUMEROS_INDICE = "0-9";
const LETRA_INDICE_VALIDA = /^(?:[A-Z]|0-9)$/;

// Chave de agrupamento: "AMOXICILINA" e "Amoxicilina" são o mesmo remédio.
const NOME_MEDICAMENTO_CHAVE_SQL = sql<string>`lower(unaccent(${NOME_MEDICAMENTO_NORMALIZADO_SQL}))`;

const PRIMEIRO_CARACTERE_SQL = sql<string>`upper(left(unaccent(${NOME_MEDICAMENTO_NORMALIZADO_SQL}), 1))`;
// Nomes que não começam com letra (número ou símbolo) vão para o grupo "0-9".
const INICIAL_MEDICAMENTO_SQL = sql<string>`case when ${PRIMEIRO_CARACTERE_SQL} ~ '^[A-Z]$' then ${PRIMEIRO_CARACTERE_SQL} else ${sql.lit(LETRA_NUMEROS_INDICE)} end`;

const INDICE_VAZIO = {
  totalUnidades: 0,
  letrasDisponiveis: [],
  totalLetras: 0,
  letras: [],
};

/**
 * Índice alfabético do estoque da Farmácia SUS: medicamentos agrupados pela
 * inicial do nome (A–Z, sem acento). Nomes que não começam com letra formam o
 * grupo "0-9", listado depois do Z e só presente quando existe algum.
 */
export async function getFarmaciaIndiceAlfabetico(
  portalSlug: string,
  filtros?: GetFarmaciaIndiceFiltros,
): Promise<FarmaciaIndiceDTO> {
  const resumo = await getResumoFarmaciaSus(portalSlug);
  if (resumo.status !== "conforme") {
    return { status: resumo.status, ...INDICE_VAZIO };
  }

  const cleanSlug = portalSlug.trim();
  const letraPedida = filtros?.letra?.trim().toUpperCase();
  const limiteLetras = Math.max(
    1,
    Math.floor(filtros?.limiteLetras ?? LIMITE_LETRAS_INDICE_PADRAO),
  );
  const limiteMedicamentos = Math.max(
    1,
    Math.floor(
      filtros?.limiteMedicamentosPorLetra ??
        (letraPedida
          ? LIMITE_MEDICAMENTOS_LETRA_SELECIONADA
          : LIMITE_MEDICAMENTOS_POR_LETRA_RESUMO),
    ),
  );

  const linhasBase = () =>
    db
      .selectFrom("fct_farmacia_estoque")
      .where("portal_slug", "=", cleanSlug)
      .where("status_conformidade", "=", "conforme")
      .where(sql<boolean>`${NOME_MEDICAMENTO_NORMALIZADO_SQL} <> ''`);

  const [contagens, totais] = await Promise.all([
    linhasBase()
      .select([
        INICIAL_MEDICAMENTO_SQL.as("inicial"),
        sql<number>`count(distinct ${NOME_MEDICAMENTO_CHAVE_SQL})`.as(
          "total_medicamentos",
        ),
      ])
      .groupBy(INICIAL_MEDICAMENTO_SQL)
      .orderBy(
        sql`${INICIAL_MEDICAMENTO_SQL} = ${sql.lit(LETRA_NUMEROS_INDICE)}`,
      )
      .orderBy("inicial")
      .execute(),
    linhasBase()
      .select(
        sql<number>`count(distinct ${ID_UNIDADE_SQL})`.as("total_unidades"),
      )
      .executeTakeFirst(),
  ]);

  const letrasDisponiveis = contagens.map((c) => c.inicial);
  const totalPorLetra = new Map(
    contagens.map((c) => [
      c.inicial,
      toNumberOrNull(c.total_medicamentos) ?? 0,
    ]),
  );
  const letrasAlvo = (() => {
    if (!letraPedida) return letrasDisponiveis.slice(0, limiteLetras);
    return LETRA_INDICE_VALIDA.test(letraPedida) &&
      totalPorLetra.has(letraPedida)
      ? [letraPedida]
      : [];
  })();

  const base = {
    status: resumo.status,
    totalUnidades: toNumberOrNull(totais?.total_unidades) ?? 0,
    letrasDisponiveis,
    totalLetras: letrasDisponiveis.length,
  };
  if (letrasAlvo.length === 0) return { ...base, letras: [] };

  const posicionados = linhasBase()
    .select([
      INICIAL_MEDICAMENTO_SQL.as("inicial"),
      sql<string>`min(${NOME_MEDICAMENTO_NORMALIZADO_SQL})`.as(
        "nome_medicamento",
      ),
      sql<number>`count(distinct ${ID_UNIDADE_SQL})`.as("unidades_com_estoque"),
      sql<number>`row_number() over (partition by ${INICIAL_MEDICAMENTO_SQL} order by ${NOME_MEDICAMENTO_CHAVE_SQL})`.as(
        "posicao",
      ),
    ])
    .where(
      sql<boolean>`${INICIAL_MEDICAMENTO_SQL} in (${sql.join(letrasAlvo)})`,
    )
    .groupBy([INICIAL_MEDICAMENTO_SQL, NOME_MEDICAMENTO_CHAVE_SQL]);

  const linhas = await db
    .selectFrom(posicionados.as("posicionados"))
    .select(["inicial", "nome_medicamento", "unidades_com_estoque"])
    .where("posicao", "<=", limiteMedicamentos)
    .orderBy("inicial")
    .orderBy("posicao")
    .execute();

  const medicamentosPorLetra = linhas.reduce<
    Map<string, FarmaciaIndiceMedicamentoDTO[]>
  >(
    (acc, linha) =>
      new Map(acc).set(linha.inicial, [
        ...(acc.get(linha.inicial) ?? []),
        {
          nomeMedicamento: linha.nome_medicamento,
          unidadesComEstoque: toNumberOrNull(linha.unidades_com_estoque) ?? 0,
        },
      ]),
    new Map(),
  );

  return {
    ...base,
    letras: letrasAlvo.map(
      (letra): FarmaciaIndiceLetraDTO => ({
        letra,
        totalMedicamentos: totalPorLetra.get(letra) ?? 0,
        medicamentos: medicamentosPorLetra.get(letra) ?? [],
      }),
    ),
  };
}

export interface FarmaciaSentinelaDTO {
  codigoPrincipioAtivo: string;
  nomePrincipioAtivo: string;
  grupoTerapeutico: string;
  ordemExibicao: number;
  destaqueCardInicial: boolean;
  unidadesComRegistro: number;
  unidadesSomenteCombinacao: number;
}

export interface FarmaciaIndicadoresDTO {
  totalEssenciais: number;
  essenciaisNoEstoque: number;
  essenciaisSomenteCombinacao: number;
  essenciaisSemRegistro: number;
}

export interface FarmaciaSentinelasDTO {
  totalUnidadesAtivas: number;
  indicadores: FarmaciaIndicadoresDTO;
  sentinelas: FarmaciaSentinelaDTO[];
}

const INDICADORES_VAZIO: FarmaciaIndicadoresDTO = {
  totalEssenciais: 0,
  essenciaisNoEstoque: 0,
  essenciaisSomenteCombinacao: 0,
  essenciaisSemRegistro: 0,
};

const SENTINELAS_VAZIO: FarmaciaSentinelasDTO = {
  totalUnidadesAtivas: 0,
  indicadores: INDICADORES_VAZIO,
  sentinelas: [],
};

/** Quantos remédios essenciais aparecem no estoque, só em combinação ou em nenhuma unidade. */
export function calcularIndicadoresFarmacia(
  sentinelas: FarmaciaSentinelaDTO[],
): FarmaciaIndicadoresDTO {
  const noEstoque = sentinelas.filter((s) => s.unidadesComRegistro > 0);
  const restantes = sentinelas.filter((s) => s.unidadesComRegistro === 0);
  const somenteCombinacao = restantes.filter(
    (s) => s.unidadesSomenteCombinacao > 0,
  );
  return {
    totalEssenciais: sentinelas.length,
    essenciaisNoEstoque: noEstoque.length,
    essenciaisSomenteCombinacao: somenteCombinacao.length,
    essenciaisSemRegistro: restantes.length - somenteCombinacao.length,
  };
}

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
      sql<boolean>`bool_or(destaque_card_inicial)`.as("destaque_card_inicial"),
      sql<number>`count(*)`.as("total_unidades_ativas"),
      sql<number>`count(*) filter (where status_disponibilidade = 'com_registro_estoque')`.as(
        "unidades_com_registro",
      ),
      sql<number>`count(*) filter (where status_disponibilidade = 'sem_registro_estoque' and quantidade_apresentacoes_combinacao_com_estoque > 0)`.as(
        "unidades_somente_combinacao",
      ),
    ])
    .where("portal_slug", "=", portalSlug.trim())
    .groupBy(["portal_slug", "codigo_principio_ativo"])
    .orderBy("ordem_exibicao")
    .orderBy("codigo_principio_ativo")
    .execute();

  if (linhas.length === 0) return SENTINELAS_VAZIO;

  const sentinelas = linhas.map(
    (l): FarmaciaSentinelaDTO => ({
      codigoPrincipioAtivo: l.codigo_principio_ativo,
      nomePrincipioAtivo: l.nome_principio_ativo,
      grupoTerapeutico: l.grupo_terapeutico,
      ordemExibicao: toNumberOrNull(l.ordem_exibicao) ?? 0,
      destaqueCardInicial: Boolean(l.destaque_card_inicial),
      unidadesComRegistro: toNumberOrNull(l.unidades_com_registro) ?? 0,
      unidadesSomenteCombinacao:
        toNumberOrNull(l.unidades_somente_combinacao) ?? 0,
    }),
  );

  return {
    totalUnidadesAtivas: Math.max(
      ...linhas.map((l) => toNumberOrNull(l.total_unidades_ativas) ?? 0),
    ),
    indicadores: calcularIndicadoresFarmacia(sentinelas),
    sentinelas,
  };
}

/** Lotes que vencem em até este número de dias contam como "próximos do vencimento". */
export const FARMACIA_JANELA_LOTES_A_VENCER_DIAS = 60;

export interface FarmaciaLotesAVencerDTO {
  janelaDias: number;
  /** Lotes com validade informada na posição vigente; zero esconde o card. */
  totalLotesComValidade: number;
  totalLotesAVencer: number;
  totalRemediosAVencer: number;
  /** Lotes com validade anterior a hoje que ainda constam com saldo na posição vigente. */
  totalLotesVencidosComSaldo: number;
  dataVencimentoMaisProxima: string | null;
}

const LOTES_A_VENCER_VAZIO: FarmaciaLotesAVencerDTO = {
  janelaDias: FARMACIA_JANELA_LOTES_A_VENCER_DIAS,
  totalLotesComValidade: 0,
  totalLotesAVencer: 0,
  totalRemediosAVencer: 0,
  totalLotesVencidosComSaldo: 0,
  dataVencimentoMaisProxima: null,
};

/**
 * Lotes próximos do vencimento na posição vigente de cada unidade (última
 * `data_posicao_estoque` por CNES). Só lotes com saldo e validade informada.
 */
export async function getFarmaciaLotesAVencer(
  portalSlug: string,
  janelaDias: number = FARMACIA_JANELA_LOTES_A_VENCER_DIAS,
): Promise<FarmaciaLotesAVencerDTO> {
  if (!isPortalSlugValido(portalSlug)) return LOTES_A_VENCER_VAZIO;
  const slug = portalSlug.trim();

  const { rows } = await sql<{
    total_lotes_com_validade: string | number;
    total_lotes_a_vencer: string | number;
    total_remedios_a_vencer: string | number;
    total_lotes_vencidos_com_saldo: string | number;
    data_vencimento_mais_proxima: unknown;
  }>`
    with posicao_vigente as (
      select portal_slug, codigo_cnes, max(data_posicao_estoque) as data_posicao_vigente
      from fct_farmacia_estoque_historico
      where portal_slug = ${slug}
      group by portal_slug, codigo_cnes
    ),
    lotes_vigentes as (
      select h.nome_medicamento, h.data_validade
      from fct_farmacia_estoque_historico h
      inner join posicao_vigente v
        on h.portal_slug = v.portal_slug
        and h.codigo_cnes is not distinct from v.codigo_cnes
        and h.data_posicao_estoque = v.data_posicao_vigente
      where h.portal_slug = ${slug}
        and h.data_validade is not null
        and h.quantidade_estoque > 0
    )
    select
      count(*) as total_lotes_com_validade,
      count(*) filter (where data_validade between current_date and current_date + ${Math.floor(janelaDias)}::int) as total_lotes_a_vencer,
      count(distinct lower(nome_medicamento)) filter (where data_validade between current_date and current_date + ${Math.floor(janelaDias)}::int) as total_remedios_a_vencer,
      count(*) filter (where data_validade < current_date) as total_lotes_vencidos_com_saldo,
      min(data_validade) filter (where data_validade >= current_date) as data_vencimento_mais_proxima
    from lotes_vigentes
  `.execute(db);

  const linha = rows[0];
  if (!linha) return LOTES_A_VENCER_VAZIO;
  const totalLotesAVencer = toNumberOrNull(linha.total_lotes_a_vencer) ?? 0;
  return {
    janelaDias,
    totalLotesComValidade: toNumberOrNull(linha.total_lotes_com_validade) ?? 0,
    totalLotesAVencer,
    totalRemediosAVencer: toNumberOrNull(linha.total_remedios_a_vencer) ?? 0,
    totalLotesVencidosComSaldo:
      toNumberOrNull(linha.total_lotes_vencidos_com_saldo) ?? 0,
    dataVencimentoMaisProxima:
      totalLotesAVencer > 0
        ? toIsoDateString(linha.data_vencimento_mais_proxima)
        : null,
  };
}

export interface FarmaciaEstoqueExportDTO {
  portalSlug: string;
  codigoCnes: string | null;
  nomeUnidade: string | null;
  nomeMedicamento: string;
  numeroLote: string | null;
  /** Nulo quando a fonte não informou a quantidade; nunca vira zero. */
  quantidadeEstoque: number | null;
  dataPosicaoEstoque: string | null;
  dataValidade: string | null;
}

/**
 * Estoque completo para download: um registro por lote na posição vigente
 * (última `data_posicao_estoque` por CNES) das unidades ativas de
 * `fct_farmacia_estoque`. Vazio para slug inválido ou portal fora de `conforme`.
 */
export async function getFarmaciaEstoqueExportRecords(
  portalSlug: string,
): Promise<FarmaciaEstoqueExportDTO[]> {
  if (!isPortalSlugValido(portalSlug)) return [];
  const slug = portalSlug.trim();

  const resumo = await getResumoFarmaciaSus(slug);
  if (resumo.status !== "conforme") return [];

  const { rows } = await sql<{
    portal_slug: string;
    codigo_cnes: string | null;
    nome_unidade: string | null;
    nome_medicamento: string;
    numero_lote: string | null;
    quantidade_estoque: string | number;
    data_posicao_estoque: unknown;
    data_validade: unknown;
  }>`
    with unidades_ativas as (
      select portal_slug, codigo_cnes, min(nome_unidade) as nome_unidade
      from fct_farmacia_estoque
      where portal_slug = ${slug}
        and status_conformidade = 'conforme'
      group by portal_slug, codigo_cnes
    ),
    posicao_vigente as (
      select portal_slug, codigo_cnes, max(data_posicao_estoque) as data_posicao_vigente
      from fct_farmacia_estoque_historico
      where portal_slug = ${slug}
      group by portal_slug, codigo_cnes
    )
    select
      h.portal_slug,
      h.codigo_cnes,
      u.nome_unidade,
      h.nome_medicamento,
      h.numero_lote,
      h.quantidade_estoque,
      h.data_posicao_estoque,
      h.data_validade
    from fct_farmacia_estoque_historico h
    inner join posicao_vigente v
      on h.portal_slug = v.portal_slug
      and h.codigo_cnes is not distinct from v.codigo_cnes
      and h.data_posicao_estoque = v.data_posicao_vigente
    inner join unidades_ativas u
      on h.portal_slug = u.portal_slug
      and h.codigo_cnes is not distinct from u.codigo_cnes
    where h.portal_slug = ${slug}
    order by u.nome_unidade, h.nome_medicamento, h.numero_lote, h.id_registro
  `.execute(db);

  return rows.map((linha) => ({
    portalSlug: linha.portal_slug,
    codigoCnes: linha.codigo_cnes,
    nomeUnidade: linha.nome_unidade,
    nomeMedicamento: linha.nome_medicamento,
    numeroLote: linha.numero_lote,
    quantidadeEstoque: toNumberOrNull(linha.quantidade_estoque),
    dataPosicaoEstoque: toIsoDateString(linha.data_posicao_estoque),
    dataValidade: toIsoDateString(linha.data_validade),
  }));
}
