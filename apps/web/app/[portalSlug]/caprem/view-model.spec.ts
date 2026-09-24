import { describe, expect, it } from "vitest";
import type { loadCapremData } from "./loader";
import { buildCapremViewModel } from "./view-model";

type RawData = Awaited<ReturnType<typeof loadCapremData>>;

function makeRaw(
  overrides: { caprem?: Record<string, unknown> } & Record<
    string,
    unknown
  > = {},
): RawData {
  const { caprem: capremOverride, ...rest } = overrides;
  return {
    context: { selectedYear: 2024, isCurrentYear: false },
    caprem: {
      entidades: [],
      natureza: [],
      cadprevParcelamentos: [],
      actuarialTrend: [],
      totalEmpenhado: 0,
      totalLiquidado: 0,
      totalPago: 0,
      taxaExecucao: 0,
      totalAporteAtuarial: 0,
      totalDividaResgatada: 0,
      totalCaspPlanoSaude: 0,
      actuarialRisk: {
        totalAporteExigido: 0,
        totalAporteQuitado: 0,
        romboAporteNaoRepassado: 0,
        taxaAdimplenciaAporte: 100,
        totalEmpenhadoPatronal: 0,
        totalPagoPatronal: 0,
        romboPatronalNaoRepassado: 0,
        deficitMedioMensal: 0,
        totalAmortizacaoDivida: 0,
        variacaoAmortizacaoPct: 0,
        servidoresEfetivos: 0,
        servidoresTemporariosComissionados: 0,
        razaoTemporariosEfetivosPct: 0,
      },
      ...capremOverride,
    },
    ...rest,
  } as unknown as RawData;
}

