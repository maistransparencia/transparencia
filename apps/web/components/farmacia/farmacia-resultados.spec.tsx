import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  FarmaciaResultados,
  type FarmaciaResultadosProps,
} from "./farmacia-resultados";

const props: FarmaciaResultadosProps = {
  busca: "dipirona",
  unidades: [
    {
      idUnidade: "u1",
      nomeUnidade: "UBS Centro",
      enderecoUnidade: "Rua A, 1",
      telefoneUnidade: "3333-0000",
      href: "/portal_x/saude/farmacia?q=dipirona&unidade=u1",
      medicamentos: [
        {
          nomeMedicamento: "Dipirona 500mg",
          quantidadeEstoque: 120,
          dataPosicaoEstoque: "2026-01-10",
        },
      ],
    },
  ],
  mapMarkers: [],
  hasMaisUnidades: false,
  maisUnidadesHref: "/portal_x/saude/farmacia?q=dipirona&limite=20",
  unidadeFiltrada: false,
  limparFiltroUnidadeHref: "/portal_x/saude/farmacia?q=dipirona",
};

describe("FarmaciaResultados", () => {
  it("sem unidades mostra estado vazio e limpa filtros quando filtrado", () => {
    render(
      <FarmaciaResultados {...props} unidades={[]} unidadeFiltrada={true} />,
    );
    expect(screen.getByText(/Nenhuma unidade com estoque/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Limpar filtros" }),
    ).toHaveAttribute("href", props.limparFiltroUnidadeHref);
  });

  it("lista unidade, medicamento e link para filtrar", () => {
    render(<FarmaciaResultados {...props} />);
    expect(screen.getByText("UBS Centro")).toBeInTheDocument();
    expect(screen.getByText("Dipirona 500mg")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Filtrar por esta unidade/ }),
    ).toHaveAttribute("href", props.unidades[0].href);
    expect(
      screen.queryByRole("link", { name: /Ver mais unidades/ }),
    ).toBeNull();
  });

  it("unidade filtrada oculta o link de filtrar e mostra limpar", () => {
    render(<FarmaciaResultados {...props} unidadeFiltrada={true} />);
    expect(screen.queryByText(/Filtrar por esta unidade/)).toBeNull();
    expect(
      screen.getByRole("link", { name: "Limpar filtros" }),
    ).toBeInTheDocument();
  });

  it("mostra Ver mais unidades quando ha mais", () => {
    render(<FarmaciaResultados {...props} hasMaisUnidades={true} />);
    expect(
      screen.getByRole("link", { name: "Ver mais unidades" }),
    ).toHaveAttribute("href", props.maisUnidadesHref);
  });

  it("renderiza o mapa so com coordenada valida", () => {
    const { container, rerender } = render(<FarmaciaResultados {...props} />);
    expect(container.querySelector("img")).toBeNull();
    rerender(
      <FarmaciaResultados
        {...props}
        mapMarkers={[{ id: "u1", latitude: -20.9, longitude: -42 }]}
      />,
    );
    expect(
      screen.getByAltText("Mapa das unidades com o medicamento em estoque"),
    ).toBeInTheDocument();
  });
});
