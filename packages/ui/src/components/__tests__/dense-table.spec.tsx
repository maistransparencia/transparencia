import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
