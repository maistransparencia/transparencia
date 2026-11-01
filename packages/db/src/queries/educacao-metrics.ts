import { sql } from "kysely";
import { db } from "../client";
import { getContratosServicosVigentes } from "./contratos-servicos-vigentes";

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
  posicaoRanking?: number | null;
  totalMunicipios?: number | null;
  variacaoPosicoes?: number | null;
  mdePercentual?: number | null;
  fundebPercentual?: number | null;
  anosIniciais: EducacaoMetricDTO | null;
  anosFinais: EducacaoMetricDTO | null;
}

export interface EducacaoRankingEstadualDTO {
  /** Redes avaliadas nos dois ciclos (base da variação); nulo quando não comparável. */
  redesComparadas?: number | null;
  posicaoRanking: number | null;
  totalMunicipios: number | null;
  /** Posições ganhas (positivo) ou perdidas (negativo); nulo quando não comparável. */
  variacaoPosicoes: number | null;
  /** Ano do ciclo anterior com notas da etapa na UF; nulo se não houver. */
  anoCicloAnterior: number | null;
  totalMunicipiosCicloAnterior: number | null;
}

export type EducacaoMediasEstaduais = Record<
  EtapaEnsino,
  Record<number, number>
>;

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

  let metrics = await getEducacaoMetrics(cleanSlug, { ano: targetAno });

  if (metrics.length === 0) {
    const latestRow = await db
      .selectFrom("fct_educacao_metricas")
      .select("ano")
      .where("portal_slug", "=", cleanSlug)
      .where("ano", "<=", targetAno)
      .orderBy("ano", "desc")
      .limit(1)
      .executeTakeFirst();

    if (!latestRow || latestRow.ano == null) {
      return null;
    }
    targetAno = Number(latestRow.ano);
    metrics = await getEducacaoMetrics(cleanSlug, { ano: targetAno });
    if (metrics.length === 0) {
      return null;
    }
  }

  const anosIniciais =
    metrics.find((m) => m.etapaEnsino === "anosIniciais") ?? null;
  const anosFinais =
    metrics.find((m) => m.etapaEnsino === "anosFinais") ?? null;

  const ranking = await getEducacaoRankingEstadual(cleanSlug, {
    ano: targetAno,
    etapaEnsino: "anosIniciais",
  });

  const requestedAno = ano ?? targetAno;

  // Busca a despesa liquidada oficial na Função 12 para o exercício solicitado em fct_despesas
  const despesaExercicioRow = await (async () => {
    try {
      return await db
        .selectFrom("fct_despesas")
        .select((eb) => eb.fn.sum<string>("liquidado").as("despesa_liquidada"))
        .where("portal_slug", "=", cleanSlug)
        .where("ano", "=", requestedAno)
        .where("fonte", "=", "exercicio")
        .where((eb) =>
          eb.or([
            eb("funcao", "=", "12"),
            eb("funcao_nome", "ilike", "%educa%"),
          ]),
        )
        .executeTakeFirst();
    } catch {
      return null;
    }
  })();

  const despesaLiquidadaReal =
    despesaExercicioRow?.despesa_liquidada != null
      ? Number(despesaExercicioRow.despesa_liquidada)
      : null;

  return {
    portalSlug: cleanSlug,
    ano: targetAno,
    notaIdeb: anosIniciais?.notaIdeb ?? null,
    metaIdeb: anosIniciais?.metaIdeb ?? null,
    atingiuMeta: anosIniciais?.atingiuMeta ?? null,
    crescimentoPontosIdeb: anosIniciais?.crescimentoPontosIdeb ?? null,
    saebMatematica: anosIniciais?.saebMatematica ?? null,
    saebLinguaPortuguesa: anosIniciais?.saebLinguaPortuguesa ?? null,
    indicadorFluxoAprovacao: anosIniciais?.indicadorFluxoAprovacao ?? null,
    despesaLiquidadaEducacao: despesaLiquidadaReal,
    posicaoRanking: ranking?.posicaoRanking ?? null,
    totalMunicipios: ranking?.totalMunicipios ?? null,
    variacaoPosicoes: ranking?.variacaoPosicoes ?? null,
    mdePercentual: null,
    fundebPercentual: null,
    anosIniciais,
    anosFinais,
  };
}

