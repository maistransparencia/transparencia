import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RadarCivicoCardItem } from "@/app/[portalSlug]/view-model";
import { RadarCivicoFeed } from "./radar-civico-feed";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

const card = {
  anomaliaId: "a1",
  tipoAnomalia: "despesa_pico",
  titulo: "Despesa acima do padrão",
  grauSeveridade: "critico",
  textoFactual: "Valor acima do histórico do município.",
  ctaUrl: "/x/despesas",
} as unknown as RadarCivicoCardItem;

describe("RadarCivicoFeed", () => {
  it("usa o ano informado e mostra estado vazio neutro sem cartões", () => {
    render(<RadarCivicoFeed cards={[]} ano={2019} portalSlug="x" />);
    expect(
      screen.getByRole("heading", { level: 2, name: /2019/ }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("radar-empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("radar-linha")).not.toBeInTheDocument();
  });

  it("lista os avisos com severidade em texto e link de entendimento", () => {
    render(<RadarCivicoFeed cards={[card]} ano={2031} portalSlug="x" />);
    expect(screen.getByTestId("radar-linha")).toHaveAttribute(
      "href",
      "/x/despesas",
    );
    expect(screen.getByTestId("radar-severidade-badge")).toHaveTextContent(
      "Alta",
    );
    expect(screen.getByText("Entender →")).toBeInTheDocument();
  });
});