describe("buildCapremViewModel", () => {
  it("traduz destino conhecido para o rótulo amigável", () => {
    const vm = buildCapremViewModel(
      makeRaw({
        caprem: {
          natureza: [
            {
              elemento: "97",
              descricao: "Aporte",
              destino: "aporte_atuarial_caprem",
              empenhado: 100,
              pago: 100,
            },
          ],
        },
      }),
    );
    expect(vm.caprem.natureza[0].destino).toBe("Aporte Atuarial (CAPREM)");
  });

  it("mantém a chave original quando o destino é desconhecido", () => {
    const vm = buildCapremViewModel(
      makeRaw({
        caprem: {
          natureza: [
            {
              elemento: "1",
              descricao: "X",
              destino: "destino_nao_mapeado",
              empenhado: 10,
              pago: 10,
            },
          ],
        },
      }),
    );
    expect(vm.caprem.natureza[0].destino).toBe("destino_nao_mapeado");
  });

  it("agrega naturezaChartData por destino somando pago, ordenado desc", () => {
    const vm = buildCapremViewModel(
      makeRaw({
        caprem: {
          natureza: [
            {
              elemento: "97",
              descricao: "A",
              destino: "aporte_atuarial_caprem",
              empenhado: 10,
              pago: 100,
            },
            {
              elemento: "97",
              descricao: "B",
              destino: "aporte_atuarial_caprem",
              empenhado: 10,
              pago: 50,
            },
            {
              elemento: "71",
              descricao: "C",
              destino: "amortizacao_divida_caprem",
              empenhado: 10,
              pago: 200,
            },
          ],
        },
      }),
    );

    expect(vm.naturezaChartData).toEqual([
      {
        label: "Amortização Dívida (CAPREM)",
        value: 200,
        barColor: expect.any(String),
      },
      {
        label: "Aporte Atuarial (CAPREM)",
        value: 150,
        barColor: expect.any(String),
      },
    ]);
  });

  it("calcula patrimonioHistoricoResumo com pico histórico, quebra de série e queima média anual", () => {
    const raw = makeRaw({
      context: { selectedYear: 2026, isCurrentYear: true },
      caprem: {
        actuarialTrend: [
          {
            ano: 2021,
            patrimonioFinanceiroTotal: 60368778.97,
            inconsistenciaDeclaracaoFlag: false,
            variacaoPatrimonioAbs: null,
            variacaoPatrimonioPct: null,
            aporteExigido: 0,
            aporteQuitado: 0,
            taxaAdimplencia: 100,
            amortizacaoDivida: 0,
          },
          {
            ano: 2022,
            patrimonioFinanceiroTotal: 588266.38,
            inconsistenciaDeclaracaoFlag: true,
            variacaoPatrimonioAbs: -59780512.59,
            variacaoPatrimonioPct: -99.03,
            aporteExigido: 0,
            aporteQuitado: 0,
            taxaAdimplencia: 100,
            amortizacaoDivida: 0,
          },
          {
            ano: 2023,
            patrimonioFinanceiroTotal: 36971987.89,
            inconsistenciaDeclaracaoFlag: false,
            variacaoPatrimonioAbs: 36383721.51,
            variacaoPatrimonioPct: 6185.25, // Deve ser anulado por quebra de série
            aporteExigido: 500000,
            aporteQuitado: 500000,
            taxaAdimplencia: 100,
            amortizacaoDivida: 50000,
          },
          {
            ano: 2024,
            patrimonioFinanceiroTotal: 39084273.78,
            inconsistenciaDeclaracaoFlag: false,
            variacaoPatrimonioAbs: 2112285.89,
            variacaoPatrimonioPct: 5.71,
            aporteExigido: 600000,
            aporteQuitado: 600000,
            taxaAdimplencia: 100,
            amortizacaoDivida: 60000,
          },
          {
            ano: 2025,
            patrimonioFinanceiroTotal: 35978565.75,
            inconsistenciaDeclaracaoFlag: false,
            variacaoPatrimonioAbs: -3105708.03,
            variacaoPatrimonioPct: -7.95,
            aporteExigido: 700000,
            aporteQuitado: 700000,
            taxaAdimplencia: 100,
            amortizacaoDivida: 70000,
          },
          {
            ano: 2026,
            patrimonioFinanceiroTotal: 33383702.66,
            inconsistenciaDeclaracaoFlag: false,
            variacaoPatrimonioAbs: -2594863.09,
            variacaoPatrimonioPct: -7.21,
            aporteExigido: 800000,
            aporteQuitado: 400000,
            taxaAdimplencia: 50,
            amortizacaoDivida: 80000,
          },
        ],
        actuarialRisk: {
          totalAporteExigido: 800000,
          totalAporteQuitado: 400000,
          romboAporteNaoRepassado: 400000,
          taxaAdimplenciaAporte: 50,
          totalEmpenhadoPatronal: 600000,
          totalPagoPatronal: 450000,
          romboPatronalNaoRepassado: 150000,
          deficitMedioMensal: 12500,
          totalAmortizacaoDivida: 80000,
          variacaoAmortizacaoPct: 14.28,
          servidoresEfetivos: 100,
          servidoresTemporariosComissionados: 50,
          razaoTemporariosEfetivosPct: 50,
        },
      },
    });

    const vm = buildCapremViewModel(raw);
    const resumo = vm.patrimonioHistoricoResumo;

    expect(resumo.patrimonioPico).toBe(60368778.97);
    expect(resumo.anoPico).toBe(2021);
    expect(resumo.patrimonioAtual).toBe(33383702.66);
    expect(resumo.anoAtual).toBe(2026);

    // Variação percentual acumulada sobre o pico: -44.70%
    expect(resumo.variacaoPicoPct).toBeCloseTo(-44.7, 1);

    // Queima média anual: (60.368.778,97 - 33.383.702,66) / 5 = ~5.397.015,26/ano (~5.4M)
    expect(resumo.queimaMediaAnual).toBeCloseTo(5397015.26, 0);

    // Quebra de série no exercício subsequente (2023) à inconsistência (2022)
    const ponto2022 = resumo.serie.find((p) => p.ano === 2022);
    expect(ponto2022?.inconsistenciaDeclaracaoFlag).toBe(true);

    const ponto2023 = resumo.serie.find((p) => p.ano === 2023);
    expect(ponto2023?.quebraSerieFlag).toBe(true);
    expect(ponto2023?.variacaoPatrimonioPct).toBeNull();

    // Diagnóstico
    expect(resumo.diagnostico.hasDeficitAporte).toBe(true);
    expect(resumo.diagnostico.romboAporteNaoRepassado).toBe(400000);
    expect(resumo.diagnostico.hasRetencaoPatronal).toBe(true);
    expect(resumo.diagnostico.totalEmpenhadoPatronal).toBe(600000);
    expect(resumo.diagnostico.totalLiquidadoPatronal).toBe(600000);
    expect(resumo.diagnostico.romboPatronalNaoRepassado).toBe(150000);
    expect(resumo.diagnostico.razaoTemporariosEfetivosPct).toBe(50);
  });

  it("trata graciosa e defensivamente actuarialTrend vazia", () => {
    const raw = makeRaw({
      caprem: {
        actuarialTrend: [],
      },
    });

    const vm = buildCapremViewModel(raw);
    const resumo = vm.patrimonioHistoricoResumo;

    expect(resumo.patrimonioPico).toBe(0);
    expect(resumo.anoPico).toBe(0);
    expect(resumo.patrimonioAtual).toBe(0);
    expect(resumo.variacaoPicoPct).toBeNull();
    expect(resumo.queimaMediaAnual).toBe(0);
    expect(resumo.serie).toHaveLength(0);
  });

  it("ignora anos com inconsistência na declaração ao determinar o patrimônio atual válido", () => {
    const raw = makeRaw({
      caprem: {
        actuarialTrend: [
          {
            ano: 2021,
            patrimonioFinanceiroTotal: 50000000,
            inconsistenciaDeclaracaoFlag: false,
            variacaoPatrimonioAbs: null,
            variacaoPatrimonioPct: null,
            aporteExigido: 500000,
            aporteQuitado: 500000,
            taxaAdimplencia: 100,
            amortizacaoDivida: 0,
          },
          {
            ano: 2022,
            patrimonioFinanceiroTotal: 500000, // Dado com omissão na MSC
            inconsistenciaDeclaracaoFlag: true,
            variacaoPatrimonioAbs: -49500000,
            variacaoPatrimonioPct: -99,
            aporteExigido: 500000,
            aporteQuitado: 500000,
            taxaAdimplencia: 100,
            amortizacaoDivida: 0,
          },
        ],
      },
    });

    const vm = buildCapremViewModel(raw);
    const resumo = vm.patrimonioHistoricoResumo;

    // Seleciona o último exercício VÁLIDO (2021) em vez do exercício com declaração inconsistente (2022)
    expect(resumo.patrimonioAtual).toBe(50000000);
    expect(resumo.anoAtual).toBe(2021);
    expect(resumo.queimaMediaAnual).toBe(0);
  });
});
