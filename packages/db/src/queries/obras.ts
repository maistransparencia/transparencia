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

export interface ObraContratoDTO {
  contratoId: string;
  contratoNumero: string;
  fornecedorNome: string;
  fornecedorCpfCnpj: string | null;
  valorContrato: number;
  modalidade: string | null;
  licitacaoNumero: string | null;
  status: "vigente" | "encerrado" | string;
  dataInicio: string | null;
  vencimentoAtual: string | null;
  ano?: number | null;
  licitacaoAno?: number | null;
  objeto?: string | null;
}

export interface ObraEmpenhoFederalDTO {
  nrEmpenho: string;
  anoEmpenho: number | null;
  ugEmitente: string | null;
  valorEmpenho: number;
  dataEmissao: string | null;
  sistemaOrigem: string | null;
  naturezaDespesa: string | null;
  fonte: string | null;
  programaTrabalho: string | null;
  planoInterno: string | null;
  acaoOrcamentaria: string | null;
  descricao: string | null;
}

export interface ObraDTO {
  idProjeto: string;
  portalSlug: string;
  nomeObra: string;
  situacao: SituacaoObra;
  orgaoResponsavel: string | null;
  valorInvestimentoPrevisto: number;
  percentualExecucaoFisica: number | null;
  percentualExecucaoFinanceira?: number | null;
  dataUltimaMedicao: string | null;
  dataParalisacao?: string | null;
  latitude: number | null;
  longitude: number | null;
  motivoParalisacao: string | null;
  dataInicioPrevista: string | null;
  dataFimPrevista: string | null;
  funcaoSocial?: string | null;
  descricaoIntervencao?: string | null;
  naturezaIntervencao?: string | null;
  especieIntervencao?: string | null;
  executorNome?: string | null;
  executorCnpj?: string | null;
  repassadorNome?: string | null;
  repassadorCnpj?: string | null;
  valorTotalEmpenhadoFederal?: number;
  quantidadeEmpenhosFederais?: number;
  contratos?: ObraContratoDTO[];
  empenhosFederais?: ObraEmpenhoFederalDTO[];
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
  "funcao_social",
  "descricao_intervencao",
  "natureza_intervencao",
  "especie_intervencao",
  "executor_nome",
  "executor_cnpj",
  "repassador_nome",
  "repassador_cnpj",
  "valor_total_empenhado_federal",
  "quantidade_empenhos_federais",
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
  percentual_execucao_financeira?: string | number | null;
  data_ultima_medicao?: string | Date | null;
  data_paralisacao?: string | Date | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  motivo_paralisacao?: string | null;
  data_inicio_prevista?: string | Date | null;
  data_fim_prevista?: string | Date | null;
  funcao_social?: string | null;
  descricao_intervencao?: string | null;
  natureza_intervencao?: string | null;
  especie_intervencao?: string | null;
  executor_nome?: string | null;
  executor_cnpj?: string | null;
  repassador_nome?: string | null;
  repassador_cnpj?: string | null;
  valor_total_empenhado_federal?: string | number | null;
  quantidade_empenhos_federais?: string | number | null;
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

  const percentualExecucaoFinanceira =
    row.percentual_execucao_financeira != null
      ? Number(row.percentual_execucao_financeira)
      : null;

  const valorTotalEmpenhadoFederal =
    row.valor_total_empenhado_federal != null
      ? Number(row.valor_total_empenhado_federal)
      : 0;

