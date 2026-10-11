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
  useSearchParams: () => new URLSearchParams(),
}));

const { default: ObrasPage } = await import("./page");

function makeRawObrasData(): RawData {
  return {
    portalSlug: "porciuncula_prefeitura",
    portalConfig: {
      displayName: "Porciúncula",
      uf: "RJ",
    } as unknown as Awaited<
      ReturnType<typeof import("@transparencia/db").getPortalConfig>
    >,
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
      percentualMedioExecucaoFisica: 62.5,
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
        dataUltimaMedicao: "2026-02-15",
        latitude: -20.965,
        longitude: -42.042,
        motivoParalisacao: "Atraso no repasse do convênio estadual",
        dataInicioPrevista: "2025-05-01",
        dataFimPrevista: "2026-06-30",
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

  it("renderiza cabeçalho, fundamentação legal e KPIs consolidados", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(
      screen.getByRole("heading", { name: "Obras Públicas & Impacto Urbano" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Porciúncula \(RJ\)/i)).toBeInTheDocument();

    // Link oficial da Lei 14.133/2021
    const legalLink = screen.getByRole("link", {
      name: /Lei nº 14.133\/2021/i,
    });
    expect(legalLink).toBeInTheDocument();
    expect(legalLink).toHaveAttribute("target", "_blank");
    expect(legalLink).toHaveAttribute("rel", "noopener noreferrer");

    // KPIs
    expect(screen.getByText("Total de Obras")).toBeInTheDocument();
    expect(screen.getAllByText("Em Execução").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Paralisadas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Concluídas").length).toBeGreaterThan(0);
  });

  it("renderiza a lista de obras e destaca badges de status e localização não georreferenciada", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByText("Construção de Escola Modelo")).toBeInTheDocument();
    expect(
      screen.getByText("Reforma da Ponte do Rio Carangola"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Revitalização da Praça da Matriz"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Extensão da Rede de Iluminação Rural"),
    ).toBeInTheDocument();

    // Obra sem coordenadas exibe badge explicativo
    expect(
      screen.getByText("Localização não georreferenciada"),
    ).toBeInTheDocument();
  });

  it("abre o painel de resumo com detalhes completos ao selecionar uma obra", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    const obraButton = screen.getByRole("button", {
      name: /Ver detalhes da obra Reforma da Ponte do Rio Carangola/i,
    });
    fireEvent.click(obraButton);

    // Painel resumo deve ser exibido com detalhes
    const painel = screen.getByRole("region", {
      name: "Resumo da obra selecionada",
    });
    expect(painel).toBeInTheDocument();
    expect(
      within(painel).getByText("Atraso no repasse do convênio estadual"),
    ).toBeInTheDocument();
    expect(
      within(painel).getByText("Investimento Previsto"),
    ).toBeInTheDocument();
    expect(within(painel).getByText("Previsão de Término")).toBeInTheDocument();
  });

  it("permite filtrar obras por status clicando na pílula correspondente", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    const tabParalisadas = screen.getByRole("tab", { name: /Paralisadas/i });
    fireEvent.click(tabParalisadas);

    // Deve exibir a obra paralisada e ocultar as outras da lista filtrada
    expect(
      screen.getByText("Reforma da Ponte do Rio Carangola"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Construção de Escola Modelo"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Revitalização da Praça da Matriz"),
    ).not.toBeInTheDocument();
  });

  it("filtra obras por busca textual considerando nome ou órgão com suporte a acentuação", async () => {
    loadObrasDataMock.mockResolvedValue(makeRawObrasData());

    const page = await ObrasPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    const searchInput = screen.getByLabelText("Buscar obras públicas");
    expect(searchInput).toBeInTheDocument();

    // Digita termo sem acento buscando obra com acento (normalização NFD)
    fireEvent.change(searchInput, { target: { value: "ponte" } });

    expect(
      screen.getByText("Reforma da Ponte do Rio Carangola"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Construção de Escola Modelo"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Revitalização da Praça da Matriz"),
    ).not.toBeInTheDocument();

    // Busca por órgão com acentuação
    fireEvent.change(searchInput, { target: { value: "Educação" } });

    expect(screen.getByText("Construção de Escola Modelo")).toBeInTheDocument();
    expect(
      screen.queryByText("Reforma da Ponte do Rio Carangola"),
    ).not.toBeInTheDocument();
  });
});
