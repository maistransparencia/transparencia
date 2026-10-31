import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { loadSaudeData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadSaudeData>>;

const { loadSaudeDataMock } = vi.hoisted(() => ({
  loadSaudeDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadSaudeData: loadSaudeDataMock,
}));

const { default: SaudePage } = await import("./page");

function makeRaw(
  overrides: { saude?: Record<string, unknown> } & Record<string, unknown> = {},
): RawData {
  const { saude: saudeOverride, ...rest } = overrides;
  const { orcamento: orcamentoOverride, ...saudeRest } = saudeOverride ?? {};
  return {
    portalSlug: "porciuncula_prefeitura",
    context: { selectedYear: 2024, isCurrentYear: false },
    saude: {
      orcamento: {
        dotacao: 1000,
        empenhado: 800,
        liquidado: 700,
        pago: 600,
        taxaExecucao: 0.8,
        alertaSubExecucao: false,
        medicamentosInsumos: 100,
        medicamentosInsumosPago: 90,
        judicializacao: 20,
        judicializacaoPago: 15,
        contratosVinculadosCount: 5,
        fornecedoresAtivosCount: 10,
        ...(orcamentoOverride as Record<string, unknown> | undefined),
      },
      farmaceutica: {
        medicamentosInsumos: 100,
        medicamentosInsumosPago: 90,
        judicializacao: 20,
        judicializacaoPago: 15,
        hhi: 900,
        hhiClassificacao: "baixa",
        concentracao: {
          hhi: 900,
          nivel: "baixa",
          label: "Baixa",
          descricao: "Compras bem distribuídas entre múltiplos fornecedores",
        },
      },
      fontesReceita: {
        repassesPrefeitura: 500,
        emendasParlamentares: 50,
      },
      executionTrend: [],
      licitacoesSaude: {
        adesaoCaronaCount: 0,
        caminhos: [],
        adesaoCaronaValor: 0,
        empenhosAtaExternaCount: 0,
        pagoAtaExternaValor: 0,
        modalidades: [],
      },
      emendasStats: {
        lista: [
          {
            id: "1",
            numero: "123",
            objeto: "Custeio SUS",
            valorAutorizado: 50,
            empenhado: 40,
            autor: "Deputado Fulano",
            tipoEmenda: "INDIVIDUAL",
            esferaOrigem: "FEDERAL",
            atoNormativo: "Portaria 1",
            destinacao: "Saúde",
          },
        ],
        totalAutorizado: 50,
        totalEmpenhado: 40,
        totalRecebidoFundo: 0,
        totalReceitaPossivel: 0,
        taxaEmpenho: 0.8,
        maiorEmenda: 50,
      },
      emendas: [],
      emendasTotal: 50,
      ...saudeRest,
    },
    ...rest,
  } as unknown as RawData;
}

const props = {
  params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
  searchParams: Promise.resolve({}),
};

describe("SaudePage", () => {
  it("happy-path: renderiza cabeçalho e KPIs principais", async () => {
    loadSaudeDataMock.mockResolvedValue(makeRaw());

    const element = await SaudePage(props);
    render(element);

    expect(screen.getByText("Emendas na saúde")).toBeInTheDocument();
    expect(screen.getAllByText("Origem").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Federal").length).toBeGreaterThan(0);
  });

  it("não exibe alerta de subexecução quando alertaSubExecucao é falso", async () => {
    loadSaudeDataMock.mockResolvedValue(
      makeRaw({ saude: { orcamento: { alertaSubExecucao: false } } }),
    );

    const element = await SaudePage(props);
    render(element);

    expect(
      screen.queryByText("Alerta de Subexecução Orçamentária"),
    ).not.toBeInTheDocument();
  });

  it("exibe alerta de subexecução quando o orçamento ficou abaixo de 70%", async () => {
    loadSaudeDataMock.mockResolvedValue(
      makeRaw({ saude: { orcamento: { alertaSubExecucao: true } } }),
    );

    const element = await SaudePage(props);
    render(element);

    expect(
      screen.getByText("Alerta de Subexecução Orçamentária"),
    ).toBeInTheDocument();
  });

  it("exibe mensagem adequada quando não há emendas no exercício", async () => {
    loadSaudeDataMock.mockResolvedValue(
      makeRaw({
        saude: {
          emendasStats: {
            lista: [],
            totalAutorizado: 0,
            totalEmpenhado: 0,
            totalRecebidoFundo: 0,
            totalReceitaPossivel: 0,
            taxaEmpenho: 0,
          },
          fontesReceita: { emendasParlamentares: 0 },
        },
      }),
    );

    const element = await SaudePage(props);
    render(element);

    expect(
      screen.getByText("Nenhuma emenda destinada no exercício"),
    ).toBeInTheDocument();
  });

  it("exibe subtexto em linha única quando há emendas recebidas mas nenhuma empenhada", async () => {
    loadSaudeDataMock.mockResolvedValue(
      makeRaw({
        saude: {
          emendasStats: {
            lista: [],
            totalAutorizado: 100000,
            totalEmpenhado: 0,
            totalRecebidoFundo: 0,
            totalReceitaPossivel: 0,
            taxaEmpenho: 0,
          },
        },
      }),
    );

    const element = await SaudePage(props);
    render(element);

    expect(
      screen.getByText("Empenho ainda não informado no cadastro de emendas"),
    ).toBeInTheDocument();
  });

  it("mostra quem recebe o dinheiro da saúde com a parte dos maiores fornecedores", async () => {
    loadSaudeDataMock.mockResolvedValue(
      makeRaw({
        saude: {
          orcamento: { pago: 1_000_000 },
          topFornecedores: [
            {
              fornecedorNome: "FORNECEDOR A",
              fornecedorCpfCnpj: null,
              totalPago: 300_000,
              totalEmpenhado: 400_000,
              percentualPago: 30,
            },
            {
              fornecedorNome: "FORNECEDOR B",
              fornecedorCpfCnpj: null,
              totalPago: 100_000,
              totalEmpenhado: 150_000,
              percentualPago: 10,
            },
          ],
        },
      }),
    );

    const element = await SaudePage(props);
    render(element);

    expect(
      screen.getByText("Quem recebe o dinheiro da saúde"),
    ).toBeInTheDocument();
    expect(screen.getByText("FORNECEDOR A")).toBeInTheDocument();
    expect(
      screen.getByText("Pago aos 2 maiores fornecedores"),
    ).toBeInTheDocument();
    expect(screen.getByText("40,00%")).toBeInTheDocument();
  });

  it("mostra estado neutro quando não há pagamentos a fornecedores", async () => {
    loadSaudeDataMock.mockResolvedValue(
      makeRaw({ saude: { topFornecedores: [] } }),
    );

    const element = await SaudePage(props);
    render(element);

    expect(
      screen.getByText(/Sem pagamentos a fornecedores registrados/),
    ).toBeInTheDocument();
  });

  it("avisa na evolução anual que o ano em andamento não deve ser comparado", async () => {
    loadSaudeDataMock.mockResolvedValue(
      makeRaw({
        context: { selectedYear: 2026, isCurrentYear: true },
        saude: { executionTrend: [{ ano: 2026, empenhado: 10, pago: 5 }] },
      }),
    );

    const element = await SaudePage(props);
    const { container } = render(element);

    expect(container.textContent).toMatch(
      /O ano de 2026 está em andamento.*não deve ser comparado com anos completos/,
    );
  });
});
