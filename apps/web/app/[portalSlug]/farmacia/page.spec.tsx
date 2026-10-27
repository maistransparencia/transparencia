import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { loadFarmaciaDataMock } = vi.hoisted(() => ({
  loadFarmaciaDataMock: vi.fn(),
}));

vi.mock("./loader", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./loader")>()),
  loadFarmaciaData: loadFarmaciaDataMock,
}));
vi.mock("@/lib/metadata", () => ({ createPortalMetadata: vi.fn() }));
vi.mock("next/dynamic", () => ({
  default: () =>
    function MapaMock() {
      return <div data-testid="mapa-mock" />;
    },
}));

const { default: FarmaciaPage } = await import("./page");

function makeRaw(farmacia: Record<string, unknown>, busca = "") {
  return {
    portalSlug: "portal_x",
    portalName: "Prefeitura X",
    context: { busca },
    farmacia: {
      status: "conforme",
      dataColeta: "2026-10-20",
      dataPosicaoMaisRecente: "2026-10-18",
      diasDesdePosicaoMaisRecente: 2,
      totalUnidades: 0,
      totalQuantidadeEstoque: 0,
      totalApresentacoes: 0,
      unidades: [],
      remedios: [],
      ...farmacia,
    },
    sentinelas:
      farmacia.status === undefined || farmacia.status === "conforme"
        ? {
            totalUnidadesAtivas: 4,
            indicadores: {
              totalEssenciais: 1,
              essenciaisNoEstoque: 1,
              essenciaisSomenteCombinacao: 0,
              essenciaisSemRegistro: 0,
            },
            sentinelas: [
              {
                codigoPrincipioAtivo: "losartana",
                nomePrincipioAtivo: "Losartana",
                grupoTerapeutico: "cardiovascular",
                ordemExibicao: 1,
                destaqueCardInicial: true,
                unidadesComRegistro: 3,
                unidadesSomenteCombinacao: 0,
              },
            ],
          }
        : {
            totalUnidadesAtivas: 0,
            indicadores: {
              totalEssenciais: 0,
              essenciaisNoEstoque: 0,
              essenciaisSomenteCombinacao: 0,
              essenciaisSemRegistro: 0,
            },
            sentinelas: [],
          },
  };
}

const props = {
  params: Promise.resolve({ portalSlug: "portal_x" }),
  searchParams: Promise.resolve({}),
};

