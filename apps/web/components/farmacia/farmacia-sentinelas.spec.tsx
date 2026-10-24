import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type FarmaciaSentinelaItem,
  FarmaciaSentinelas,
} from "./farmacia-sentinelas";

function item(
  parcial: Partial<FarmaciaSentinelaItem> & { nomePrincipioAtivo: string },
): FarmaciaSentinelaItem {
  return {
    codigoPrincipioAtivo: parcial.nomePrincipioAtivo.toLowerCase(),
    codigoCategoria: "cardiovascular",
    rotuloCategoria: "Coração e pressão",
    status: "no_estoque",
    unidadesComRegistro: 3,
    unidadesSomenteCombinacao: 0,
    href: `/portal_x/saude/farmacia?q=${parcial.nomePrincipioAtivo}`,
    ...parcial,
  };
}

const essenciais = [
  item({ nomePrincipioAtivo: "Losartana" }),
  item({
    nomePrincipioAtivo: "Captopril",
    status: "sem_registro",
    unidadesComRegistro: 0,
  }),
  item({
    nomePrincipioAtivo: "Hidroclorotiazida",
    status: "somente_combinacao",
    unidadesComRegistro: 0,
    unidadesSomenteCombinacao: 2,
  }),
  item({
    nomePrincipioAtivo: "Metformina",
    codigoCategoria: "diabetes",
    rotuloCategoria: "Diabetes",
  }),
];
const categorias = [
  { codigo: "cardiovascular", rotulo: "Coração e pressão" },
  { codigo: "diabetes", rotulo: "Diabetes" },
];

describe("FarmaciaSentinelas", () => {
  it("usa o total de unidades dos dados no subtitulo, nos rotulos e nos quadradinhos", () => {
    const { container } = render(
      <FarmaciaSentinelas
        essenciais={essenciais}
        categorias={categorias}
        totalUnidadesAtivas={5}
      />,
    );
    expect(screen.getByText(/Em quantas das 5 unidades/)).toBeInTheDocument();
    expect(screen.getAllByText("3 de 5 unidades")).toHaveLength(2);
    const quadradinhos = screen
      .getByRole("link", { name: /Losartana/ })
      .querySelectorAll("span.rounded-\\[2px\\]");
    expect(quadradinhos).toHaveLength(5);
    expect(
      [...quadradinhos].filter((q) => q.className.includes("bg-accent")),
    ).toHaveLength(3);
    expect(container.textContent).not.toContain("8 unidades");
  });

  it("mostra rotulos de ausencia e combinacao sem afirmar que acabou", () => {
    render(
      <FarmaciaSentinelas
        essenciais={essenciais}
        categorias={categorias}
        totalUnidadesAtivas={5}
      />,
    );
    expect(screen.getByText("não aparece no estoque")).toBeInTheDocument();
    expect(screen.getByText("só em combinação")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/esgotad|zerad/i);
  });

  it("links levam para a busca e o filtro de categoria reduz a lista", () => {
    render(
      <FarmaciaSentinelas
        essenciais={essenciais}
        categorias={categorias}
        totalUnidadesAtivas={5}
      />,
    );
    expect(screen.getByRole("link", { name: /Losartana/ })).toHaveAttribute(
      "href",
      "/portal_x/saude/farmacia?q=Losartana",
    );
    fireEvent.click(screen.getByRole("button", { name: "Diabetes" }));
    expect(screen.queryByRole("link", { name: /Losartana/ })).toBeNull();
    expect(
      screen.getByRole("link", { name: /Metformina/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    expect(screen.getByRole("link", { name: /Losartana/ })).toBeInTheDocument();
  });

  it("explicacao recolhivel preserva o link da RENAME", () => {
    render(
      <FarmaciaSentinelas
        essenciais={essenciais}
        categorias={categorias}
        totalUnidadesAtivas={5}
      />,
    );
    expect(screen.getByText("Como ler esta lista")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /RENAME, edição 2024/ }),
    ).toHaveAttribute("target", "_blank");
  });

  it("nao renderiza sem essenciais ou sem unidades ativas", () => {
    const { container, rerender } = render(
      <FarmaciaSentinelas
        essenciais={[]}
        categorias={[]}
        totalUnidadesAtivas={5}
      />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(
      <FarmaciaSentinelas
        essenciais={essenciais}
        categorias={categorias}
        totalUnidadesAtivas={0}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
