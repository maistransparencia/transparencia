import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { loadLicitacoesData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadLicitacoesData>>;

const { loadLicitacoesDataMock } = vi.hoisted(() => ({
  loadLicitacoesDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadLicitacoesData: loadLicitacoesDataMock,
}));

const { default: LicitacoesPage } = await import("./page");

function makeRaw(overrides: Record<string, unknown> = {}): RawData {
  return {
    portalSlug: "porciuncula_prefeitura",
    context: {
      selectedYear: 2024,
      isCurrentYear: false,
      entidadesIds: undefined,
    },
    gaps: [],
    adesao: { quantidade: 0 },
    adesaoExterna: { quantidade: 0 },
    anomalias: { fracionamento: [] },
    modalidades: [],
    ...overrides,
  } as unknown as RawData;
}

const props = {
  params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
  searchParams: Promise.resolve({}),
};

describe("LicitacoesPage", () => {
  it("happy-path: renderiza cabeçalho e KPIs com dados vazios (sem crash)", async () => {
    loadLicitacoesDataMock.mockResolvedValue(makeRaw());

    const element = await LicitacoesPage(props);
    render(element);

    expect(screen.getByText("Licitações e Contratos")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Nenhuma informação de modalidade disponível para o período.",
      ),
    ).toBeInTheDocument();
  });

  it("não exibe alerta de fracionamento quando não há casos", async () => {
    loadLicitacoesDataMock.mockResolvedValue(makeRaw());

    const element = await LicitacoesPage(props);
    render(element);

    expect(screen.queryByText(/de possível/)).not.toBeInTheDocument();
  });

  it("exibe alerta de fracionamento e gráfico de modalidades quando há dados", async () => {
    loadLicitacoesDataMock.mockResolvedValue(
      makeRaw({
        gaps: [
          {
            acimaLimite: true,
            fornecedor: "Fornecedor X",
            valorContrato: 100000,
            periodo: "01/2024",
          },
        ],
        anomalias: {
          fracionamento: [
            { fornecedor: "Fornecedor X" },
            { fornecedor: "Fornecedor X" },
            { fornecedor: "Fornecedor X" },
          ],
        },
        modalidades: [
          {
            modalidade: "Pregão",
            valorTotal: 1000,
            quantidade: 3,
            percentual_valor: 100,
            pctValor: 100,
          },
        ],
      }),
    );

    const element = await LicitacoesPage(props);
    render(element);

    expect(screen.getByText(/1 caso de possível/)).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Nenhuma informação de modalidade disponível para o período.",
      ),
    ).not.toBeInTheDocument();
  });

  it("exibe Taxa de Contratação Direta com badge neutra quando sem anomalia", async () => {
    loadLicitacoesDataMock.mockResolvedValue(
      makeRaw({
        modalidades: [
          { modalidade: "Pregão Eletrônico", valorTotal: 80000 },
          { modalidade: "Dispensa", valorTotal: 20000 },
        ],
        alertasRadar: [],
      }),
    );

    const element = await LicitacoesPage(props);
    render(element);

    expect(screen.getByText("Taxa de Contratação Direta")).toBeInTheDocument();
    expect(screen.getByText(/20[.,]00%/)).toBeInTheDocument();
    expect(screen.getByText("Padrão esperado")).toBeInTheDocument();
    expect(
      screen.queryByText(/Alerta de Concentração de Contratações Diretas/),
    ).not.toBeInTheDocument();
  });

  it("exibe badge de alerta, banner contextual e link da Lei 14.133/2021 quando há anomalia concentracao_dispensa", async () => {
    loadLicitacoesDataMock.mockResolvedValue(
      makeRaw({
        modalidades: [
          { modalidade: "Pregão Eletrônico", valorTotal: 25000 },
          { modalidade: "Dispensa", valorTotal: 75000 },
        ],
        alertasRadar: [
          {
            tipoAnomalia: "concentracao_dispensa",
            valorObservado: 75,
            valorEsperado: 30,
          },
        ],
      }),
    );

    const element = await LicitacoesPage(props);
    render(element);

    expect(screen.getByText("Taxa de Contratação Direta")).toBeInTheDocument();
    expect(screen.getAllByText(/75[.,]00%/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Alerta de concentração")).toBeInTheDocument();
    expect(
      screen.getByText(/Alerta de Concentração de Contratações Diretas:/),
    ).toBeInTheDocument();

    const linkArt74 = screen.getByRole("link", {
      name: /Art\. 74 da Lei Federal nº 14\.133\/2021/i,
    });
    expect(linkArt74).toBeInTheDocument();
    expect(linkArt74).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art74",
    );

    const linkArt75 = screen.getByRole("link", {
      name: /Art\. 75 da Lei Federal nº 14\.133\/2021/i,
    });
    expect(linkArt75).toBeInTheDocument();
    expect(linkArt75).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art75",
    );

    const linkArt86 = screen.getByRole("link", {
      name: /Art\. 86 da Lei Federal nº 14\.133\/2021/i,
    });
    expect(linkArt86).toBeInTheDocument();
    expect(linkArt86).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art86",
    );
  });

  it("renderiza a seção de Licitações Abertas e em Andamento com lista de processos", async () => {
    loadLicitacoesDataMock.mockResolvedValue(
      makeRaw({
        licitacoesEmAndamento: [
          {
            licitacaoId: "lic-and-1",
            licitacaoNumero: "042/2024",
            objeto: "Contratação de empresa para reforma de pontes",
            modalidade: "concorrencia",
            valor: 450000,
            valorEstimado: 450000,
            entidadeNome: "Secretaria de Obras",
            dataAbertura: "2024-10-15",
          },
        ],
      }),
    );

    const element = await LicitacoesPage(props);
    render(element);

    expect(
      screen.getByText("Licitações Abertas e em Andamento"),
    ).toBeInTheDocument();
    expect(screen.getByText("Processo 042/2024")).toBeInTheDocument();
    expect(screen.getByText("Secretaria de Obras")).toBeInTheDocument();
    expect(
      screen.getByText("Contratação de empresa para reforma de pontes"),
    ).toBeInTheDocument();
  });
});