describe("FarmaciaPage", () => {
  it("conforme sem busca: cabecalho, selo, busca com chips, indicadores e sem resultados", async () => {
    loadFarmaciaDataMock.mockResolvedValue(makeRaw({}));
    render(await FarmaciaPage(props));
    expect(
      screen.getByRole("heading", { level: 1, name: "Farmácia SUS" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Temas/)).not.toBeInTheDocument();
    expect(screen.getByText(/Lista de estoque atualizada/)).toHaveTextContent(
      "18/10/2026",
    );
    expect(
      screen.getByRole("form", { name: "Busca de remédios" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Losartana" })).toHaveAttribute(
      "href",
      "/portal_x/farmacia?q=Losartana#resultados",
    );
    expect(
      screen.getByText("Unidades que informaram estoque"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Onde encontrar/)).toBeNull();
    expect(screen.queryByTestId("mapa-mock")).toBeNull();
  });

  it("conforme com busca: resultados por unidade com mapa e sem filtro por unidade", async () => {
    loadFarmaciaDataMock.mockResolvedValue(
      makeRaw(
        {
          totalUnidades: 1,
          totalQuantidadeEstoque: 10,
          totalApresentacoes: 1,
          unidades: [
            {
              idUnidade: "1",
              nomeUnidade: "UBS CENTRO",
              enderecoUnidade: null,
              telefoneUnidade: null,
              latitudeUnidade: -20.9,
              longitudeUnidade: -42,
              totalQuantidadeEstoque: 10,
              medicamentos: [
                {
                  nomeMedicamento: "Dipirona",
                  quantidadeEstoque: 10,
                  dataPosicaoEstoque: "2026-10-18",
                },
              ],
            },
          ],
          remedios: [
            {
              nomeMedicamento: "Dipirona",
              totalQuantidadeEstoque: 10,
              totalUnidadesComEstoque: 1,
              unidades: [{ idUnidade: "1", quantidadeEstoque: 10 }],
            },
          ],
        },
        "dip",
      ),
    );
    render(await FarmaciaPage(props));
    expect(
      screen.getByRole("heading", { name: "Onde encontrar “dip”" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ubs Centro")).toBeInTheDocument();
    expect(screen.getByText("Dipirona")).toBeInTheDocument();
    expect(screen.getByTestId("mapa-mock")).toBeInTheDocument();
    expect(screen.queryByText(/Filtrar por esta unidade/)).toBeNull();
    expect(screen.queryByText(/Ver mais unidades/)).toBeNull();
  });

  it("conforme com busca sem resultado: card tracejado sem mapa", async () => {
    loadFarmaciaDataMock.mockResolvedValue(makeRaw({}, "xyz"));
    render(await FarmaciaPage(props));
    expect(
      screen.getByText("“xyz” não aparece na lista de estoque"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("mapa-mock")).toBeNull();
  });

  it("fonte dos dados so aparece em conforme", async () => {
    loadFarmaciaDataMock.mockResolvedValue(makeRaw({}));
    const { unmount } = render(await FarmaciaPage(props));
    expect(screen.getByText("Fonte dos dados")).toBeInTheDocument();
    unmount();
    loadFarmaciaDataMock.mockResolvedValue(makeRaw({ status: "apagao" }));
    render(await FarmaciaPage(props));
    expect(screen.queryByText("Fonte dos dados")).toBeNull();
  });

  it("conforme: bloco de sentinelas abaixo da busca", async () => {
    loadFarmaciaDataMock.mockResolvedValue(makeRaw({}));
    render(await FarmaciaPage(props));
    expect(screen.getByText("Remédios essenciais")).toBeInTheDocument();
    expect(screen.getByText("3 de 4 unidades")).toBeInTheDocument();
  });

  it("apagao e indisponivel: sem bloco de sentinelas", async () => {
    loadFarmaciaDataMock.mockResolvedValue(makeRaw({ status: "apagao" }));
    const { unmount } = render(await FarmaciaPage(props));
    expect(screen.queryByText("Remédios essenciais")).toBeNull();
    unmount();
    loadFarmaciaDataMock.mockResolvedValue(makeRaw({ status: "indisponivel" }));
    render(await FarmaciaPage(props));
    expect(screen.queryByText("Remédios essenciais")).toBeNull();
  });

  it("apagao: sentinela com os dois botoes", async () => {
    loadFarmaciaDataMock.mockResolvedValue(makeRaw({ status: "apagao" }));
    render(await FarmaciaPage(props));
    expect(
      screen.getByRole("button", {
        name: /Copiar Requerimento de Fiscalização/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Compartilhar no WhatsApp/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Busca de remédios" }),
    ).toBeNull();
  });

  it("indisponivel: mensagem neutra", async () => {
    loadFarmaciaDataMock.mockResolvedValue(makeRaw({ status: "indisponivel" }));
    render(await FarmaciaPage(props));
    expect(screen.getByText(/não estão disponíveis/)).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Busca de remédios" }),
    ).toBeNull();
  });

  it("dica de 2 letras so aparece em conforme com busca curta", async () => {
    loadFarmaciaDataMock.mockResolvedValue(makeRaw({}, "d"));
    const { unmount } = render(await FarmaciaPage(props));
    expect(screen.getByText(/Digite pelo menos 2 letras/)).toBeInTheDocument();
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("d");
    unmount();
    for (const status of ["apagao", "indisponivel"]) {
      loadFarmaciaDataMock.mockResolvedValue(makeRaw({ status }, "d"));
      const { unmount: desmontar } = render(await FarmaciaPage(props));
      expect(screen.queryByText(/Digite pelo menos 2 letras/)).toBeNull();
      desmontar();
    }
  });
});
