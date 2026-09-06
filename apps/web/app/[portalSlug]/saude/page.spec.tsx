import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { loadSaudeData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadSaudeData>>;

const { loadSaudeDataMock } = vi.hoisted(() => ({
  loadSaudeDataMock: vi.fn(),
}));

vi.mock("./loader", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./loader")>();
  return {
    ...actual,
    loadSaudeData: loadSaudeDataMock,
  };
});

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
        adesaoCaronaValor: 0,
        empenhosAtaExternaCount: 0,
        pagoAtaExternaValor: 0,
        modalidades: [],
      },
      emendasStats: {
        lista: [
          {
            id: "1",
            Nº: "123",
            Objeto: "Custeio SUS",
            "Valor Autorizado": 50,
            Empenhado: 40,
            Autor: "Deputado Fulano",
            "Tipo da Emenda": "INDIVIDUAL",
            "Esfera de Origem": "FEDERAL",
            "Ato Normativo": "Portaria 1",
            Destinação: "Saúde",
          },
        ],
        totalAutorizado: 50,
        totalEmpenhado: 40,
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

    expect(screen.getByText("Emendas na Saúde")).toBeInTheDocument();
    expect(
      screen.getByText("Concentração de Fornecedores"),
    ).toBeInTheDocument();
    expect(screen.getByText("Baixa")).toBeInTheDocument();
    expect(screen.getByText("Origem")).toBeInTheDocument();
    expect(screen.getByText("Federal")).toBeInTheDocument();
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
            taxaEmpenho: 0,
          },
          fontesReceita: { emendasParlamentares: 0 },
        },
      }),
    );

    const element = await SaudePage(props);
    render(element);

    expect(screen.getByText("Sem emendas no exercício")).toBeInTheDocument();
  });

  it("exibe subtexto em linha única quando há emendas recebidas mas nenhuma empenhada", async () => {
    loadSaudeDataMock.mockResolvedValue(
      makeRaw({
        saude: {
          emendasStats: {
            lista: [],
            totalAutorizado: 100000,
            totalEmpenhado: 0,
            taxaEmpenho: 0,
          },
        },
      }),
    );

    const element = await SaudePage(props);
    render(element);

    expect(screen.getByText("Nenhum valor empenhado")).toBeInTheDocument();
  });

  it("renderiza badge e descrição de concentração moderada", async () => {
    loadSaudeDataMock.mockResolvedValue(
      makeRaw({
        saude: {
          farmaceutica: {
            medicamentosInsumos: 100,
            medicamentosInsumosPago: 90,
            judicializacao: 20,
            judicializacaoPago: 15,
            hhi: 1850,
            hhiClassificacao: "moderada",
            concentracao: {
              hhi: 1850,
              nivel: "moderada",
              label: "Moderada",
              descricao: "Mercado moderadamente concentrado em poucas empresas",
            },
          },
        },
      }),
    );

    const element = await SaudePage(props);
    render(element);

    expect(screen.getByText("Moderada")).toBeInTheDocument();
    expect(
      screen.getByText("Mercado moderadamente concentrado em poucas empresas"),
    ).toBeInTheDocument();
    expect(screen.getByText("Índice HHI: 1.850")).toBeInTheDocument();
  });

  it("renderiza badge e descrição de alta concentração", async () => {
    loadSaudeDataMock.mockResolvedValue(
      makeRaw({
        saude: {
          farmaceutica: {
            medicamentosInsumos: 100,
            medicamentosInsumosPago: 90,
            judicializacao: 20,
            judicializacaoPago: 15,
            hhi: 3200,
            hhiClassificacao: "alta",
            concentracao: {
              hhi: 3200,
              nivel: "alta",
              label: "Alta",
              descricao:
                "Alto risco de dependência: poucos fornecedores dominam os fornecimentos",
            },
          },
        },
      }),
    );

    const element = await SaudePage(props);
    render(element);

    expect(screen.getByText("Alta")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Alto risco de dependência: poucos fornecedores dominam os fornecimentos",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Índice HHI: 3.200")).toBeInTheDocument();
  });
});
