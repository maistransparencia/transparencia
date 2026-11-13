import { sql } from "kysely";
import { db } from "../client";
import { montarEmendasStats } from "./emendas-parlamentares";

export interface HistoriaSaudeMetricsDTO {
  historiaSaudeId: string;
  portalSlug: string;
  ano: number;
  dotacaoTotal: number;
  totalEmpenhado: number;
  totalLiquidado: number;
  totalPago: number;
  medicamentosInsumosEmpenhado: number;
  medicamentosInsumosPago: number;
  judicializacaoEmpenhado: number;
  judicializacaoPago: number;
  emendasSaudeArrecadado: number;
  hhiConcentracaoFornecedores: number;
}

export interface EmendaEmpenhoItemDTO {
  empenhoId: string;
  dataEmpenho: string | null;
  fornecedorNome: string;
  fornecedorCpfCnpj: string | null;
  licitacaoNumero: string | null;
  licitacaoModalidade: string | null;
  valorEmpenhado: number;
  valorLiquidado: number;
  valorPago: number;
  descricao: string;
}

export interface EmendaSaudeDTO {
  id: string;
  numero: string;
  objeto: string;
  valorAutorizado: number;
  empenhado: number | null;
  autor: string;
  tipoEmenda: string;
  esferaOrigem: string;
  atoNormativo: string;
  destinacao: string;
  quantidadeEmpenhos: number;
  empenhos: EmendaEmpenhoItemDTO[];
  /** Valor da emenda quando aparece como receita arrecadada pelo fundo (indício por valor). */
  valorRecebidoFundo: number;
  /** confirmado_por_proposta, valor_igual (só o valor coincide) ou nao_identificado. */
  recebimentoFundo: string;
  /** Linha de receita correspondente, para o cidadão conferir. */
  receitaCodigo: string | null;
  receitaDescricao: string | null;
}

export interface EmendasStatsSaudeDTO {
  totalAutorizado: number;
  totalEmpenhado: number;
  /** Soma das emendas que aparecem como receita arrecadada pelo fundo. */
  totalRecebidoFundo: number;
  /** Soma das emendas com receita de mesmo valor, sem o número da proposta (indício fraco). */
  totalReceitaPossivel: number;
  taxaEmpenho: number;
  maiorEmenda: number;
  lista: EmendaSaudeDTO[];
}

export interface FontesReceitaSaudeDTO {
  percentualUniaoSus: number;
  percentualEstado: number;
  percentualPropria: number;
  percentualOutrasReceitas: number;
  /** Transferências da União (SUS) recebidas pelo fundo, em reais. */
  receitaUniao: number;
  /** Transferências do Estado recebidas pelo fundo, em reais. */
  receitaEstado: number;
  /** Repasse financeiro medido da entidade pagadora ao fundo, em reais. */
  repassesPrefeitura: number;
  /** Receita orçamentária do fundo que não vem da União nem do Estado. */
  receitaOutras: number;
  /** União + Estado + repasse + outras receitas. */
  totalEntrada: number;
  emendasParlamentares: number;
}

export interface CaminhoContratacaoSaudeDTO {
  /** Código em snake_case: licitacao_propria, adesao_ata_interna, adesao_ata_externa, gap_licitacao. */
  tipoContratacao: string;
  quantidade: number;
  valorEmpenhado: number;
}

export interface LicitacoesSaudeResultDTO {
  /** Caminhos de contratação do fundo, com o valor empenhado ligado a cada um. */
  caminhos: CaminhoContratacaoSaudeDTO[];
}

export async function getHistoriaSaudeMetrics(
  portalSlug: string,
  ano: number,
): Promise<HistoriaSaudeMetricsDTO | null> {
  try {
    const result = await db
      .selectFrom("fct_historia_saude_metricas")
      .selectAll()
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano)
      .executeTakeFirst();

    if (!result) return null;

    return {
      historiaSaudeId: result.historia_saude_id,
      portalSlug: result.portal_slug,
      ano: Number(result.ano),
      dotacaoTotal: Number(result.dotacao_total ?? 0),
      totalEmpenhado: Number(result.total_empenhado ?? 0),
      totalLiquidado: Number(result.total_liquidado ?? 0),
      totalPago: Number(result.total_pago ?? 0),
      medicamentosInsumosEmpenhado: Number(
        result.medicamentos_insumos_empenhado ?? 0,
      ),
      medicamentosInsumosPago: Number(result.medicamentos_insumos_pago ?? 0),
      judicializacaoEmpenhado: Number(result.judicializacao_empenhado ?? 0),
      judicializacaoPago: Number(result.judicializacao_pago ?? 0),
      emendasSaudeArrecadado: Number(result.emendas_saude_arrecadado ?? 0),
      hhiConcentracaoFornecedores: Number(
        result.hhi_concentracao_fornecedores ?? 0,
      ),
    } satisfies HistoriaSaudeMetricsDTO;
  } catch {
    return null;
  }
}

