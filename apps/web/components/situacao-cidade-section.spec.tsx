import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import posthog from "posthog-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SituacaoCidadeSection } from "./situacao-cidade-section";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...resto
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

const semAtencao = { emAtencao: false, motivo: null };

const propsBase = {
  situacao: {
    saude: { estado: "normal", ...semAtencao },
    obras: { estado: "normal", ...semAtencao },
    educacao: { estado: "normal", ...semAtencao },
  },
  ano: 2024,
  farmaciaStatus: "conforme",
  minimoSaude: null,
  resumoObras: {
    totalObras: 5,
    emExecucao: 2,
    paralisadas: 1,
    concluidas: 2,
    cadastradas: 0,
    canceladas: 0,
    valorTotalInvestimento: 0,
    valorEmExecucao: 0,
    valorParalisadas: 0,
    valorConcluidas: 0,
    valorCadastradas: 0,
    percentualMedioExecucaoFisica: null,
    obrasSemMedicaoCount: 0,
  },
  educacaoResumo: null,
  minimoEducacao: null,
  saudeDetailUrl: "/p/saude?ano=2024",
  obrasDetailUrl: "/p/obras?ano=2024",
  educacaoDetailUrl: "/p/educacao?ano=2024",
  farmaciaDetailUrl: "/p/farmacia",
  farmaciaExemplos: [
    { codigoPrincipioAtivo: "1", nomePrincipioAtivo: "Dipirona", href: "/x" },
  ],
} as unknown as React.ComponentProps<typeof SituacaoCidadeSection>;

describe("SituacaoCidadeSection compartilhar", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete (navigator as unknown as { share?: unknown }).share;
  });

  it("compartilha a URL da página de detalhe do card, sem wa.me", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: share,
      configurable: true,
    });
    const abrir = vi.spyOn(window, "open");

    render(<SituacaoCidadeSection {...propsBase} />);
    const botoes = screen.getAllByRole("button", { name: /Compartilhar/ });
    fireEvent.click(botoes[1] as HTMLElement);

    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share.mock.calls[0]?.[0].url).toContain("/p/obras?ano=2024");
    expect(abrir).not.toHaveBeenCalled();
    expect(posthog.capture).toHaveBeenCalledWith(
      "situacao_card_compartilhado",
      expect.objectContaining({ area: "obras", method: "native" }),
    );
  });

  it("remédios de exemplo viram links depois de 'Remédios comuns:'", () => {
    render(<SituacaoCidadeSection {...propsBase} />);
    expect(screen.getByText("Remédios comuns:")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Dipirona" });
    // display: contents apaga a semântica de lista no Safari; o role explícito a devolve.
    expect(link.closest("ul")?.getAttribute("role")).toBe("list");
    expect(link.className).not.toContain("border");
    expect(link.className).toContain("underline");
  });
});

describe("SituacaoCidadeSection mini mapa de obras", () => {
  it("leva direto à seção do mapa, e 'Ver detalhes' abre a página do topo", () => {
    render(
      <SituacaoCidadeSection
        {...propsBase}
        obrasCenter={[-21, -42]}
        obrasMarkers={[]}
      />,
    );
    expect(
      screen.getByRole("link", {
        name: "Ver no mapa interativo de obras públicas",
      }),
    ).toHaveAttribute("href", "/p/obras?ano=2024#secao-mapa-obras");
    const detalhes = screen
      .getAllByRole("link", { name: /Ver detalhes/ })
      .map((link) => link.getAttribute("href"));
    expect(detalhes).toContain("/p/obras?ano=2024");
  });
});
