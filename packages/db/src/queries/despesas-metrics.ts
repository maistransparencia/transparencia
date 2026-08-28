import { db } from "../client";

export interface ResumoDiariasMetricsDTO {
  totalValor: number;
  totalViajantes: number;
  mediaReembolso: number;
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

export const CATEGORIAS_GASTOS_SENSIVEIS = [
  "combustivel_frota",
  "locacao_maquinas_veiculos",
  "locacao_imoveis",
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
    const [result, vendorRows] = await Promise.all([
      db
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
        .executeTakeFirst(),
      db
        .selectFrom("fct_despesas")
        .select((eb) => [
          "fornecedor_nome",
          "descricao",
          eb.fn.sum<string>("empenhado").as("empenhado"),
          eb.fn.sum<string>("liquidado").as("liquidado"),
          eb.fn.sum<string>("pago").as("pago"),
        ])
        .where("portal_slug", "=", portalSlug)
        .where("fonte", "=", "restos_a_pagar")
        .where("ano", "=", year)
        .where("empresa_id", "in", empresaIds)
        .groupBy(["fornecedor_nome", "descricao"])
        .execute(),
    ]);

    const initialDividaMaisAntigaAno = Number(
      result?.divida_mais_antiga_ano ?? year,
    );

    const fornecedoresComSaldo = vendorRows
      .map((r) => {
        const emp = Number(r.empenhado ?? 0);
        const liq = Number(r.liquidado ?? 0);
        const pag = Number(r.pago ?? 0);
        const pend = Math.max(0, emp - pag);
        const liqPend = Math.max(0, liq - pag);
        const empALiq = Math.max(0, pend - liqPend);
        const fornecedor = String(
          r.fornecedor_nome || r.descricao || "Não identificado",
        ).trim();

        return {
          fornecedor,
          valorTotal: pend,
          liquidado: liqPend,
          empenhadoALiquidar: empALiq,
          valor: pend,
        };
      })
      .filter((v) => v.valorTotal > 0);

    const { totalPendente, totalLiquidadoPendente, fornecedoresSet } =
      fornecedoresComSaldo.reduce(
        (acc, v) => {
          acc.totalPendente += v.valorTotal;
          acc.totalLiquidadoPendente += v.liquidado;
          acc.fornecedoresSet.add(v.fornecedor);
          return acc;
        },
        {
          totalPendente: 0,
          totalLiquidadoPendente: 0,
          fornecedoresSet: new Set<string>(),
        },
      );

    const restosInscritos = Number(result?.restos_inscritos ?? 0);
    const restosLiquidados = Number(result?.restos_liquidados ?? 0);
    const restosPagos = Number(result?.restos_pagos ?? 0);
    const restosCancelados = Number(result?.restos_cancelados ?? 0);
    const saldoRestos = Number(result?.saldo_restos ?? 0);

    const topFornecedores: RestosAPagarVendorItemDTO[] = [
      ...fornecedoresComSaldo,
    ]
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
      dividaMaisAntigaAno: initialDividaMaisAntigaAno,
      topFornecedores,
    };
  } catch {
    return emptyResult;
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
