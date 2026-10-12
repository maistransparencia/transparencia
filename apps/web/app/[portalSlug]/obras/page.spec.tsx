import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { loadObrasData } from "./loader";

type RawData = Awaited<ReturnType<typeof loadObrasData>>;

const { loadObrasDataMock } = vi.hoisted(() => ({
  loadObrasDataMock: vi.fn(),
}));

vi.mock("./loader", () => ({
  loadObrasData: loadObrasDataMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/porciuncula_prefeitura/obras",
  useSearchParams: () => new URLSearchParams({ ano: "2026" }),
}));

const { default: ObrasPage } = await import("./page");

function makeRawObrasData(): RawData {
  return {
    portalSlug: "porciuncula_prefeitura",
    portalConfig: {
      displayName: "Porciúncula",
      uf: "RJ",
      dataExtracao: "2026-10-01",
    } as unknown as Awaited<
      ReturnType<typeof import("@transparencia/db").getPortalConfig>
    >,
    context: {
      selectedYear: 2026,
      isCurrentYear: true,
    },
    filtros: {
      status: "todas",
    },
    resumo: {
      totalObras: 4,
      emExecucao: 2,
      paralisadas: 1,
      concluidas: 1,
      cadastradas: 0,
      canceladas: 0,
      valorTotalInvestimento: 4500000,
      valorEmExecucao: 2800000,
      valorParalisadas: 1200000,
      valorConcluidas: 500000,
      valorCadastradas: 0,
      percentualMedioExecucaoFisica: 62.5,
      obrasSemMedicaoCount: 0,
    },
    obras: [
      {
        idProjeto: "OBR-001",
        portalSlug: "porciuncula_prefeitura",
        nomeObra: "Construção de Escola Modelo",
        situacao: "em_execucao",
        orgaoResponsavel: "Secretaria de Educação",
        valorInvestimentoPrevisto: 2500000,
        percentualExecucaoFisica: 55.0,
        dataUltimaMedicao: "2026-04-10",
        latitude: -20.9634,
        longitude: -42.0408,
        motivoParalisacao: null,
        dataInicioPrevista: "2026-01-10",
        dataFimPrevista: "2026-12-20",
      },
      {
        idProjeto: "OBR-002",
        portalSlug: "porciuncula_prefeitura",
        nomeObra: "Reforma da Ponte do Rio Carangola",
        situacao: "paralisada",
        orgaoResponsavel: "Secretaria de Obras",
        valorInvestimentoPrevisto: 1200000,
        percentualExecucaoFisica: 30.0,
        dataUltimaMedicao: "2024-02-15",
        latitude: -20.965,
        longitude: -42.042,
        motivoParalisacao: "Atraso no repasse do convênio estadual",
        dataInicioPrevista: "2023-05-01",
        dataFimPrevista: "2024-06-30",
      },
      {
        idProjeto: "OBR-003",
        portalSlug: "porciuncula_prefeitura",
        nomeObra: "Revitalização da Praça da Matriz",
        situacao: "concluida",
        orgaoResponsavel: "Secretaria de Turismo",
        valorInvestimentoPrevisto: 500000,
        percentualExecucaoFisica: 100.0,
        dataUltimaMedicao: "2026-03-01",
        latitude: -20.961,
        longitude: -42.039,
        motivoParalisacao: null,
        dataInicioPrevista: "2025-08-01",
        dataFimPrevista: "2026-02-28",
      },
      {
        idProjeto: "OBR-004",
        portalSlug: "porciuncula_prefeitura",
        nomeObra: "Extensão da Rede de Iluminação Rural",
        situacao: "em_execucao",
        orgaoResponsavel: "Secretaria de Agricultura",
        valorInvestimentoPrevisto: 300000,
        percentualExecucaoFisica: 15.0,
        dataUltimaMedicao: null,
        latitude: null,
        longitude: null,
        motivoParalisacao: null,
        dataInicioPrevista: null,
        dataFimPrevista: null,
      },
    ],
  };
}

