import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { loadOrcamentoData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadOrcamentoData>>;

const { loadOrcamentoDataMock } = vi.hoisted(() => ({
  loadOrcamentoDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadOrcamentoData: loadOrcamentoDataMock,
}));

const { default: OrcamentoPage } = await import("./page");

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    portalSlug: "porciuncula_prefeitura",
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    items: [],
    funcionalData: [],
    summary: {
      totalDotacao: 1000,
      totalEmpenhado: 800,
      totalLiquidado: 700,
      totalPago: 600,
      taxaExecucao: 80,
    },
    ...overrides,
  } as unknown as RawData;
}

const props = {
  params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
  searchParams: Promise.resolve({}),
};

describe("OrcamentoPage", () => {
  it("happy-path: renderiza cabeçalho e KPIs de execução", async () => {
    loadOrcamentoDataMock.mockResolvedValue(makeRaw());

    const element = await OrcamentoPage(props);
    render(element);

    expect(screen.getByText("Execução Orçamentária")).toBeInTheDocument();
    expect(screen.getByText("Dotação Atualizada")).toBeInTheDocument();
  });

  it("esconde a seção 'por função' quando não há dados funcionais", async () => {
    loadOrcamentoDataMock.mockResolvedValue(makeRaw({ funcionalData: [] }));

    const element = await OrcamentoPage(props);
    render(element);

    expect(
      screen.queryByText("Para onde vai o gasto, por função"),
    ).not.toBeInTheDocument();
  });

  it("exibe a seção 'por função' quando há dados funcionais", async () => {
    loadOrcamentoDataMock.mockResolvedValue(
      makeRaw({
        funcionalData: [{ funcaoNome: "Saúde", empenhado: 100, pago: 90 }],
      }),
    );

    const element = await OrcamentoPage(props);
    render(element);

    expect(
      screen.getByText("Para onde vai o gasto, por função"),
    ).toBeInTheDocument();
  });

  it("renderiza a seção de disponibilidade financeira em caixa por entidade na página de orçamento", async () => {
    loadOrcamentoDataMock.mockResolvedValue(
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

    const element = await OrcamentoPage(props);
    render(element);

    expect(
      screen.getByRole("heading", {
        name: /disponibilidade financeira em caixa e bancos/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Prefeitura Municipal")).toBeInTheDocument();
    expect(screen.getByText("Fundo Municipal de Saúde")).toBeInTheDocument();
    expect(screen.queryByText("CAPREM")).not.toBeInTheDocument();
  });

  it("renderiza o aviso pedagógico de visão consolidada quando filtro de entidades está ativo", async () => {
    loadOrcamentoDataMock.mockResolvedValue(
      makeRaw({
        context: {
          selectedYear: 2024,
          isCurrentYear: false,
          entidadesIds: ["1"],
        },
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
          ],
          previdencia: [],
        },
      }),
    );

    const element = await OrcamentoPage(props);
    render(element);

    expect(
      screen.getByText(
        /Disponibilidade contábil exibida na visão consolidada municipal/i,
      ),
    ).toBeInTheDocument();
  });

  it("renderiza a seção de evolução mensal e queima de caixa quando evolucaoMensal for fornecido", async () => {
    loadOrcamentoDataMock.mockResolvedValue(
      makeRaw({
        posicaoFinanceira: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2024,
          mesMaisRecente: 12,
          dataHomologacao: "2024-12-31",
          totalCaixaGeral: 5000000,
          totalRecursosLivres: 3000000,
          totalRecursosVinculados: 2000000,
          totalCaixaPrevidencia: 0,
          totalRecursosPrevidencia: 0,
          entidades: [
            {
              poderOrgao: "Executivo",
              entidadeNome: "Prefeitura Municipal",
              cnpj: "29.138.342/0001-30",
              empresaId: "1",
              grupoDestinacao: "livre",
              saldoCaixaBancos: 5000000,
              saldoRecursosLivres: 3000000,
              saldoRecursosVinculados: 2000000,
              mesReferencia: 12,
              dataReferencia: "2024-12-31",
            },
          ],
          previdencia: [],
        },
        evolucaoMensal: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2024,
          pontos: [
            {
              mesReferencia: 1,
              mesNome: "Janeiro",
              mesAbreviado: "Jan",
              saldoCaixaBancos: 10000000,
              saldoRecursosLivres: 8000000,
              saldoRecursosVinculados: 2000000,
            },
            {
              mesReferencia: 12,
              mesNome: "Dezembro",
              mesAbreviado: "Dez",
              saldoCaixaBancos: 5000000,
              saldoRecursosLivres: 3000000,
              saldoRecursosVinculados: 2000000,
            },
          ],
          mediaRecursosLivres: 5500000,
          minRecursosLivres: 3000000,
          mesMinRecursosLivres: 12,
          maxRecursosLivres: 8000000,
          mesMaxRecursosLivres: 1,
          variacaoIntraAnualLivresPct: -62.5,
          queimaPicoRecursosLivres: 5000000,
        },
      }),
    );

    const element = await OrcamentoPage(props);
    render(element);

    expect(
      screen.getByText("Evolução Mensal e Queima de Caixa no Exercício"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Média Mensal (Recursos Livres)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Piso Operacional no Ano")).toBeInTheDocument();
    expect(screen.getByText("Queima Intra-anual de Caixa")).toBeInTheDocument();
  });
});
