import { describe, expect, it } from "vitest";
import type { loadDespesasData } from "./loader";
import { buildDespesasViewModel } from "./view-model";

type RawData = Awaited<ReturnType<typeof loadDespesasData>>;

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    metricasGerais: {
      empenhado: 1000,
      liquidado: 800,
      pago: 700,
      taxaLiquidacao: 80,
      taxaPagamento: 70,
    },
    radarGastosSensiveis: {
      itens: [],
      anoAtual: 2024,
      anoAnterior: 2023,
    },
    restosResumo: {
      totalPendente: 200,
      totalLiquidadoPendente: 50,
      fornecedoresAguardando: 5,
      dividaMaisAntigaAno: 2021,
      topFornecedores: [],
    },
    ...overrides,
  } as unknown as RawData;
}

describe("buildDespesasViewModel", () => {
  it("repassa os dados brutos para o shape final sem perder informação", () => {
    const raw = makeRaw();
    const vm = buildDespesasViewModel(raw);
    expect(vm.selectedYear).toBe(raw.context.selectedYear);
    expect(vm.isCurrentYear).toBe(raw.context.isCurrentYear);
    expect(vm.metricasGerais).toEqual(raw.metricasGerais);
    expect(vm.radarGastosSensiveis).toEqual(raw.radarGastosSensiveis);
    expect(vm.restosResumo).toEqual(raw.restosResumo);
  });
});
