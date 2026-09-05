import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type ContratoSemLicitacaoItem,
  LicitacoesTable,
} from "./licitacoes-table";

const mockContratos: ContratoSemLicitacaoItem[] = [
  {
    ano: 2024,
    empresa: "Empresa Beta",
    numero: "002/2024",
    fornecedor: "Beta Construções",
    objeto: "Reforma de escola",
    valorContrato: 50000,
    mes: 3,
    modalidade: "Dispensa",
    periodo: "Mar/2024",
  },
  {
    ano: 2024,
    empresa: "Empresa Alfa",
    numero: "001/2024",
    fornecedor: "Alfa Serviços",
    objeto: "Manutenção predial",
    valorContrato: 120000,
    mes: 1,
    modalidade: "Inexigibilidade",
    periodo: "Jan/2024",
  },
  {
    ano: 2024,
    empresa: "Empresa Gama",
    numero: "003/2024",
    fornecedor: "Gama Suprimentos",
    objeto: "Aquisição de computadores",
    valorContrato: 80000,
    mes: 6,
    modalidade: "Pregão Eletrônico",
    periodo: "Jun/2024",
  },
];

describe("LicitacoesTable", () => {
  it("não renderiza o select de ordenação legado na toolbar", () => {
    render(<LicitacoesTable data={mockContratos} />);

    expect(screen.queryByText("Ordenar por")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renderiza ordenado inicialmente por maior valor (desc)", () => {
    render(<LicitacoesTable data={mockContratos} />);

    const rows = screen.getAllByRole("row");
    // header row + 3 data rows
    expect(rows).toHaveLength(4);

    // Row 1: Alfa Serviços (120.000)
    expect(rows[1]).toHaveTextContent("Alfa Serviços");
    // Row 2: Gama Suprimentos (80.000)
    expect(rows[2]).toHaveTextContent("Gama Suprimentos");
    // Row 3: Beta Construções (50.000)
    expect(rows[3]).toHaveTextContent("Beta Construções");

    // Header VALOR deve ter aria-sort="descending"
    const valorHeader = screen.getByRole("columnheader", { name: /VALOR/i });
    expect(valorHeader).toHaveAttribute("aria-sort", "descending");
  });

  it("ordena por fornecedor ao clicar no cabeçalho FORNECEDOR", () => {
    render(<LicitacoesTable data={mockContratos} />);

    const fornecedorBtn = screen.getByRole("button", { name: /FORNECEDOR/i });
    fireEvent.click(fornecedorBtn);

    const rows = screen.getAllByRole("row");
    // Ascendente: Alfa, Beta, Gama
    expect(rows[1]).toHaveTextContent("Alfa Serviços");
    expect(rows[2]).toHaveTextContent("Beta Construções");
    expect(rows[3]).toHaveTextContent("Gama Suprimentos");

    const header = screen.getByRole("columnheader", { name: /FORNECEDOR/i });
    expect(header).toHaveAttribute("aria-sort", "ascending");

    // Clicar novamente inverte para descendente: Gama, Beta, Alfa
    fireEvent.click(fornecedorBtn);
    const rowsDesc = screen.getAllByRole("row");
    expect(rowsDesc[1]).toHaveTextContent("Gama Suprimentos");
    expect(rowsDesc[2]).toHaveTextContent("Beta Construções");
    expect(rowsDesc[3]).toHaveTextContent("Alfa Serviços");
    expect(header).toHaveAttribute("aria-sort", "descending");
  });

  it("ordena por valor ao clicar no cabeçalho VALOR", () => {
    render(<LicitacoesTable data={mockContratos} />);

    const valorBtn = screen.getByRole("button", { name: /VALOR/i });
    // Default inicial é desc (120k, 80k, 50k). Clicar deve mudar para asc (50k, 80k, 120k)
    fireEvent.click(valorBtn);

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Beta Construções");
    expect(rows[2]).toHaveTextContent("Gama Suprimentos");
    expect(rows[3]).toHaveTextContent("Alfa Serviços");

    const header = screen.getByRole("columnheader", { name: /VALOR/i });
    expect(header).toHaveAttribute("aria-sort", "ascending");
  });

  it("ordena por período ao clicar no cabeçalho PERÍODO", () => {
    render(<LicitacoesTable data={mockContratos} />);

    const periodoBtn = screen.getByRole("button", { name: /PERÍODO/i });
    // Primeiro clique seleciona periodo com default desc (Junho, Março, Janeiro)
    fireEvent.click(periodoBtn);

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Gama Suprimentos");
    expect(rows[2]).toHaveTextContent("Beta Construções");
    expect(rows[3]).toHaveTextContent("Alfa Serviços");

    const header = screen.getByRole("columnheader", { name: /PERÍODO/i });
    expect(header).toHaveAttribute("aria-sort", "descending");

    // Segundo clique inverte para asc (Janeiro, Março, Junho)
    fireEvent.click(periodoBtn);
    const rowsAsc = screen.getAllByRole("row");
    expect(rowsAsc[1]).toHaveTextContent("Alfa Serviços");
    expect(rowsAsc[2]).toHaveTextContent("Beta Construções");
    expect(rowsAsc[3]).toHaveTextContent("Gama Suprimentos");
    expect(header).toHaveAttribute("aria-sort", "ascending");
  });

  it("filtra dados pela barra de busca mantendo a ordenação", () => {
    render(<LicitacoesTable data={mockContratos} />);

    const searchInput = screen.getByPlaceholderText(
      "Buscar fornecedor, objeto ou modalidade...",
    );
    fireEvent.change(searchInput, { target: { value: "Reforma" } });

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(2); // Header + 1 match
    expect(rows[1]).toHaveTextContent("Beta Construções");
  });
});
