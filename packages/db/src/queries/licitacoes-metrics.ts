import { sql } from "kysely";
import { db } from "../client";
import { NEAR_THRESHOLD_PCT } from "../constants";

export interface ContratoSemLicitacaoMetricsDTO {
  ano: number;
  empresa: string;
  numero: string;
  fornecedor: string;
  objeto: string;
  valorContrato: string;
  licitacaoNumero: string;
  mes: number;
  numeroObra: string | null;
  tipoObra: string | null;
  modalidade: string | null;
  fundlegal: string | null;
  limiteDispensa: number;
  acimaLimite: boolean;
  periodo: string;
  isentoLegalmente?: boolean;
}

export interface ItemDistribucaoModalidadeMetricsDTO {
  modalidade: string;
  valorTotal: number;
  quantidade: number;
  percentual_valor: number;
  pctValor: number;
}

export interface ItemAdesaoAtaMetricsDTO {
  numero: string;
  objeto: string;
  licitacaoValor: number;
  carona: string;
  totalValorContrato: number;
  totalEmpenhadoContrato: number;
  total_contrato_valor: number;
  total_contrato_empenhado: number;
  totalCValor: number;
  totalCEmpenhado: number;
  mes: number | null;
  temContrato: boolean;
  periodo: string;
}

export interface AdesaoAtaResultMetricsDTO {
  lista: ItemAdesaoAtaMetricsDTO[];
  quantidade: number;
  valor: number;
  totalLicitacao: number;
  contratosAssociadosCount: number;
}

export interface ItemAdesaoExternaMetricsDTO {
  data: string;
  fornecedor: string;
  empenhado: number;
  pago: number;
  unidade: string;
  justificativa: string;
  numLicitacao: string;
}

export interface AdesaoExternaResultMetricsDTO {
  lista: ItemAdesaoExternaMetricsDTO[];
  quantidade: number;
  totalPago: number;
}

export interface ContratoFracionamentoMetricsDTO {
  ano: number;
  empresa: string;
  numero: string;
  fornecedor: string;
  objeto: string;
  valorContrato: number;
  licitacaoNumero: string;
  mes: number;
  periodo: string;
}

export interface FornecedorRecorrenteMetricsDTO {
  empresa: string;
  fornecedor: string;
  quantidade: number;
  total: number;
  percentual: number;
  pct: number;
}

export interface AnomaliasResultMetricsDTO {
  fracionamento: ContratoFracionamentoMetricsDTO[];
  fornecedorRecorrente: FornecedorRecorrenteMetricsDTO[];
  janelaCurta: ContratoSemLicitacaoMetricsDTO[];
}

/**
 * Retorna o limite de dispensa de licitação para compras e serviços gerais para o ano especificado,
 * consultando a constante fiscal cadastrada.
 */
export async function getLimiteDispensaComprasServicos(
  _portalSlug: string,
  year: number,
): Promise<number | null> {
  if (Number.isNaN(year)) return null;

  const row = await db
    .selectFrom("seed_constantes_fiscais")
    .select("valor_num")
    .where("dominio", "=", "licitacoes")
    .where("chave", "=", "limite_dispensa_compras_servicos")
    .where("ano_inicio", "<=", year)
    .where("ano_fim", ">=", year)
    .executeTakeFirst();

  return row?.valor_num ? parseFloat(String(row.valor_num)) : null;
}

/**
 * Retorna os contratos sem licitação (gaps) a partir do mart unificado `fct_licitacoes_metricas`.
 */
