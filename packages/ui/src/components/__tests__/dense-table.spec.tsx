import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Column, DenseTable } from "../dense-table";

interface TestItem {
  id: string;
  nome: string;
  valor: number;
}

describe("DenseTable - renderMobileCard", () => {
  const columns: Column<TestItem>[] = [
    { header: "Nome", accessorKey: "nome", sortable: true },
    {
      header: "Valor",
      accessorKey: "valor",
      format: "currency",
      sortable: true,
    },
  ];

  const testData: TestItem[] = [
    { id: "1", nome: "Item Alpha", valor: 1000 },
    { id: "2", nome: "Item Beta", valor: 2500 },
    { id: "3", nome: "Item Gamma", valor: 500 },
  ];

  it("renderiza os cards mobile quando renderMobileCard é fornecido", () => {
    render(
      <DenseTable
        data={testData}
        columns={columns}
        rowKey="id"
        renderMobileCard={(row) => (
          <div data-testid={`mobile-card-${row.id}`}>
            <span>Mobile: {row.nome}</span>
          </div>
        )}
      />,
    );

    expect(screen.getByTestId("mobile-card-1")).toHaveTextContent(
      "Mobile: Item Alpha",
    );
    expect(screen.getByTestId("mobile-card-2")).toHaveTextContent(
      "Mobile: Item Beta",
    );
    expect(screen.getByTestId("mobile-card-3")).toHaveTextContent(
      "Mobile: Item Gamma",
    );
  });

  it("não renderiza container mobile quando renderMobileCard não é fornecido", () => {
    const { container } = render(
      <DenseTable data={testData} columns={columns} rowKey="id" />,
    );

    const mobileContainer = container.querySelector(".block.sm\\:hidden");
    expect(mobileContainer).toBeNull();
  });

  it("filtra cards mobile ao utilizar o campo de busca", () => {
    render(
      <DenseTable
        data={testData}
        columns={columns}
        searchableKeys={["nome"]}
        rowKey="id"
        renderMobileCard={(row) => (
          <div data-testid={`mobile-card-${row.id}`}>
            <span>{row.nome}</span>
          </div>
        )}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Buscar...");
    fireEvent.change(searchInput, { target: { value: "Beta" } });

    expect(screen.queryByTestId("mobile-card-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("mobile-card-2")).toBeInTheDocument();
    expect(screen.queryByTestId("mobile-card-3")).not.toBeInTheDocument();
  });
});

describe("DenseTable - botão CSV adaptativo", () => {
  const columns: Column<TestItem>[] = [
    { header: "Nome", accessorKey: "nome", sortable: true },
    {
      header: "Valor",
      accessorKey: "valor",
      format: "currency",
      sortable: true,
    },
  ];

  const testData: TestItem[] = [
    { id: "1", nome: "Item Alpha", valor: 1000 },
    { id: "2", nome: "Item Beta", valor: 2500 },
  ];

  it("renderiza botão mobile com aria-label='Baixar CSV' e botão desktop com rótulo no DOM", () => {
    render(
      <DenseTable
        data={testData}
        columns={columns}
        rowKey="id"
        enableExportCsv
        csvButtonLabel="Baixar CSV"
      />,
    );

    // Botão mobile: identificado pelo aria-label
    const allCsvBtns = screen.getAllByRole("button", {
      name: "Baixar CSV",
      hidden: true,
    });
    const mobileBtn = allCsvBtns.find(
      (btn) => btn.getAttribute("aria-label") === "Baixar CSV",
    );
    expect(mobileBtn).toBeInTheDocument();

    // Botão desktop: span com texto do rótulo presente no DOM (oculto via CSS)
    const desktopLabel = screen.getAllByText("Baixar CSV");
    expect(desktopLabel.length).toBeGreaterThanOrEqual(1);
  });

  it("ambos os botões CSV ficam desabilitados quando não há dados", () => {
    render(
      <DenseTable
        data={[]}
        columns={columns}
        rowKey="id"
        enableExportCsv
        csvButtonLabel="Baixar CSV"
      />,
    );

    const buttons = screen.getAllByRole("button", { hidden: true });
    const csvButtons = buttons.filter(
      (btn) =>
        btn.getAttribute("aria-label") === "Baixar CSV" ||
        btn.textContent?.includes("Baixar CSV"),
    );
    expect(csvButtons.length).toBeGreaterThanOrEqual(2);
    csvButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("não renderiza botão CSV quando enableExportCsv é false", () => {
    render(
      <DenseTable
        data={testData}
        columns={columns}
        rowKey="id"
        enableExportCsv={false}
        csvButtonLabel="Baixar CSV"
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Baixar CSV", hidden: true }),
    ).toBeNull();
    expect(screen.queryByText("Baixar CSV")).toBeNull();
  });

  it("csvButtonLabel customizado é refletido no aria-label do botão mobile", () => {
    render(
      <DenseTable
        data={testData}
        columns={columns}
        rowKey="id"
        enableExportCsv
        csvButtonLabel="Exportar dados"
      />,
    );

    const mobileBtn = screen
      .getAllByRole("button", { hidden: true })
      .find((btn) => btn.getAttribute("aria-label") === "Exportar dados");
    expect(mobileBtn).toBeInTheDocument();
  });
});

describe("DenseTable - paginação e scroll suave automático", () => {
  const columns: Column<TestItem>[] = [
    { header: "Nome", accessorKey: "nome" },
    { header: "Valor", accessorKey: "valor" },
  ];

  const generateData = (count: number): TestItem[] =>
    Array.from({ length: count }, (_, i) => ({
      id: String(i + 1),
      nome: `Item ${i + 1}`,
      valor: (i + 1) * 100,
    }));

  const testData = generateData(25);

  let originalScrollIntoView: typeof window.HTMLElement.prototype.scrollIntoView;

  beforeEach(() => {
    originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
  });

  afterEach(() => {
    if (originalScrollIntoView !== undefined) {
      window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    } else {
      delete (window.HTMLElement.prototype as { scrollIntoView?: unknown })
        .scrollIntoView;
    }
    vi.restoreAllMocks();
  });

  it("possui as classes utilitárias de scroll margin (scroll-mt-20 sm:scroll-mt-24) no container raiz", () => {
    const { container } = render(
      <DenseTable
        data={testData}
        columns={columns}
        rowKey="id"
        pageSize={10}
      />,
    );

    const rootElement = container.firstElementChild;
    expect(rootElement).toHaveClass("scroll-mt-20");
    expect(rootElement).toHaveClass("sm:scroll-mt-24");
  });

  it("não dispara scrollIntoView na montagem inicial", () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <DenseTable
        data={testData}
        columns={columns}
        rowKey="id"
        pageSize={10}
      />,
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it("dispara scroll suave para o container raiz ao clicar no botão de uma página diferente", () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <DenseTable
        data={testData}
        columns={columns}
        rowKey="id"
        pageSize={10}
      />,
    );

    const page2Button = screen.getByRole("button", { name: "Página 2" });
    fireEvent.click(page2Button);

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("não dispara scrollIntoView ao clicar na página que já está ativa", () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <DenseTable
        data={testData}
        columns={columns}
        rowKey="id"
        pageSize={10}
      />,
    );

    const page1Button = screen.getByRole("button", { name: "Página 1" });
    fireEvent.click(page1Button);

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it("dispara scroll suave ao navegar para a próxima página e página anterior", () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <DenseTable
        data={testData}
        columns={columns}
        rowKey="id"
        pageSize={10}
      />,
    );

    const nextButton = screen.getByRole("button", { name: "Próxima página" });
    fireEvent.click(nextButton);

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });

    const prevButton = screen.getByRole("button", { name: "Página anterior" });
    fireEvent.click(prevButton);

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
    expect(scrollIntoViewMock).toHaveBeenLastCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("trata defensivamente ambientes sem suporte a scrollIntoView sem lançar erro", () => {
    // @ts-expect-error teste defensivo para ambiente sem scrollIntoView
    delete window.HTMLElement.prototype.scrollIntoView;

    render(
      <DenseTable
        data={testData}
        columns={columns}
        rowKey="id"
        pageSize={10}
      />,
    );

    const page2Button = screen.getByRole("button", { name: "Página 2" });
    expect(() => fireEvent.click(page2Button)).not.toThrow();
  });

  it("aplica rowClassName dinâmico nas linhas tr da tabela", () => {
    render(
      <DenseTable
        data={testData.slice(0, 3)}
        columns={columns}
        rowKey="id"
        rowClassName={(row) =>
          row.id === "2" ? "bg-amber-100 highlight-test" : undefined
        }
      />,
    );

    const rows = screen.getAllByRole("row");
    // row 0 is the header row
    expect(rows[2]).toHaveClass("bg-amber-100");
    expect(rows[2]).toHaveClass("highlight-test");
    expect(rows[1]).not.toHaveClass("highlight-test");
    expect(rows[3]).not.toHaveClass("highlight-test");
  });
});

describe("DenseTable - rodapé e onFilteredDataChange", () => {
  const data: TestItem[] = [
    { id: "1", nome: "Alpha", valor: 10 },
    { id: "2", nome: "Beta", valor: 20 },
  ];

  it("renderiza o tfoot com rótulo Total na primeira coluna", () => {
    const columns: Column<TestItem>[] = [
      { header: "Nome", accessorKey: "nome" },
      { header: "Valor", accessorKey: "valor", footer: "R$ 30,00" },
    ];
    render(<DenseTable data={data} columns={columns} rowKey="id" />);
    const rodape = screen.getAllByRole("row").at(-1) as HTMLElement;
    expect(rodape.textContent).toContain("Total");
    expect(rodape.textContent).toContain("R$ 30,00");
  });

  it("não renderiza tfoot sem footer nas colunas", () => {
    const columns: Column<TestItem>[] = [
      { header: "Nome", accessorKey: "nome" },
    ];
    const { container } = render(
      <DenseTable data={data} columns={columns} rowKey="id" />,
    );
    expect(container.querySelector("tfoot")).toBeNull();
  });

  it("notifica as linhas filtradas sem loop com searchableKeys literal", () => {
    const columns: Column<TestItem>[] = [
      { header: "Nome", accessorKey: "nome" },
    ];
    const onFilteredDataChange = vi.fn();
    const { rerender } = render(
      <DenseTable
        data={data}
        columns={columns}
        rowKey="id"
        searchableKeys={["nome"]}
        onFilteredDataChange={onFilteredDataChange}
      />,
    );
    rerender(
      <DenseTable
        data={data}
        columns={columns}
        rowKey="id"
        searchableKeys={["nome"]}
        onFilteredDataChange={onFilteredDataChange}
      />,
    );
    expect(onFilteredDataChange).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByPlaceholderText(/Buscar/), {
      target: { value: "beta" },
    });
    expect(onFilteredDataChange).toHaveBeenLastCalledWith([data[1]]);
    expect(onFilteredDataChange).toHaveBeenCalledTimes(2);
  });
});

describe("DenseTable - formato Divisórias, renderMobileRow e hideSearch", () => {
  const columns: Column<TestItem>[] = [
    { header: "Nome", accessorKey: "nome", sortable: true },
    { header: "Valor", accessorKey: "valor", format: "currency" },
  ];
  const data: TestItem[] = [
    { id: "1", nome: "Item Alpha", valor: 1000 },
    { id: "2", nome: "Item Beta", valor: 2500 },
  ];

  it("contêiner não usa rounded-xl, border nem shadow-xs e usa filetes ink/line", () => {
    const { container } = render(
      <DenseTable data={data} columns={columns} rowKey="id" />,
    );

    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz).not.toHaveClass("rounded-xl");
    expect(raiz).not.toHaveClass("border");
    expect(raiz).not.toHaveClass("shadow-xs");
    expect(container.querySelector("thead tr")).toHaveClass("border-ink");
    expect(container.querySelector("tbody")).toHaveClass("divide-line");
  });

  it("renderMobileRow renderiza <details> com resumo e detalhes", () => {
    const { container } = render(
      <DenseTable
        data={data}
        columns={columns}
        rowKey="id"
        renderMobileRow={(row) => ({
          resumo: <span>Resumo {row.nome}</span>,
          detalhes: <span>Detalhes {row.nome}</span>,
        })}
      />,
    );

    const linhas = container.querySelectorAll("details");
    expect(linhas).toHaveLength(2);
    expect(linhas[0].querySelector("summary")).toHaveTextContent(
      "Resumo Item Alpha",
    );
    expect(linhas[0]).toHaveTextContent("Detalhes Item Alpha");
    expect(container.querySelector("table")?.parentElement).toHaveClass(
      "hidden",
    );
  });

  it("renderMobileRow tem precedência sobre renderMobileCard", () => {
    const { container } = render(
      <DenseTable
        data={data}
        columns={columns}
        rowKey="id"
        renderMobileCard={(row) => <span>Card {row.nome}</span>}
        renderMobileRow={(row) => ({
          resumo: <span>Resumo {row.nome}</span>,
          detalhes: <span>Detalhes {row.nome}</span>,
        })}
      />,
    );

    expect(container.querySelectorAll("details")).toHaveLength(2);
    expect(screen.queryByText("Card Item Alpha")).not.toBeInTheDocument();
  });

  it("hideSearch esconde o campo de busca; padrão preserva", () => {
    const { rerender } = render(
      <DenseTable
        data={data}
        columns={columns}
        searchableKeys={["nome"]}
        searchPlaceholder="Buscar aqui"
      />,
    );
    expect(screen.getByPlaceholderText("Buscar aqui")).toBeInTheDocument();

    rerender(
      <DenseTable
        data={data}
        columns={columns}
        searchableKeys={["nome"]}
        searchPlaceholder="Buscar aqui"
        hideSearch
      />,
    );
    expect(
      screen.queryByPlaceholderText("Buscar aqui"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Baixar CSV")).toBeInTheDocument();
  });
});

describe("DenseTable - renderExpandedRow e exportOnly", () => {
  type Linha = { id: string; nome: string; extra: string };
  const dados: Linha[] = [
    { id: "1", nome: "Alfa", extra: "x1" },
    { id: "2", nome: "Beta", extra: "x2" },
  ];
  const colunas: Column<Linha>[] = [
    { header: "Nome", accessorKey: "nome", sortable: true },
    { header: "Extra", accessorKey: "extra", exportOnly: true },
  ];

  it("expande e recolhe o painel de detalhe da linha no desktop", () => {
    render(
      <DenseTable
        data={dados}
        columns={colunas}
        rowKey="id"
        enableExportCsv={false}
        renderExpandedRow={(row) => <div>Detalhe de {row.nome}</div>}
      />,
    );
    expect(screen.queryByText("Detalhe de Alfa")).not.toBeInTheDocument();
    const [primeiro] = screen.getAllByRole("button", {
      name: "Expandir detalhes da linha",
    });
    fireEvent.click(primeiro);
    expect(screen.getByText("Detalhe de Alfa")).toBeInTheDocument();
    expect(primeiro).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(primeiro);
    expect(screen.queryByText("Detalhe de Alfa")).not.toBeInTheDocument();
  });

  it("não exibe colunas exportOnly na tabela e mantém o sort por coluna", () => {
    render(
      <DenseTable
        data={dados}
        columns={colunas}
        rowKey="id"
        enableExportCsv={false}
        renderExpandedRow={() => null}
      />,
    );
    expect(
      screen.queryByRole("columnheader", { name: /extra/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ordenar por nome/i }),
    ).toBeInTheDocument();
  });

  it("sem renderExpandedRow não há botão de expandir", () => {
    render(
      <DenseTable data={dados} columns={colunas} enableExportCsv={false} />,
    );
    expect(
      screen.queryByRole("button", { name: "Expandir detalhes da linha" }),
    ).not.toBeInTheDocument();
  });

  it("clicar na linha alterna o painel, mas clicar em botão interno não", () => {
    const aoClicar = vi.fn();
    render(
      <DenseTable
        data={dados}
        columns={[
          {
            header: "Nome",
            accessorKey: "nome",
            renderCell: (row) => (
              <button type="button" onClick={aoClicar}>
                abrir {row.nome}
              </button>
            ),
          },
          { header: "Extra", accessorKey: "extra" },
        ]}
        rowKey="id"
        enableExportCsv={false}
        renderExpandedRow={(row) => <div>Detalhe de {row.nome}</div>}
      />,
    );
    fireEvent.click(screen.getByText("x1"));
    expect(screen.getByText("Detalhe de Alfa")).toBeInTheDocument();
    fireEvent.click(screen.getByText("x1"));
    expect(screen.queryByText("Detalhe de Alfa")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("abrir Alfa"));
    expect(aoClicar).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Detalhe de Alfa")).not.toBeInTheDocument();
    // a seta continua alternando uma única vez (sem duplo toggle)
    fireEvent.click(
      screen.getAllByRole("button", { name: "Expandir detalhes da linha" })[0],
    );
    expect(screen.getByText("Detalhe de Alfa")).toBeInTheDocument();
  });

  it("comporta-se como accordion: expandir uma linha fecha a outra", () => {
    render(
      <DenseTable
        data={dados}
        columns={colunas}
        rowKey="id"
        enableExportCsv={false}
        renderExpandedRow={(row) => <div>Detalhe de {row.nome}</div>}
      />,
    );
    fireEvent.click(screen.getByText("Alfa"));
    expect(screen.getByText("Detalhe de Alfa")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Beta"));
    expect(screen.getByText("Detalhe de Beta")).toBeInTheDocument();
    expect(screen.queryByText("Detalhe de Alfa")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Beta"));
    expect(screen.queryByText("Detalhe de Beta")).not.toBeInTheDocument();
  });
});

describe("DenseTable - mobile com painel expandido, ordenação e CSV", () => {
  type Linha = { id: string; nome: string; valor: number };
  const dados: Linha[] = [
    { id: "1", nome: "Alfa", valor: 10 },
    { id: "2", nome: "Beta", valor: 30 },
    { id: "3", nome: "Gama", valor: 20 },
  ];
  const colunas: Column<Linha>[] = [
    { header: "Nome", accessorKey: "nome", sortable: true },
    { header: "Valor", accessorKey: "valor", sortable: true },
  ];
  const renderTabela = (extra = {}) =>
    render(
      <DenseTable
        data={dados}
        columns={colunas}
        rowKey="id"
        renderMobileRow={(row) => ({
          resumo: <span>resumo {row.nome}</span>,
          detalhes: null,
        })}
        renderExpandedRow={(row) => <div>painel {row.nome}</div>}
        {...extra}
      />,
    );

  it("mobile: toque na linha alterna (accordion) e o painel é o do renderExpandedRow", () => {
    const { container } = renderTabela();
    const linhas = container.querySelectorAll(
      "div[role='button'][aria-expanded]",
    );
    expect(linhas).toHaveLength(3);
    fireEvent.click(linhas[0]);
    expect(screen.getAllByText("painel Alfa").length).toBeGreaterThan(0);
    fireEvent.keyDown(linhas[1], { key: "Enter" });
    expect(linhas[0]).toHaveAttribute("aria-expanded", "false");
    expect(linhas[1]).toHaveAttribute("aria-expanded", "true");
  });

  it("mobile: select 'Ordenar por' e botão de direção refletem o sort", () => {
    const { container } = renderTabela();
    const ordem = () =>
      Array.from(
        container.querySelectorAll("div[role='button'][aria-expanded]"),
      ).map((el) => el.textContent);
    fireEvent.change(screen.getByLabelText("Ordenar por"), {
      target: { value: "valor" },
    });
    expect(ordem()).toEqual(["resumo Alfa", "resumo Gama", "resumo Beta"]);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Ordem crescente, alternar para decrescente",
      }),
    );
    expect(ordem()).toEqual(["resumo Beta", "resumo Gama", "resumo Alfa"]);
    expect(
      screen.getByRole("button", {
        name: "Ordem decrescente, alternar para crescente",
      }),
    ).toBeInTheDocument();
  });

  it("sem renderMobileRow não há controle de ordenação mobile", () => {
    render(<DenseTable data={dados} columns={colunas} sortable />);
    expect(screen.queryByLabelText("Ordenar por")).not.toBeInTheDocument();
  });

  it("hideCsvOnMobile remove apenas o botão CSV mobile", () => {
    const { container } = renderTabela({ hideCsvOnMobile: true });
    expect(
      container.querySelector('button[aria-label="Baixar CSV"]'),
    ).toBeNull();
    expect(screen.getByText("Baixar CSV")).toBeInTheDocument();
  });
});
