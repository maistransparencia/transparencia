import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { loadDespesasData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadDespesasData>>;

const { loadDespesasDataMock } = vi.hoisted(() => ({
  loadDespesasDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadDespesasData: loadDespesasDataMock,
}));

const { default: DespesasPage } = await import("./page");

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    portalSlug: "portal_x",
    frescorFontes: [
      {
        fonte: "portal_municipal",
        descricaoDados: "sistema contábil da Prefeitura",
        frequenciaEsperada: "diaria",
        ultimaColetaEm: "2026-11-12T08:00:00.000Z",
        situacao: "coleta_em_dia",
      },
    ],
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    metricasGerais: {
      empenhado: 1_000_000,
      liquidado: 800_000,
      pago: 700_000,
      taxaLiquidacao: 80,
      taxaPagamento: 70,
    },
    radarGastosSensiveis: {
      itens: [
        {
          categoria: "combustivel_frota",
          valorPagoAnoAtual: 150_000,
          valorPagoAnoAnterior: 100_000,
          valorLiquidadoAnoAtual: 150_000,
          valorEmpenhadoAnoAtual: 200_000,
          valorLiquidadoPendente: 0,
          variacaoPercentual: 50,
          tendencia: "aumento",
        },
      ],
      anoAtual: 2024,
      anoAnterior: 2023,
    },
    restosResumo: {
      totalPendente: 200_000,
      totalLiquidadoPendente: 50_000,
      fornecedoresAguardando: 5,
      dividaMaisAntigaAno: 2021,
      restosPagos: 80_000,
      topFornecedores: [],
    },
    restosHistorico: [
      { ano: 2021, restosInscritos: 500, restosPagos: 450, saldoRestos: 50 },
      { ano: 2022, restosInscritos: 300, restosPagos: 100, saldoRestos: 200 },
    ],
    ...overrides,
  } as unknown as RawData;
}

const props = {
  params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
  searchParams: Promise.resolve({}),
};

