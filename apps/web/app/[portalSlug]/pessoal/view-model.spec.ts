import { describe, expect, it } from "vitest";
import type { loadPessoalData } from "./loader";
import { buildPessoalViewModel } from "./view-model";

type RawData = Awaited<ReturnType<typeof loadPessoalData>>;

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    folhaData: [
      { totalFolha: 1000, totalPago: 900, rclProxy: 2000, percentualFolha: 45 },
    ],
    pctChefias: 60,
    decimo13: { empenhado: 100, pago: 90, pctPago: 90 },
    distribuicaoProventos: [],
    regimeMetrics: [],
    ...overrides,
  } as unknown as RawData;
}

describe("buildPessoalViewModel", () => {
  it("usa a primeira linha de folhaData como currentYearRow", () => {
    const vm = buildPessoalViewModel(makeRaw());
    expect(vm.currentYearRow.percentualFolha).toBe(45);
  });

  it("usa valores zerados quando folhaData vem vazio", () => {
    const vm = buildPessoalViewModel(makeRaw({ folhaData: [] }));
    expect(vm.currentYearRow).toEqual({
      totalFolha: 0,
      totalPago: 0,
      rclProxy: 0,
      percentualFolha: 0,
    });
  });

  it("repassa pctChefias e decimo13 sem transformação", () => {
    const vm = buildPessoalViewModel(
      makeRaw({ pctChefias: null, decimo13: null }),
    );
    expect(vm.pctChefias).toBeNull();
    expect(vm.decimo13).toBeNull();
  });

  it("configura folhaKpi para consolidado municipal (abaixo e acima do teto)", () => {
    const vmOk = buildPessoalViewModel(
      makeRaw({
        folhaData: [
          {
            totalFolha: 1000,
            totalPago: 900,
            rclProxy: 2000,
            percentualFolha: 50,
          },
        ],
      }),
    );
    expect(vmOk.folhaKpi.title).toBe("Folha / Receita Arrecadada");
    expect(vmOk.folhaKpi.subtext).toBe("abaixo do teto de 54%");
    expect(vmOk.folhaKpi.alert).toBe(false);

    const vmEstouro = buildPessoalViewModel(
      makeRaw({
        folhaData: [
          {
            totalFolha: 1200,
            totalPago: 900,
            rclProxy: 2000,
            percentualFolha: 60,
          },
        ],
      }),
    );
    expect(vmEstouro.folhaKpi.title).toBe("Folha / Receita Arrecadada");
    expect(vmEstouro.folhaKpi.subtext).toBe("acima do teto de 54%");
    expect(vmEstouro.folhaKpi.alert).toBe(true);
  });

  it("configura folhaKpi e headerDescription contextuais quando há entidade filtrada", () => {
    const vm = buildPessoalViewModel(
      makeRaw({
        context: {
          selectedYear: 2026,
          isCurrentYear: false,
          entidadesIds: ["3"],
        },
        folhaData: [
          {
            totalFolha: 240,
            totalPago: 200,
            rclProxy: 10000,
            percentualFolha: 2.4,
          },
        ],
      }),
    );
    expect(vm.isEntidadeFiltrada).toBe(true);
    expect(vm.folhaKpi.title).toBe("Folha / Receita Municipal");
    expect(vm.folhaKpi.subtext).toBe(
      "impacto no teto da LRF do município (54%)",
    );
    expect(vm.folhaKpi.alert).toBe(false);
    expect(vm.headerDescription).toContain(
      "desta entidade na arrecadação do município",
    );
  });

  it("repassa regimeMetrics para o viewModel e calcula variacoes YoY quando ha dados anteriores", () => {
    const mockRegimes = [
      {
        categoriaRegime: "efetivo_concurso" as const,
        totalProfissionais: 60,
        totalProventos: 240000,
        proventoMedio: 4000,
        percentualProfissionais: 60,
        percentualFolha: 60,
      },
    ];
    const prevRegimes = [
      {
        categoriaRegime: "efetivo_concurso" as const,
        totalProfissionais: 50,
        totalProventos: 200000,
        proventoMedio: 4000,
        percentualProfissionais: 50,
        percentualFolha: 50,
      },
    ];
    const vm = buildPessoalViewModel(
      makeRaw({
        regimeMetrics: mockRegimes,
        prevRegimeMetrics: prevRegimes,
      }),
    );
    expect(vm.regimeMetrics[0].variacaoProfissionais).toBe(20); // (60 - 50) / 50 * 100
    expect(vm.regimeMetrics[0].variacaoFolha).toBe(20); // (240k - 200k) / 200k * 100
  });

  it("calcula folhaTrend, chefiasTrend e totalFolhaTrend corretamente com base no ano anterior", () => {
    const vm = buildPessoalViewModel(
      makeRaw({
        context: {
          selectedYear: 2024,
          isCurrentYear: false,
          entidadesIds: undefined,
        },
        folhaData: [
          {
            ano: 2024,
            totalFolha: 1100,
            totalPago: 1000,
            rclProxy: 2000,
            percentualFolha: 55,
          },
          {
            ano: 2023,
            totalFolha: 1000,
            totalPago: 900,
            rclProxy: 2000,
            percentualFolha: 50,
          },
        ],
        pctChefias: 65,
        prevPctChefias: 60,
      }),
    );

    // folhaTrend: 55% - 50% = +5 p.p. (aumento de comprometimento => isPositive false)
    expect(vm.folhaTrend).toEqual({
      value: "+5 p.p. vs 2023",
      isPositive: false,
    });

    // chefiasTrend: 65% - 60% = +5 p.p. (aumento de efetivos em chefia => isPositive true)
    expect(vm.chefiasTrend).toEqual({
      value: "+5 p.p. vs 2023",
      isPositive: true,
    });

    // totalFolhaTrend: (1100 - 1000) / 1000 * 100 = +10% (aumento de despesa => isPositive false)
    expect(vm.totalFolhaTrend).toEqual({
      value: "+10% vs 2023",
      isPositive: false,
    });
  });

  it("retorna trends como undefined quando nao ha ano anterior para comparar", () => {
    const vm = buildPessoalViewModel(
      makeRaw({
        folhaData: [
          {
            ano: 2020,
            totalFolha: 1000,
            totalPago: 900,
            rclProxy: 2000,
            percentualFolha: 50,
          },
        ],
        pctChefias: 60,
        prevPctChefias: null,
      }),
    );

    expect(vm.folhaTrend).toBeUndefined();
    expect(vm.chefiasTrend).toBeUndefined();
    expect(vm.totalFolhaTrend).toBeUndefined();
  });
});
