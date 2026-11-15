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
    execucaoAnoAnterior: {
      anoAnterior: 2023,
      percentualPago: null,
    },
    restosPagosNoAno: 0,
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
    expect(screen.getByText("Reservado (empenhado)")).toBeInTheDocument();
  });

  it("destaca o percentual do orçamento já pago", async () => {
    loadOrcamentoDataMock.mockResolvedValue(makeRaw());

    const element = await OrcamentoPage(props);
    render(element);

    expect(screen.getByTestId("orcamento-destaque")).toHaveTextContent("60%");
    expect(
      screen.queryByTestId("orcamento-ano-anterior"),
    ).not.toBeInTheDocument();
  });

  it("mostra traço e explicação quando não há orçamento autorizado", async () => {
    loadOrcamentoDataMock.mockResolvedValue(
      makeRaw({
        summary: {
          totalDotacao: 0,
          totalEmpenhado: 0,
          totalLiquidado: 0,
          totalPago: 0,
          taxaExecucao: 0,
        },
      }),
    );

    const element = await OrcamentoPage(props);
    render(element);

    const destaque = screen.getByTestId("orcamento-destaque");
    expect(destaque).toHaveTextContent("—");
    expect(destaque).toHaveTextContent(
      "Ainda não há orçamento autorizado registrado para 2024.",
    );
    expect(destaque).not.toHaveTextContent("0%");
  });

  it("compara com o ano anterior inteiro quando há dado", async () => {
    loadOrcamentoDataMock.mockResolvedValue(
      makeRaw({
        execucaoAnoAnterior: { anoAnterior: 2023, percentualPago: 85 },
      }),
    );

    const element = await OrcamentoPage(props);
    render(element);

    expect(screen.getByTestId("orcamento-ano-anterior")).toHaveTextContent(
      "Para comparar: em 2023, o ano inteiro terminou com 85% do orçamento pago.",
    );
  });

  it("mostra o pago de anos anteriores à parte quando há restos a pagar pagos", async () => {
    loadOrcamentoDataMock.mockResolvedValue(
      makeRaw({ restosPagosNoAno: 15_440_000 }),
    );

    const element = await OrcamentoPage(props);
    render(element);

    expect(screen.getByTestId("orcamento-restos-pagos")).toHaveTextContent(
      "contas de anos anteriores (restos a pagar)",
    );
  });

  it("não mostra o aviso de restos a pagar quando não houve pagamento", async () => {
    loadOrcamentoDataMock.mockResolvedValue(makeRaw());

    const element = await OrcamentoPage(props);
    render(element);

    expect(screen.queryByTestId("orcamento-restos-pagos")).toBeNull();
  });

  it("esconde a seção 'por função' quando não há dados funcionais", async () => {
    loadOrcamentoDataMock.mockResolvedValue(makeRaw({ funcionalData: [] }));

    const element = await OrcamentoPage(props);
    render(element);

    expect(
      screen.queryByText("Quanto foi pago em cada área"),
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
      screen.getByText("Quanto foi pago em cada área"),
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
        name: /dinheiro em caixa e nos bancos/i,
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
      screen.getByText(/Este saldo é do município todo/i),
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
      screen.getByText("Como o caixa mudou mês a mês"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Média mensal dos recursos livres"),
    ).toBeInTheDocument();
    expect(screen.getByText("Menor saldo do ano")).toBeInTheDocument();
    expect(screen.getByText("Queda desde o maior saldo")).toBeInTheDocument();
  });
});
