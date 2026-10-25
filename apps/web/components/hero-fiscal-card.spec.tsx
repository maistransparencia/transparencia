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
});