export async function getSaudeExecutionTrendMetrics(
  portalSlug: string,
): Promise<Array<{ ano: number; empenhado: number; pago: number }>> {
  try {
    const results = await db
      .selectFrom("fct_historia_saude_metricas")
      .select(["ano", "total_empenhado as empenhado", "total_pago as pago"])
      .where("portal_slug", "=", portalSlug)
      .orderBy("ano", "asc")
      .execute();

    return results.map((r) => ({
      ano: Number(r.ano),
      empenhado: Number(r.empenhado ?? 0),
      pago: Number(r.pago ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function getSaudeEmendasMetrics(
  portalSlug: string,
  ano: number,
  empresaIds: string[],
): Promise<EmendasStatsSaudeDTO> {
  const empty: EmendasStatsSaudeDTO = {
    totalAutorizado: 0,
    totalEmpenhado: 0,
    totalRecebidoFundo: 0,
    totalReceitaPossivel: 0,
    taxaEmpenho: 0,
    maiorEmenda: 0,
    lista: [],
  };

  if (empresaIds.length === 0) return empty;

  try {
    const rows = await db
      .selectFrom("fct_emendas")
      .selectAll()
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano)
      .where((eb) =>
        eb.or([
          eb("empresa_id", "in", empresaIds),
          eb("destinacao", "ilike", "%saud%"),
          eb("resumo", "ilike", "%saud%"),
        ]),
      )
      .execute();

    if (rows.length === 0) return empty;

    return montarEmendasStats(rows);
  } catch {
    return empty;
  }
}

export async function getSaudeContratosCountMetrics(
  portalSlug: string,
  ano: number,
  empresaIds: string[],
): Promise<number> {
  if (empresaIds.length === 0) return 0;

  try {
    const res = await db
      .selectFrom("fct_contratos")
      .select((eb) => eb.fn.count<string>("contrato_id").as("count"))
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano)
      .where((eb) =>
        eb.or([
          eb("empresa_id", "in", empresaIds),
          eb("objeto", "ilike", "%saud%"),
          eb("modalidade", "ilike", "%saud%"),
        ]),
      )
      .executeTakeFirst();

    return Number(res?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function getSaudeFornecedoresCountMetrics(
  portalSlug: string,
  ano: number,
  empresaIds: string[],
): Promise<number> {
  if (empresaIds.length === 0) return 0;

  try {
    const res = await db
      .selectFrom("fct_despesas")
      .select(sql<number>`count(distinct fornecedor_nome)`.as("count"))
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano)
      // restos a pagar são despesas de exercícios anteriores: ficam fora dos fornecedores do ano
      .where("fonte", "=", "exercicio")
      .where((eb) =>
        eb.or([
          eb("empresa_id", "in", empresaIds),
          eb("fornecedor_nome", "ilike", "%saud%"),
          eb("fornecedor_nome", "ilike", "%hospital%"),
          eb("fornecedor_nome", "ilike", "%farmac%"),
        ]),
      )
      .executeTakeFirst();

    return Number(res?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function getSaudeFontesReceitaMetrics(params: {
  portalSlug: string;
  ano: number;
  empresaIds?: string[];
  empenhadoTotal?: number;
}): Promise<FontesReceitaSaudeDTO> {
  const empty: FontesReceitaSaudeDTO = {
    percentualUniaoSus: 0,
    percentualEstado: 0,
    percentualPropria: 0,
    percentualOutrasReceitas: 0,
    receitaUniao: 0,
    receitaEstado: 0,
    repassesPrefeitura: 0,
    receitaOutras: 0,
    totalEntrada: 0,
    emendasParlamentares: 0,
  };

  try {
    const row = await db
      .selectFrom("fct_historia_saude_metricas")
      .select([
        "percentual_uniao_sus",
        "percentual_estado",
        "percentual_propria",
        "percentual_outras_receitas",
        "receita_uniao_saude",
        "receita_estado_saude",
        "repasses_prefeitura_saude",
        "receita_outras_saude",
        "total_entrada_saude",
        "emendas_saude_arrecadado",
      ])
      .where("portal_slug", "=", params.portalSlug)
      .where("ano", "=", params.ano)
      .executeTakeFirst();

    if (!row) return empty;

    return {
      percentualUniaoSus: Number(row.percentual_uniao_sus ?? 0),
      percentualEstado: Number(row.percentual_estado ?? 0),
      percentualPropria: Number(row.percentual_propria ?? 0),
      percentualOutrasReceitas: Number(row.percentual_outras_receitas ?? 0),
      receitaUniao: Number(row.receita_uniao_saude ?? 0),
      receitaEstado: Number(row.receita_estado_saude ?? 0),
      repassesPrefeitura: Number(row.repasses_prefeitura_saude ?? 0),
      receitaOutras: Number(row.receita_outras_saude ?? 0),
      totalEntrada: Number(row.total_entrada_saude ?? 0),
      emendasParlamentares: Number(row.emendas_saude_arrecadado ?? 0),
    };
  } catch {
    return empty;
  }
}

export async function getSaudeLicitacoesMetrics(
  portalSlug: string,
  ano: number,
  empresaIds: string[],
): Promise<LicitacoesSaudeResultDTO> {
  const empty: LicitacoesSaudeResultDTO = { caminhos: [] };

  if (empresaIds.length === 0) return empty;

  try {
    const rows = await db
      .selectFrom("fct_licitacoes_metricas")
      .select([
        "tipo_contratacao",
        db.fn.countAll<string>().as("quantidade"),
        db.fn.sum<string>("empenhado_contrato").as("valor_empenhado"),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano)
      .where("empresa_id", "in", empresaIds)
      .groupBy("tipo_contratacao")
      .orderBy("tipo_contratacao")
      .execute();

    return {
      caminhos: rows.map((row) => ({
        tipoContratacao: String(row.tipo_contratacao ?? "nao_informado"),
        quantidade: Number(row.quantidade ?? 0),
        valorEmpenhado: Number(row.valor_empenhado ?? 0),
      })),
    };
  } catch {
    return empty;
  }
}
