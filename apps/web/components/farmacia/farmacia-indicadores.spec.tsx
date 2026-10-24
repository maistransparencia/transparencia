import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FarmaciaIndicadores } from "./farmacia-indicadores";

describe("FarmaciaIndicadores", () => {
  it("renderiza os cartoes com nota de atencao", () => {
    render(
      <FarmaciaIndicadores
        indicadores={[
          {
            codigo: "a",
            rotulo: "Unidades que informaram estoque",
            valor: "6",
            nota: "Na última lista divulgada",
            notaAtencao: false,
          },
          {
            codigo: "b",
            rotulo: "Remédios essenciais no estoque",
            valor: "5 de 7",
            nota: "2 não aparecem na lista de estoque",
            notaAtencao: true,
          },
        ]}
      />,
    );
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(
      screen.getByText("2 não aparecem na lista de estoque").className,
    ).toContain("text-attention");
  });

  it("sem indicadores omite o bloco", () => {
    const { container } = render(<FarmaciaIndicadores indicadores={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