  const quantidadeEmpenhosFederais =
    row.quantidade_empenhos_federais != null
      ? Number(row.quantidade_empenhos_federais)
      : 0;

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
    percentualExecucaoFinanceira:
      percentualExecucaoFinanceira != null &&
      !Number.isNaN(percentualExecucaoFinanceira)
        ? percentualExecucaoFinanceira
        : null,
    dataUltimaMedicao: toIsoDateString(row.data_ultima_medicao),
    dataParalisacao: toIsoDateString(row.data_paralisacao),
    latitude,
    longitude,
    motivoParalisacao:
      row.motivo_paralisacao != null ? String(row.motivo_paralisacao) : null,
    dataInicioPrevista: toIsoDateString(row.data_inicio_prevista),
    dataFimPrevista: toIsoDateString(row.data_fim_prevista),
    funcaoSocial: row.funcao_social != null ? String(row.funcao_social) : null,
    descricaoIntervencao:
      row.descricao_intervencao != null
        ? String(row.descricao_intervencao)
        : null,
    naturezaIntervencao:
      row.natureza_intervencao != null
        ? String(row.natureza_intervencao)
        : null,
    especieIntervencao:
      row.especie_intervencao != null ? String(row.especie_intervencao) : null,
    executorNome: row.executor_nome != null ? String(row.executor_nome) : null,
    executorCnpj: row.executor_cnpj != null ? String(row.executor_cnpj) : null,
    repassadorNome:
      row.repassador_nome != null ? String(row.repassador_nome) : null,
    repassadorCnpj:
      row.repassador_cnpj != null ? String(row.repassador_cnpj) : null,
    valorTotalEmpenhadoFederal: Number.isNaN(valorTotalEmpenhadoFederal)
      ? 0
      : valorTotalEmpenhadoFederal,
    quantidadeEmpenhosFederais: Number.isNaN(quantidadeEmpenhosFederais)
      ? 0
      : quantidadeEmpenhosFederais,
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
        sql`extract(year from data_inicio_prevista) = ${filtros.ano}`,
        sql`extract(year from data_fim_prevista) = ${filtros.ano}`,
        sql`extract(year from data_ultima_medicao) = ${filtros.ano}`,
        sql`(data_inicio_prevista is not null and data_fim_prevista is not null and extract(year from data_inicio_prevista) <= ${filtros.ano} and extract(year from data_fim_prevista) >= ${filtros.ano})`,
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
  const obrasBase = rows.map(mapRowToObraDTO);

  if (obrasBase.length === 0) {
    return [];
  }

  // Enriquece as obras com os contratos municipais e empenhos federais correlacionados em batch único (Regra 22)
  const idsProjetos = obrasBase.map((o) => o.idProjeto).filter(Boolean);
  const [contratosPorObraMap, empenhosPorObraMap] = await Promise.all([
    getContratosPorObrasBatch(cleanSlug, idsProjetos),
    getEmpenhosFederaisPorObrasBatch(cleanSlug, idsProjetos),
  ]);

  return obrasBase.map((obra) => ({
    ...obra,
    contratos: contratosPorObraMap.get(obra.idProjeto?.trim()) ?? [],
    empenhosFederais: empenhosPorObraMap.get(obra.idProjeto?.trim()) ?? [],
  }));
}

type ObraContratoRow = {
  contrato_id?: string | null;
  contrato_numero?: string | null;
  fornecedor_nome?: string | null;
  fornecedor_cpf_cnpj?: string | null;
  valor_contrato?: string | number | null;
  modalidade?: string | null;
  licitacao_numero?: string | null;
  status?: string | null;
  data_inicio?: string | Date | null;
  vencimento_atual?: string | Date | null;
  objeto?: string | null;
  ano?: number | null;
  licitacao_ano?: number | null;
};

function mapRowToObraContratoDTO(row: ObraContratoRow): ObraContratoDTO {
  const valorContrato =
    row.valor_contrato != null ? Number(row.valor_contrato) : 0;
  const rawStatus = (row.status ?? "vigente").toLowerCase().trim();
  const status = rawStatus === "encerrado" ? "encerrado" : "vigente";

  return {
    contratoId: row.contrato_id != null ? String(row.contrato_id) : "",
    contratoNumero:
      row.contrato_numero != null ? String(row.contrato_numero) : "",
    fornecedorNome:
      row.fornecedor_nome != null
        ? String(row.fornecedor_nome)
        : "Fornecedor não informado",
    fornecedorCpfCnpj:
      row.fornecedor_cpf_cnpj != null ? String(row.fornecedor_cpf_cnpj) : null,
    valorContrato: Number.isNaN(valorContrato) ? 0 : valorContrato,
    modalidade: row.modalidade != null ? String(row.modalidade) : null,
    licitacaoNumero:
      row.licitacao_numero != null ? String(row.licitacao_numero) : null,
    status,
    dataInicio: toIsoDateString(row.data_inicio),
    vencimentoAtual: toIsoDateString(row.vencimento_atual),
    ano: row.ano != null ? Number(row.ano) : null,
    licitacaoAno: row.licitacao_ano != null ? Number(row.licitacao_ano) : null,
    objeto: row.objeto != null ? String(row.objeto) : null,
  };
}

