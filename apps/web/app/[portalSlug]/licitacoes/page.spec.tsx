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
    expect(screen.getByText("Taxa de Contratação Direta")).toBeInTheDocument();
  });

  it("não exibe alerta de fracionamento quando não há casos", async () => {
    loadLicitacoesDataMock.mockResolvedValue(makeRaw());

    const element = await LicitacoesPage(props);
    render(element);

    expect(screen.queryByText(/de possível/)).not.toBeInTheDocument();
  });

  it("exibe alerta de fracionamento quando há dados", async () => {
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
  });

  it("exibe Taxa de Contratação Direta quando sem anomalia", async () => {
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
    expect(
      screen.queryByText(/Alerta de Concentração de Contratações Diretas/),
    ).not.toBeInTheDocument();
  });

  it("exibe banner contextual articulando volume financeiro e processos com links da Lei 14.133/2021", async () => {
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

    expect(
      screen.getByText(
        /No consolidado municipal de 2024, embora as contratações diretas representem/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/card acima/)).toBeInTheDocument();
  });

  it("não exibe alerta quando entidade filtrada possui contratação direta baixa", async () => {
    loadLicitacoesDataMock.mockResolvedValue(
      makeRaw({
        context: {
          selectedYear: 2024,
          isCurrentYear: false,
          entidadesIds: ["2"],
        },
        modalidades: [
          { modalidade: "Pregão Eletrônico", valorTotal: 90000 },
          { modalidade: "Dispensa", valorTotal: 10000 },
        ],
        alertasRadar: [
          {
            tipoAnomalia: "concentracao_dispensa",
            valorObservado: 85,
            valorEsperado: 40,
          },
        ],
      }),
    );

    const propsComEntidade = {
      ...props,
      searchParams: Promise.resolve({ entidades: "2" }),
    };

    const element = await LicitacoesPage(propsComEntidade);
    render(element);

    expect(screen.getByText("Taxa de Contratação Direta")).toBeInTheDocument();
    expect(screen.getByText(/10[.,]00%/)).toBeInTheDocument();
    expect(
      screen.queryByText(/Alerta de Concentração de Contratações Diretas:/),
    ).not.toBeInTheDocument();
  });

  it("exibe alerta contextualizado para a entidade quando contratação direta for anômala", async () => {
    loadLicitacoesDataMock.mockResolvedValue(
      makeRaw({
        context: {
          selectedYear: 2024,
          isCurrentYear: false,
          entidadesIds: ["7"],
        },
        modalidades: [
          { modalidade: "Pregão Eletrônico", valorTotal: 40000 },
          { modalidade: "Dispensa", valorTotal: 60000 },
        ],
        alertasRadar: [
          {
            tipoAnomalia: "concentracao_dispensa",
            valorObservado: 85,
            valorEsperado: 40,
          },
        ],
      }),
    );

    const propsComEntidade = {
      ...props,
      searchParams: Promise.resolve({ entidades: "7" }),
    };

    const element = await LicitacoesPage(propsComEntidade);
    render(element);

    expect(screen.getByText("Taxa de Contratação Direta")).toBeInTheDocument();
    expect(screen.getAllByText(/60[.,]00%/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        /Nas entidades selecionadas em 2024, 60\.00% do volume apurado/,
      ),
    ).toBeInTheDocument();
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
    expect(screen.getAllByText(/042\/2024/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Secretaria de Obras").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Contratação de empresa para reforma de pontes")
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("repassa itensByLicitacao para LicitacoesEmAndamentoSection permitindo abrir modal de itens", async () => {
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
            fonteObjeto: "pncp",
            linkSistemaOrigem: "https://pncp.gov.br/app/editais/123/2024/1",
          },
        ],
        itensByLicitacao: {
          "042/2024": [
            {
              itemId: "item-1",
              portalSlug: "porciuncula_prefeitura",
              ano: 2024,
              licitacaoNumero: "042/2024",
              numeroItem: 1,
              descricao: "Viga pré-moldada de concreto",
              quantidade: 50,
              unidadeMedida: "UN",
              valorUnitarioEstimado: 1000,
              valorTotalEstimado: 50000,
              valorUnitarioHomologado: 900,
              valorTotalHomologado: 45000,
              percentualDesconto: 10,
              fornecedorNome: "Construtora Alfa LTDA",
              fornecedorCpfCnpj: "12.345.678/0001-00",
              situacaoItem: "adjudicado",
            },
          ],
        },
      }),
    );

    const element = await LicitacoesPage(props);
    render(element);

    expect(
      screen.getAllByRole("link", { name: /sala de disputa/i })[0],
    ).toHaveAttribute("href", "https://pncp.gov.br/app/editais/123/2024/1");
    expect(
      screen.getAllByRole("button", { name: /ver itens licitados/i })[0],
    ).toBeInTheDocument();
  });

  it("renderiza a barra de busca global de licitações e contratos no hero", async () => {
    loadLicitacoesDataMock.mockResolvedValue(makeRaw());

    const element = await LicitacoesPage(props);
    render(element);

    expect(
      screen.getByRole("button", {
        name: /abrir busca global de licitações e contratos/i,
      }),
    ).toBeInTheDocument();
  });

  it("renderiza a seção de contratos de serviços vigentes quando há contratos nos dados", async () => {
    loadLicitacoesDataMock.mockResolvedValue(
      makeRaw({
        contratosServicosVigentes: [
          {
            contratoServicoId: "1",
            portalSlug: "porciuncula_prefeitura",
            ano: 2024,
            contratoNumero: "0010/24",
            fornecedorNome: "Empresa Limpeza XYZ LTDA",
            fornecedorCnpj: "12345678000199",
            objetoDescricao: "Prestação de serviços contínuos de limpeza",
            totalEmpenhado: 50000,
            totalLiquidado: 30000,
            totalPago: 20000,
            saldoPendente: 30000,
            percentualPago: 40,
            statusExecucao: "em_execucao",
          },
        ],
      }),
    );

    const element = await LicitacoesPage(props);
    render(element);

    expect(
      screen.getByRole("heading", { name: "Contratos de Serviços Vigentes" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Empresa Limpeza XYZ LTDA")[0],
    ).toBeInTheDocument();
  });
});