export async function getLicitacaoGapsMetrics(
  portalSlug: string,
  year: number,
  empresaIds?: string[] | null,
): Promise<ContratoSemLicitacaoMetricsDTO[]> {
  if (!portalSlug || Number.isNaN(year)) return [];
  if (Array.isArray(empresaIds) && empresaIds.length === 0) return [];

  let query = db
    .selectFrom("fct_licitacoes_metricas")
    .selectAll()
    .where("portal_slug", "=", portalSlug)
    .where("ano", "=", year)
    .where("tipo_contratacao", "=", "gap_licitacao");

  if (empresaIds && empresaIds.length > 0) {
    query = query.where("empresa_id", "in", empresaIds);
  }

  const rows = await query.execute();

  return rows.map((r) => {
    const empresa = String(r.empresa_id ?? "");
    const numero = String(r.contrato_numero ?? r.numero ?? "");
    const fornecedor = String(r.fornecedor_nome ?? "");
    const _valor_contrato = parseFloat(String(r.valor_contrato ?? "0")) || 0;
    const limite_dispensa = parseFloat(String(r.limite_dispensa ?? "0")) || 0;
    const acima_limite = Boolean(r.acima_limite);

    const mes_num =
      r.mes !== null && r.mes !== undefined && !Number.isNaN(Number(r.mes))
        ? Number(r.mes)
        : 0;
    const mes_str = mes_num > 0 ? String(mes_num).padStart(2, "0") : "00";

    return {
      ano: Number(r.ano),
      empresa,
      numero,
      fornecedor,
      objeto: String(r.objeto ?? ""),
      valorContrato: String(r.valor_contrato ?? "0"),
      licitacaoNumero: String(r.licitacao_numero ?? ""),
      mes: mes_num,
      numeroObra: r.numero_obra ?? null,
      tipoObra: r.tipo_obra ?? null,
      modalidade: r.modalidade ?? null,
      fundlegal: r.fundlegal ?? null,
      limiteDispensa: limite_dispensa,
      acimaLimite: acima_limite,
      isentoLegalmente: Boolean(r.isento_legalmente),
      periodo: `${mes_str}/${r.ano}`,
    };
  });
}

/**
 * Retorna a distribuição por modalidades de licitação a partir do mart `fct_licitacoes_modalidades_metricas`.
 */
export async function getDistribucaoModalidadesMetrics(
  portalSlug: string,
  year: number,
  empresaIds?: string[] | null,
): Promise<ItemDistribucaoModalidadeMetricsDTO[]> {
  if (!portalSlug || Number.isNaN(year)) return [];
  if (Array.isArray(empresaIds) && empresaIds.length === 0) return [];

  let query = db
    .selectFrom("fct_licitacoes_modalidades_metricas")
    .select([
      "modalidade",
      db.fn.sum<string>("quantidade").as("quantidade"),
      db.fn.sum<string>("valor_total").as("valor_total"),
    ])
    .where("portal_slug", "=", portalSlug)
    .where("ano", "=", year);

  if (empresaIds && empresaIds.length > 0) {
    query = query.where("empresa_id", "in", empresaIds);
  }

  const rows = await query
    .groupBy("modalidade")
    .orderBy("valor_total", "desc")
    .execute();

  const total_geral = rows.reduce(
    (acc, r) => acc + (parseFloat(String(r.valor_total ?? "0")) || 0),
    0,
  );

  return rows.map((r) => {
    const valor_total = parseFloat(String(r.valor_total ?? "0")) || 0;
    const percentual_valor =
      total_geral > 0 ? (valor_total / total_geral) * 100 : 0;
    const modalidade = String(r.modalidade ?? "outros").toLowerCase();
    return {
      modalidade,
      valorTotal: valor_total,
      quantidade: Number(r.quantidade ?? 0),
      percentual_valor,
      pctValor: percentual_valor,
    };
  });
}

/**
 * Retorna adesaos de ata (caronas) a partir do mart unificado `fct_licitacoes_metricas`.
 */
