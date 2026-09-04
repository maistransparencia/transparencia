import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DecomposicaoDividaPopover,
  type EntidadeDividaItemDTO,
} from "./decomposicao-divida-popover";

describe("DecomposicaoDividaPopover Component", () => {
  const mockDecomposicao: EntidadeDividaItemDTO[] = [
    {
      empresaId: "2",
      entidadeNome: "Fundo Municipal de Saúde",
      valorDivida: 70000,
      percentual: 70,
    },
    {
      empresaId: "1",
      entidadeNome: "Prefeitura Municipal",
      valorDivida: 30000,
      percentual: 30,
    },
  ];

  it("deve renderizar o gatilho acessível com atributos WAI-ARIA adequados", () => {
    render(
      <DecomposicaoDividaPopover
        categoriaTitulo="Combustíveis & Frotas"
        dividaRealTotal={100000}
        decomposicao={mockDecomposicao}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /ver decomposição da dívida de combustíveis & frotas/i,
    });
    expect(trigger).toBeDefined();
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("deve abrir o popover ao clicar no gatilho exibindo entidades, valores e percentuais", () => {
    render(
      <DecomposicaoDividaPopover
        categoriaTitulo="Combustíveis & Frotas"
        dividaRealTotal={100000}
        decomposicao={mockDecomposicao}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /ver decomposição da dívida de combustíveis & frotas/i,
    });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    expect(screen.getByText("Decomposição da Dívida Real")).toBeDefined();
    expect(screen.getByText(/Fundo Municipal de Saúde/i)).toBeDefined();
    expect(screen.getByText(/Prefeitura Municipal/i)).toBeDefined();
    expect(screen.getByText("70%")).toBeDefined();
    expect(screen.getByText("30%")).toBeDefined();
    expect(
      screen.getByText(/empenhos liquidados do exercício ainda não pagos/i),
    ).toBeDefined();
  });

  it("deve fechar o popover ao clicar no botão de fechar", () => {
    render(
      <DecomposicaoDividaPopover
        categoriaTitulo="Combustíveis & Frotas"
        dividaRealTotal={100000}
        decomposicao={mockDecomposicao}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /ver decomposição da dívida de combustíveis & frotas/i,
    });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeDefined();

    const closeBtn = screen.getByRole("button", {
      name: /fechar detalhamento/i,
    });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("deve fechar o popover ao pressionar Escape", () => {
    render(
      <DecomposicaoDividaPopover
        categoriaTitulo="Combustíveis & Frotas"
        dividaRealTotal={100000}
        decomposicao={mockDecomposicao}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /ver decomposição da dívida de combustíveis & frotas/i,
    });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("deve fechar o popover ao clicar fora", () => {
    render(
      <div>
        <div data-testid="outside">Fora</div>
        <DecomposicaoDividaPopover
          categoriaTitulo="Combustíveis & Frotas"
          dividaRealTotal={100000}
          decomposicao={mockDecomposicao}
        />
      </div>,
    );

    const trigger = screen.getByRole("button", {
      name: /ver decomposição da dívida de combustíveis & frotas/i,
    });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("deve renderizar barra cheia quando houver entidade única com 100%", () => {
    const singleEntidade: EntidadeDividaItemDTO[] = [
      {
        empresaId: "1",
        entidadeNome: "Gabinete do Prefeito",
        valorDivida: 50000,
        percentual: 100,
      },
    ];

    render(
      <DecomposicaoDividaPopover
        categoriaTitulo="Locação de Imóveis"
        dividaRealTotal={50000}
        decomposicao={singleEntidade}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /ver decomposição da dívida de locação de imóveis/i,
    });
    fireEvent.click(trigger);

    expect(screen.getByText("100%")).toBeDefined();
    expect(screen.getByText("Gabinete do Prefeito")).toBeDefined();
  });
});
