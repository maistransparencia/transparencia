import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MultiSelect, type MultiSelectOption } from "../multi-select";

describe("MultiSelect Component", () => {
  const mockOptions: MultiSelectOption[] = [
    { id: "1", nome: "PREFEITURA MUNICIPAL" },
    { id: "2", nome: "FUNDO MUNICIPAL DE SAÚDE" },
    { id: "3", nome: "CÂMARA MUNICIPAL" },
  ];

  it("renderiza o texto padrão 'Todas as entidades' quando vazio", () => {
    render(<MultiSelect options={mockOptions} selectedIds={[]} />);

    expect(screen.getByText("Todas as entidades")).toBeInTheDocument();
  });

  it("renderiza o nome da entidade quando apenas 1 estiver selecionada", () => {
    render(<MultiSelect options={mockOptions} selectedIds={["2"]} />);

    expect(screen.getByText("Fundo Municipal de Saúde")).toBeInTheDocument();
  });

  it("renderiza a contagem quando múltiplas entidades estiverem selecionadas", () => {
    render(<MultiSelect options={mockOptions} selectedIds={["1", "2"]} />);

    expect(screen.getByText("2 selecionadas")).toBeInTheDocument();
  });

  it("renderiza 'Nenhuma entidade cadastrada' e desabilita quando sem opções", () => {
    render(<MultiSelect options={[]} selectedIds={[]} />);

    const trigger = screen.getByRole("button");
    expect(trigger).toBeDisabled();
    expect(screen.getByText("Nenhuma entidade cadastrada")).toBeInTheDocument();
  });

  it("abre o dropdown ao clicar no gatilho", () => {
    render(<MultiSelect options={mockOptions} selectedIds={[]} />);

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    expect(
      screen.getByRole("group", { name: "Prefeitura Municipal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Fundo Municipal de Saúde" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Câmara Municipal" }),
    ).toBeInTheDocument();
  });

  it("segrega cada opção em container com role='group' e dois botões irmãos acessíveis", () => {
    render(<MultiSelect options={mockOptions} selectedIds={["1"]} />);

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    const group = screen.getByRole("group", { name: "Prefeitura Municipal" });
    expect(group).toBeInTheDocument();

    const checkboxBtn = screen.getByRole("checkbox", {
      name: "Alternar seleção de Prefeitura Municipal",
    });
    expect(checkboxBtn).toBeInTheDocument();
    expect(checkboxBtn).toHaveAttribute("aria-checked", "true");

    const labelBtn = screen.getByRole("button", {
      name: "Selecionar apenas Prefeitura Municipal",
    });
    expect(labelBtn).toBeInTheDocument();

    // Valida indicador sutil "apenas"
    expect(labelBtn).toHaveTextContent("apenas");

    // Valida anéis de foco visível (focus-visible) e acessibilidade
    expect(checkboxBtn).toHaveClass(
      "focus-visible:ring-1",
      "focus-visible:ring-[#1d64d8]",
      "rounded-sm",
    );
    expect(labelBtn).toHaveClass(
      "focus-visible:ring-1",
      "focus-visible:ring-[#1d64d8]",
      "rounded-sm",
    );

    // Valida target de toque confortável em mobile
    expect(checkboxBtn).toHaveClass("min-h-[40px]");

    // Garante que não há elementos <button> aninhados
    expect(group.querySelectorAll("button")).toHaveLength(2);
    expect(checkboxBtn.querySelector("button")).toBeNull();
    expect(labelBtn.querySelector("button")).toBeNull();
  });

  it("fecha o dropdown ao pressionar a tecla Escape quando aberto", () => {
    render(<MultiSelect options={mockOptions} selectedIds={[]} />);

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    expect(
      screen.getByRole("group", { name: "Prefeitura Municipal" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("group", { name: "Prefeitura Municipal" }),
    ).not.toBeInTheDocument();
  });

  it("dispara onChange adicionando ID ao clicar no checkbox desmarcado", () => {
    const handleChange = vi.fn();
    render(
      <MultiSelect
        options={mockOptions}
        selectedIds={["1"]}
        onChange={handleChange}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    const checkboxFms = screen.getByRole("checkbox", {
      name: "Alternar seleção de Fundo Municipal de Saúde",
    });
    expect(checkboxFms).toHaveAttribute("aria-checked", "false");

    fireEvent.click(checkboxFms);
    expect(handleChange).toHaveBeenCalledWith(["1", "2"]);
  });

  it("dispara onChange removendo ID ao clicar no checkbox marcado", () => {
    const handleChange = vi.fn();
    render(
      <MultiSelect
        options={mockOptions}
        selectedIds={["1", "2"]}
        onChange={handleChange}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    const checkboxPref = screen.getByRole("checkbox", {
      name: "Alternar seleção de Prefeitura Municipal",
    });
    expect(checkboxPref).toHaveAttribute("aria-checked", "true");

    fireEvent.click(checkboxPref);
    expect(handleChange).toHaveBeenCalledWith(["2"]);
  });

  it("dispara onChange([]) ao selecionar todas as opções via checkbox", () => {
    const twoOptions: MultiSelectOption[] = [
      { id: "1", nome: "PREFEITURA" },
      { id: "2", nome: "CÂMARA" },
    ];
    const handleChange = vi.fn();
    render(
      <MultiSelect
        options={twoOptions}
        selectedIds={["1"]}
        onChange={handleChange}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    const checkboxCamara = screen.getByRole("checkbox", {
      name: "Alternar seleção de Câmara",
    });
    fireEvent.click(checkboxCamara);

    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it("dispara onChange com todas as outras opções ao desmarcar checkbox a partir do estado consolidado", () => {
    const twoOptions: MultiSelectOption[] = [
      { id: "1", nome: "PREFEITURA" },
      { id: "2", nome: "CÂMARA" },
    ];
    const handleChange = vi.fn();
    render(
      <MultiSelect
        options={twoOptions}
        selectedIds={[]}
        onChange={handleChange}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    const checkboxPref = screen.getByRole("checkbox", {
      name: "Alternar seleção de Prefeitura",
    });
    fireEvent.click(checkboxPref);

    expect(handleChange).toHaveBeenCalledWith(["2"]);
  });

  it("dispara onChange([id]) exclusivo ao clicar no texto/label da entidade ('Apenas Esta')", () => {
    const handleChange = vi.fn();
    render(
      <MultiSelect
        options={mockOptions}
        selectedIds={["1", "2"]}
        onChange={handleChange}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    const labelBtn = screen.getByRole("button", {
      name: "Selecionar apenas Fundo Municipal de Saúde",
    });
    fireEvent.click(labelBtn);

    expect(handleChange).toHaveBeenCalledWith(["2"]);
  });

  it("dispara onChange([id]) exclusivo mesmo quando a seleção inicial for consolidada/vazia", () => {
    const handleChange = vi.fn();
    render(
      <MultiSelect
        options={mockOptions}
        selectedIds={[]}
        onChange={handleChange}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    const labelBtn = screen.getByRole("button", {
      name: "Selecionar apenas Câmara Municipal",
    });
    fireEvent.click(labelBtn);

    expect(handleChange).toHaveBeenCalledWith(["3"]);
  });

  it("dispara onChange([]) ao clicar na opção 'Todas as entidades'", () => {
    const handleChange = vi.fn();
    render(
      <MultiSelect
        options={mockOptions}
        selectedIds={["1"]}
        onChange={handleChange}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    const allBtn = screen.getByRole("button", {
      name: "Todas as entidades",
    });
    fireEvent.click(allBtn);

    expect(handleChange).toHaveBeenCalledWith([]);
  });
});