export async function getAdesaoDeAtaMetrics(
  portalSlug: string,
  year: number,
  empresaIds?: string[] | null,
): Promise<AdesaoAtaResultMetricsDTO> {
  const emptyResult: AdesaoAtaResultMetricsDTO = {
    lista: [],
    quantidade: 0,
    valor: 0,
    totalLicitacao: 0,
    contratosAssociadosCount: 0,
  };

  if (!portalSlug || Number.isNaN(year)) return emptyResult;
  if (Array.isArray(empresaIds) && empresaIds.length === 0) return emptyResult;

  let query = db
    .selectFrom("fct_licitacoes_metricas")
    .select([
      "numero",
      "objeto",
      "licitacao_valor",
      "carona",
      "mes",
      "valor_contrato",
      "empenhado_contrato",
    ])
    .where("portal_slug", "=", portalSlug)
    .where("ano", "=", year)
    .where("tipo_contratacao", "=", "adesao_ata_interna");

  if (empresaIds && empresaIds.length > 0) {
    query = query.where("empresa_id", "in", empresaIds);
  }

  const rows = await query.execute();
  if (rows.length === 0) return emptyResult;

  const groupedMap = new Map<
    string,
    {
      numero: string;
      objeto: string;
      licitacaoValor: number;
      carona: string;
      totalValorContrato: number;
      totalEmpenhadoContrato: number;
      mes: number | null;
    }
  >();

  for (const r of rows) {
    const key = `${r.numero ?? ""}__${r.objeto ?? ""}`;
    const licitacao_valor = parseFloat(String(r.licitacao_valor ?? "0")) || 0;
    const contrato_valor = parseFloat(String(r.valor_contrato ?? "0")) || 0;
    const contrato_empenhado =
      parseFloat(String(r.empenhado_contrato ?? "0")) || 0;
    const mes_num =
      r.mes !== null && r.mes !== undefined && !Number.isNaN(Number(r.mes))
        ? Number(r.mes)
        : null;

    const existing = groupedMap.get(key);
    if (existing) {
      existing.totalValorContrato += contrato_valor;
      existing.totalEmpenhadoContrato += contrato_empenhado;
      if (existing.mes === null) existing.mes = mes_num;
    } else {
      groupedMap.set(key, {
        numero: String(r.numero ?? ""),
        objeto: String(r.objeto ?? ""),
        licitacaoValor: licitacao_valor,
        carona: String(r.carona ?? "S"),
        totalValorContrato: contrato_valor,
        totalEmpenhadoContrato: contrato_empenhado,
        mes: mes_num,
      });
    }
  }

  const lista: ItemAdesaoAtaMetricsDTO[] = Array.from(groupedMap.values()).map(
    (item) => {
      const mes_str = item.mes ? String(item.mes).padStart(2, "0") : "";
      return {
        ...item,
        total_contrato_valor: item.totalValorContrato,
        total_contrato_empenhado: item.totalEmpenhadoContrato,
        totalCValor: item.totalValorContrato,
        totalCEmpenhado: item.totalEmpenhadoContrato,
        temContrato: item.totalValorContrato > 0,
        periodo: mes_str ? `${mes_str}/${year}` : "",
      };
    },
  );

  return {
    lista,
    quantidade: lista.length,
    valor: lista.reduce((acc, i) => acc + i.totalValorContrato, 0),
    totalLicitacao: lista.reduce((acc, i) => acc + i.licitacaoValor, 0),
    contratosAssociadosCount: lista.filter((i) => i.temContrato).length,
  };
}

/**
 * Retorna adesaos externas a partir do mart unificado `fct_licitacoes_metricas`.
 */
export async function getAdesaoExternaMetrics(
  portalSlug: string,
  year: number,
  empresaIds?: string[] | null,
): Promise<AdesaoExternaResultMetricsDTO> {
  const emptyResult: AdesaoExternaResultMetricsDTO = {
    lista: [],
    quantidade: 0,
    totalPago: 0,
  };

  if (!portalSlug || Number.isNaN(year)) return emptyResult;
  if (Array.isArray(empresaIds) && empresaIds.length === 0) return emptyResult;

  let query = db
    .selectFrom("fct_licitacoes_metricas")
    .select([
      "data_referencia as data",
      "fornecedor_nome as fornecedor",
      "empenhado_contrato as empenhado",
      "pago_contrato as pago",
      "empresa_id as unidade",
      "objeto as justificativa",
      "licitacao_numero as num_licitacao",
    ])
    .where("portal_slug", "=", portalSlug)
    .where("ano", "=", year)
    .where("tipo_contratacao", "=", "adesao_ata_externa");

  if (empresaIds && empresaIds.length > 0) {
    query = query.where("empresa_id", "in", empresaIds);
  }

  const rows = await query.orderBy("pago_contrato", "desc").execute();

  const lista: ItemAdesaoExternaMetricsDTO[] = rows.map((r) => ({
    data: r.data ? String(r.data) : "",
    fornecedor: String(r.fornecedor ?? ""),
    empenhado: parseFloat(String(r.empenhado ?? "0")) || 0,
    pago: parseFloat(String(r.pago ?? "0")) || 0,
    unidade: String(r.unidade ?? ""),
    justificativa: String(r.justificativa ?? ""),
    numLicitacao: String(r.num_licitacao ?? ""),
  }));

  return {
    lista,
    quantidade: lista.length,
    totalPago: lista.reduce((acc, i) => acc + i.pago, 0),
  };
}

/**
 * Retorna anomalias contratuais a partir do mart unificado `fct_licitacoes_metricas`.
 */
