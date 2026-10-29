import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroFiscalCard } from "./hero-fiscal-card";

describe("HeroFiscalCard", () => {
  it("exibe a origem da arrecadação como título de seção de nível 2", () => {
    render(
      <HeroFiscalCard
        portalName="Portal"
        originBreakdown={[
          { label: "Transferências", amountPerReal: "R$ 0,60", percentage: 60 },
          {
            label: "Tributos próprios",
            amountPerReal: "R$ 0,40",
            percentage: 40,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: /de onde vem cada/i }),
    ).toBeInTheDocument();
  });

  it("aplica a cor da barra por token e usa ink como fallback nas origens", () => {
    const { container } = render(
      <HeroFiscalCard
        originBreakdown={[
          { label: "A", percentage: 60, corToken: "ok" },
          { label: "B", percentage: 40 },
        ]}
      />,
    );
    const cores = Array.from(
      container.querySelectorAll<HTMLElement>("[style*='width']"),
    ).map((barra) => barra.style.backgroundColor);
    expect(cores).toContain("var(--ok-fill)");
    expect(cores.filter((cor) => cor === "var(--brand-fill)")).toHaveLength(1);
    expect(cores.filter((cor) => cor === "var(--ink)")).toHaveLength(1);
  });
});