/**
 * Retorna um mapa (idProjeto -> ObraContratoDTO[]) de contratos administrativos municipais
 * correlacionados para uma lista de obras públicas em UMA ÚNICA QUERY em lote,
 * prevenindo fan-out N+1 (Regra 22) e respeitando estritamente o isolamento de tenant (Regra 23).
 */
export async function getContratosPorObrasBatch(
  portalSlug: string,
  idProjetos: string[],
): Promise<Map<string, ObraContratoDTO[]>> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === "" ||
    !Array.isArray(idProjetos) ||
    idProjetos.length === 0
  ) {
    return new Map();
  }

  const cleanSlug = portalSlug.trim();
  const cleanIds = Array.from(
    new Set(
      idProjetos
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean),
    ),
  );

  if (cleanIds.length === 0) {
    return new Map();
  }

  type ObraContratoBatchRow = ObraContratoRow & {
    obra_id_projeto: string;
  };

  const query = sql<ObraContratoBatchRow>`
    WITH obra_alvo AS (
      SELECT
        portal_slug,
        id_projeto
      FROM fct_obras
      WHERE portal_slug = ${cleanSlug}
        AND id_projeto = ANY(${cleanIds})
    )
    SELECT DISTINCT ON (o.id_projeto, c.contrato_numero)
      o.id_projeto AS obra_id_projeto,
      c.contrato_id,
      c.contrato_numero,
      cf.fornecedor_nome,
      c.fornecedor_cpf_cnpj,
      c.valor_contrato,
      c.modalidade,
      c.licitacao_numero,
      CASE
        WHEN c.vencimento_atual IS NOT NULL AND c.vencimento_atual >= CURRENT_DATE THEN 'vigente'
        WHEN c.vencimento_atual IS NOT NULL THEN 'encerrado'
        ELSE 'vigente'
      END AS status,
      c.data_inicio,
      c.vencimento_atual,
      c.objeto,
      c.ano,
      (
        SELECT l.ano
        FROM fct_licitacoes l
        WHERE l.portal_slug = c.portal_slug
          AND l.empresa_id = c.empresa_id
          AND l.licitacao_numero = c.licitacao_numero
        ORDER BY
          CASE
            WHEN c.modalidade IS NOT NULL AND lower(l.modalidade) = lower(c.modalidade) THEN 0
            WHEN c.modalidade IS NOT NULL AND (
              (lower(c.modalidade) LIKE '%concorrencia%' AND lower(l.modalidade) LIKE '%concorrencia%') OR
              (lower(c.modalidade) LIKE '%dispensa%' AND lower(l.modalidade) LIKE '%dispensa%') OR
              (lower(c.modalidade) LIKE '%pregao%' AND lower(l.modalidade) LIKE '%pregao%') OR
              (lower(c.modalidade) LIKE '%tomada%' AND lower(l.modalidade) LIKE '%tomada%')
            ) THEN 1
            ELSE 2
          END,
          CASE
            WHEN l.ano <= c.ano THEN 0
            ELSE 1
          END,
          CASE
            WHEN l.ano <= c.ano THEN c.ano - l.ano
            ELSE 100 + (l.ano - c.ano)
          END ASC,
          l.ano DESC
        LIMIT 1
      ) AS licitacao_ano
    FROM fct_contratos c
    INNER JOIN obra_alvo o
      ON c.portal_slug = o.portal_slug
    LEFT JOIN dim_fornecedor cf
      ON cf.portal_slug = c.portal_slug
      AND cf.credor_id = c.credor_id
    WHERE
      (c.numero_obra IS NOT NULL AND c.numero_obra = o.id_projeto)
      OR (
        length(o.id_projeto) >= 4
        AND NOT (o.id_projeto ~ '^[0-9]{4}$')
        AND (
          unaccent(lower(coalesce(c.objeto_completo, '') || ' ' || coalesce(c.objeto, ''))) LIKE '%' || unaccent(lower(o.id_projeto)) || '%'
        )
      )
      OR (
        unaccent(lower(coalesce(c.objeto_completo, '') || ' ' || coalesce(c.objeto, ''))) LIKE '%' || unaccent(lower('projeto ' || o.id_projeto)) || '%'
      )
    ORDER BY
      o.id_projeto ASC,
      c.contrato_numero ASC,
      c.ano DESC,
      c.valor_contrato DESC NULLS LAST,
      c.vencimento_atual DESC NULLS LAST
  `;

  const execResult = await query.execute(db);
  const rows = execResult.rows || [];

  const initialMap = new Map<string, ObraContratoDTO[]>(
    cleanIds.map((id) => [id, []]),
  );

  const groupedMap = rows.reduce((acc, row) => {
    const list = acc.get(row.obra_id_projeto) ?? [];
    acc.set(row.obra_id_projeto, [...list, mapRowToObraContratoDTO(row)]);
    return acc;
  }, initialMap);

  return new Map(
    Array.from(groupedMap.entries()).map(([id, list]) => [
      id,
      [...list].sort((a, b) => {
        if (a.status === "vigente" && b.status !== "vigente") return -1;
        if (a.status !== "vigente" && b.status === "vigente") return 1;
        return b.valorContrato - a.valorContrato;
      }),
    ]),
  );
}