export async function getAnomaliasContratuaisMetrics(
  portalSlug: string,
  year: number,
  empresaIds?: string[] | null,
): Promise<AnomaliasResultMetricsDTO> {
  const emptyAnomalias: AnomaliasResultMetricsDTO = {
    fracionamento: [],
    fornecedorRecorrente: [],
    janelaCurta: [],
  };

  if (!portalSlug || Number.isNaN(year)) return emptyAnomalias;
  if (Array.isArray(empresaIds) && empresaIds.length === 0)
    return emptyAnomalias;

  let gapQuery = db
    .selectFrom("fct_licitacoes_metricas")
    .selectAll()
    .where("portal_slug", "=", portalSlug)
    .where("ano", "=", year)
    .where("tipo_contratacao", "=", "gap_licitacao");

  let totalContratosQuery = db
    .selectFrom("fct_licitacoes_metricas")
    .select(["empresa_id as empresa", db.fn.countAll().as("total_contratos")])
    .where("portal_slug", "=", portalSlug)
    .where("ano", "=", year);

  if (empresaIds && empresaIds.length > 0) {
    gapQuery = gapQuery.where("empresa_id", "in", empresaIds);
    totalContratosQuery = totalContratosQuery.where(
      "empresa_id",
      "in",
      empresaIds,
    );
  }

  const [contratos, totalContratosRows] = await Promise.all([
    gapQuery.execute(),
    totalContratosQuery.groupBy("empresa_id").execute(),
  ]);

  const totalContratosMap = new Map<string, number>(
    totalContratosRows.map((r) => [
      String(r.empresa ?? ""),
      Number(r.total_contratos ?? 0),
    ]),
  );

  const proximo = contratos
    .map((c) => {
      const valor = parseFloat(String(c.valor_contrato ?? "0")) || 0;
      const limite = parseFloat(String(c.limite_dispensa ?? "0")) || 0;
      const limite_inferior = limite * (1 - NEAR_THRESHOLD_PCT);
      return {
        ...c,
        ano: c.ano,
        mes: c.mes,
        objeto: c.objeto,
        licitacao_numero: c.licitacao_numero,
        empresa: String(c.empresa_id ?? ""),
        numero: String(c.contrato_numero ?? c.numero ?? ""),
        fornecedor: String(c.fornecedor_nome ?? ""),
        valorNum: valor,
        isProximo: valor >= limite_inferior && valor < limite,
      };
    })
    .filter((c) => c.isProximo);

  const countFrac = new Map<string, number>();
  for (const p of proximo) {
    const key = `${p.empresa ?? ""}__${p.fornecedor ?? ""}`;
    countFrac.set(key, (countFrac.get(key) || 0) + 1);
  }

  const chavesFrac = new Set<string>();
  for (const [k, cnt] of countFrac.entries()) {
    if (cnt >= 3) chavesFrac.add(k);
  }

  const fracionamento: ContratoFracionamentoMetricsDTO[] = proximo
    .filter((p) => chavesFrac.has(`${p.empresa ?? ""}__${p.fornecedor ?? ""}`))
    .map((p) => {
      const mes_num =
        p.mes !== null && p.mes !== undefined && !Number.isNaN(Number(p.mes))
          ? Number(p.mes)
          : 0;
      const mes_str = mes_num > 0 ? String(mes_num).padStart(2, "0") : "00";
      const periodo = `${mes_str}/${p.ano}`;
      return {
        ano: Number(p.ano),
        empresa: String(p.empresa ?? ""),
        numero: String(p.numero ?? ""),
        fornecedor: String(p.fornecedor ?? ""),
        objeto: String(p.objeto ?? ""),
        valorContrato: p.valorNum,
        licitacaoNumero: String(p.licitacao_numero ?? ""),
        mes: mes_num,
        periodo,
      };
    });

  const empresaFornecedorCount = new Map<string, Map<string, number>>();
  for (const c of contratos) {
    const emp = String(c.empresa ?? "");
    const forn = String(c.fornecedor ?? "");
    let fornMap = empresaFornecedorCount.get(emp);
    if (!fornMap) {
      fornMap = new Map<string, number>();
      empresaFornecedorCount.set(emp, fornMap);
    }
    fornMap.set(forn, (fornMap.get(forn) || 0) + 1);
  }

  const fornecedorRecorrente: FornecedorRecorrenteMetricsDTO[] = [];
  for (const [emp, mapForn] of empresaFornecedorCount.entries()) {
    const total_contratos = totalContratosMap.get(emp) || 0;
    if (total_contratos === 0) continue;
    for (const [forn, qtd] of mapForn.entries()) {
      const percentual = qtd / total_contratos;
      if (percentual > 0.5) {
        fornecedorRecorrente.push({
          empresa: emp,
          fornecedor: forn,
          quantidade: qtd,
          total: total_contratos,
          percentual,
          pct: percentual,
        });
      }
    }
  }

  return {
    fracionamento,
    fornecedorRecorrente,
    janelaCurta: [],
  };
}

