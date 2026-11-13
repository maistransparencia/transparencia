import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { loadReceitasData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadReceitasData>>;

const { loadReceitasDataMock } = vi.hoisted(() => ({
  loadReceitasDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadReceitasData: loadReceitasDataMock,
}));

const { default: ReceitasPage } = await import("./page");

function makeFonte(overrides: Record<string, unknown> = {}) {
  return {
    receitaPropriaPrevisto: 1000,
    receitaPropriaArrecadado: 900,
    transferenciasUniaoPrevisto: 500,
    transferenciasUniaoArrecadado: 400,
    transferenciasEstadoPrevisto: 300,
    transferenciasEstadoArrecadado: 200,
    receitaExtraOrcamentariaArrecadado: 50,
    totalPrevisto: 1800,
    totalArrecadado: 1550,
    pctPropria: 58,
    pctArrecadado: 0.86,
    alertaDependencia: false,
    totalPctChange: 5,
    emendasTotalArrecadado: 0,
    emendasPixArrecadado: 0,
    emendasIndividuaisArrecadado: 0,
    fpmArrecadado: 0,
    icmsArrecadado: 0,
    issIptuArrecadado: 0,
    ...overrides,
  };
}

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    portalSlug: "porciuncula_prefeitura",
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    fonte: makeFonte(),
    frescorFontes: [
      {
        fonte: "portal_municipal",
        descricaoDados: "sistema contábil da Prefeitura",
        frequenciaEsperada: "diaria",
        ultimaColetaEm: "2026-11-12T08:00:00.000Z",
        situacao: "coleta_em_dia",
      },
    ],
    ...overrides,
  } as unknown as RawData;
}

const props = {
  params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
  searchParams: Promise.resolve({}),
};

describe("ReceitasPage", () => {
  it("happy-path: renderiza cabeçalho e totais principais", async () => {
    loadReceitasDataMock.mockResolvedValue(makeRaw());

    const element = await ReceitasPage(props);
    render(element);

    expect(screen.getByText("Fontes de Receita")).toBeInTheDocument();
    expect(screen.getByText("Total arrecadado")).toBeInTheDocument();
  });

  it("mostra a barra com o previsto na régua e a comparação com o ano anterior", async () => {
    loadReceitasDataMock.mockResolvedValue(makeRaw());
    render(await ReceitasPage(props));

    const destaque = screen.getByTestId("receitas-destaque");
    expect(destaque).toHaveTextContent("Previsto para o ano:");
    expect(destaque).toHaveTextContent(
      "A Prefeitura arrecadou 5,0% a mais que em 2023, sem descontar a inflação.",
    );
    expect(
      screen.getByRole("meter", {
        name: "Quanto da previsão já foi arrecadado",
      }),
    ).toBeInTheDocument();
    expect(destaque.querySelector("dl")).toBeNull();
  });

  it("sem previsão informada mostra uma linha neutra no lugar da barra", async () => {
    loadReceitasDataMock.mockResolvedValue(
      makeRaw({ fonte: makeFonte({ totalPrevisto: 0 }) }),
    );
    render(await ReceitasPage(props));
    expect(screen.getByTestId("receitas-destaque")).toHaveTextContent(
      "Previsão do ano não informada.",
    );
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
  });

  it("quando arrecada mais que o previsto, diz que ficou acima da previsão", async () => {
    loadReceitasDataMock.mockResolvedValue(
      makeRaw({
        fonte: makeFonte({ totalArrecadado: 2000, pctArrecadado: 1.11 }),
      }),
    );
    render(await ReceitasPage(props));
    expect(screen.getByTestId("receitas-destaque")).toHaveTextContent(
      /arrecadados, acima dos .* previstos/,
    );
  });

  it("não exibe o card de anomalia de dependência quando não há alerta", async () => {
    loadReceitasDataMock.mockResolvedValue(makeRaw({ radarAlertas: [] }));

    const element = await ReceitasPage(props);
    render(element);

    expect(screen.queryByTestId("radar-anomalia-card")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Alta Dependência de Transferências Externas/),
    ).not.toBeInTheDocument();
  });

  it("exibe o RadarAnomaliaCard canônico quando há anomalia de dependência apurada", async () => {
    loadReceitasDataMock.mockResolvedValue(
      makeRaw({
        radarAlertas: [
          {
            anomaliaId: "anomalia-dep-1",
            portalSlug: "porciuncula_prefeitura",
            ano: 2024,
            tipoAnomalia: "dependencia_transferencias",
            dimensaoReferencia: "receita_propria",
            grauSeveridade: "critico",
            desvioPercentual: 5.0,
            valorObservado: 5.0,
            valorEsperado: 10.0,
            mesInicial: 1,
            mesFinal: 12,
            licitacaoNumero: null,
            metodoDeteccao: "art11_lrf_arrecadacao_propria",
          },
        ],
      }),
    );

    const element = await ReceitasPage(props);
    render(element);

    expect(screen.getByTestId("radar-anomalia-card")).toBeInTheDocument();
    expect(
      screen.getByText("Dependência de Transferências Externas"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Alta Dependência de Transferências Externas/),
    ).not.toBeInTheDocument();
  });

  it("não quebra quando não há fonte de receita disponível (loader retorna undefined)", async () => {
    loadReceitasDataMock.mockResolvedValue(makeRaw({ fonte: undefined }));

    const element = await ReceitasPage(props);
    render(element);

    expect(screen.getByText("Fontes de Receita")).toBeInTheDocument();
  });

  it("mostra o selo da fonte em cada seção, com o aviso só na primeira", async () => {
    loadReceitasDataMock.mockResolvedValue(
      makeRaw({
        frescorFontes: [
          {
            fonte: "portal_municipal",
            descricaoDados: "sistema contábil da Prefeitura",
            frequenciaEsperada: "diaria",
            ultimaColetaEm: "2026-10-01T08:00:00.000Z",
            situacao: "coleta_atrasada",
          },
        ],
      }),
    );
    render(await ReceitasPage(props));
    expect(screen.getAllByTestId("selo-fonte")).toHaveLength(2);
    expect(screen.getAllByText(/verificado em 01\/10\/2026/)).toHaveLength(2);
    expect(
      screen.getAllByText(/Não conseguimos verificar esta fonte desde/),
    ).toHaveLength(1);
  });
});
