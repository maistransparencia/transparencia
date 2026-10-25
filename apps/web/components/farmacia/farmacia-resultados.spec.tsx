import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./farmacia-mapa", () => ({
  FarmaciaMapa: ({ marcadores }: { marcadores: unknown[] }) => (
    <div data-testid="mapa-mock">{marcadores.length} marcadores</div>
  ),
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function Mapa(props: { marcadores: unknown[] }) {
      return <div data-testid="mapa-mock">{props.marcadores.length}</div>;
    },
}));

const { FarmaciaResultados } = await import("./farmacia-resultados");
type Props = React.ComponentProps<typeof FarmaciaResultados>;

const props: Props = {
  busca: "omeprazol",
  resumo: "1 remédio em 2 de 4 unidades",
  unidades: [
    {
      numero: 1,
      idUnidade: "u1",
      nomeUnidade: "Farmácia Básica",
      enderecoUnidade: "Rua A, 1",
      telefoneUnidade: "(22) 3333-0000",
      telefoneHref: "tel:2233330000",
      totalQuantidadeEstoque: 100,
      medicamentos: [
        { nomeMedicamento: "Omeprazol 20 mg", quantidadeEstoque: 100 },
      ],
    },
    {
      numero: 2,
      idUnidade: "u2",
      nomeUnidade: "Módulo Norte",
      enderecoUnidade: null,
      telefoneUnidade: null,
      telefoneHref: null,
      totalQuantidadeEstoque: 30,
      medicamentos: [
        { nomeMedicamento: "Omeprazol 20 mg", quantidadeEstoque: 30 },
      ],
    },
  ],
  remedios: [
    {
      nomeMedicamento: "Omeprazol 20 mg",
      totalQuantidadeEstoque: 130,
      totalUnidadesComEstoque: 2,
      unidades: [
        {
          numero: 1,
          idUnidade: "u1",
          nomeUnidade: "Farmácia Básica",
          quantidadeEstoque: 100,
          percentualBarra: 100,
        },
        {
          numero: 2,
          idUnidade: "u2",
          nomeUnidade: "Módulo Norte",
          quantidadeEstoque: 30,
          percentualBarra: 30,
        },
      ],
    },
  ],
  marcadores: [
    {
      id: "u1",
      numero: 1,
      nome: "Farmácia Básica",
      latitude: -20.9,
      longitude: -42,
    },
  ],
};

describe("FarmaciaResultados", () => {
  it("por unidade: titulo com o termo, resumo, cards numerados e mapa", () => {
    render(<FarmaciaResultados {...props} />);
    expect(
      screen.getByRole("heading", { name: "Onde encontrar “omeprazol”" }),
    ).toBeInTheDocument();
    expect(screen.getByText(props.resumo)).toBeInTheDocument();
    expect(screen.getByText("Farmácia Básica")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "(22) 3333-0000" }),
    ).toHaveAttribute("href", "tel:2233330000");
    expect(screen.getByTestId("mapa-mock")).toBeInTheDocument();
    expect(screen.getByText("Tem o remédio")).toBeInTheDocument();
    expect(screen.queryByText(/Filtrar por esta unidade/)).toBeNull();
  });

  it("mapa fica acima da lista no mobile e sticky so no desktop", () => {
    const { container } = render(<FarmaciaResultados {...props} />);
    const layout = container.querySelector("ul")?.parentElement;
    expect(layout?.className).toContain("flex-col-reverse");
    expect(layout?.className).toContain("lg:flex-row");
    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("lg:sticky");
    expect(aside?.className).toContain("lg:top-4");
    expect(aside?.className).not.toMatch(/(^|\s)sticky/);
    expect(aside?.querySelector("div")?.className).toContain("h-60");
  });

  it("expoe data-unidade-id nas duas visoes", () => {
    const { container } = render(<FarmaciaResultados {...props} />);
    const ids = () =>
      [...container.querySelectorAll("li[data-unidade-id]")].map((el) =>
        el.getAttribute("data-unidade-id"),
      );
    expect(ids()).toEqual(["u1", "u2"]);
    fireEvent.click(screen.getByRole("button", { name: "Por remédio" }));
    expect(ids()).toEqual(["u1", "u2"]);
  });

  it("foco no card destaca a unidade", () => {
    render(<FarmaciaResultados {...props} />);
    const card = screen.getByText("Farmácia Básica").closest("li");
    fireEvent.focus(card as HTMLElement);
    expect(card?.className).toContain("border-accent");
    fireEvent.blur(card as HTMLElement);
    expect(card?.className).not.toContain("border-accent");
  });

  it("alterna para a visao por remedio", () => {
    render(<FarmaciaResultados {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Por remédio" }));
    expect(screen.getByText(/130 em estoque · 2 unidades/)).toBeInTheDocument();
  });

  it("hover no card destaca a unidade", () => {
    render(<FarmaciaResultados {...props} />);
    const card = screen.getByText("Farmácia Básica").closest("li");
    fireEvent.mouseEnter(card as HTMLElement);
    expect(card?.className).toContain("border-accent");
    fireEvent.mouseLeave(card as HTMLElement);
    expect(card?.className).not.toContain("border-accent");
  });

  it("unidade sem coordenadas aparece na lista e sem marcadores oculta o mapa", () => {
    render(<FarmaciaResultados {...props} marcadores={[]} />);
    expect(screen.getByText("Módulo Norte")).toBeInTheDocument();
    expect(screen.queryByTestId("mapa-mock")).toBeNull();
  });

  it("sem resultado mostra card tracejado sem mapa e sem afirmar que acabou", () => {
    render(
      <FarmaciaResultados
        {...props}
        unidades={[]}
        remedios={[]}
        marcadores={[]}
      />,
    );
    expect(
      screen.getByText("“omeprazol” não aparece na lista de estoque"),
    ).toBeInTheDocument();
    expect(screen.getByText(/não quer dizer que acabou/)).toBeInTheDocument();
    expect(screen.queryByTestId("mapa-mock")).toBeNull();
    expect(document.body.textContent).not.toMatch(/esgotad|zerad/i);
  });
});