export interface LicitacaoEmAndamentoDTO {
  licitacaoId: string;
  portalSlug: string;
  ano: number;
  empresaId: string;
  entidadeNome: string | null;
  licitacaoNumero: string;
  modalidade: string;
  objeto: string;
  discriminacao: string | null;
  valor: number | null;
  valorEstimado: number | null;
  valorHomologado: number | null;
  situacao: string;
  dataAbertura: string | null;
  carona: string | null;
  fonteObjeto?: string | null;
  linkSistemaOrigem?: string | null;
}

export interface LicitacaoItemDTO {
  itemId: string;
  portalSlug: string;
  ano: number;
  licitacaoNumero: string;
  numeroItem: number;
  descricao: string | null;
  quantidade: number | null;
  unidadeMedida: string | null;
  valorUnitarioEstimado: number | null;
  valorTotalEstimado: number | null;
  valorUnitarioHomologado: number | null;
  valorTotalHomologado: number | null;
  percentualDesconto: number | null;
  fornecedorNome: string | null;
  fornecedorCpfCnpj: string | null;
  situacaoItem: string | null;
}

export interface GetLicitacaoItensOptions {
  ano?: number;
  licitacaoNumero: string;
}

export interface GetLicitacoesEmAndamentoOptions {
  ano?: number;
  empresaIds?: string[] | null;
  empresaId?: string | null;
  entidade?: string | null;
  limite?: number;
}

export function toIsoDateString(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return null;
    return val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return null;
}

/**
 * Retorna os processos licitatórios abertos e em andamento a partir do fato `fct_licitacoes`.
 */
