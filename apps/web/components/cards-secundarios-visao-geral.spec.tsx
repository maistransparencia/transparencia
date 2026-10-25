import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardsSecundariosVisaoGeral } from "./cards-secundarios-visao-geral";

const coresDeFundo = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("[style]")).map(
    (elemento) => elemento.style.backgroundColor,
  );

describe("CardsSecundariosVisaoGeral", () => {
  it("aplica corToken nas barras de antiguidade e fallback por destaque", () => {
    const { container } = render(
      <CardsSecundariosVisaoGeral
        despesas={{
          totalEmpenhadoFormatted: "R$ 1",
          antiguidadeBars: [
            { year: "A", percentage: 50, corToken: "ok" },
            { year: "B", percentage: 50, isCurrentYear: false },
            { year: "C", percentage: 50 },
          ],
        }}
      />,
    );
    expect(coresDeFundo(container)).toEqual([
      "var(--ok)",
      "var(--line)",
      "var(--danger)",
    ]);
  });

  it("usa tokens nas barras bipartidas", () => {
    const { container } = render(
      <CardsSecundariosVisaoGeral
        despesas={{
          antiguidadeBars: [
            {
              year: "A",
              percentage: 80,
              percentageLiquidado: 40,
              percentageEmpenhado: 40,
              liquidadoCorToken: "ok",
            },
          ],
        }}
      />,
    );
    const cores = coresDeFundo(container);
    expect(cores).toContain("var(--ok)");
    expect(cores).toContain("var(--line)");
  });

  it("barra de progresso da folha usa brand", () => {
    const { container } = render(
      <CardsSecundariosVisaoGeral
        pessoal={{
          receitaFolhaPercentFormatted: "40%",
          receitaFolhaPercentValue: 40,
        }}
      />,
    );
    expect(coresDeFundo(container)).toContain("var(--brand)");
  });
});