export interface ClassificacaoRedes {
  posicao: number | null;
  total: number;
  codigosIbge: number[];
}

/**
 * Classificação por competição: redes com a mesma nota dividem a posição
 * (1 + quantas redes têm nota estritamente maior), então um empate nunca
 * vira subida ou queda por desempate arbitrário.
 */
export function classificarRedes(
  rows: ReadonlyArray<{
    cod_ibge: number | string;
    nota_ideb: number | string;
  }>,
  codIbge: number,
): ClassificacaoRedes {
  const notas = rows.map((row) => ({
    codIbge: Number(row.cod_ibge),
    nota: Number(row.nota_ideb),
  }));
  const propria = notas.find((rede) => rede.codIbge === codIbge);
  return {
    posicao:
      propria === undefined
        ? null
        : 1 + notas.filter((rede) => rede.nota > propria.nota).length,
    total: notas.length,
    codigosIbge: notas.map((rede) => rede.codIbge),
  };
}

export interface VariacaoPosicoes {
  /** Posições ganhas (positivo) ou perdidas (negativo). */
  variacaoPosicoes: number;
  /** Redes avaliadas nos dois ciclos, base única da comparação. */
  redesComparadas: number;
}

type NotaRede = { cod_ibge: number | string; nota_ideb: number | string };

/**
 * Compara a posição do município entre dois ciclos do IDEB usando só as redes
 * presentes nos dois, para que entrada ou saída de redes não vire subida ou
 * queda. Nulo quando o município não está nos dois ciclos.
 */
export function calcularVariacaoPosicoes({
  codIbge,
  atual,
  anterior,
}: {
  codIbge: number;
  atual: ReadonlyArray<NotaRede>;
  anterior: ReadonlyArray<NotaRede> | null;
}): VariacaoPosicoes | null {
  if (anterior === null) return null;
  const codigosAnteriores = new Set(anterior.map((r) => Number(r.cod_ibge)));
  const comuns = new Set(
    atual
      .map((r) => Number(r.cod_ibge))
      .filter((codigo) => codigosAnteriores.has(codigo)),
  );
  const restringir = (rows: ReadonlyArray<NotaRede>) =>
    classificarRedes(
      rows.filter((r) => comuns.has(Number(r.cod_ibge))),
      codIbge,
    );
  const posicaoAtual = restringir(atual).posicao;
  const posicaoAnterior = restringir(anterior).posicao;
  if (posicaoAtual === null || posicaoAnterior === null) return null;
  return {
    variacaoPosicoes: posicaoAnterior - posicaoAtual,
    redesComparadas: comuns.size,
  };
}

/**
 * Calcula a classificação do município no ranking estadual do IDEB para a etapa solicitada
 * com base nos microdados de seed_inep_ideb, computando posição e evolução frente ao ciclo anterior.
 */