export async function getLicitacoesEmAndamentoMetrics(
  portalSlug: string,
  optionsOrYear?: GetLicitacoesEmAndamentoOptions | number,
  empresaIdsParam?: string[] | null,
): Promise<LicitacaoEmAndamentoDTO[]> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === ""
  ) {
    return [];
  }

  const cleanSlug = portalSlug.trim();

  const options: GetLicitacoesEmAndamentoOptions = (() => {
    if (typeof optionsOrYear === "number") {
      return { ano: optionsOrYear, empresaIds: empresaIdsParam };
    }
    if (optionsOrYear && typeof optionsOrYear === "object") {
      return optionsOrYear;
    }
    return {};
  })();

  if (options.ano !== undefined && Number.isNaN(options.ano)) {
    return [];
  }

  const effectiveEmpresaIds: string[] | null = (() => {
    if (Array.isArray(options.empresaIds)) {
      return options.empresaIds;
    }
    const single = options.empresaId ?? options.entidade;
    if (typeof single === "string" && single.trim() !== "") {
      return [single.trim()];
    }
    return null;
  })();

  if (Array.isArray(effectiveEmpresaIds) && effectiveEmpresaIds.length === 0) {
    return [];
  }

  let query = db
    .selectFrom("fct_licitacoes as l")
    .leftJoin("dim_orgao as o", (join) =>
      join
        .onRef("o.portal_slug", "=", "l.portal_slug")
        .onRef("o.empresa_id", "=", "l.empresa_id"),
    )
    .select([
      "l.licitacao_id",
      "l.portal_slug",
      "l.ano",
      "l.empresa_id",
      "o.orgao_nome as entidade_nome",
      "l.licitacao_numero",
      "l.modalidade",
      "l.objeto",
      "l.discriminacao",
      "l.valor",
      "l.valor_estimado",
      "l.valor_homologado",
      "l.situacao",
      "l.data_abertura",
      "l.carona",
      "l.fonte_objeto",
      "l.link_sistema_origem",
    ])
    .where("l.portal_slug", "=", cleanSlug)
    .where(
      sql<boolean>`(
        lower(replace(trim(l.situacao), ' ', '_')) in ('em_andamento', 'aberta', 'em_aberto', 'publicada', 'publicado')
        or (
          l.fonte_objeto = 'pncp'
          and lower(replace(trim(coalesce(l.situacao, '')), ' ', '_')) not in ('encerrada', 'encerrado', 'fracassada', 'fracassado', 'anulada', 'anulado', 'revogada', 'revogado', 'deserta')
        )
      )`,
    );

  if (options.ano !== undefined) {
    query = query.where("l.ano", "=", options.ano);
  }

  if (Array.isArray(effectiveEmpresaIds) && effectiveEmpresaIds.length > 0) {
    query = query.where("l.empresa_id", "in", effectiveEmpresaIds);
  }

  query = query
    .orderBy(sql`l.data_abertura IS NULL`, "asc")
    .orderBy("l.data_abertura", "desc")
    .orderBy(sql`l.valor IS NULL`, "asc")
    .orderBy("l.valor", "desc")
    .orderBy("l.licitacao_id", "asc");

  if (
    typeof options.limite === "number" &&
    Number.isInteger(options.limite) &&
    options.limite > 0
  ) {
    query = query.limit(options.limite);
  }

  const rows = await query.execute();

  return rows.map((r) => {
    const valorNumerico = r.valor != null ? parseFloat(String(r.valor)) : null;
    const valorEstimado =
      r.valor_estimado != null
        ? parseFloat(String(r.valor_estimado))
        : valorNumerico;
    const valorHomologado =
      r.valor_homologado != null
        ? parseFloat(String(r.valor_homologado))
        : null;

    return {
      licitacaoId: String(r.licitacao_id),
      portalSlug: String(r.portal_slug),
      ano: Number(r.ano),
      empresaId: String(r.empresa_id ?? ""),
      entidadeNome: r.entidade_nome ? String(r.entidade_nome) : null,
      licitacaoNumero: String(r.licitacao_numero ?? ""),
      modalidade: String(r.modalidade ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_"),
      objeto: String(r.objeto ?? ""),
      discriminacao: r.discriminacao ? String(r.discriminacao) : null,
      valor: valorNumerico,
      valorEstimado,
      valorHomologado,
      situacao: String(r.situacao ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_"),
      dataAbertura: toIsoDateString(r.data_abertura),
      carona: r.carona ? String(r.carona) : null,
      fonteObjeto: r.fonte_objeto ? String(r.fonte_objeto) : "municipal",
      linkSistemaOrigem: r.link_sistema_origem
        ? String(r.link_sistema_origem)
        : null,
    };
  });
}

/**
 * Retorna os detalhes de uma licitação específica por número ou ID, independentemente da situação.
 */
export async function getLicitacaoByNumero(
  portalSlug: string,
  licitacaoNumeroOuId: string,
  ano?: number,
): Promise<LicitacaoEmAndamentoDTO | null> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === "" ||
    !licitacaoNumeroOuId ||
    typeof licitacaoNumeroOuId !== "string" ||
    licitacaoNumeroOuId.trim() === ""
  ) {
    return null;
  }

  const cleanSlug = portalSlug.trim();
  const cleanTerm = licitacaoNumeroOuId.trim();

  let query = db
    .selectFrom("fct_licitacoes as l")
    .leftJoin("dim_orgao as o", (join) =>
      join
        .onRef("o.portal_slug", "=", "l.portal_slug")
        .onRef("o.empresa_id", "=", "l.empresa_id"),
    )
    .select([
      "l.licitacao_id",
      "l.portal_slug",
      "l.ano",
      "l.empresa_id",
      "o.orgao_nome as entidade_nome",
      "l.licitacao_numero",
      "l.modalidade",
      "l.objeto",
      "l.discriminacao",
      "l.valor",
      "l.valor_estimado",
      "l.valor_homologado",
      "l.situacao",
      "l.data_abertura",
      "l.carona",
      "l.fonte_objeto",
      "l.link_sistema_origem",
    ])
    .where("l.portal_slug", "=", cleanSlug)
    .where((eb) =>
      eb.or([
        eb("l.licitacao_numero", "=", cleanTerm),
        eb("l.licitacao_id", "=", cleanTerm),
      ]),
    );

  if (ano !== undefined && !Number.isNaN(ano)) {
    query = query.where("l.ano", "=", ano);
  }

  const r = await query.orderBy("l.ano", "desc").limit(1).executeTakeFirst();
  if (!r) return null;

  const valorNumerico = r.valor != null ? parseFloat(String(r.valor)) : null;
  const valorEstimado =
    r.valor_estimado != null
      ? parseFloat(String(r.valor_estimado))
      : valorNumerico;
  const valorHomologado =
    r.valor_homologado != null ? parseFloat(String(r.valor_homologado)) : null;

  return {
    licitacaoId: String(r.licitacao_id),
    portalSlug: String(r.portal_slug),
    ano: Number(r.ano),
    empresaId: String(r.empresa_id ?? ""),
    entidadeNome: r.entidade_nome ? String(r.entidade_nome) : null,
    licitacaoNumero: String(r.licitacao_numero ?? ""),
    modalidade: String(r.modalidade ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_"),
    objeto: String(r.objeto ?? ""),
    discriminacao: r.discriminacao ? String(r.discriminacao) : null,
    valor: valorNumerico,
    valorEstimado,
    valorHomologado,
    situacao: String(r.situacao ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_"),
    dataAbertura: toIsoDateString(r.data_abertura),
    carona: r.carona ? String(r.carona) : null,
    fonteObjeto: r.fonte_objeto ? String(r.fonte_objeto) : "municipal",
    linkSistemaOrigem: r.link_sistema_origem
      ? String(r.link_sistema_origem)
      : null,
  };
}

/**
 * Retorna os itens licitados de um processo a partir do mart `fct_licitacoes_itens`.
 */
export async function getLicitacaoItens(
  portalSlug: string,
  options: GetLicitacaoItensOptions,
): Promise<LicitacaoItemDTO[]> {
  if (
    !portalSlug ||
    typeof portalSlug !== "string" ||
    portalSlug.trim() === "" ||
    !options ||
    !options.licitacaoNumero ||
    typeof options.licitacaoNumero !== "string" ||
    options.licitacaoNumero.trim() === ""
  ) {
    return [];
  }

  const cleanSlug = portalSlug.trim();
  const cleanNumero = options.licitacaoNumero.trim();

  if (
    options.ano !== undefined &&
    (Number.isNaN(options.ano) || !Number.isInteger(options.ano))
  ) {
    return [];
  }

  let query = db
    .selectFrom("fct_licitacoes_itens")
    .select([
      "item_id",
      "portal_slug",
      "ano",
      "licitacao_numero",
      "numero_item",
      "descricao",
      "quantidade",
      "unidade_medida",
      "valor_unitario_estimado",
      "valor_total_estimado",
      "valor_unitario_homologado",
      "valor_total_homologado",
      "percentual_desconto",
      "fornecedor_nome",
      "fornecedor_cpf_cnpj",
      "situacao_item",
    ])
    .where("portal_slug", "=", cleanSlug)
    .where("licitacao_numero", "=", cleanNumero);

  if (options.ano !== undefined) {
    query = query.where("ano", "=", options.ano);
  }

  query = query.orderBy("numero_item", "asc");

  const rows = await query.execute();

  return rows.map((r) => ({
    itemId: String(r.item_id),
    portalSlug: String(r.portal_slug),
    ano: Number(r.ano),
    licitacaoNumero: String(r.licitacao_numero),
    numeroItem: Number(r.numero_item),
    descricao: r.descricao ? String(r.descricao) : null,
    quantidade: r.quantidade != null ? parseFloat(String(r.quantidade)) : null,
    unidadeMedida: r.unidade_medida ? String(r.unidade_medida) : null,
    valorUnitarioEstimado:
      r.valor_unitario_estimado != null
        ? parseFloat(String(r.valor_unitario_estimado))
        : null,
    valorTotalEstimado:
      r.valor_total_estimado != null
        ? parseFloat(String(r.valor_total_estimado))
        : null,
    valorUnitarioHomologado:
      r.valor_unitario_homologado != null
        ? parseFloat(String(r.valor_unitario_homologado))
        : null,
    valorTotalHomologado:
      r.valor_total_homologado != null
        ? parseFloat(String(r.valor_total_homologado))
        : null,
    percentualDesconto:
      r.percentual_desconto != null
        ? parseFloat(String(r.percentual_desconto))
        : null,
    fornecedorNome: r.fornecedor_nome ? String(r.fornecedor_nome) : null,
    fornecedorCpfCnpj: r.fornecedor_cpf_cnpj
      ? String(r.fornecedor_cpf_cnpj)
      : null,
    situacaoItem: r.situacao_item ? String(r.situacao_item) : null,
  }));
}
