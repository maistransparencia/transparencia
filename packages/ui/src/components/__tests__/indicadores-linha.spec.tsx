import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IndicadoresLinha } from "../indicadores-linha";

describe("IndicadoresLinha", () => {
  it("renderiza rotulo, valor e nota de atencao sem cartoes arredondados", () => {
    const { container } = render(
      <IndicadoresLinha
        indicadores={[
          { codigo: "a", rotulo: "Taxa", valor: "30%", destaque: true },
          {
            codigo: "b",
            rotulo: "Casos",
            valor: 4,
            nota: "Atencao",
            notaAtencao: true,
          },
        ]}
      />,
    );
    expect(screen.getByText("30%").className).toContain("text-brand");
    expect(screen.getByText("4").className).toContain("text-ink");
    expect(screen.getByText("Atencao").className).toContain("text-warn-text");
    expect(container.querySelector("dl")?.className).toContain("divide-x");
    expect(container.innerHTML).not.toContain("rounded");
  });

  it("sem indicadores omite o bloco", () => {
    const { container } = render(<IndicadoresLinha indicadores={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
