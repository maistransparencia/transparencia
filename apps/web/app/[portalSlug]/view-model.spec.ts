import { describe, expect, it } from "vitest";
import type { loadVisaoGeralData } from "./loader";
import { buildVisaoGeralViewModel } from "./view-model";

type RawData = Awaited<ReturnType<typeof loadVisaoGeralData>>;

function makeRawVisaoGeral(overrides: Record<string, unknown> = {}): RawData {
  return {
    portalSlug: "porciuncula",
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    portalConfig: { displayName: "Porciúncula" },
    posicao: {
      totalArrecadado: 1000000,
      restosPendentesTotal: 250000,
      restosPagosNoAno: 15000,
      restosPendentesAnteriores: 50000,
      totalCredoresAdmAtual: 12,
      topCredoresAdmAtual: [],
      restosPendentes: [
        {
          ano: 2023,
          administracao: "Adm. Atual",
          empenhado: 100000,
          liquidado: 80000,
          pago: 50000,
          pendente: 50000,
        },
        {
          ano: 2024,
          administracao: "Adm. Atual",
          empenhado: 300000,
          liquidado: 150000,
          pago: 100000,
          pendente: 200000,
        },
      ],
    },
    execSummary: {
      totalDotacao: 2000000,
      totalEmpenhado: 1500000,
      totalLiquidado: 1200000,
      totalPago: 1000000,
    },
    gaps: [],
    fonte: {
      totalArrecadado: 1000000,
      transferenciasUniaoArrecadado: 500000,
      transferenciasEstadoArrecadado: 300000,
      receitaPropriaArrecadado: 200000,
    },
    folha: {
      percentualFolha: 45.5,
    },
    sanitizedCredores: [],
    ...overrides,
  } as unknown as RawData;
}

describe("buildVisaoGeralViewModel - despesasCardData", () => {
  it("monta despesasCardData com totais formatados de restos a pagar e liquidado secundário", () => {
    const raw = makeRawVisaoGeral();
    const vm = buildVisaoGeralViewModel(raw);

    expect(vm.despesasCardData.title).toBe("Despesas");
    expect(vm.despesasCardData.totalRestosPagarFormatted).toBeDefined();
    expect(vm.despesasCardData.secondaryTextFormatted).toBeDefined();
    expect(vm.despesasCardData.secondaryTextFormatted).toContain("liquidados");
    expect(vm.despesasCardData.subtext).toContain("12 fornecedores");
  });

  it("calcula percentuais bipartidos (percentageLiquidado e percentageEmpenhado) para antiguidadeBars", () => {
    const raw = makeRawVisaoGeral();
    const vm = buildVisaoGeralViewModel(raw);

    const bars = vm.despesasCardData.antiguidadeBars;
    expect(bars).toHaveLength(2);

    const bar2023 = bars.find((b) => b.year === "2023");
    expect(bar2023).toBeDefined();
    expect(bar2023?.percentageLiquidado).toBeGreaterThan(0);
    expect(bar2023?.percentageEmpenhado).toBeGreaterThanOrEqual(0);
    expect(
      (bar2023?.percentageLiquidado ?? 0) + (bar2023?.percentageEmpenhado ?? 0),
    ).toBe(bar2023?.percentage);
  });
});
