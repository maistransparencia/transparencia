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
      screen.getByText("Chefias ocupadas por concursados"),
    ).toBeInTheDocument();
  });

  it("ano fechado: legenda 'proventos brutos, {ano}'", async () => {
    loadPessoalDataMock.mockResolvedValue(makeRaw());
    render(await PessoalPage(props));
    expect(screen.getByTestId("pessoal-destaque")).toHaveTextContent(
      "proventos brutos, 2024",
    );
  });

  it("ano parcial: legenda inclui o período", async () => {
    loadPessoalDataMock.mockResolvedValue(
      makeRaw({
        context: {
          selectedYear: 2024,
          isCurrentYear: true,
          entidadesIds: undefined,
        },
      }),
    );
    render(await PessoalPage(props));
    expect(screen.getByTestId("pessoal-destaque")).toHaveTextContent(
      /proventos brutos no período \(.+\)/,
    );
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

  it("promove o gasto com pessoal (LRF) ao lado do total pago, com barra do teto e do limite prudencial", async () => {
    loadPessoalDataMock.mockResolvedValue(
      makeRaw({
        folhaData: [
          {
            ano: 2024,
            totalFolha: 1000,
            totalPago: 900,
            rclProxy: 2000,
            percentualFolha: 47.16,
            statusLrf: "normal",
            limitesLrf: { maximo: 54, prudencial: 51.3, alerta: 48.6 },
          },
        ],
      }),
    );
    render(await PessoalPage(props));

    const destaque = screen.getByTestId("pessoal-lrf-destaque");
    expect(destaque).toHaveTextContent("Gasto com Pessoal (LRF)");
    expect(destaque.querySelector(".stat-value-lg")?.textContent).toBe(
      "47,16%",
    );
    expect(destaque).toHaveTextContent("Teto: 54%");
    expect(destaque).toHaveTextContent("Limite prudencial: 51,3%");
    expect(destaque).toHaveTextContent(
      "O número oficial sai no Relatório de Gestão Fiscal",
    );
    const barra = screen.getByRole("meter", {
      name: "Gasto com pessoal sobre a receita",
    });
    expect(barra.getAttribute("aria-valuenow")).toBe("47.16");
  });

  it("no ano em andamento a barra aparece sem os marcadores e sem a legenda de limites", async () => {
    loadPessoalDataMock.mockResolvedValue(
      makeRaw({
        context: {
          selectedYear: 2024,
          isCurrentYear: true,
          entidadesIds: undefined,
        },
        folhaData: [
          {
            ano: 2024,
            totalFolha: 1000,
            totalPago: 900,
            rclProxy: 2000,
            percentualFolha: 52,
            statusLrf: "prudencial",
            limitesLrf: { maximo: 54, prudencial: 51.3, alerta: 48.6 },
          },
        ],
      }),
    );
    render(await PessoalPage(props));

    const destaque = screen.getByTestId("pessoal-lrf-destaque");
    expect(destaque).not.toHaveTextContent("Teto:");
    expect(destaque).not.toHaveTextContent("Limite prudencial");
    expect(
      screen
        .getByRole("meter", { name: "Gasto com pessoal sobre a receita" })
        .getAttribute("aria-valuetext"),
    ).toBe("52,00% da receita");
  });

  it("com órgão filtrado não desenha a barra de limites", async () => {
    loadPessoalDataMock.mockResolvedValue(
      makeRaw({
        context: {
          selectedYear: 2024,
          isCurrentYear: false,
          entidadesIds: ["1"],
        },
        folhaData: [
          {
            ano: 2024,
            totalFolha: 1000,
            totalPago: 900,
            rclProxy: 2000,
            percentualFolha: 20,
            statusLrf: "normal",
            limitesLrf: { maximo: 54, prudencial: 51.3, alerta: 48.6 },
          },
        ],
      }),
    );
    render(await PessoalPage(props));

    expect(screen.getByTestId("pessoal-lrf-destaque")).toBeInTheDocument();
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
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
