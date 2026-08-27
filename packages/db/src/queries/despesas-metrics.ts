import { db } from "../client";

export interface ResumoDiariasMetricsDTO {
  totalValor: number;
  totalViajantes: number;
  mediaReembolso: number;
}

export interface BeneficiarioDiariaMetricsDTO {
  favorecido: string;
  nome: string;
  cargo: string;
  quantidade: number;
  valor: number;
  total: number;
}

export interface ImpactoGastosLocaisMetricsDTO {
  localPago: number;
  externoPago: number;
  totalPago: number;
  pctLocal: number;
  historicoLocalPago: number;
  historicoExternoPago: number;
  historicoTotalPago: number;
  historicoPctLocal: number;
}

export interface ItemFornecedorTopMetrics {
  codigo: string;
  descricao: string;
  empenhado: number;
  percentual: number;
}

export interface ConcentracaoFornecedoresMetricsDTO {
  top10: ItemFornecedorTopMetrics[];
  hhi: number;
  dominante: string | null;
  totalAll: number;
}

export interface RestosAPagarVendorItemDTO {
  fornecedor: string;
  valorTotal: number;
  liquidado: number;
  empenhadoALiquidar: number;
  valor: number; // para compatibilidade retroativa
}

export interface RestosAPagarResumoMetricsDTO {
  restosInscritos: number;
  restosLiquidados: number;
  totalLiquidadoPendente: number;
  restosPagos: number;
  restosCancelados: number;
  saldoRestos: number;
  totalPendente: number;
  fornecedoresAguardando: number;
  dividaMaisAntigaAno: number;
  topFornecedores: RestosAPagarVendorItemDTO[];
}

export interface DespesaUnidadeMetricsDTO {
  descricao: string;
  empenhado: number;
  liquidado: number;
  pago: number;
  dotacaoAtualizada: number;
  totalPendente: number;
  liquidadoPendente: number;
  empenhadoALiquidar: number;
}

export const CATEGORIAS_GASTOS_SENSIVEIS = [
  "combustivel_frota",
  "locacao_maquinas_veiculos",
  "eventos_festas",
  "diarias_viagens",
  "obras_infraestrutura",
] as const;

export type CategoriaGastoSensivel =
  (typeof CATEGORIAS_GASTOS_SENSIVEIS)[number];

export interface ItemGastoSensivelDTO {
  categoria: CategoriaGastoSensivel;
  valorPagoAnoAtual: number;
  valorPagoAnoAnterior: number;
  valorLiquidadoAnoAtual: number;
  valorEmpenhadoAnoAtual: number;
  valorLiquidadoPendente: number;
  dividaRealAcumulada: number;
  dividaRestosAcumulada: number;
  variacaoPercentual: number | null;
  tendencia: "aumento" | "economia" | "estavel" | "sem_historico";
}

export interface RadarGastosSensiveisDTO {
  itens: ItemGastoSensivelDTO[];
  anoAtual: number;
  anoAnterior: number;
}

export interface FornecedorExecucaoItemDTO {
  fornecedorNome: string;
  fornecedorCpfCnpj: string | null;
  totalPago: number;
  totalEmpenhado: number;
  percentualPago: number;
}

export interface DespesaFuncaoItemDTO {
  funcaoCodigo: string;
  funcaoNome: string;
  totalEmpenhado: number;
  totalLiquidado: number;
  totalPago: number;
  percentualPago: number;
}

export interface GargaloNaturezaItemDTO {
  categoriaDescricao: string;
  empenhado: number;
  liquidado: number;
  pago: number;
  totalPendente: number;
  liquidadoPendente: number;
  empenhadoALiquidar: number;
}

