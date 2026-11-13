import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { loadMock } = vi.hoisted(() => ({ loadMock: vi.fn() }));

vi.mock("./loader", () => ({ loadMetodologiaData: loadMock }));
vi.mock("@/lib/metadata", () => ({ createPortalMetadata: vi.fn() }));

const { default: MetodologiaPage } = await import("./page");

const renderizar = async (frescorFontes: unknown[], lacunas: unknown[]) => {
  loadMock.mockResolvedValue({
    portalSlug: "portal_x",
    frescorFontes,
    portalUrl: null,
    portalNome: null,
    fonteEmendasEstaduais: null,
    lacunas,
  });
  render(
    await MetodologiaPage({
      params: Promise.resolve({ portalSlug: "portal_x" }),
    }),
  );
};

describe("MetodologiaPage", () => {
  it("gera fontes e lacunas dos dados e linka para Como atualizamos", async () => {
    await renderizar(
      [
        {
          fonte: "pncp",
          descricaoDados: "as compras publicadas",
          nomeFonte: "PNCP",
          urlFonte: "https://pncp.gov.br",
          esferaFonte: "nacional",
          frequenciaEsperada: "semanal",
          ultimaColetaEm: null,
          situacao: "nao_monitorado",
        },
      ],
      [
        {
          codigo: "x",
          fonte: "todas_as_fontes",
          tipo: "lacuna",
          textoCidadao: "Texto da lacuna vindo do catálogo.",
        },
      ],
    );
    expect(screen.getByText("As compras publicadas")).toBeInTheDocument();
    expect(screen.getByText("PNCP")).toBeInTheDocument();
    expect(
      screen.getByText("Texto da lacuna vindo do catálogo."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("metodologia-cobertura")).toHaveTextContent(
      "Ainda não acompanhamos o dia em que o portal busca as fontes",
    );
    expect(
      screen.getByRole("link", { name: /quando buscamos cada fonte/i }),
    ).toHaveAttribute("href", "/portal_x/como-atualizamos");
  });

  it("sem dados mostra estado neutro, não zero", async () => {
    await renderizar([], []);
    expect(
      screen.getByText("Fontes ainda não disponíveis."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nenhuma lacuna conhecida no momento."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("metodologia-divergencias")).toBeNull();
  });
});