describe("DespesasPage", () => {
  it("happy-path: renderiza KPIs principais com dados completos", async () => {
    loadDespesasDataMock.mockResolvedValue(makeRaw());

    const element = await DespesasPage(props);
    render(element);

    expect(
      screen.getByText("Despesas & Controle de Gastos"),
    ).toBeInTheDocument();
    expect(screen.getByText("Reservado (empenhado)")).toBeInTheDocument();
    expect(
      screen.getByText("Gastos que merecem acompanhamento"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Combustíveis & Frotas").length).toBeGreaterThan(
      0,
    );
  });

  it("ano corrente: cabeçalho indica exercício parcial", async () => {
    loadDespesasDataMock.mockResolvedValue(
      makeRaw({
        context: {
          selectedYear: 2026,
          isCurrentYear: true,
          entidadesIds: undefined,
        },
        portalConfig: { dataExtracaoDate: "2026-09-30" },
      }),
    );

    render(await DespesasPage(props));

    expect(screen.getByText(/Exercício 2026/)).toBeInTheDocument();
    expect(screen.getByText(/parcial/)).toBeInTheDocument();
  });

  it("esconde seções condicionais quando as listas vêm vazias", async () => {
    loadDespesasDataMock.mockResolvedValue(makeRaw());

    const element = await DespesasPage(props);
    render(element);

    // topFornecedores de restos vazio -> não renderiza nome
    expect(screen.queryByText("Fornecedor X")).not.toBeInTheDocument();
  });

  it("mostra o quanto já foi pago de dívidas antigas e o histórico a partir do ano mais antigo", async () => {
    loadDespesasDataMock.mockResolvedValue(makeRaw());

    const element = await DespesasPage(props);
    render(element);

    expect(screen.getByText("Já pago em 2024")).toBeInTheDocument();
    const historico = screen.getByTestId("restos-historico");
    expect(historico).toHaveTextContent("2021–2022");
    const anos = within(historico)
      .getAllByRole("row")
      .slice(1)
      .map((linha) => linha.textContent?.slice(0, 4));
    expect(anos).toEqual(["2021", "2022"]);
  });

  it("oferece o download dos restos a pagar do ano selecionado em CSV", async () => {
    loadDespesasDataMock.mockResolvedValue(makeRaw());

    const element = await DespesasPage(props);
    render(element);

    expect(
      screen.getByText("Baixar os restos a pagar de 2024 (planilha CSV)"),
    ).toBeInTheDocument();
  });

  it("não mostra o histórico quando não há dívidas de anos anteriores", async () => {
    loadDespesasDataMock.mockResolvedValue(makeRaw({ restosHistorico: [] }));

    const element = await DespesasPage(props);
    render(element);

    expect(screen.queryByTestId("restos-historico")).toBeNull();
  });

  it("exibe seções condicionais quando os dados vêm populados", async () => {
    loadDespesasDataMock.mockResolvedValue(
      makeRaw({
        restosResumo: {
          totalPendente: 200_000,
          totalLiquidadoPendente: 50_000,
          fornecedoresAguardando: 5,
          dividaMaisAntigaAno: 2021,
          topFornecedores: [
            {
              fornecedor: "Fornecedor X",
              valor: 1000,
              valorTotal: 1000,
              liquidado: 600,
              empenhadoALiquidar: 400,
            },
          ],
        },
      }),
    );

    const element = await DespesasPage(props);
    render(element);

    expect(screen.getByText("Fornecedor X")).toBeInTheDocument();
  });

  it("ordena as seções: resumo, áreas, fornecedores, acompanhamento, dívidas", async () => {
    loadDespesasDataMock.mockResolvedValue(
      makeRaw({
        areasPorFuncao: [
          {
            funcaoCodigo: "10",
            funcaoNome: "Saúde",
            totalEmpenhado: 100,
            totalLiquidado: 90,
            totalPago: 80,
          },
        ],
        topFornecedores: [
          {
            fornecedorNome: "Empresa A",
            fornecedorCpfCnpj: "00.000.000/0001-00",
            totalPago: 70,
            totalEmpenhado: 80,
            percentualPago: 100,
          },
        ],
      }),
    );
    const { container } = render(await DespesasPage(props));
    const titulos = Array.from(container.querySelectorAll("h2")).map(
      (h) => h.textContent,
    );
    expect(titulos).toEqual([
      "Para quais áreas o dinheiro foi",
      "Quem mais recebeu",
      "Gastos que merecem acompanhamento",
      "Dívidas de anos anteriores",
    ]);
    expect(
      screen.getByText(
        "Como ler estes números: reservado, entregue e pago não se somam",
      ),
    ).toBeInTheDocument();
    const destaque = screen.getByTestId("despesas-resumo-destaque");
    expect(destaque).toHaveTextContent("Dinheiro que saiu (pago) em");
    expect(destaque).toHaveTextContent("70,00%");
    expect(screen.getByText("Empresa A")).toBeInTheDocument();
  });

  it("omite a frase do percentual quando nada foi reservado", async () => {
    loadDespesasDataMock.mockResolvedValue(
      makeRaw({
        metricasGerais: {
          empenhado: 0,
          liquidado: 0,
          pago: 0,
          taxaLiquidacao: 0,
          taxaPagamento: 0,
        },
      }),
    );
    render(await DespesasPage(props));
    expect(
      screen.getByTestId("despesas-resumo-destaque"),
    ).not.toHaveTextContent("do que estava reservado");
  });

  it("omite áreas e fornecedores quando as listas vêm vazias", async () => {
    loadDespesasDataMock.mockResolvedValue(
      makeRaw({ areasPorFuncao: [], topFornecedores: [] }),
    );
    render(await DespesasPage(props));
    expect(
      screen.queryByText("Para quais áreas o dinheiro foi"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Quem mais recebeu")).not.toBeInTheDocument();
  });

  it("mostra o selo da fonte nas seções e some quando a fonte não vem no DTO", async () => {
    loadDespesasDataMock.mockResolvedValue(makeRaw());
    const { unmount } = render(await DespesasPage(props));
    expect(screen.getAllByTestId("selo-fonte").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(
      screen.getAllByRole("link", { name: "Como atualizamos" })[0],
    ).toHaveAttribute("href", "/portal_x/como-atualizamos");
    unmount();

    loadDespesasDataMock.mockResolvedValue(makeRaw({ frescorFontes: [] }));
    render(await DespesasPage(props));
    expect(screen.queryByTestId("selo-fonte")).not.toBeInTheDocument();
  });
});
