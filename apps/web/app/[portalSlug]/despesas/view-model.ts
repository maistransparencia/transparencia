import { getPartialYearPeriod } from "@transparencia/ui";
import type { loadDespesasData } from "./loader";

type DespesasRawData = Awaited<ReturnType<typeof loadDespesasData>>;

export function buildDespesasViewModel(raw: DespesasRawData) {
  const selectedYear = raw.context.selectedYear;
  const previousYear = selectedYear - 1;

  return {
    selectedYear,
    isCurrentYear: raw.context.isCurrentYear,
    partialPeriod: getPartialYearPeriod(),
    metricasGerais: raw.metricasGerais ?? {
      empenhado: 0,
      liquidado: 0,
      pago: 0,
      taxaLiquidacao: 0,
      taxaPagamento: 0,
    },
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
      topFornecedores: [],
    },
    opacidadeContabil: raw.opacidadeContabil ?? null,
  };
}
