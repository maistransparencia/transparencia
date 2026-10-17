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
  posicaoRanking?: number | null;
  totalMunicipios?: number | null;
  variacaoPosicoes?: number | null;
  mdePercentual?: number | null;
  fundebPercentual?: number | null;
  anosIniciais: EducacaoMetricDTO | null;
  anosFinais: EducacaoMetricDTO | null;
}

export interface EducacaoRankingEstadualDTO {
  posicaoRanking: number | null;
  totalMunicipios: number | null;
  variacaoPosicoes: number | null;
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

  const ranking = await getEducacaoRankingEstadual(cleanSlug, {
    ano: targetAno,
    etapaEnsino: "anosIniciais",
  });

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
    posicaoRanking: ranking?.posicaoRanking ?? null,
    totalMunicipios: ranking?.totalMunicipios ?? null,
    variacaoPosicoes: ranking?.variacaoPosicoes ?? null,
    mdePercentual: null,
    fundebPercentual: null,
    anosIniciais,
    anosFinais,
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

  const targetAno =
    options?.ano ?? (metricRow?.ano ? Number(metricRow.ano) : 2025);
  const etapa = options?.etapaEnsino ?? "anosIniciais";
  const dbEtapa = toDbEtapaEnsino(etapa);
  const ufCode = Math.floor(codIbge / 100000);
  const ufMin = ufCode * 100000;
  const ufMax = (ufCode + 1) * 100000;

  try {
    const currentRows = await db
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

    const currentIdx = currentRows.findIndex(
      (r: any) => Number(r.cod_ibge) === codIbge,
    );

    const totalMunicipios = currentRows.length;
    const posicaoRanking = currentIdx !== -1 ? currentIdx + 1 : null;

    let variacaoPosicoes: number | null = null;
    if (posicaoRanking !== null) {
      const prevRows = await db
        .selectFrom("seed_inep_ideb")
        .select(["cod_ibge", "nota_ideb"])
        .where("ano", "=", targetAno - 2)
        .where("rede", "=", "municipal")
        .where("etapa_ensino", "=", dbEtapa)
        .where("cod_ibge", ">=", ufMin)
        .where("cod_ibge", "<", ufMax)
        .where("nota_ideb", "is not", null)
        .orderBy("nota_ideb", "desc")
        .orderBy("cod_ibge", "asc")
        .execute();

      if (prevRows.length > 0) {
        const prevIdx = prevRows.findIndex(
          (r: any) => Number(r.cod_ibge) === codIbge,
        );
        if (prevIdx !== -1) {
          const posicaoAnterior = prevIdx + 1;
          variacaoPosicoes = posicaoAnterior - posicaoRanking;
        }
      }
    }

    return {
      posicaoRanking,
      totalMunicipios,
      variacaoPosicoes,
    };
  } catch {
    return null;
  }
}

export type EducacaoCategoriaContrato =
  | "merenda_pnae"
  | "transporte_pnate"
  | "manutencao_geral"
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

  if (
    text.includes("pnae") ||
    text.includes("merenda") ||
    text.includes("alimenta") ||
    text.includes("alimento") ||
    text.includes("generos alimenticios") ||
    text.includes("nutri") ||
    text.includes("refeic")
  ) {
    return "merenda_pnae";
  }
  if (
    text.includes("pnate") ||
    text.includes("transporte") ||
    text.includes("onibus") ||
    text.includes("van") ||
    text.includes("locacao de veiculo") ||
    text.includes("veiculo escolar")
  ) {
    return "transporte_pnate";
  }
  if (
    text.includes("reforma") ||
    text.includes("manutenc") ||
    text.includes("conservac") ||
    text.includes("pintura") ||
    text.includes("infraestrutura") ||
    text.includes("eletric") ||
    text.includes("hidraulic") ||
    text.includes("obra") ||
    text.includes("pedagog") ||
    text.includes("livro") ||
    text.includes("didatico") ||
    text.includes("mobiliario") ||
    text.includes("material escolar") ||
    text.includes("escola") ||
    text.includes("creche")
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
 * Retorna os contratos e compras vinculados à Educação (merenda PNAE, transporte PNATE, manutenção escolar).
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
    .where((eb) =>
      eb.or([
        eb("cr.principal_funcao", "ilike", "%educa%"),
        eb("cr.orgao_nome", "ilike", "%educa%"),
        eb("o.orgao_nome", "ilike", "%educa%"),
        eb("c.objeto", "ilike", "%educa%"),
        eb("c.objeto", "ilike", "%escola%"),
        eb("c.objeto", "ilike", "%merenda%"),
        eb("c.objeto", "ilike", "%pnae%"),
        eb("c.objeto", "ilike", "%pnate%"),
        eb("c.objeto", "ilike", "%ensino%"),
        eb("c.objeto", "ilike", "%creche%"),
        eb("c.objeto", "ilike", "%pedag%"),
        eb("cr.fonte_principal", "ilike", "%fundeb%"),
        eb("cr.fonte_principal", "ilike", "%mde%"),
        eb("cr.fontes_recursos", "ilike", "%fundeb%"),
        eb("cr.fontes_recursos", "ilike", "%mde%"),
      ]),
    );

  if (ano !== undefined && ano !== null && !Number.isNaN(ano)) {
    query = query.where("c.ano", "=", ano);
  }

  query = query.orderBy("c.ano", "desc").orderBy("c.contrato_numero", "asc");

  const rows = await query.execute();

  return rows.map(mapRowToEducacaoContratoDTO);
}