export async function getEducacaoRankingEstadual(
  portalSlug: string,
  options?: { ano?: number; etapaEnsino?: EtapaEnsino },
): Promise<EducacaoRankingEstadualDTO | null> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === ""
  ) {
    return null;
  }

  const cleanSlug = portalSlug.trim();

  const metricRow = await db
    .selectFrom("fct_educacao_metricas")
    .select(["cod_ibge", "ano"])
    .where("portal_slug", "=", cleanSlug)
    .orderBy("ano", "desc")
    .limit(1)
    .executeTakeFirst();

  let codIbge = metricRow?.cod_ibge ? Number(metricRow.cod_ibge) : null;
  if (!codIbge) {
    const portalRow = await db
      .selectFrom("dim_portais")
      .select("cod_ibge")
      .where("portal_slug", "=", cleanSlug)
      .limit(1)
      .executeTakeFirst();
    if (portalRow?.cod_ibge) {
      codIbge = Number(portalRow.cod_ibge);
    }
  }

  if (!codIbge || codIbge <= 0) {
    return null;
  }

  const etapa = options?.etapaEnsino ?? "anosIniciais";
  const dbEtapa = toDbEtapaEnsino(etapa);
  const ufCode = Math.floor(codIbge / 100000);
  const ufMin = ufCode * 100000;
  const ufMax = (ufCode + 1) * 100000;

  let targetAno =
    options?.ano ?? (metricRow?.ano ? Number(metricRow.ano) : null);
  if (targetAno === null) {
    const latestSeed = await db
      .selectFrom("seed_inep_ideb")
      .select("ano")
      .where("cod_ibge", ">=", ufMin)
      .where("cod_ibge", "<", ufMax)
      .where("rede", "=", "municipal")
      .where("nota_ideb", "is not", null)
      .orderBy("ano", "desc")
      .limit(1)
      .executeTakeFirst();
    if (!latestSeed?.ano) {
      return null;
    }
    targetAno = Number(latestSeed.ano);
  }

  try {
    let currentRows = await db
      .selectFrom("seed_inep_ideb")
      .select(["cod_ibge", "nota_ideb"])
      .where("ano", "=", targetAno)
      .where("rede", "=", "municipal")
      .where("etapa_ensino", "=", dbEtapa)
      .where("cod_ibge", ">=", ufMin)
      .where("cod_ibge", "<", ufMax)
      .where("nota_ideb", "is not", null)
      .orderBy("nota_ideb", "desc")
      .orderBy("cod_ibge", "asc")
      .execute();

    if (currentRows.length === 0) {
      const latestSeedRow = await db
        .selectFrom("seed_inep_ideb")
        .select("ano")
        .where("rede", "=", "municipal")
        .where("etapa_ensino", "=", dbEtapa)
        .where("cod_ibge", ">=", ufMin)
        .where("cod_ibge", "<", ufMax)
        .where("ano", "<=", targetAno)
        .orderBy("ano", "desc")
        .limit(1)
        .executeTakeFirst();

      if (!latestSeedRow || latestSeedRow.ano == null) {
        return null;
      }
      targetAno = Number(latestSeedRow.ano);
      currentRows = await db
        .selectFrom("seed_inep_ideb")
        .select(["cod_ibge", "nota_ideb"])
        .where("ano", "=", targetAno)
        .where("rede", "=", "municipal")
        .where("etapa_ensino", "=", dbEtapa)
        .where("cod_ibge", ">=", ufMin)
        .where("cod_ibge", "<", ufMax)
        .where("nota_ideb", "is not", null)
        .orderBy("nota_ideb", "desc")
        .orderBy("cod_ibge", "asc")
        .execute();

      if (currentRows.length === 0) {
        return null;
      }
    }

    const atual = classificarRedes(currentRows, codIbge);

    const anoAnteriorRow = await db
      .selectFrom("seed_inep_ideb")
      .select("ano")
      .where("rede", "=", "municipal")
      .where("etapa_ensino", "=", dbEtapa)
      .where("cod_ibge", ">=", ufMin)
      .where("cod_ibge", "<", ufMax)
      .where("nota_ideb", "is not", null)
      .where("ano", "<", targetAno)
      .orderBy("ano", "desc")
      .limit(1)
      .executeTakeFirst();

    const anoCicloAnterior =
      anoAnteriorRow?.ano != null ? Number(anoAnteriorRow.ano) : null;

    const prevRows =
      anoCicloAnterior === null
        ? []
        : await db
            .selectFrom("seed_inep_ideb")
            .select(["cod_ibge", "nota_ideb"])
            .where("ano", "=", anoCicloAnterior)
            .where("rede", "=", "municipal")
            .where("etapa_ensino", "=", dbEtapa)
            .where("cod_ibge", ">=", ufMin)
            .where("cod_ibge", "<", ufMax)
            .where("nota_ideb", "is not", null)
            .orderBy("nota_ideb", "desc")
            .orderBy("cod_ibge", "asc")
            .execute();

    const anterior =
      prevRows.length > 0 ? classificarRedes(prevRows, codIbge) : null;
    const comparacao = calcularVariacaoPosicoes({
      codIbge,
      atual: currentRows,
      anterior: prevRows.length > 0 ? prevRows : null,
    });

    return {
      posicaoRanking: atual.posicao,
      totalMunicipios: atual.total,
      variacaoPosicoes: comparacao?.variacaoPosicoes ?? null,
      redesComparadas: comparacao?.redesComparadas ?? null,
      anoCicloAnterior: anterior === null ? null : anoCicloAnterior,
      totalMunicipiosCicloAnterior: anterior?.total ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Retorna as médias estaduais do IDEB para a UF correspondente ao município informado,
 * particionadas dinamicamente por etapa de ensino e ano com base na rede pública (seed_inep_ideb).
 */
export async function getEducacaoMediasEstaduais(
  portalSlug: string,
): Promise<EducacaoMediasEstaduais> {
  const empty: EducacaoMediasEstaduais = {
    anosIniciais: {},
    anosFinais: {},
  };

  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === ""
  ) {
    return empty;
  }

  const cleanSlug = portalSlug.trim();

  const metricRow = await db
    .selectFrom("fct_educacao_metricas")
    .select("cod_ibge")
    .where("portal_slug", "=", cleanSlug)
    .where("cod_ibge", "is not", null)
    .limit(1)
    .executeTakeFirst();

  let codIbge = metricRow?.cod_ibge ? Number(metricRow.cod_ibge) : null;
  if (!codIbge) {
    const portalRow = await db
      .selectFrom("dim_portais")
      .select("cod_ibge")
      .where("portal_slug", "=", cleanSlug)
      .limit(1)
      .executeTakeFirst();
    if (portalRow?.cod_ibge) {
      codIbge = Number(portalRow.cod_ibge);
    }
  }

  if (!codIbge || codIbge <= 0) {
    return empty;
  }

  const ufCode = Math.floor(codIbge / 100000);

  try {
    const rows = await db
      .selectFrom("seed_inep_ideb_estados")
      .select(["ano", "etapa_ensino", "nota_ideb"])
      .where("cod_uf", "=", ufCode)
      .where("rede", "=", "publica")
      .where("nota_ideb", "is not", null)
      .execute();

    const pontos = rows
      .map((r) => ({
        etapa: toEtapaEnsino(String(r.etapa_ensino)),
        ano: Number(r.ano),
        nota: toNumberOrNull(r.nota_ideb),
      }))
      .filter(
        (ponto): ponto is typeof ponto & { nota: number } =>
          ponto.nota !== null && !Number.isNaN(ponto.nota),
      );

    const porEtapa = (etapa: EtapaEnsino): Record<number, number> =>
      Object.fromEntries(
        pontos.filter((p) => p.etapa === etapa).map((p) => [p.ano, p.nota]),
      );

    return {
      anosIniciais: porEtapa("anosIniciais"),
      anosFinais: porEtapa("anosFinais"),
    };
  } catch {
    return empty;
  }
}

export type EducacaoCategoriaContrato =
  | "merenda_pnae"
  | "transporte_pnate"
  | "manutencao_geral"
  | "locacao_imoveis"
  | "outros";

export interface EducacaoContratoDTO {
  contratoId: string;
  portalSlug: string;
  ano: number;
  empresaId: string;
  contratoNumero: string;
  licitacaoNumero: string | null;
  modalidade: string | null;
  fornecedorNome: string;
  fornecedorCpfCnpj: string | null;
  objeto: string;
  categoria: EducacaoCategoriaContrato;
  valorContrato: number;
  valorAditado: number;
  totalEmpenhado: number;
  totalLiquidado: number;
  totalPago: number;
  saldoAPagar: number;
  fontePrincipal: string | null;
  fontesRecursos: string | null;
  orgaoNome: string | null;
  principalFuncao: string | null;
  principalPrograma: string | null;
  principalAcao: string | null;
  dataInicio: string | null;
  vencimentoAtual: string | null;
}

function toIsoDateString(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const str = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return null;
}

export function categorizarContratoEducacao(
  objeto: string,
  fontesOuFuncao?: string | null,
): EducacaoCategoriaContrato {
  const text = `${objeto} ${fontesOuFuncao ?? ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 1. Locação de imóveis (prédios, classes anexas, secretaria, salões, etc.)
  const isLocacaoVeiculo =
    text.includes("veiculo") ||
    text.includes("veiculos") ||
    text.includes("transporte") ||
    text.includes("onibus") ||
    text.includes("van");

  const isLocacaoImovel =
    !isLocacaoVeiculo &&
    (text.includes("locacao de imovel") ||
      text.includes("locacao de imoveis") ||
      text.includes("aluguel de imovel") ||
      text.includes("aluguel de imoveis") ||
      text.includes("locacao de predio") ||
      text.includes("aluguel de predio") ||
      text.includes("locacao de salao") ||
      text.includes("aluguel de salao") ||
      ((text.includes("locacao") || text.includes("aluguel")) &&
        (text.includes("imovel") ||
          text.includes("imoveis") ||
          text.includes("predio") ||
          text.includes("salao"))));

  if (isLocacaoImovel) {
    return "locacao_imoveis";
  }

  // 2. Prevenção de falso positivo para alimentação de sistemas/dados de TI
  const isAlimentacaoSistema =
    text.includes("alimentacao do sistema") ||
    text.includes("alimentacao de sistema") ||
    text.includes("alimentacao dos sistemas") ||
    text.includes("alimentacao de sistemas") ||
    text.includes("alimentacao de dados") ||
    text.includes("alimentacao do banco") ||
    text.includes("alimentacao de banco") ||
    text.includes("alimentacao da base") ||
    text.includes("alimentacao de base");

  // 3. Merenda Escolar e PNAE
  if (
    !isAlimentacaoSistema &&
    (text.includes("pnae") ||
      text.includes("merenda") ||
      text.includes("alimentacao escolar") ||
      text.includes("nutricao escolar") ||
      text.includes("generos alimenticios") ||
      text.includes("genero alimenticio") ||
      text.includes("alimento") ||
      text.includes("alimenticios") ||
      text.includes("alimenticia") ||
      text.includes("refeicao") ||
      text.includes("refeicoes") ||
      text.includes("desjejum") ||
      text.includes("hortifruti") ||
      text.includes("hortifrutigranjeiro") ||
      (text.includes("agricultura familiar") &&
        (text.includes("genero") ||
          text.includes("alimento") ||
          text.includes("fornecimento") ||
          text.includes("aquisicao"))))
  ) {
    return "merenda_pnae";
  }

  // 4. Transporte Escolar e PNATE
  if (
    text.includes("pnate") ||
    text.includes("transporte escolar") ||
    text.includes("transporte de aluno") ||
    text.includes("transporte de estudante") ||
    text.includes("transporte universitario") ||
    text.includes("onibus escolar") ||
    text.includes("van escolar") ||
    (text.includes("transporte") &&
      (text.includes("terrestre") ||
        text.includes("diario") ||
        text.includes("aluno") ||
        text.includes("estudante") ||
        text.includes("ensino") ||
        text.includes("escola"))) ||
    (text.includes("locacao de veiculo") &&
      (text.includes("aluno") ||
        text.includes("escolar") ||
        text.includes("educacao")))
  ) {
    return "transporte_pnate";
  }

  // 5. Manutenção, Infraestrutura, Reformas e Materiais Pedagógicos/Escolares
  // Nota: Não incluir termos genéricos isolados como "escola" ou "creche" para evitar falsos positivos
  if (
    text.includes("reforma") ||
    text.includes("manutenc") ||
    text.includes("conservac") ||
    text.includes("pintura") ||
    text.includes("infraestrutura") ||
    text.includes("eletric") ||
    text.includes("hidraulic") ||
    text.includes("obra") ||
    text.includes("reparo") ||
    text.includes("climatizac") ||
    text.includes("ar condicionado") ||
    text.includes("livro didatico") ||
    text.includes("material didatico") ||
    text.includes("mobiliario") ||
    text.includes("material escolar") ||
    text.includes("uniforme") ||
    text.includes("carteira escolar")
  ) {
    return "manutencao_geral";
  }

  return "outros";
}

function mapRowToEducacaoContratoDTO(
  row: Record<string, unknown>,
): EducacaoContratoDTO {
  const objeto = String(row.objeto_completo ?? row.objeto ?? "");
  const valorContrato = toNumberOrNull(row.valor_contrato) ?? 0;
  const valorAditado = toNumberOrNull(row.valor_aditado) ?? 0;

  const totalEmpenhado = (() => {
    const rawCrEmp = toNumberOrNull(row.total_empenhado);
    if (rawCrEmp != null) return rawCrEmp;
    const rawContratoEmp = toNumberOrNull(row.empenhado_contrato);
    if (rawContratoEmp != null) return rawContratoEmp;
    return 0;
  })();

  const totalLiquidado = toNumberOrNull(row.total_liquidado) ?? 0;
  const totalPago = toNumberOrNull(row.total_pago) ?? 0;

  const saldoAPagar = (() => {
    const rawSaldo = toNumberOrNull(row.saldo_a_pagar);
    if (rawSaldo != null) return rawSaldo;
    return Math.max(0, totalEmpenhado - totalPago);
  })();

  const fontesOuFuncao = `${row.fonte_principal ?? ""} ${row.fontes_recursos ?? ""} ${row.principal_funcao ?? ""}`;
  const categoria = categorizarContratoEducacao(objeto, fontesOuFuncao);

  const orgaoNome = (() => {
    if (row.cr_orgao_nome && String(row.cr_orgao_nome).trim() !== "") {
      return String(row.cr_orgao_nome);
    }
    if (row.dim_orgao_nome && String(row.dim_orgao_nome).trim() !== "") {
      return String(row.dim_orgao_nome);
    }
    return null;
  })();

  return {
    contratoId: String(row.contrato_id ?? ""),
    portalSlug: String(row.portal_slug ?? ""),
    ano: toIntegerOrNull(row.ano) ?? 0,
    empresaId: String(row.empresa_id ?? ""),
    contratoNumero: String(row.contrato_numero ?? ""),
    licitacaoNumero:
      row.licitacao_numero != null ? String(row.licitacao_numero) : null,
    modalidade: row.modalidade != null ? String(row.modalidade) : null,
    fornecedorNome: String(row.fornecedor_nome ?? ""),
    fornecedorCpfCnpj:
      row.fornecedor_cpf_cnpj != null ? String(row.fornecedor_cpf_cnpj) : null,
    objeto,
    categoria,
    valorContrato,
    valorAditado,
    totalEmpenhado,
    totalLiquidado,
    totalPago,
    saldoAPagar,
    fontePrincipal:
      row.fonte_principal != null ? String(row.fonte_principal) : null,
    fontesRecursos:
      row.fontes_recursos != null ? String(row.fontes_recursos) : null,
    orgaoNome,
    principalFuncao:
      row.principal_funcao != null ? String(row.principal_funcao) : null,
    principalPrograma:
      row.principal_programa != null ? String(row.principal_programa) : null,
    principalAcao:
      row.principal_acao != null ? String(row.principal_acao) : null,
    dataInicio: toIsoDateString(row.data_inicio),
    vencimentoAtual: toIsoDateString(row.vencimento_atual),
  };
}

/**
 * Empresas (`empresa_id`) do Fundo Municipal de Educação do portal.
 */
export async function getEducacaoFundoEmpresaIds(
  portalSlug: string,
): Promise<string[]> {
  const cleanSlug = (portalSlug ?? "").trim();
  if (!cleanSlug) {
    return [];
  }
  try {
    const orgaos = await db
      .selectFrom("dim_orgao")
      .select("empresa_id")
      .where("portal_slug", "=", cleanSlug)
      .where("orgao_nome", "ilike", "%fundo%")
      .where("orgao_nome", "ilike", "%educa%")
      .execute();
    return orgaos.map((orgao) => orgao.empresa_id);
  } catch {
    return [];
  }
}

/**
 * Retorna os contratos e compras do Fundo Municipal de Educação (merenda PNAE, transporte PNATE, manutenção escolar),
 * identificados pelo `empresa_id` do Fundo.
 */
export async function getEducacaoContratos(
  portalSlug: string,
  ano?: number,
): Promise<EducacaoContratoDTO[]> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === ""
  ) {
    return [];
  }

  const cleanSlug = portalSlug.trim();
  const fundoEmpresaIds = await getEducacaoFundoEmpresaIds(cleanSlug);
  if (fundoEmpresaIds.length === 0) {
    return [];
  }

  // Fonte canônica da página de Contratos (vigentes no ano).
  if (ano !== undefined && ano !== null && !Number.isNaN(ano)) {
    try {
      const vigentes = (
        await getContratosServicosVigentes(cleanSlug, ano)
      ).filter(
        (c) =>
          c.empresaId !== undefined && fundoEmpresaIds.includes(c.empresaId),
      );
      if (vigentes.length > 0) {
        return vigentes.map((c) => ({
          contratoId: c.contratoServicoId ?? c.contratoNumero ?? "",
          portalSlug: c.portalSlug,
          ano: c.ano ?? ano,
          empresaId: c.empresaId ?? "",
          contratoNumero: c.contratoNumero ?? "",
          licitacaoNumero: c.licitacaoNumero ?? null,
          modalidade: null,
          fornecedorNome: c.fornecedorNome,
          fornecedorCpfCnpj: c.fornecedorCnpj || null,
          objeto: c.objetoDescricao,
          categoria: categorizarContratoEducacao(
            c.objetoDescricao,
            `${c.fontePrincipal ?? ""} ${c.fontesRecursos ?? ""} ${c.funcaoNome ?? ""}`,
          ),
          valorContrato: c.valorContrato ?? 0,
          valorAditado: c.valorAditado ?? 0,
          totalEmpenhado: c.totalEmpenhado,
          totalLiquidado: c.totalLiquidado,
          totalPago: c.totalPago,
          saldoAPagar: c.saldoPendente,
          fontePrincipal: c.fontePrincipal ?? null,
          fontesRecursos: c.fontesRecursos ?? null,
          orgaoNome: c.orgaoNome ?? null,
          principalFuncao: c.funcaoNome ?? null,
          principalPrograma: c.programaNome ?? null,
          principalAcao: c.projetoAtividadeNome ?? null,
          dataInicio: c.dataInicio,
          vencimentoAtual: c.vencimentoAtual,
        }));
      }
    } catch {
      // Fallback gracioso para a consulta direta em fct_contratos
    }
  }

  // Fallback direto para fct_contratos (sem fct_contratos_servicos_vigentes ou em fixtures de teste)
  let query = db
    .selectFrom("fct_contratos as c")
    .leftJoin("fct_contratos_recursos as cr", (join) =>
      join
        .onRef("c.portal_slug", "=", "cr.portal_slug")
        .onRef("c.contrato_id", "=", "cr.contrato_id"),
    )
    .leftJoin("dim_orgao as o", (join) =>
      join
        .onRef("c.portal_slug", "=", "o.portal_slug")
        .onRef("c.empresa_id", "=", "o.empresa_id"),
    )
    .select([
      "c.contrato_id",
      "c.portal_slug",
      "c.ano",
      "c.empresa_id",
      "c.contrato_numero",
      "c.licitacao_numero",
      "c.modalidade",
      "c.fornecedor_nome",
      "c.fornecedor_cpf_cnpj",
      "c.objeto",
      "c.objeto_completo",
      "c.valor_contrato",
      "c.valor_aditado",
      "c.data_inicio",
      "c.vencimento_atual",
      "c.empenhado as empenhado_contrato",
      "cr.orgao_nome as cr_orgao_nome",
      "o.orgao_nome as dim_orgao_nome",
      "cr.total_empenhado",
      "cr.total_liquidado",
      "cr.total_pago",
      "cr.saldo_a_pagar",
      "cr.fonte_principal",
      "cr.fontes_recursos",
      "cr.principal_funcao",
      "cr.principal_programa",
      "cr.principal_acao",
    ])
    .where("c.portal_slug", "=", cleanSlug)
    .where("c.empresa_id", "in", fundoEmpresaIds);

  if (ano !== undefined && ano !== null && !Number.isNaN(ano)) {
    query = query.where((eb) =>
      eb.or([
        eb("c.ano", "=", ano),
        sql<boolean>`((c.data_inicio is null or extract(year from c.data_inicio) <= ${ano}) and (c.vencimento_atual is not null and extract(year from c.vencimento_atual) >= ${ano}))`,
      ]),
    );
  }

  const rows = await query
    .orderBy("c.ano", "desc")
    .orderBy("c.contrato_numero", "asc")
    .execute();

  return rows.map(mapRowToEducacaoContratoDTO);
}
