import { describe, expect, it } from "vitest";
import type { loadPessoalData } from "./loader";
import { buildPessoalViewModel } from "./view-model";

const LIMITES_LRF = { maximo: 54, prudencial: 51.3, alerta: 48.6 };

function rgfDe(
  statusLrf: string | null,
  percentualDespesaPessoal = 50,
  periodo = 3,
) {
  return {
    periodicidade: "quadrimestral",
    periodo,
    despesaPessoal12Meses: 1000,
    receitaCorrenteLiquidaAjustada: 2000,
    percentualDespesaPessoal,
    statusLrf,
  };
}

type RawData = Awaited<ReturnType<typeof loadPessoalData>>;

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    folhaData: [
      {
        totalFolha: 1000,
        totalPago: 900,
        receitaCorrenteLiquida: 2000,
        percentualFolha: 45,
      },
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
      despesaPessoalLrf: 0,
      receitaCorrenteLiquida: 0,
      percentualFolha: 0,
      rgf: null,
      rgfAnoAnteriorMesmoPeriodo: null,
      limitesLrf: null,
    });
  });

  it("repassa pctChefias e decimo13 sem transformação", () => {
    const vm = buildPessoalViewModel(
      makeRaw({ pctChefias: null, decimo13: null }),
    );
    expect(vm.pctChefias).toBeNull();
    expect(vm.decimo13).toBeNull();
  });

  it("configura folhaKpi para consolidado municipal (dentro do limite, alerta, prudencial e acima do teto)", () => {
    const vmNormal = buildPessoalViewModel(
      makeRaw({
        folhaData: [
          {
            totalFolha: 900,
            totalPago: 900,
            receitaCorrenteLiquida: 2000,
            percentualFolha: 45,
            rgf: rgfDe("normal"),
            limitesLrf: LIMITES_LRF,
          },
        ],
      }),
    );
    expect(vmNormal.folhaKpi.title).toBe("Gasto com Pessoal (LRF)");
    expect(vmNormal.folhaKpi.subtext).toBe("Dentro dos limites da lei.");
    expect(vmNormal.folhaKpi.alert).toBe(false);

    const vmAlerta = buildPessoalViewModel(
      makeRaw({
        folhaData: [
          {
            totalFolha: 1000,
            totalPago: 900,
            receitaCorrenteLiquida: 2000,
            percentualFolha: 50,
            rgf: rgfDe("alerta"),
            limitesLrf: LIMITES_LRF,
          },
        ],
      }),
    );
    expect(vmAlerta.folhaKpi.title).toBe("Gasto com Pessoal (LRF)");
    expect(vmAlerta.folhaKpi.subtext).toBe(
      "Acima do limite de alerta (48,6%).",
    );
    expect(vmAlerta.folhaKpi.alert).toBe(true);

    const vmPrudencial = buildPessoalViewModel(
      makeRaw({
        folhaData: [
          {
            totalFolha: 1050,
            totalPago: 900,
            receitaCorrenteLiquida: 2000,
            percentualFolha: 52.5,
            rgf: rgfDe("prudencial"),
            limitesLrf: LIMITES_LRF,
          },
        ],
      }),
    );
    expect(vmPrudencial.folhaKpi.title).toBe("Gasto com Pessoal (LRF)");
    expect(vmPrudencial.folhaKpi.subtext).toBe("Acima do limite prudencial.");
    expect(vmPrudencial.folhaKpi.alert).toBe(true);

    const vmEstouro = buildPessoalViewModel(
      makeRaw({
        folhaData: [
          {
            totalFolha: 1200,
            totalPago: 900,
            receitaCorrenteLiquida: 2000,
            percentualFolha: 60,
            rgf: rgfDe("excedido"),
            limitesLrf: LIMITES_LRF,
          },
        ],
      }),
    );
    expect(vmEstouro.folhaKpi.title).toBe("Gasto com Pessoal (LRF)");
    expect(vmEstouro.folhaKpi.subtext).toBe("Acima do teto da lei.");
    expect(vmEstouro.folhaKpi.alert).toBe(true);
  });

  it("descreve a página e o teto da lei em uma frase curta", () => {
    const vm = buildPessoalViewModel(
      makeRaw({
        folhaData: [
          {
            totalFolha: 1000,
            totalPago: 900,
            receitaCorrenteLiquida: 2000,
            percentualFolha: 45,
            limitesLrf: LIMITES_LRF,
          },
        ],
      }),
    );
    expect(vm.headerDescription).toBe(
      "Quanto a Prefeitura paga ao pessoal e quanto isso pesa na receita.",
    );
    expect(vm.limitesLrfDescricao).toBe("limita esse gasto a 54% da receita.");
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
            receitaCorrenteLiquida: 10000,
            percentualFolha: 2.4,
            rgf: rgfDe("normal"),
            limitesLrf: LIMITES_LRF,
          },
        ],
      }),
    );
    expect(vm.isEntidadeFiltrada).toBe(true);
    expect(vm.folhaKpi.title).toBe("Pessoal / Receita Municipal");
    expect(vm.folhaKpi.subtext).toBe(
      "impacto no teto da LRF do município (54%)",
    );
    expect(vm.folhaKpi.alert).toBe(false);
    expect(vm.headerDescription).toContain(
      "deste órgão pesa na receita do município",
    );
    expect(vm.limitesLrfDescricao).toBe(
      "limita o gasto total com pessoal a 54% da receita do município.",
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
            receitaCorrenteLiquida: 2000,
            percentualFolha: 55,
            rgf: rgfDe("excedido", 55),
            rgfAnoAnteriorMesmoPeriodo: rgfDe("alerta", 50),
          },
          {
            ano: 2023,
            totalFolha: 1000,
            totalPago: 900,
            receitaCorrenteLiquida: 2000,
            percentualFolha: 50,
          },
        ],
        pctChefias: 65,
        prevPctChefias: 60,
      }),
    );

    // folhaTrend: 55% - 50% = +5 p.p. (aumento de comprometimento => isPositive false)
    expect(vm.folhaTrend).toEqual({
      value: "+5 p.p. vs 3º quadrimestre de 2023",
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

  it("sem RGF publicado mostra estimativa rotulada, sem veredito, sem comparação e sem marcadores", () => {
    const vm = buildPessoalViewModel(
      makeRaw({
        context: {
          selectedYear: 2024,
          isCurrentYear: true,
          entidadesIds: undefined,
        },
        folhaData: [
          {
            ano: 2024,
            totalFolha: 1100,
            totalPago: 1000,
            receitaCorrenteLiquida: 2000,
            percentualFolha: 52,
            rgf: null,
            rgfAnoAnteriorMesmoPeriodo: null,
            limitesLrf: LIMITES_LRF,
          },
        ],
      }),
    );

    expect(vm.origemPercentual).toBe("estimativa");
    expect(vm.percentualExibido).toBe(52);
    expect(vm.folhaTrend).toBeUndefined();
    expect(vm.folhaKpi.title).toBe("Gasto com Pessoal (estimativa)");
    expect(vm.folhaKpi.alert).toBe(false);
    expect(vm.folhaKpi.subtext).toBe("");
    expect(vm.barraLimitesLrf).toBeNull();
    expect(vm.notaFonteLrf).toContain("Estimativa do portal");
  });

  it("com RGF usa o percentual oficial e o rótulo do período, com marcadores de teto e prudencial", () => {
    const vm = buildPessoalViewModel(
      makeRaw({
        folhaData: [
          {
            ano: 2024,
            totalFolha: 1000,
            totalPago: 900,
            receitaCorrenteLiquida: 2000,
            percentualFolha: 45,
            rgf: rgfDe("normal", 53.46),
            rgfAnoAnteriorMesmoPeriodo: null,
            limitesLrf: LIMITES_LRF,
          },
        ],
      }),
    );
    expect(vm.origemPercentual).toBe("rgf");
    expect(vm.percentualExibido).toBe(53.46);
    expect(vm.periodoRgfRotulo).toBe("3º quadrimestre de 2024");
    expect(vm.barraLimitesLrf?.exibirMarcadores).toBe(true);
    expect(vm.notaFonteLrf).toContain("3º quadrimestre de 2024");
    // Sem par no ano anterior, a comparação some
    expect(vm.folhaTrend).toBeUndefined();
  });

  it("com um órgão filtrado ignora o RGF (vale para a Prefeitura inteira)", () => {
    const vm = buildPessoalViewModel(
      makeRaw({
        context: {
          selectedYear: 2024,
          isCurrentYear: false,
          entidadesIds: ["3"],
        },
        folhaData: [
          {
            ano: 2024,
            totalFolha: 100,
            totalPago: 90,
            receitaCorrenteLiquida: 2000,
            percentualFolha: 5,
            rgf: rgfDe("normal", 53),
            limitesLrf: LIMITES_LRF,
          },
        ],
      }),
    );
    expect(vm.origemPercentual).toBe("estimativa");
    expect(vm.barraLimitesLrf).toBeNull();
  });

  it("retorna trends como undefined quando nao ha ano anterior para comparar", () => {
    const vm = buildPessoalViewModel(
      makeRaw({
        folhaData: [
          {
            ano: 2020,
            totalFolha: 1000,
            totalPago: 900,
            receitaCorrenteLiquida: 2000,
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
