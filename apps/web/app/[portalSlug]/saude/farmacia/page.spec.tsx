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

const { default: FarmaciaPage } = await import("./page");

function makeRaw(
  farmacia: Record<string, unknown>,
  busca = "",
  idUnidade: string | null = null,
) {
  return {
    portalSlug: "portal_x",
    portalName: "Prefeitura X",
    context: { busca, idUnidade, limiteUnidades: 10 },
    farmacia: {
      status: "conforme",
      dataColeta: "2026-10-20",
      dataPosicaoMaisRecente: "2026-10-18",
      diasDesdePosicaoMaisRecente: 2,
      totalUnidades: 0,
      unidades: [],
      ...farmacia,
    },
  };
}

const props = {
  params: Promise.resolve({ portalSlug: "portal_x" }),
  searchParams: Promise.resolve({}),
};

describe("FarmaciaPage", () => {
  it("conforme sem busca: selo com data, campo e sem lista", async () => {
    loadFarmaciaDataMock.mockResolvedValue(makeRaw({}));
    render(await FarmaciaPage(props));
    expect(screen.getByText(/Estoque Transparente/)).toHaveTextContent(
      "Atualizado em",
    );
    expect(
      screen.getByRole("form", { name: "Busca de medicamentos" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("conforme com busca: lista por unidade, paginacao e limpar filtro", async () => {
    loadFarmaciaDataMock.mockResolvedValue(
      makeRaw(
        {
          totalUnidades: 3,
          unidades: [
            {
              idUnidade: "1",
              nomeUnidade: "UBS Centro",
              enderecoUnidade: null,
              telefoneUnidade: null,
              latitudeUnidade: null,
              longitudeUnidade: null,
              href: "/portal_x/saude/farmacia?q=dip&unidade=1",
              medicamentos: [
                {
                  nomeMedicamento: "Dipirona",
                  quantidadeEstoque: 10,
                  dataPosicaoEstoque: "2026-10-18",
                },
              ],
            },
          ],
        },
        "dip",
      ),
    );
    render(await FarmaciaPage(props));
    expect(screen.getByText("UBS Centro")).toBeInTheDocument();
    expect(screen.getByText("Dipirona")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver mais unidades" }),
    ).toHaveAttribute("href", "/portal_x/saude/farmacia?q=dip&limite=20");
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
      screen.queryByRole("form", { name: "Busca de medicamentos" }),
    ).toBeNull();
  });

  it("indisponivel: mensagem neutra", async () => {
    loadFarmaciaDataMock.mockResolvedValue(makeRaw({ status: "indisponivel" }));
    render(await FarmaciaPage(props));
    expect(screen.getByText(/não estão disponíveis/)).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Busca de medicamentos" }),
    ).toBeNull();
  });
});