/**
 * Retorna os contratos municipais e processos licitatórios correlacionados a uma obra pública
 * a partir de `fct_contratos` e `fct_obras`, garantindo isolamento estrito de tenant (Regra 23).
 */
export async function getContratosPorObra(
  portalSlug: string,
  idProjeto: string,
): Promise<ObraContratoDTO[]> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === "" ||
    !idProjeto ||
    typeof idProjeto !== "string" ||
    idProjeto.trim() === ""
  ) {
    return [];
  }

  const map = await getContratosPorObrasBatch(portalSlug, [idProjeto.trim()]);
  return map.get(idProjeto.trim()) ?? [];
}

type ObraEmpenhoFederalRow = {
  id_projeto?: string | null;
  nr_empenho?: string | null;
  ug_emitente?: string | null;
  ano_empenho?: string | number | null;
  valor_empenho?: string | number | null;
  data_emissao?: string | Date | null;
  sistema_origem_empenho?: string | null;
  natureza_despesa?: string | null;
  fonte?: string | null;
  programa_trabalho?: string | null;
  plano_interno?: string | null;
  acao_orcamentaria?: string | null;
  descricao_empenho?: string | null;
};

function mapRowToObraEmpenhoFederalDTO(
  row: ObraEmpenhoFederalRow,
): ObraEmpenhoFederalDTO {
  const valorEmpenho =
    row.valor_empenho != null ? Number(row.valor_empenho) : 0;
  const anoEmpenho = row.ano_empenho != null ? Number(row.ano_empenho) : null;

  return {
    nrEmpenho: row.nr_empenho != null ? String(row.nr_empenho).trim() : "",
    anoEmpenho:
      anoEmpenho != null && !Number.isNaN(anoEmpenho) ? anoEmpenho : null,
    ugEmitente: row.ug_emitente != null ? String(row.ug_emitente).trim() : null,
    valorEmpenho: Number.isNaN(valorEmpenho) ? 0 : valorEmpenho,
    dataEmissao: toIsoDateString(row.data_emissao),
    sistemaOrigem:
      row.sistema_origem_empenho != null
        ? String(row.sistema_origem_empenho).trim()
        : null,
    naturezaDespesa:
      row.natureza_despesa != null ? String(row.natureza_despesa).trim() : null,
    fonte: row.fonte != null ? String(row.fonte).trim() : null,
    programaTrabalho:
      row.programa_trabalho != null
        ? String(row.programa_trabalho).trim()
        : null,
    planoInterno:
      row.plano_interno != null ? String(row.plano_interno).trim() : null,
    acaoOrcamentaria:
      row.acao_orcamentaria != null
        ? String(row.acao_orcamentaria).trim()
        : null,
    descricao:
      row.descricao_empenho != null
        ? String(row.descricao_empenho).trim()
        : null,
  };
}

