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
    departmentalPayroll: [],
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
});
