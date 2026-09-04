import { fireEvent, render, screen } from "@testing-library/react";
import { type MultiSelectOption, Sidebar } from "@transparencia/ui";
import { describe, expect, it, vi } from "vitest";
import { EntidadeSelectCompact } from "./entidade-select-compact";

vi.mock("next/navigation", () => ({
  usePathname: () => "/porciuncula_prefeitura",
}));

describe("EntidadeSelectCompact Component", () => {
  const mockEntidades: MultiSelectOption[] = [
    { id: "1", nome: "PREFEITURA MUNICIPAL" },
    { id: "2", nome: "FUNDO MUNICIPAL DE SAÚDE" },
    { id: "3", nome: "CÂMARA MUNICIPAL" },
  ];

  it("deve renderizar o gatilho no estado consolidado padrão", () => {
    render(
      <EntidadeSelectCompact
        entidades={mockEntidades}
        selectedEntidades={[]}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /filtrar entidades públicas municipais/i,
    });
    expect(trigger).toBeDefined();
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Consolidado")).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("deve renderizar o nome amigável quando 1 entidade estiver selecionada", () => {
    render(
      <EntidadeSelectCompact
        entidades={mockEntidades}
        selectedEntidades={["2"]}
      />,
    );

    expect(screen.getByText("Fundo Municipal de Saúde")).toBeDefined();
  });

  it("deve renderizar a contagem quando múltiplas entidades estiverem selecionadas", () => {
    render(
      <EntidadeSelectCompact
        entidades={mockEntidades}
        selectedEntidades={["1", "2"]}
      />,
    );

    expect(screen.getByText("2 entidades")).toBeDefined();
  });

  it("deve abrir o popover com role='dialog' e aria-modal='true' ao clicar no gatilho", () => {
    render(
      <EntidadeSelectCompact
        entidades={mockEntidades}
        selectedEntidades={[]}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /filtrar entidades públicas municipais/i,
    });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/perímetro institucional/i)).toBeDefined();
    expect(screen.getByText("Todas (Consolidado)")).toBeDefined();
  });

  it("deve fechar o popover ao pressionar Escape", () => {
    render(
      <EntidadeSelectCompact
        entidades={mockEntidades}
        selectedEntidades={[]}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /filtrar entidades públicas municipais/i,
    });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("deve fechar o popover ao clicar fora via pointerdown", () => {
    render(
      <div>
        <div data-testid="outside">Fora</div>
        <EntidadeSelectCompact
          entidades={mockEntidades}
          selectedEntidades={[]}
        />
      </div>,
    );

    const trigger = screen.getByRole("button", {
      name: /filtrar entidades públicas municipais/i,
    });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("deve acionar onChange com array vazio ao clicar em Todas (Consolidado)", () => {
    const handleChange = vi.fn();
    render(
      <EntidadeSelectCompact
        entidades={mockEntidades}
        selectedEntidades={["1"]}
        onChange={handleChange}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /filtrar entidades públicas municipais/i,
    });
    fireEvent.click(trigger);

    const consolidadoBtn = screen.getByRole("button", {
      name: /todas \(consolidado\)/i,
    });
    fireEvent.click(consolidadoBtn);

    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it("deve alternar a entidade selecionada ao clicar no checkbox", () => {
    const handleChange = vi.fn();
    render(
      <EntidadeSelectCompact
        entidades={mockEntidades}
        selectedEntidades={["1"]}
        onChange={handleChange}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /filtrar entidades públicas municipais/i,
    });
    fireEvent.click(trigger);

    // Clicar na entidade 2 (adicionar ao filtro)
    const entidade2Btn = screen.getByRole("checkbox", {
      name: /fundo municipal de saúde/i,
    });
    fireEvent.click(entidade2Btn);

    expect(handleChange).toHaveBeenCalledWith(["1", "2"]);
  });

  it("deve desmarcar uma entidade já selecionada", () => {
    const handleChange = vi.fn();
    render(
      <EntidadeSelectCompact
        entidades={mockEntidades}
        selectedEntidades={["1", "2"]}
        onChange={handleChange}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /filtrar entidades públicas municipais/i,
    });
    fireEvent.click(trigger);

    const entidade1Btn = screen.getByRole("checkbox", {
      name: /prefeitura municipal/i,
    });
    fireEvent.click(entidade1Btn);

    expect(handleChange).toHaveBeenCalledWith(["2"]);
  });

  it("deve desativar o gatilho quando disabled ou sem entidades", () => {
    render(
      <EntidadeSelectCompact
        entidades={[]}
        selectedEntidades={[]}
        disabled={true}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /filtrar entidades públicas municipais/i,
    });
    expect(trigger.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Nenhuma entidade")).toBeDefined();
  });

  it("deve renderizar os itens de entidade com role='checkbox' e aria-checked correto", () => {
    render(
      <EntidadeSelectCompact
        entidades={mockEntidades}
        selectedEntidades={["1"]}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /filtrar entidades públicas municipais/i,
    });
    fireEvent.click(trigger);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(3);

    expect(checkboxes[0].getAttribute("aria-checked")).toBe("true");
    expect(checkboxes[1].getAttribute("aria-checked")).toBe("false");
    expect(checkboxes[2].getAttribute("aria-checked")).toBe("false");
  });

  it("deve exibir o resumo do escopo atual no cabeçalho do popover", () => {
    const { rerender } = render(
      <EntidadeSelectCompact
        entidades={mockEntidades}
        selectedEntidades={[]}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /filtrar entidades públicas municipais/i,
    });
    fireEvent.click(trigger);

    expect(screen.getAllByText("Consolidado").length).toBeGreaterThanOrEqual(1);

    rerender(
      <EntidadeSelectCompact
        entidades={mockEntidades}
        selectedEntidades={["2"]}
      />,
    );
    expect(screen.getByText("1 de 3 selecionadas")).toBeDefined();
  });

  it("deve interromper a propagação do evento ao pressionar Escape", () => {
    render(
      <EntidadeSelectCompact
        entidades={mockEntidades}
        selectedEntidades={[]}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /filtrar entidades públicas municipais/i,
    });
    fireEvent.click(trigger);

    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    const stopPropagationSpy = vi.spyOn(escapeEvent, "stopPropagation");

    fireEvent(document, escapeEvent);

    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("deve filtrar IDs órfãos vindos da URL sem corromper a contagem ou o rótulo", () => {
    render(
      <EntidadeSelectCompact
        entidades={mockEntidades}
        selectedEntidades={["999", "888", "777"]}
      />,
    );

    // Como nenhum ID existe em entidades, deve ser tratado como Consolidado (sem filtro válido)
    expect(screen.getByText("Consolidado")).toBeDefined();
  });
});

describe("Sidebar mobileHeaderRightSlot Integration", () => {
  it("deve renderizar o slot de cabeçalho móvel dentro do Top Header Móvel da Sidebar", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        mobileHeaderRightSlot={
          <span data-testid="custom-mobile-header-slot">Gatilho Entidade</span>
        }
      />,
    );

    const slotElement = screen.getByTestId("custom-mobile-header-slot");
    expect(slotElement).toBeDefined();
    expect(slotElement.textContent).toBe("Gatilho Entidade");
  });
});