/**
 * Retorna os empenhos federais vinculados a um lote de obras públicas a partir de `fct_obras_empenhos`,
 * agrupados por `id_projeto` com isolamento estrito de tenant (Regra 23).
 */
export async function getEmpenhosFederaisPorObrasBatch(
  portalSlug: string,
  idProjetos: string[],
): Promise<Map<string, ObraEmpenhoFederalDTO[]>> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === "" ||
    !Array.isArray(idProjetos) ||
    idProjetos.length === 0
  ) {
    return new Map();
  }

  const cleanSlug = portalSlug.trim();
  const cleanIds = Array.from(
    new Set(
      idProjetos
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean),
    ),
  );

  if (cleanIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .selectFrom("fct_obras_empenhos")
    .select([
      "id_projeto",
      "nr_empenho",
      "ug_emitente",
      "ano_empenho",
      "valor_empenho",
      "data_emissao",
      "sistema_origem_empenho",
      "natureza_despesa",
      "fonte",
      "programa_trabalho",
      "plano_interno",
      "acao_orcamentaria",
      "descricao_empenho",
    ])
    .where("portal_slug", "=", cleanSlug)
    .where("id_projeto", "in", cleanIds)
    .orderBy(sql`data_emissao desc nulls last`)
    .orderBy("nr_empenho", "asc")
    .execute();

  const initialMap = new Map<string, ObraEmpenhoFederalDTO[]>(
    cleanIds.map((id) => [id, []]),
  );

  return (rows as ObraEmpenhoFederalRow[]).reduce((acc, row) => {
    const idProjeto = row.id_projeto ? String(row.id_projeto).trim() : "";
    if (!idProjeto) return acc;
    const list = acc.get(idProjeto) ?? [];
    acc.set(idProjeto, [...list, mapRowToObraEmpenhoFederalDTO(row)]);
    return acc;
  }, initialMap);
}

/**
 * Retorna os empenhos federais vinculados a uma obra pública específica
 * a partir de `fct_obras_empenhos`, com isolamento estrito de tenant (Regra 23).
 */
export async function getEmpenhosFederaisPorObra(
  portalSlug: string,
  idProjeto: string,
): Promise<ObraEmpenhoFederalDTO[]> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === "" ||
    !idProjeto ||
    typeof idProjeto !== "string" ||
    idProjeto.trim() === ""
  ) {
    return [];
  }

  const map = await getEmpenhosFederaisPorObrasBatch(portalSlug, [
    idProjeto.trim(),
  ]);
  return map.get(idProjeto.trim()) ?? [];
}

/**
 * Retorna o detalhe de uma obra específica pelo seu identificador único de projeto e portal,
 * enriquecido com os contratos administrativos municipais e empenhos federais correlacionados.
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

  const [row, contratos, empenhosFederais] = await Promise.all([
    db
      .selectFrom("fct_obras")
      .select(OBRA_SELECT_COLUMNS)
      .where("portal_slug", "=", cleanSlug)
      .where("id_projeto", "=", cleanId)
      .executeTakeFirst(),
    getContratosPorObra(cleanSlug, cleanId),
    getEmpenhosFederaisPorObra(cleanSlug, cleanId),
  ]);

  if (!row) {
    return null;
  }

  return {
    ...mapRowToObraDTO(row),
    contratos,
    empenhosFederais,
  };
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
        sql`extract(year from data_inicio_prevista) = ${filtros.ano}`,
        sql`extract(year from data_fim_prevista) = ${filtros.ano}`,
        sql`extract(year from data_ultima_medicao) = ${filtros.ano}`,
        sql`(data_inicio_prevista is not null and data_fim_prevista is not null and extract(year from data_inicio_prevista) <= ${filtros.ano} and extract(year from data_fim_prevista) >= ${filtros.ano})`,
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