export async function getResumoDiariasMetrics(
  portalSlug: string,
  ano: number,
  empresaIds: string[],
): Promise<ResumoDiariasMetricsDTO> {
  if (empresaIds.length === 0) {
    return { totalValor: 0, totalViajantes: 0, mediaReembolso: 0 };
  }

  try {
    const totals = await db
      .selectFrom("fct_despesas_diarias_metricas")
      .select((eb) => [
        eb.fn.sum<string>("total_valor").as("total_valor"),
        eb.fn.sum<string>("qtd_concessoes").as("qtd_concessoes"),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano)
      .where("empresa_id", "in", empresaIds)
      .where("favorecido", "=", "__TOTAL__")
      .executeTakeFirst();

    const viajantesRes = await db
      .selectFrom("fct_despesas_diarias_metricas")
      .select("favorecido")
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", ano)
      .where("empresa_id", "in", empresaIds)
      .where("favorecido", "!=", "__TOTAL__")
      .groupBy("favorecido")
      .execute();

    const totalValor = Number(totals?.total_valor ?? 0);
    const qtdConcessoes = Number(totals?.qtd_concessoes ?? 0);
    const totalViajantes = viajantesRes.length;

    return {
      totalValor,
      totalViajantes,
      mediaReembolso: qtdConcessoes > 0 ? totalValor / qtdConcessoes : 0,
    };
  } catch {
    return { totalValor: 0, totalViajantes: 0, mediaReembolso: 0 };
  }
}

export async function getPrincipaisBeneficiariosDiariasMetrics({
  portalSlug,
  year,
  limit = 10,
  empresaIds,
}: {
  portalSlug: string;
  year: number;
  limit?: number;
  empresaIds: string[];
}): Promise<BeneficiarioDiariaMetricsDTO[]> {
  if (empresaIds.length === 0) return [];

  try {
    const results = await db
      .selectFrom("fct_despesas_diarias_metricas")
      .select((eb) => [
        "favorecido",
        "cargo",
        eb.fn.sum<string>("total_valor").as("total"),
        eb.fn.sum<string>("qtd_concessoes").as("quantidade"),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", year)
      .where("empresa_id", "in", empresaIds)
      .where("favorecido", "!=", "__TOTAL__")
      .groupBy(["favorecido", "cargo"])
      .orderBy("total", "desc")
      .limit(limit)
      .execute();

    return results.map((r) => {
      const tot = Number(r.total ?? 0);
      const fav = r.favorecido ?? "";
      return {
        favorecido: fav,
        nome: fav,
        cargo: r.cargo ?? "",
        quantidade: Number(r.quantidade ?? 0),
        valor: tot,
        total: tot,
      };
    });
  } catch {
    return [];
  }
}

export async function getImpactoGastosLocaisMetrics({
  portalSlug,
  year,
  empresaIds,
  cidadeClean,
}: {
  portalSlug: string;
  year: number;
  empresaIds: string[];
  cidadeClean: string;
}): Promise<ImpactoGastosLocaisMetricsDTO> {
  const emptyResult: ImpactoGastosLocaisMetricsDTO = {
    localPago: 0,
    externoPago: 0,
    totalPago: 0,
    pctLocal: 0,
    historicoLocalPago: 0,
    historicoExternoPago: 0,
    historicoTotalPago: 0,
    historicoPctLocal: 0,
  };

  if (empresaIds.length === 0) return emptyResult;

  try {
    const normalizedCidade = cidadeClean.trim().toUpperCase();

    const currentYearRows = await db
      .selectFrom("fct_despesas_fornecedores_metricas")
      .select((eb) => [
        "fornecedor_cidade_clean",
        eb.fn.sum<string>("total_pago").as("total_pago"),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", year)
      .where("empresa_id", "in", empresaIds)
      .groupBy("fornecedor_cidade_clean")
      .execute();

    const { localPago, externoPago } = currentYearRows.reduce(
      (acc, r) => {
        const val = Number(r.total_pago ?? 0);
        if (r.fornecedor_cidade_clean === normalizedCidade) {
          acc.localPago += val;
        } else {
          acc.externoPago += val;
        }
        return acc;
      },
      { localPago: 0, externoPago: 0 },
    );

    const totalPago = localPago + externoPago;
    const pctLocal = totalPago > 0 ? (localPago / totalPago) * 100 : 0;

    const histRows = await db
      .selectFrom("fct_despesas_fornecedores_metricas")
      .select((eb) => [
        "fornecedor_cidade_clean",
        eb.fn.sum<string>("total_pago").as("total_pago"),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "<", year)
      .where("empresa_id", "in", empresaIds)
      .groupBy("fornecedor_cidade_clean")
      .execute();

    const { historicoLocalPago, historicoExternoPago } = histRows.reduce(
      (acc, r) => {
        const val = Number(r.total_pago ?? 0);
        if (r.fornecedor_cidade_clean === normalizedCidade) {
          acc.historicoLocalPago += val;
        } else {
          acc.historicoExternoPago += val;
        }
        return acc;
      },
      { historicoLocalPago: 0, historicoExternoPago: 0 },
    );

    const historicoTotalPago = historicoLocalPago + historicoExternoPago;
    const historicoPctLocal =
      historicoTotalPago > 0
        ? (historicoLocalPago / historicoTotalPago) * 100
        : 0;

    return {
      localPago,
      externoPago,
      totalPago,
      pctLocal,
      historicoLocalPago,
      historicoExternoPago,
      historicoTotalPago,
      historicoPctLocal,
    };
  } catch {
    return emptyResult;
  }
}

export async function getConcentracaoFornecedoresMetrics(
  portalSlug: string,
  year: number,
  empresaIds: string[],
): Promise<ConcentracaoFornecedoresMetricsDTO> {
  const emptyResult: ConcentracaoFornecedoresMetricsDTO = {
    top10: [],
    hhi: 0,
    dominante: null,
    totalAll: 0,
  };

  if (empresaIds.length === 0) return emptyResult;

  try {
    const rows = await db
      .selectFrom("fct_despesas_fornecedores_metricas")
      .select((eb) => [
        "fornecedor_codigo",
        "fornecedor_nome",
        eb.fn.sum<string>("total_empenhado").as("empenhado"),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", year)
      .where("empresa_id", "in", empresaIds)
      .groupBy(["fornecedor_codigo", "fornecedor_nome"])
      .orderBy("empenhado", "desc")
      .execute();

    let totalAll = 0;
    const items = rows.map((r) => {
      const emp = Number(r.empenhado ?? 0);
      totalAll += emp;
      return {
        codigo: r.fornecedor_codigo,
        descricao: r.fornecedor_nome,
        empenhado: emp,
        percentual: 0,
      };
    });

    const formattedItems = items.map((i) => ({
      ...i,
      percentual: totalAll > 0 ? (i.empenhado / totalAll) * 100 : 0,
    }));

    const top10 = formattedItems.slice(0, 10);

    const sumHHI = formattedItems.reduce((acc, i) => {
      const share = totalAll > 0 ? i.empenhado / totalAll : 0;
      return acc + share * share;
    }, 0);
    const hhi = sumHHI * 10000;

    const domItem = formattedItems.find((i) => i.percentual > 40);
    const dominante = domItem ? domItem.descricao : null;

    return { top10, hhi, dominante, totalAll };
  } catch {
    return emptyResult;
  }
}

export async function getRestosAPagarResumoMetrics(
  portalSlug: string,
  year: number,
  empresaIds: string[],
): Promise<RestosAPagarResumoMetricsDTO> {
  const emptyResult: RestosAPagarResumoMetricsDTO = {
    restosInscritos: 0,
    restosLiquidados: 0,
    totalLiquidadoPendente: 0,
    restosPagos: 0,
    restosCancelados: 0,
    saldoRestos: 0,
    totalPendente: 0,
    fornecedoresAguardando: 0,
    dividaMaisAntigaAno: year,
    topFornecedores: [],
  };

  if (empresaIds.length === 0) return emptyResult;

  try {
    const result = await db
      .selectFrom("fct_despesas_restos_metricas")
      .select((eb) => [
        eb.fn.sum<string>("restos_inscritos").as("restos_inscritos"),
        eb.fn.sum<string>("restos_liquidados").as("restos_liquidados"),
        eb.fn.sum<string>("restos_pagos").as("restos_pagos"),
        eb.fn.sum<string>("restos_cancelados").as("restos_cancelados"),
        eb.fn.sum<string>("saldo_restos").as("saldo_restos"),
        eb.fn
          .min<number>("divida_mais_antiga_ano")
          .as("divida_mais_antiga_ano"),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", year)
      .where("empresa_id", "in", empresaIds)
      .executeTakeFirst();

    const rows = await db
      .selectFrom("fct_despesas")
      .select([
        "ano",
        "fornecedor_nome",
        "descricao",
        "empenhado",
        "liquidado",
        "pago",
      ])
      .where("portal_slug", "=", portalSlug)
      .where("fonte", "=", "restos_a_pagar")
      .where("ano", "=", year)
      .where("empresa_id", "in", empresaIds)
      .execute();

    const initialDividaMaisAntigaAno = Number(
      result?.divida_mais_antiga_ano ?? year,
    );

    const {
      totalPendente,
      totalLiquidadoPendente,
      dividaMaisAntigaAno,
      fornecedoresSet,
      mapFornecedores,
    } = rows.reduce(
      (acc, r) => {
        const emp = Number(r.empenhado ?? 0);
        const liq = Number(r.liquidado ?? 0);
        const pag = Number(r.pago ?? 0);
        const pend = emp - pag;
        if (pend > 0) {
          const liqPend = Math.max(0, liq - pag);
          const empALiq = Math.max(0, pend - liqPend);

          acc.totalPendente += pend;
          acc.totalLiquidadoPendente += liqPend;

          const a = Number(r.ano);
          if (a > 0 && a < acc.dividaMaisAntigaAno) {
            acc.dividaMaisAntigaAno = a;
          }
          const nome = String(
            r.fornecedor_nome || r.descricao || "Não identificado",
          ).trim();
          acc.fornecedoresSet.add(nome);
          if (!acc.mapFornecedores[nome]) {
            acc.mapFornecedores[nome] = {
              valorTotal: 0,
              liquidado: 0,
              empenhadoALiquidar: 0,
            };
          }
          acc.mapFornecedores[nome].valorTotal += pend;
          acc.mapFornecedores[nome].liquidado += liqPend;
          acc.mapFornecedores[nome].empenhadoALiquidar += empALiq;
        }
        return acc;
      },
      {
        totalPendente: 0,
        totalLiquidadoPendente: 0,
        dividaMaisAntigaAno: initialDividaMaisAntigaAno,
        fornecedoresSet: new Set<string>(),
        mapFornecedores: {} as Record<
          string,
          { valorTotal: number; liquidado: number; empenhadoALiquidar: number }
        >,
      },
    );

    const restosInscritos = Number(result?.restos_inscritos ?? 0);
    const restosLiquidados = Number(result?.restos_liquidados ?? 0);
    const restosPagos = Number(result?.restos_pagos ?? 0);
    const restosCancelados = Number(result?.restos_cancelados ?? 0);
    const saldoRestos = Number(result?.saldo_restos ?? 0);

    const topFornecedores: RestosAPagarVendorItemDTO[] = Object.entries(
      mapFornecedores,
    )
      .map(([fornecedor, data]) => ({
        fornecedor,
        valorTotal: data.valorTotal,
        liquidado: data.liquidado,
        empenhadoALiquidar: data.empenhadoALiquidar,
        valor: data.valorTotal,
      }))
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 5);

    return {
      restosInscritos,
      restosLiquidados,
      totalLiquidadoPendente,
      restosPagos,
      restosCancelados,
      saldoRestos,
      totalPendente: totalPendente > 0 ? totalPendente : saldoRestos,
      fornecedoresAguardando: fornecedoresSet.size,
      dividaMaisAntigaAno,
      topFornecedores,
    };
  } catch {
    return emptyResult;
  }
}

export async function getDespesasPorUnidadeMetrics(
  portalSlug: string,
  year: number,
  empresaIds: string[],
): Promise<DespesaUnidadeMetricsDTO[]> {
  if (empresaIds.length === 0) return [];

  try {
    const results = await db
      .selectFrom("fct_despesas_por_unidade")
      .select((eb) => [
        "descricao",
        eb.fn.sum<string>("empenhado").as("empenhado"),
        eb.fn.sum<string>("liquidado").as("liquidado"),
        eb.fn.sum<string>("pago").as("pago"),
        eb.fn.sum<string>("dotacao_atualizada").as("dotacao_atualizada"),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", year)
      .where("empresa", "in", empresaIds)
      .groupBy("descricao")
      .orderBy("empenhado", "desc")
      .execute();

    return results.map((r) => {
      const empenhado = Number(r.empenhado ?? 0);
      const liquidado = Number(r.liquidado ?? 0);
      const pago = Number(r.pago ?? 0);
      const totalPendente = Math.max(0, empenhado - pago);
      const liquidadoPendente = Math.max(0, liquidado - pago);
      const empenhadoALiquidar = Math.max(
        0,
        empenhado - Math.max(liquidado, pago),
      );

      return {
        descricao: String(r.descricao ?? ""),
        empenhado,
        liquidado,
        pago,
        dotacaoAtualizada: Number(r.dotacao_atualizada ?? 0),
        totalPendente,
        liquidadoPendente,
        empenhadoALiquidar,
      };
    });
  } catch {
    return [];
  }
}

export async function getRadarGastosSensiveisMetrics(
  portalSlug: string,
  year: number,
  empresaIds: string[],
): Promise<RadarGastosSensiveisDTO> {
  const previousYear = year - 1;

  const buildEmptyItem = (
    categoria: CategoriaGastoSensivel,
  ): ItemGastoSensivelDTO => ({
    categoria,
    valorPagoAnoAtual: 0,
    valorPagoAnoAnterior: 0,
    valorLiquidadoAnoAtual: 0,
    valorEmpenhadoAnoAtual: 0,
    valorLiquidadoPendente: 0,
    dividaRealAcumulada: 0,
    dividaRestosAcumulada: 0,
    variacaoPercentual: null,
    tendencia: "sem_historico",
  });

  const emptyResult: RadarGastosSensiveisDTO = {
    itens: CATEGORIAS_GASTOS_SENSIVEIS.map(buildEmptyItem),
    anoAtual: year,
    anoAnterior: previousYear,
  };

  if (empresaIds.length === 0) return emptyResult;

  try {
    const rows = await db
      .selectFrom("fct_despesas")
      .select((eb) => [
        "ano",
        "fonte",
        "categoria_gasto_sensivel",
        eb.fn.sum<string>("pago").as("pago"),
        eb.fn.sum<string>("liquidado").as("liquidado"),
        eb.fn.sum<string>("empenhado").as("empenhado"),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "<=", year)
      .where("empresa_id", "in", empresaIds)
      .where("categoria_gasto_sensivel", "is not", null)
      .groupBy(["ano", "fonte", "categoria_gasto_sensivel"])
      .execute();

    const dataMap = rows.reduce(
      (acc, r) => {
        const cat = r.categoria_gasto_sensivel as CategoriaGastoSensivel;
        if (!cat || !acc[cat]) return acc;
        const rowAno = Number(r.ano);
        const pago = Number(r.pago ?? 0);
        const liquidado = Number(r.liquidado ?? 0);
        const empenhado = Number(r.empenhado ?? 0);
        const pendente = Math.max(0, liquidado - pago);

        if (r.fonte === "exercicio") {
          if (rowAno === year) {
            acc[cat].pagoAtual += pago;
            acc[cat].liquidadoAtual += liquidado;
            acc[cat].empenhadoAtual += empenhado;
            acc[cat].dividaExercicio += pendente;
          } else if (rowAno === previousYear) {
            acc[cat].pagoAnterior += pago;
          }
        } else if (r.fonte === "restos_a_pagar") {
          acc[cat].dividaRestos += pendente;
        }
        return acc;
      },
      CATEGORIAS_GASTOS_SENSIVEIS.reduce(
        (acc, cat) => {
          acc[cat] = {
            pagoAtual: 0,
            pagoAnterior: 0,
            liquidadoAtual: 0,
            empenhadoAtual: 0,
            dividaExercicio: 0,
            dividaRestos: 0,
          };
          return acc;
        },
        {} as Record<
          CategoriaGastoSensivel,
          {
            pagoAtual: number;
            pagoAnterior: number;
            liquidadoAtual: number;
            empenhadoAtual: number;
            dividaExercicio: number;
            dividaRestos: number;
          }
        >,
      ),
    );

    const itens = CATEGORIAS_GASTOS_SENSIVEIS.map((categoria) => {
      const data = dataMap[categoria];
      const atual = data.pagoAtual;
      const anterior = data.pagoAnterior;
      const liquidadoPendente = data.dividaExercicio;
      const dividaRestosAcumulada = data.dividaRestos;
      const dividaRealAcumulada = liquidadoPendente + dividaRestosAcumulada;
      const variacaoPercentual =
        anterior > 0
          ? Number((((atual - anterior) / anterior) * 100).toFixed(1))
          : null;

      const tendencia: ItemGastoSensivelDTO["tendencia"] = (() => {
        if (variacaoPercentual === null) return "sem_historico";
        if (variacaoPercentual > 2) return "aumento";
        if (variacaoPercentual < -2) return "economia";
        return "estavel";
      })();

      return {
        categoria,
        valorPagoAnoAtual: atual,
        valorPagoAnoAnterior: anterior,
        valorLiquidadoAnoAtual: data.liquidadoAtual,
        valorEmpenhadoAnoAtual: data.empenhadoAtual,
        valorLiquidadoPendente: liquidadoPendente,
        dividaRealAcumulada,
        dividaRestosAcumulada,
        variacaoPercentual,
        tendencia,
      };
    });

    return {
      itens,
      anoAtual: year,
      anoAnterior: previousYear,
    };
  } catch {
    return emptyResult;
  }
}

export async function getDespesasPorFuncaoMetrics(
  portalSlug: string,
  year: number,
  empresaIds: string[],
): Promise<DespesaFuncaoItemDTO[]> {
  if (empresaIds.length === 0) return [];

  try {
    const results = await db
      .selectFrom("fct_despesas")
      .select((eb) => [
        "funcao",
        "funcao_nome",
        eb.fn.sum<string>("empenhado").as("empenhado"),
        eb.fn.sum<string>("liquidado").as("liquidado"),
        eb.fn.sum<string>("pago").as("pago"),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", year)
      .where("fonte", "=", "exercicio")
      .where("empresa_id", "in", empresaIds)
      .groupBy(["funcao", "funcao_nome"])
      .execute();

    const totalGeralPago = results.reduce(
      (acc, r) => acc + Number(r.pago ?? 0),
      0,
    );

    return results
      .map((r) => {
        const totalEmpenhado = Number(r.empenhado ?? 0);
        const totalLiquidado = Number(r.liquidado ?? 0);
        const totalPago = Number(r.pago ?? 0);
        const percentualPago =
          totalGeralPago > 0 ? (totalPago / totalGeralPago) * 100 : 0;

        return {
          funcaoCodigo: String(r.funcao ?? "00"),
          funcaoNome: String(r.funcao_nome ?? "Outras Funções"),
          totalEmpenhado,
          totalLiquidado,
          totalPago,
          percentualPago: Number(percentualPago.toFixed(1)),
        };
      })
      .filter((i) => i.totalPago > 0 || i.totalEmpenhado > 0)
      .sort((a, b) => b.totalPago - a.totalPago);
  } catch {
    return [];
  }
}

export async function getGargalosNaturezaMetrics(
  portalSlug: string,
  year: number,
  empresaIds: string[],
): Promise<GargaloNaturezaItemDTO[]> {
  if (empresaIds.length === 0) return [];

  try {
    const results = await db
      .selectFrom("fct_despesas")
      .select((eb) => [
        "natureza_despesa",
        "grupo_natureza",
        "elemento",
        "descricao",
        eb.fn.sum<string>("empenhado").as("empenhado"),
        eb.fn.sum<string>("liquidado").as("liquidado"),
        eb.fn.sum<string>("pago").as("pago"),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", year)
      .where("empresa_id", "in", empresaIds)
      .groupBy(["natureza_despesa", "grupo_natureza", "elemento", "descricao"])
      .execute();

    const mapNaturezas = results.reduce(
      (acc, r) => {
        const emp = Number(r.empenhado ?? 0);
        const liq = Number(r.liquidado ?? 0);
        const pag = Number(r.pago ?? 0);

        const cat = String(
          r.natureza_despesa ||
            r.grupo_natureza ||
            r.descricao ||
            "Outras Despesas",
        ).trim();

        if (!acc[cat]) {
          acc[cat] = { empenhado: 0, liquidado: 0, pago: 0 };
        }
        acc[cat].empenhado += emp;
        acc[cat].liquidado += liq;
        acc[cat].pago += pag;
        return acc;
      },
      {} as Record<
        string,
        { empenhado: number; liquidado: number; pago: number }
      >,
    );

    return Object.entries(mapNaturezas)
      .map(([categoriaDescricao, vals]) => {
        const totalPendente = Math.max(0, vals.empenhado - vals.pago);
        const liquidadoPendente = Math.max(0, vals.liquidado - vals.pago);
        const empenhadoALiquidar = Math.max(
          0,
          vals.empenhado - Math.max(vals.liquidado, vals.pago),
        );
        return {
          categoriaDescricao,
          empenhado: vals.empenhado,
          liquidado: vals.liquidado,
          pago: vals.pago,
          totalPendente,
          liquidadoPendente,
          empenhadoALiquidar,
        };
      })
      .filter((i) => i.totalPendente > 0 || i.empenhado > 0)
      .sort((a, b) => b.totalPendente - a.totalPendente)
      .slice(0, 10);
  } catch {
    return [];
  }
}

export async function getTopFornecedoresExecucaoMetrics(options: {
  portalSlug: string;
  year: number;
  empresaIds: string[];
  limit?: number;
}): Promise<FornecedorExecucaoItemDTO[]> {
  const { portalSlug, year, empresaIds, limit = 5 } = options;
  if (empresaIds.length === 0) return [];

  try {
    const results = await db
      .selectFrom("fct_despesas")
      .select((eb) => [
        "fornecedor_nome",
        "fornecedor_cpf_cnpj",
        eb.fn.sum<string>("pago").as("total_pago"),
        eb.fn.sum<string>("empenhado").as("total_empenhado"),
      ])
      .where("portal_slug", "=", portalSlug)
      .where("ano", "=", year)
      .where("fonte", "=", "exercicio")
      .where("empresa_id", "in", empresaIds)
      .groupBy(["fornecedor_nome", "fornecedor_cpf_cnpj"])
      .orderBy("total_pago", "desc")
      .limit(limit)
      .execute();

    const totalGeralPago = results.reduce(
      (acc, r) => acc + Number(r.total_pago ?? 0),
      0,
    );

    return results.map((r) => {
      const totalPago = Number(r.total_pago ?? 0);
      const totalEmpenhado = Number(r.total_empenhado ?? 0);
      const percentualPago =
        totalGeralPago > 0 ? (totalPago / totalGeralPago) * 100 : 0;

      return {
        fornecedorNome: String(r.fornecedor_nome ?? "Sem identificação").trim(),
        fornecedorCpfCnpj: r.fornecedor_cpf_cnpj
          ? String(r.fornecedor_cpf_cnpj)
          : null,
        totalPago,
        totalEmpenhado,
        percentualPago: Number(percentualPago.toFixed(1)),
      };
    });
  } catch {
    return [];
  }
}
