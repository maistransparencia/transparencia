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
    expect(screen.getByText("Total Arrecadado Real")).toBeInTheDocument();
  });

  it("não exibe o alerta de dependência quando alertaDependencia é falso", async () => {
    loadReceitasDataMock.mockResolvedValue(
      makeRaw({ fonte: makeFonte({ alertaDependencia: false }) }),
    );

    const element = await ReceitasPage(props);
    render(element);

    expect(
      screen.queryByText(/Alta Dependência de Transferências Externas/),
    ).not.toBeInTheDocument();
  });

  it("exibe o alerta de vulnerabilidade fiscal quando alertaDependencia é verdadeiro", async () => {
    loadReceitasDataMock.mockResolvedValue(
      makeRaw({
        fonte: makeFonte({ alertaDependencia: true, pctPropria: 12 }),
      }),
    );

    const element = await ReceitasPage(props);
    render(element);

    expect(
      screen.getByText(/Alta Dependência de Transferências Externas/),
    ).toBeInTheDocument();
  });

  it("não quebra quando não há fonte de receita disponível (loader retorna undefined)", async () => {
    loadReceitasDataMock.mockResolvedValue(makeRaw({ fonte: undefined }));

    const element = await ReceitasPage(props);
    render(element);

    expect(screen.getByText("Fontes de Receita")).toBeInTheDocument();
  });

  it("renderiza a seção de disponibilidade financeira em caixa por entidade na página de receitas (excluindo CAPREM)", async () => {
    loadReceitasDataMock.mockResolvedValue(
      makeRaw({
        posicaoFinanceira: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2024,
          mesMaisRecente: 12,
          dataHomologacao: "2024-12-31",
          totalCaixaGeral: 11200000,
          totalRecursosLivres: 5000000,
          totalRecursosVinculados: 6200000,
          totalCaixaPrevidencia: 8000000,
          totalRecursosPrevidencia: 8000000,
          entidades: [
            {
              poderOrgao: "Executivo",
              entidadeNome: "Prefeitura Municipal",
              cnpj: "29.138.342/0001-30",
              empresaId: "1",
              grupoDestinacao: "livre",
              saldoCaixaBancos: 6200000,
              saldoRecursosLivres: 5000000,
              saldoRecursosVinculados: 1200000,
              mesReferencia: 12,
              dataReferencia: "2024-12-31",
            },
            {
              poderOrgao: "Executivo",
              entidadeNome: "Fundo Municipal de Saúde",
              cnpj: "11.222.333/0001-44",
              empresaId: "2",
              grupoDestinacao: "saude",
              saldoCaixaBancos: 5000000,
              saldoRecursosLivres: 0,
              saldoRecursosVinculados: 5000000,
              mesReferencia: 12,
              dataReferencia: "2024-12-31",
            },
          ],
          previdencia: [
            {
              poderOrgao: "10132",
              entidadeNome: "CAPREM",
              cnpj: "33.444.555/0001-66",
              empresaId: "4",
              grupoDestinacao: "previdencia",
              saldoCaixaBancos: 8000000,
              saldoRecursosLivres: 0,
              saldoRecursosVinculados: 8000000,
              mesReferencia: 12,
              dataReferencia: "2024-12-31",
            },
          ],
        },
      }),
    );

    const element = await ReceitasPage(props);
    render(element);

    expect(
      screen.getByRole("heading", {
        name: /disponibilidade financeira em caixa e bancos/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Prefeitura Municipal")).toBeInTheDocument();
    expect(screen.getByText("Fundo Municipal de Saúde")).toBeInTheDocument();
    // CAPREM deve estar restrito ao /caprem e não aparecer em Receitas
    expect(screen.queryByText("CAPREM")).not.toBeInTheDocument();
  });
});
