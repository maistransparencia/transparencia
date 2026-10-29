import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FarmaciaIndicadores } from "./farmacia-indicadores";

describe("FarmaciaIndicadores", () => {
  it("recolhe a explicacao longa em um bloco expansivel", () => {
    render(
      <FarmaciaIndicadores
        indicadores={[
          {
            codigo: "lotes",
            rotulo: "Lotes",
            valor: "36",
            nota: "36 lotes, de 23 remédios diferentes.",
            notaAtencao: true,
            detalhe: {
              resumo: "102 remédios só com lote vencido",
              paragrafos: ["Primeiro.", "Segundo."],
            },
          },
        ]}
      />,
    );
    const resumo = screen.getByText("102 remédios só com lote vencido");
    expect(resumo.closest("details")).not.toHaveAttribute("open");
    expect(screen.getByText("Segundo.")).toBeInTheDocument();
  });

  it("renderiza os cartoes com nota de atencao", () => {
    render(
      <FarmaciaIndicadores
        indicadores={[
          {
            codigo: "a",
            rotulo: "Unidades que informaram estoque",
            valor: "6",
            nota: "Enviaram a lista mais recente",
            notaAtencao: false,
          },
          {
            codigo: "b",
            rotulo: "Essenciais na lista de estoque",
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
