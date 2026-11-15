import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { loadMock } = vi.hoisted(() => ({ loadMock: vi.fn() }));

vi.mock("./loader", () => ({ loadComoAtualizamosData: loadMock }));
vi.mock("@/lib/metadata", () => ({ createPortalMetadata: vi.fn() }));

const { default: ComoAtualizamosPage } = await import("./page");

const renderizar = async (frescorFontes: unknown[]) => {
  loadMock.mockResolvedValue({
    portalSlug: "portal_x",
    frescorFontes,
    portalUrl: null,
    portalNome: null,
    fonteEmendasEstaduais: null,
  });
  render(
    await ComoAtualizamosPage({
      params: Promise.resolve({ portalSlug: "portal_x" }),
    }),
  );
};

describe("ComoAtualizamosPage", () => {
  it("lista a fonte com frequência e data de verificação", async () => {
    await renderizar([
      {
        fonte: "portal_municipal",
        descricaoDados: "sistema contábil",
        nomeFonte: "Fonte Exemplo",
        urlFonte: "https://fonte.exemplo.gov.br",
        esferaFonte: "nacional",
        frequenciaEsperada: "diaria",
        ultimaColetaEm: "2026-11-12T08:00:00.000Z",
        situacao: "coleta_em_dia",
      },
    ]);
    expect(
      screen.getByRole("heading", { name: "Sistema contábil" }),
    ).toBeInTheDocument();
    expect(screen.getByText("todo dia útil")).toBeInTheDocument();
    expect(screen.getByText("12/11/2026")).toBeInTheDocument();
    expect(screen.queryByText(/atualizado em/i)).not.toBeInTheDocument();
  });

  it("cita a fonte oficial com link quando o catálogo conhece a fonte", async () => {
    await renderizar([
      {
        fonte: "pncp",
        descricaoDados: "compras e contratos",
        nomeFonte: "PNCP",
        urlFonte: "https://pncp.gov.br",
        esferaFonte: "nacional",
        frequenciaEsperada: "semanal",
        ultimaColetaEm: "2026-11-12T08:00:00.000Z",
        situacao: "coleta_em_dia",
      },
    ]);
    expect(screen.getByText("Fonte oficial:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /PNCP/ })).toHaveAttribute(
      "href",
      "https://pncp.gov.br",
    );
  });

  it("fonte atrasada mostra aviso no topo", async () => {
    await renderizar([
      {
        fonte: "portal_municipal",
        descricaoDados: "sistema contábil",
        nomeFonte: "Fonte Exemplo",
        urlFonte: "https://fonte.exemplo.gov.br",
        esferaFonte: "nacional",
        frequenciaEsperada: "diaria",
        ultimaColetaEm: "2026-10-01T08:00:00.000Z",
        situacao: "coleta_atrasada",
      },
    ]);
    expect(
      screen.getByText("Fonte sem verificação no prazo"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sem verificação no prazo")).toBeInTheDocument();
  });

  it("separa as fontes sem data acompanhada das acompanhadas", async () => {
    await renderizar([
      {
        fonte: "siope",
        descricaoDados: "gastos com educação",
        nomeFonte: "Fonte Exemplo",
        urlFonte: "https://fonte.exemplo.gov.br",
        esferaFonte: "nacional",
        frequenciaEsperada: "mensal",
        ultimaColetaEm: null,
        situacao: "nao_monitorado",
      },
    ]);
    expect(screen.queryByTestId("como-atualizamos-fontes")).toBeNull();
    expect(screen.getByTestId("como-atualizamos-sem-data")).toHaveTextContent(
      "Gastos com educação",
    );
    expect(screen.queryByTestId("como-atualizamos-neutro")).toBeNull();
  });

  it("sem fonte monitorada: estado neutro", async () => {
    await renderizar([]);
    expect(screen.getByTestId("como-atualizamos-neutro")).toBeInTheDocument();
  });
});
