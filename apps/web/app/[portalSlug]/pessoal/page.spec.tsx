import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { loadPessoalData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadPessoalData>>;

const { loadPessoalDataMock } = vi.hoisted(() => ({
  loadPessoalDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadPessoalData: loadPessoalDataMock,
}));

const { default: PessoalPage } = await import("./page");

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    folhaData: [
      { totalFolha: 1000, totalPago: 900, rclProxy: 2000, percentualFolha: 45 },
    ],
    pctChefias: 60,
    decimo13: { empenhado: 100, pago: 90, pctPago: 90 },
    distribuicaoProventos: [],
    regimeMetrics: [],
    ...overrides,
  } as unknown as RawData;
}

const props = {
  params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
  searchParams: Promise.resolve({}),
};

describe("PessoalPage", () => {
  it("happy-path: renderiza cabeçalho e KPIs principais", async () => {
    loadPessoalDataMock.mockResolvedValue(makeRaw());

    const element = await PessoalPage(props);
    render(element);

    expect(screen.getByText("Folha de Pagamento")).toBeInTheDocument();
    expect(
      screen.getByText("Efetivos no comando das chefias"),
    ).toBeInTheDocument();
  });

  it("exibe o card de 13º salário quando decimo13 está disponível", async () => {
    loadPessoalDataMock.mockResolvedValue(makeRaw());

    const element = await PessoalPage(props);
    render(element);

    expect(
      screen.queryByText(/Sem dados de 13º salário/),
    ).not.toBeInTheDocument();
  });

  it("exibe mensagem de fallback quando decimo13 é null", async () => {
    loadPessoalDataMock.mockResolvedValue(makeRaw({ decimo13: null }));

    const element = await PessoalPage(props);
    render(element);

    expect(screen.getByText(/Sem dados de 13º salário/)).toBeInTheDocument();
  });

  it("mostra 'N/D' quando pctChefias é null", async () => {
    loadPessoalDataMock.mockResolvedValue(makeRaw({ pctChefias: null }));

    const element = await PessoalPage(props);
    render(element);

    expect(screen.getByText("N/D")).toBeInTheDocument();
  });

  it("renderiza a seção de quadro e folha por regime jurídico", async () => {
    loadPessoalDataMock.mockResolvedValue(
      makeRaw({
        regimeMetrics: [
          {
            categoriaRegime: "efetivo_concurso",
            categoriaRegimeRotulo: "Concursados (Efetivos)",
            totalProfissionais: 150,
            totalProventos: 600000,
            proventoMedio: 4000,
            percentualProfissionais: 100,
            percentualFolha: 100,
          },
        ],
      }),
    );

    const element = await PessoalPage(props);
    render(element);

    expect(
      screen.getByRole("heading", {
        name: /Quadro e Folha por Regime Jurídico/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Concursados (Efetivos)" }),
    ).toBeInTheDocument();
  });

  it("renderiza indicadores de tendência YoY nos KPICards quando há histórico do ano anterior", async () => {
    loadPessoalDataMock.mockResolvedValue(
      makeRaw({
        context: { selectedYear: 2024, isCurrentYear: false },
        folhaData: [
          {
            ano: 2024,
            totalFolha: 1100,
            totalPago: 1000,
            rclProxy: 2000,
            percentualFolha: 55,
          },
          {
            ano: 2023,
            totalFolha: 1000,
            totalPago: 900,
            rclProxy: 2000,
            percentualFolha: 50,
          },
        ],
        pctChefias: 70,
        prevPctChefias: 60,
      }),
    );

    const element = await PessoalPage(props);
    render(element);

    expect(screen.getByText("+5 p.p. vs 2023")).toBeInTheDocument();
    expect(screen.getByText("+10 p.p. vs 2023")).toBeInTheDocument();
    expect(screen.getByText("+10% vs 2023")).toBeInTheDocument();
  });
});
