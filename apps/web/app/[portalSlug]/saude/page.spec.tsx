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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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
    farmaciaResumo: {
      status: "indisponivel",
      dataPosicaoMaisRecente: null,
      totalUnidadesAtivas: null,
      essenciaisNoEstoque: null,
      totalEssenciais: null,
    },
    minimoSaude: {
      portalSlug: "porciuncula_prefeitura",
      ano: 2024,
      atual: null,
      minimo: {
        limite: null,
        percentualAplicado: null,
        resultado: "sem_dado",
        comparavel: false,
        mesesCobertos: null,
        baseLegal: null,
        urlBaseLegal: null,
      },
      serie: [],
      anoInicial: null,
      anoFinal: null,
    },
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
      fontesReceita: {
        repassesPrefeitura: 500,
        emendasParlamentares: 50,
      },
      executionTrend: [],
      licitacoesSaude: {
        caminhos: [],
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

    expect(
      screen.getByRole("heading", { level: 1, name: "Saúde em 2024" }),
    ).toBeInTheDocument();
    [
      "Aplicação mínima exigida em saúde",
      "Origem do dinheiro da saúde",
      "Rede do SUS",
      "Remédios na Farmácia SUS",
    ].forEach((rotulo) => {
      expect(screen.getByText(rotulo)).toBeInTheDocument();
    });
    expect(screen.getAllByText("Origem").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Federal").length).toBeGreaterThan(0);
    // A produção do SUS saiu do topo (a seção de baixo é coberta no spec do componente).
    expect(
      screen.queryByText("Atendimento do SUS por mil moradores"),
    ).toBeNull();
    // O painel antigo de quatro indicadores saiu do topo.
    expect(screen.queryByText("Contratos vinculados")).not.toBeInTheDocument();
    expect(screen.queryByText("Fornecedores ativos")).not.toBeInTheDocument();
  });

  it("cita o portal da Prefeitura como fonte da origem das receitas", async () => {
    loadSaudeDataMock.mockResolvedValue(
      makeRaw({
        portalConfig: {
          portalUrl: "https://transparencia.exemplo.gov.br/",
          dataExtracao: "2026-11-05",
        },
      }),
    );

    render(await SaudePage(props));

    const links = screen.getAllByRole("link", {
      name: /Portal da Transparência da Prefeitura/,
    });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link.getAttribute("href")).toBe(
        "https://transparencia.exemplo.gov.br/",
      );
    });
    expect(
      screen.getAllByText(/Coletado em 05\/11\/2026/).length,
    ).toBeGreaterThan(0);
  });

  it("mostra o bloco do mínimo de saúde no topo com o percentual do ano", async () => {
    const anoEncerrado = {
      ano: 2024,
      periodo: 6,
      situacao: "encerrado" as const,
      percentualAplicadoSaude: 21.4,
      despesaSaudePorHabitante: null,
      percentualTransferenciasSaude: null,
      receitaImpostosTransferenciasConstitucionais: null,
      despesaRecursosProprios: null,
      despesaTotalSaude: null,
      divergenciaEntreVias: false,
      indicadoresDivergentes: [],
      coletadoEm: null,
    };
    loadSaudeDataMock.mockResolvedValue(
      makeRaw({
        minimoSaude: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2024,
          atual: anoEncerrado,
          minimo: {
            limite: 15,
            percentualAplicado: 21.4,
            resultado: "cumpriu",
            comparavel: true,
            mesesCobertos: null,
            baseLegal: null,
            urlBaseLegal: null,
          },
          serie: [anoEncerrado],
          anoInicial: 2024,
          anoFinal: 2024,
        },
      }),
    );

    render(await SaudePage(props));

    expect(screen.getByTestId("saude-minimo-destaque")).toBeInTheDocument();
    expect(screen.getByText(/Exigido por lei: 15%/)).toBeInTheDocument();
  });

  it("mantém todos os blocos e põe contratação, fornecedores e emendas em Para fiscalizar, recolhidos", async () => {
    loadSaudeDataMock.mockResolvedValue(makeRaw());

    const element = await SaudePage(props);
    const { container } = render(element);

    const fiscalizar = container.querySelector("#para-fiscalizar");
    expect(fiscalizar).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "Para fiscalizar" }),
    ).toBeInTheDocument();
    const secoes = ["contratacao-saude", "fornecedores-saude", "emendas-saude"];
    secoes.forEach((id) => {
      const secao = container.querySelector(`#${id}`);
      expect(secao).not.toBeNull();
      expect(fiscalizar?.contains(secao)).toBe(true);
      expect(secao?.querySelector("details")?.open).toBe(false);
    });
    ["O que entrou", "Como mudou ao longo dos anos"].forEach((titulo) => {
      const heading = screen.getByRole("heading", { name: titulo });
      expect(fiscalizar?.contains(heading)).toBe(false);
    });
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

  it("resume zero emendas em Para fiscalizar quando não há emendas no exercício", async () => {
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

    expect(screen.getByTestId("saude-resumo-fiscalizar")).toHaveTextContent(
      /0 emendas · .* autorizados/,
    );
  });

  it("resume as emendas autorizadas em Para fiscalizar mesmo sem emenda listada", async () => {
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

    expect(screen.getByTestId("saude-resumo-fiscalizar")).toHaveTextContent(
      /autorizados/,
    );
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
