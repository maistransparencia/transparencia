import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import { FarmaciaFonteDados } from "./farmacia-fonte-dados";

describe("FarmaciaFonteDados", () => {
  it("mostra fonte, lei e data da lista mais recente", () => {
    render(
      <FarmaciaFonteDados
        dataAtualizacao="2026-10-18"
        leiUrl="https://exemplo.gov.br/lei"
        portalSlug="portal_x"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Fonte dos dados" }),
    ).toBeInTheDocument();
    const fonte = screen.getByRole("link", {
      name: /BNAFAR\/Hórus — dados abertos/,
    });
    expect(fonte).toHaveAttribute("href", FONTES_OFICIAIS.bnafar.url);
    expect(fonte).toHaveAttribute("target", "_blank");
    expect(fonte).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByRole("link", { name: /Lei 14.654\/2023/ }),
    ).toHaveAttribute("href", "https://exemplo.gov.br/lei");
    expect(screen.getByText(/18\/10\/2026/)).toBeInTheDocument();
  });

  it("oferece o download da lista completa de estoque", () => {
    render(
      <FarmaciaFonteDados
        dataAtualizacao={null}
        leiUrl="https://x.y"
        portalSlug="portal_x"
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "Baixar a lista completa de estoque (planilha CSV)",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Traz os remédios que cada unidade informou/),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/esgotado|zerado|acabou/i);
  });

  it("omite a data quando nao existe", () => {
    render(
      <FarmaciaFonteDados
        dataAtualizacao={null}
        leiUrl="https://x.y"
        portalSlug="portal_x"
      />,
    );
    expect(screen.queryByText(/Lista mais recente:/)).toBeNull();
  });
});
