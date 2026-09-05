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
    lrfLimiteMaximo: 54,
    pctChefiasEfetivas: 80,
    contratosServicos: {
      totalContratosVigentes: 5,
      totalContratosComPendencia: 1,
      totalEmpenhado: 500000,
    },
    ...overrides,
  } as unknown as RawData;
}

describe("buildVisaoGeralViewModel - despesasCardData", () => {
  it("monta despesasCardData com totais formatados de restos a pagar e liquidado secundário", () => {
    const raw = makeRawVisaoGeral();
    const vm = buildVisaoGeralViewModel(raw);

    expect(vm.despesasCardData.title).toBe("Restos a pagar");
    expect(vm.despesasCardData.totalRestosPagarFormatted).toBeDefined();
    expect(vm.despesasCardData.totalEmpenhadoFormatted).toBeDefined();
    expect(vm.despesasCardData.totalLiquidadoFormatted).toBeDefined();
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
    expect(bar2023?.isCurrentYear).toBe(false);
    expect(bar2023?.percentageLiquidado).toBeGreaterThan(0);
    expect(bar2023?.percentageEmpenhado).toBeGreaterThanOrEqual(0);
    expect(
      (bar2023?.percentageLiquidado ?? 0) + (bar2023?.percentageEmpenhado ?? 0),
    ).toBe(bar2023?.percentage);

    const bar2024 = bars.find((b) => b.year === "2024");
    expect(bar2024?.isCurrentYear).toBe(true);
  });

  it("não expõe sanitizedCredores e credoresCols no ViewModel retornado", () => {
    const raw = makeRawVisaoGeral();
    const vm = buildVisaoGeralViewModel(raw) as unknown as Record<
      string,
      unknown
    >;

    expect(vm.sanitizedCredores).toBeUndefined();
    expect(vm.credoresCols).toBeUndefined();
  });
});

describe("buildVisaoGeralViewModel - pessoalCardData", () => {
  it("monta pessoalCardData com limite LRF dinâmico vindo da constante fiscal", () => {
    const raw = makeRawVisaoGeral({ lrfLimiteMaximo: 54 });
    const vm = buildVisaoGeralViewModel(raw);

    expect(vm.pessoalCardData.title).toBe("Pessoal");
    expect(vm.pessoalCardData.lrfLimitPercentValue).toBe(54);
    expect(vm.pessoalCardData.lrfLimitPercentFormatted).toBe("54% LRF");
    expect(vm.pessoalCardData.receitaFolhaPercentValue).toBe(45.5);
  });

  it("utiliza fallback para 54 quando lrfLimiteMaximo for nulo", () => {
    const raw = makeRawVisaoGeral({ lrfLimiteMaximo: null });
    const vm = buildVisaoGeralViewModel(raw);

    expect(vm.pessoalCardData.lrfLimitPercentValue).toBe(54);
    expect(vm.pessoalCardData.lrfLimitPercentFormatted).toBe("54% LRF");
  });

  it("adapta subtexto e legenda de LRF quando há entidade filtrada", () => {
    const raw = makeRawVisaoGeral({
      context: {
        selectedYear: 2026,
        isCurrentYear: false,
        entidadesIds: ["3"],
      },
      folha: {
        percentualFolha: 2.3,
      },
    });
    const vm = buildVisaoGeralViewModel(raw);

    expect(vm.pessoalCardData.subtext).toBe(
      "da receita municipal consumida por esta entidade",
    );
    expect(vm.pessoalCardData.lrfLimitPercentFormatted).toBe("54% LRF (total)");
  });
});
