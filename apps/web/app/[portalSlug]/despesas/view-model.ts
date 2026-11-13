import { getPartialYearPeriod } from "@transparencia/ui";
import type { loadDespesasData } from "./loader";

type DespesasRawData = Awaited<ReturnType<typeof loadDespesasData>>;

export type EtapaDespesa = "empenhado" | "liquidado" | "pago";

export const ETAPAS_DESPESA: readonly EtapaDespesa[] = [
  "empenhado",
  "liquidado",
  "pago",
];

export interface AreaDespesaLinha {
  codigo: string;
  nome: string;
  empenhado: number;
  liquidado: number;
  pago: number;
  valor: number;
  percentualEtapa: number;
  larguraBarra: number;
}

export interface FornecedorLinha {
  nome: string;
  documento: string | null;
  valorPago: number;
  percentualTotalPago: number;
  larguraBarra: number;
}

const dividir = (numerador: number, denominador: number) =>
  denominador > 0 ? (numerador / denominador) * 100 : 0;

const limitarLargura = (valor: number) => Math.min(100, Math.max(0, valor));

export interface RestosHistoricoLinha {
  ano: number;
  inscrito: number;
  pago: number;
  pendente: number;
}

export function buildRestosHistorico(
  restosPorAno: DespesasRawData["restosPorAno"],
): RestosHistoricoLinha[] {
  const porAno = (restosPorAno ?? []).reduce(
    (acc, restos) => ({
      ...acc,
      [restos.ano]: {
        ano: restos.ano,
        inscrito: (acc[restos.ano]?.inscrito ?? 0) + restos.empenhado,
        pago: (acc[restos.ano]?.pago ?? 0) + restos.pago,
        pendente: (acc[restos.ano]?.pendente ?? 0) + restos.pendente,
      },
    }),
    {} as Record<number, RestosHistoricoLinha>,
  );
  return Object.values(porAno).sort((a, b) => a.ano - b.ano);
}

export function buildAreasPorEtapa(
  areas: DespesasRawData["areasPorFuncao"],
): Record<EtapaDespesa, AreaDespesaLinha[]> {
  const base = (areas ?? []).map((area) => ({
    codigo: area.funcaoCodigo,
    nome: area.funcaoNome,
    empenhado: area.totalEmpenhado,
    liquidado: area.totalLiquidado,
    pago: area.totalPago,
  }));
  const porEtapa = (etapa: EtapaDespesa): AreaDespesaLinha[] => {
    const ordenadas = [...base].sort((a, b) => b[etapa] - a[etapa]);
    const somaEtapa = ordenadas.reduce((acc, area) => acc + area[etapa], 0);
    const maior = ordenadas[0]?.[etapa] ?? 0;
    return ordenadas.map((area) => ({
      ...area,
      valor: area[etapa],
      percentualEtapa: dividir(area[etapa], somaEtapa),
      larguraBarra: limitarLargura(dividir(area[etapa], maior)),
    }));
  };
  return {
    empenhado: porEtapa("empenhado"),
    liquidado: porEtapa("liquidado"),
    pago: porEtapa("pago"),
  };
}

export function buildFornecedoresLinhas(
  fornecedores: DespesasRawData["topFornecedores"],
  totalPago: number,
): FornecedorLinha[] {
  const lista = fornecedores ?? [];
  const maior = Math.max(0, ...lista.map((f) => f.totalPago));
  return lista.map((fornecedor) => ({
    nome: fornecedor.fornecedorNome,
    documento: fornecedor.fornecedorCpfCnpj,
    valorPago: fornecedor.totalPago,
    percentualTotalPago: dividir(fornecedor.totalPago, totalPago),
    larguraBarra: limitarLargura(dividir(fornecedor.totalPago, maior)),
  }));
}

export function buildDespesasViewModel(raw: DespesasRawData) {
  const selectedYear = raw.context.selectedYear;
  const previousYear = selectedYear - 1;

  const metricasGerais = raw.metricasGerais ?? {
    empenhado: 0,
    liquidado: 0,
    pago: 0,
    taxaLiquidacao: 0,
    taxaPagamento: 0,
  };

  return {
    selectedYear,
    isCurrentYear: raw.context.isCurrentYear,
    partialPeriod: getPartialYearPeriod(
      raw.portalConfig?.dataExtracaoDate ?? raw.portalConfig?.dataExtracao,
    ),
    metricasGerais,
    areasPorEtapa: buildAreasPorEtapa(raw.areasPorFuncao),
    fornecedoresLinhas: buildFornecedoresLinhas(
      raw.topFornecedores,
      metricasGerais.pago,
    ),
    radarGastosSensiveis: raw.radarGastosSensiveis ?? {
      itens: [],
      anoAtual: selectedYear,
      anoAnterior: previousYear,
    },
    restosResumo: raw.restosResumo ?? {
      totalPendente: 0,
      totalLiquidadoPendente: 0,
      fornecedoresAguardando: 0,
      dividaMaisAntigaAno: selectedYear,
      restosPagos: 0,
      topFornecedores: [],
    },
    restosHistorico: buildRestosHistorico(raw.restosPorAno),
    opacidadeContabil: raw.opacidadeContabil ?? null,
  };
}