describe("ObrasPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza o Hero no padrão visual de temas com narrativa, investimento e 4 KPIs", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({ ano: "2026" }),
    });

    render(page);

    // Hero Header de Tema
    expect(
      screen.getByText(/TEMAS · OBRAS PÚBLICAS · 2026/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Do planejamento ao canteiro/i,
      }),
    ).toBeInTheDocument();

    // Card de Investimento Previsto
    expect(screen.getByText("Investimento previsto")).toBeInTheDocument();

    // 4 KPIs
    expect(screen.getAllByText("Em execução").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Paralisadas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Concluídas").length).toBeGreaterThan(0);
    expect(screen.getByText("Avanço físico médio")).toBeInTheDocument();
  });

  it("renderiza a seção 'Onde estão as obras' com alternância urbana/território e lista de cards", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(
      screen.getByRole("heading", { name: "Onde estão as obras" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Área urbana" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Todo o território" }),
    ).toBeInTheDocument();

    // Lista de obras
    expect(
      screen.getAllByText("Construção de Escola Modelo").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Reforma da Ponte do Rio Carangola").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Revitalização da Praça da Matriz").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Extensão da Rede de Iluminação Rural").length,
    ).toBeGreaterThan(0);
  });

  it("renderiza a seção dedicada de obras paralisadas com fundamentação legal oficial", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    // Seção de paralisadas
    expect(
      screen.getByRole("heading", { name: "Obras paralisadas" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Atenção especial")).toBeInTheDocument();
    expect(
      screen.getByText("Atraso no repasse do convênio estadual"),
    ).toBeInTheDocument();

    // Link oficial da Lei 14.133/2021 (Regra 20)
    const legalLink = screen.getByRole("link", {
      name: /Art\. 115, §6º da Lei nº 14\.133\/2021/i,
    });
    expect(legalLink).toBeInTheDocument();
    expect(legalLink).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art115p6",
    );
    expect(legalLink).toHaveAttribute("target", "_blank");
    expect(legalLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("permite filtrar obras por status clicando na pílula correspondente", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    const tabConcluidas = screen.getByRole("tab", { name: /Concluída/i });
    fireEvent.click(tabConcluidas);

    // Na lista de cards
    expect(
      screen.getAllByText("Revitalização da Praça da Matriz").length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText("Construção de Escola Modelo"),
    ).not.toBeInTheDocument();
  });

  it("filtra obras por busca textual considerando nome ou órgão", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    const searchInput = screen.getByLabelText("Buscar obras públicas");
    expect(searchInput).toBeInTheDocument();

    // Busca textual
    fireEvent.change(searchInput, { target: { value: "ponte" } });

    expect(
      screen.getAllByText("Reforma da Ponte do Rio Carangola").length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText("Construção de Escola Modelo"),
    ).not.toBeInTheDocument();
  });

  it("exibe box expandido de detalhes com dados de previsão e fonte ObrasGov.br ao selecionar uma obra", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    const obraButtons = screen.getAllByRole("button", {
      name: /Construção de Escola Modelo/i,
    });
    fireEvent.click(obraButtons[0]);

    // Box expandido com detalhes e menção a ObrasGov.br
    expect(screen.getByText("Órgão Responsável")).toBeInTheDocument();
    expect(screen.getByText("Previsão")).toBeInTheDocument();
    expect(screen.getAllByText("Última Medição").length).toBeGreaterThan(0);
    expect(screen.getByText(/Fonte: ObrasGov\.br/i)).toBeInTheDocument();
    const cipiLink = screen.getByRole("link", {
      name: /Ver no Cadastro de Obras/i,
    });
    expect(cipiLink).toBeInTheDocument();
    expect(cipiLink).toHaveAttribute(
      "href",
      "https://cipi.economia.gov.br/cipi-frontend/acesso-livre/visao-geral-intervencao/OBR-001",
    );

    const detalhesBtns = screen.getAllByRole("button", {
      name: /Ver detalhes/i,
    });
    expect(detalhesBtns.length).toBeGreaterThan(0);
    fireEvent.click(detalhesBtns[0]);

    // Modal de Detalhes da Obra deve ser aberto
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText("Auditoria de Avanço Físico vs. Financeiro"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Execução Física Oficial"),
    ).toBeInTheDocument();
  });

  it("abre o modal de detalhes ao acionar Ver detalhes na seção de obras paralisadas", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    const paralisadasSection = screen.getByRole("region", {
      name: /Obras Paralisadas/i,
    });
    const verDetalhesParalisadaBtn = within(paralisadasSection).getByRole(
      "button",
      { name: /Ver detalhes/i },
    );
    fireEvent.click(verDetalhesParalisadaBtn);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText("Atenção Cívica: Obra Paralisada"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Atraso no repasse do convênio estadual"),
    ).toBeInTheDocument();
  });

  it("permite alternar abas mobile entre Mapa e Lista e usar o botão flutuante de território", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    // Botões mobile Mapa e Lista
    const btnMapa = screen.getByRole("button", { name: "Mapa" });
    const btnLista = screen.getByRole("button", { name: "Lista" });
    expect(btnMapa).toBeInTheDocument();
    expect(btnLista).toBeInTheDocument();

    // No modo Mapa (padrão mobile), o carrossel horizontal de cards e instrução estão visíveis
    expect(
      screen.getByText("Deslize os cards ou toque num ponto do mapa"),
    ).toBeInTheDocument();

    // Botão flutuante de território mobile
    const floatingTerritorioBtn = screen.getByRole("button", {
      name: "Ver todo o território",
    });
    expect(floatingTerritorioBtn).toBeInTheDocument();

    // Ao clicar no botão flutuante, altera o modo para 'territorio' e atualiza o label
    fireEvent.click(floatingTerritorioBtn);
    expect(
      screen.getByRole("button", { name: "Ver área urbana" }),
    ).toBeInTheDocument();

    // Ao alternar para a aba 'Lista' no mobile
    fireEvent.click(btnLista);
    expect(screen.getByText("Maior valor primeiro")).toBeInTheDocument();
  });

  it("renderiza a seção de disclaimer cívico com orientação para cobrança de vereadores e link do ObrasGov.br", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(
      screen.getByRole("heading", {
        name: "Notou obras sem contrato ou licitação vinculados?",
      }),
    ).toBeInTheDocument();

    const btnCopiar = screen.getByRole("button", {
      name: /Copiar mensagem para cobrar vereador ou autoridade/i,
    });
    expect(btnCopiar).toBeInTheDocument();

    const disclaimerSection = screen.getByRole("region", {
      name: /Notou obras sem contrato ou licitação vinculados\?/i,
    });
    expect(disclaimerSection).toBeInTheDocument();

    const linkConhecerObrasGov = within(disclaimerSection).getByRole("link", {
      name: /Conhecer o ObrasGov\.br/i,
    });
    expect(linkConhecerObrasGov).toHaveAttribute(
      "href",
      "https://dd-publico.serpro.gov.br/extensions/painel/ObrasgovbrIntervencao.html",
    );
  });
});
