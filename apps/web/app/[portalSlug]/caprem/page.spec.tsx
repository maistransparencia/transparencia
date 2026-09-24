import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { loadCapremData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadCapremData>>;

const { loadCapremDataMock } = vi.hoisted(() => ({
  loadCapremDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadCapremData: loadCapremDataMock,
}));

const { default: CapremPage } = await import("./page");

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
      totalEmpenhado: 1000,
      totalLiquidado: 900,
      totalPago: 800,
      taxaExecucao: 0.8,
      totalAporteAtuarial: 500,
      totalDividaResgatada: 100,
      totalCaspPlanoSaude: 0,
      actuarialRisk: {
        totalAporteExigido: 500,
        totalAporteQuitado: 400,
        romboAporteNaoRepassado: 100,
        taxaAdimplenciaAporte: 80,
        totalEmpenhadoPatronal: 300,
        totalPagoPatronal: 250,
        romboPatronalNaoRepassado: 50,
        deficitMedioMensal: 5,
        totalAmortizacaoDivida: 100,
        variacaoAmortizacaoPct: 0,
        servidoresEfetivos: 20,
        servidoresTemporariosComissionados: 2,
        razaoTemporariosEfetivosPct: 10,
      },
      ...capremOverride,
    },
    ...rest,
  } as unknown as RawData;
}

const props = {
  params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
  searchParams: Promise.resolve({}),
};

describe("CapremPage", () => {
  it("happy-path: renderiza KPIs principais mesmo sem entidades/natureza", async () => {
    loadCapremDataMock.mockResolvedValue(makeRaw());

    const element = await CapremPage(props);
    render(element);

    expect(screen.getByText("Total Empenhado")).toBeInTheDocument();
    expect(screen.getByText("Índice de Adimplência")).toBeInTheDocument();
  });

  it("esconde a seção de composição contábil quando natureza está vazia", async () => {
    loadCapremDataMock.mockResolvedValue(makeRaw({ caprem: { natureza: [] } }));

    const element = await CapremPage(props);
    render(element);

    expect(
      screen.queryByText("Composição Contábil dos Repasses"),
    ).not.toBeInTheDocument();
  });

  it("exibe a seção de composição contábil quando natureza tem dados", async () => {
    loadCapremDataMock.mockResolvedValue(
      makeRaw({
        caprem: {
          natureza: [
            {
              elemento: "97",
              descricao: "Aporte",
              destino: "aporte_atuarial_caprem",
              empenhado: 100,
              pago: 90,
            },
          ],
        },
      }),
    );

    const element = await CapremPage(props);
    render(element);

    expect(
      screen.getByText("Composição Contábil dos Repasses"),
    ).toBeInTheDocument();
  });

  it("renderiza a seção de disponibilidade financeira em caixa do RPPS (SICONFI)", async () => {
    loadCapremDataMock.mockResolvedValue(
      makeRaw({
        posicaoFinanceira: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2024,
          mesMaisRecente: 12,
          dataHomologacao: "2024-12-31",
          totalCaixaGeral: 15000000,
          totalRecursosLivres: 5000000,
          totalRecursosVinculados: 10000000,
          totalCaixaPrevidencia: 8500000,
          totalRecursosPrevidencia: 8500000,
          hasSaldoDescoberto: false,
          entidades: [],
          previdencia: [
            {
              poderOrgao: "10132",
              entidadeNome: "CAPREM",
              cnpj: "33.444.555/0001-66",
              empresaId: "4",
              grupoDestinacao: "previdencia",
              saldoCaixaBancos: 8500000,
              saldoRecursosLivres: 0,
              saldoRecursosVinculados: 8500000,
              saldoCaixaAnoAnterior: 7500000,
              variacaoAnualPercentual: 13.3,
              saldoDescobertoFlag: false,
              mesReferencia: 12,
              dataReferencia: "2024-12-31",
            },
          ],
        },
      }),
    );

    const element = await CapremPage(props);
    render(element);

    expect(
      screen.getByRole("heading", {
        name: /disponibilidade em caixa e aplicações do rpps/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/segregado do caixa geral do município/i),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 8.5mi")).toBeInTheDocument();
  });

  it("renderiza a seção de evolução do patrimônio histórico da previdência (Story 14.3)", async () => {
    loadCapremDataMock.mockResolvedValue(
      makeRaw({
        caprem: {
          actuarialTrend: [
            {
              ano: 2021,
              patrimonioFinanceiroTotal: 60368778.97,
              inconsistenciaDeclaracaoFlag: false,
              variacaoPatrimonioAbs: null,
              variacaoPatrimonioPct: null,
            },
            {
              ano: 2022,
              patrimonioFinanceiroTotal: 588266.38,
              inconsistenciaDeclaracaoFlag: true,
              variacaoPatrimonioAbs: -59780512.59,
              variacaoPatrimonioPct: -99.03,
            },
            {
              ano: 2023,
              patrimonioFinanceiroTotal: 36971987.89,
              inconsistenciaDeclaracaoFlag: false,
              variacaoPatrimonioAbs: null,
              variacaoPatrimonioPct: null,
            },
            {
              ano: 2026,
              patrimonioFinanceiroTotal: 33383702.66,
              inconsistenciaDeclaracaoFlag: false,
              variacaoPatrimonioAbs: -2594863.09,
              variacaoPatrimonioPct: -7.21,
            },
          ],
        },
      }),
    );

    const element = await CapremPage(props);
    const { container } = render(element);

    expect(container.querySelector("#patrimonio")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /evolução do patrimônio financeiro da previdência/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Pico Histórico").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("R$ 60.4mi")).toBeInTheDocument();
    expect(screen.getByText("Queima Média Anual")).toBeInTheDocument();
  });

  it("renderiza a seção de acordos CADPREV sem os cards de KPI redundantes", async () => {
    loadCapremDataMock.mockResolvedValue(
      makeRaw({
        caprem: {
          cadprevParcelamentos: [
            {
              numeroCadprev: "00999/2024",
              descricao: "Termo de Confissão Cadprev Teste",
              elemento: "71",
              empenhado: 50000,
              pago: 45000,
            },
          ],
        },
      }),
    );

    const element = await CapremPage(props);
    render(element);

    expect(
      screen.getByRole("heading", {
        name: /acordos de parcelamento e dívidas previdenciárias \(cadprev \/ ministério da previdência\)/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Termo de Confissão Cadprev Teste"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Aporte Déficit Atuarial \(2024\)/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Déficit de Repasse Mensal \(2024\)/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Amortização de Dívidas/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Base de Contribuintes/i),
    ).not.toBeInTheDocument();
  });
});
