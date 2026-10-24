import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FarmaciaSentinelas } from "./farmacia-sentinelas";

const grupos = [
  {
    codigo: "cardiovascular",
    rotulo: "Coração e pressão",
    itens: [
      {
        codigoPrincipioAtivo: "losartana",
        nomePrincipioAtivo: "Losartana",
        unidadesComRegistro: 3,
        href: "/portal_x/saude/farmacia?q=Losartana",
      },
      {
        codigoPrincipioAtivo: "captopril",
        nomePrincipioAtivo: "Captopril",
        unidadesComRegistro: 0,
        href: "/portal_x/saude/farmacia?q=Captopril",
      },
    ],
  },
];

describe("FarmaciaSentinelas", () => {
  it("renderiza grupos, contagens e links de busca", () => {
    render(<FarmaciaSentinelas grupos={grupos} totalUnidadesAtivas={5} />);
    expect(screen.getByText("Coração e pressão")).toBeInTheDocument();
    expect(
      screen.getByText("3 de 5 unidades que informaram estoque"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("sem registro de estoque informado"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Losartana/ })).toHaveAttribute(
      "href",
      "/portal_x/saude/farmacia?q=Losartana",
    );
    expect(screen.getByText(/RENAME 2024/)).toBeInTheDocument();
  });

  it("nunca usa esgotado ou zerado", () => {
    const { container } = render(
      <FarmaciaSentinelas grupos={grupos} totalUnidadesAtivas={5} />,
    );
    expect(container.textContent).not.toMatch(/esgotad|zerad/i);
  });

  it("nao renderiza sem grupos ou sem unidades ativas", () => {
    const { container } = render(
      <FarmaciaSentinelas grupos={[]} totalUnidadesAtivas={5} />,
    );
    expect(container).toBeEmptyDOMElement();
    const outro = render(
      <FarmaciaSentinelas grupos={grupos} totalUnidadesAtivas={0} />,
    );
    expect(outro.container).toBeEmptyDOMElement();
  });
});
