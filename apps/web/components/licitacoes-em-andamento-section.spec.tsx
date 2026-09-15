import { fireEvent, render, screen } from "@testing-library/react";
import type { LicitacaoEmAndamentoDTO } from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { LicitacoesEmAndamentoSection } from "./licitacoes-em-andamento-section";

describe("LicitacoesEmAndamentoSection Component", () => {
  const sampleItems: LicitacaoEmAndamentoDTO[] = [
    {
      licitacaoId: "lic-001",
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      empresaId: "1",
      licitacaoNumero: "PE 001/2025",
      modalidade: "pregao_eletronico",
      objeto: "Aquisição de medicamentos hospitalares",
      discriminacao: null,
      dataAbertura: "2025-04-10",
      situacao: "aberta",
      entidadeNome: "Fundo Municipal de Saúde",
      valorEstimado: 250000,
      valor: 250000,
      carona: null,
    },
    {
      licitacaoId: "lic-002",
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      empresaId: "1",
      licitacaoNumero: "CP 002/2025",
      modalidade: "concorrencia",
      objeto: "Reforma e ampliação da escola municipal",
      discriminacao: null,
      dataAbertura: "2025-05-15",
      situacao: "publicado",
      entidadeNome: "Secretaria de Educação",
      valorEstimado: 1200000,
      valor: 1200000,
      carona: null,
    },
  ];

  it("renderiza cabeçalho, contagem, top cards e tabela DenseTable", () => {
    render(<LicitacoesEmAndamentoSection licitacoes={sampleItems} />);

    expect(
      screen.getByText("Licitações Abertas e em Andamento"),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 processos em aberto/i)).toBeInTheDocument();

    // Destaque Top 3
    expect(
      screen.getByText("Processos em Destaque por Relevância"),
    ).toBeInTheDocument();

    // Tabela completa
    expect(
      screen.getByText("Relação Completa de Licitações em Aberto"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/PE 001\/2025/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/CP 002\/2025/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("ordena os cards em destaque por maior valor estimado", () => {
    render(<LicitacoesEmAndamentoSection licitacoes={sampleItems} />);

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    // CP 002/2025 tem 1.200.000 vs PE 001/2025 com 250.000
    expect(cards[0]).toHaveTextContent("CP 002/2025");
    expect(cards[1]).toHaveTextContent("PE 001/2025");
  });

  it("limita os cards de destaque a 4 itens quando há mais de 4 licitações", () => {
    const cincoItens: LicitacaoEmAndamentoDTO[] = [
      ...sampleItems,
      {
        ...sampleItems[0],
        licitacaoId: "lic-003",
        licitacaoNumero: "PE 003/2025",
        valorEstimado: 500000,
        valor: 500000,
      },
      {
        ...sampleItems[0],
        licitacaoId: "lic-004",
        licitacaoNumero: "PE 004/2025",
        valorEstimado: 800000,
        valor: 800000,
      },
      {
        ...sampleItems[0],
        licitacaoId: "lic-005",
        licitacaoNumero: "PE 005/2025",
        valorEstimado: 100000,
        valor: 100000,
      },
    ];

    render(<LicitacoesEmAndamentoSection licitacoes={cincoItens} />);

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(4);
    // Ordenação esperada dos 4 maiores:
    // CP 002/2025 (1.200.000), PE 004/2025 (800.000), PE 003/2025 (500.000), PE 001/2025 (250.000)
    // O menor (PE 005/2025 de 100.000) não entra nos cards
    expect(cards[0]).toHaveTextContent("CP 002/2025");
    expect(cards[1]).toHaveTextContent("PE 004/2025");
    expect(cards[2]).toHaveTextContent("PE 003/2025");
    expect(cards[3]).toHaveTextContent("PE 001/2025");
  });

  it("filtra itens na tabela pela busca do DenseTable", () => {
    render(<LicitacoesEmAndamentoSection licitacoes={sampleItems} />);

    const searchInput = screen.getByPlaceholderText(
      /Buscar por objeto.*modalidade/i,
    );
    fireEvent.change(searchInput, { target: { value: "medicamentos" } });

    // Na tabela filtrada, deve encontrar apenas o PE 001/2025
    const rows = screen.getAllByRole("row");
    // Header + 1 linha de dado
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent("PE 001/2025");
    expect(rows[1]).not.toHaveTextContent("CP 002/2025");
  });

  it("filtra itens na busca por modalidade com espaços ou discriminação", () => {
    const itemsComDiscriminacao: LicitacaoEmAndamentoDTO[] = [
      {
        ...sampleItems[0],
        objeto: "Contratação de empresa especializada",
        discriminacao: "Fornecimento de antibióticos e seringas",
        modalidade: "pregao_eletronico",
      },
      sampleItems[1],
    ];

    render(<LicitacoesEmAndamentoSection licitacoes={itemsComDiscriminacao} />);
    const searchInput = screen.getByPlaceholderText(
      /Buscar por objeto.*modalidade/i,
    );

    // Busca por termo na discriminação
    fireEvent.change(searchInput, { target: { value: "antibioticos" } });
    const rowsDiscriminacao = screen.getAllByRole("row");
    expect(rowsDiscriminacao).toHaveLength(2);
    expect(rowsDiscriminacao[1]).toHaveTextContent("PE 001/2025");

    // Busca por modalidade com espaços em vez de snake_case
    fireEvent.change(searchInput, { target: { value: "pregao eletronico" } });
    const rowsModalidade = screen.getAllByRole("row");
    expect(rowsModalidade).toHaveLength(2);
    expect(rowsModalidade[1]).toHaveTextContent("PE 001/2025");
  });

  it("filtra itens na tabela pela situação (ex: 'em andamento')", () => {
    const itensComSituacaoDiferente: LicitacaoEmAndamentoDTO[] = [
      {
        ...sampleItems[0],
        licitacaoId: "lic-andamento",
        licitacaoNumero: "PE 101/2025",
        situacao: "em_andamento",
      },
      {
        ...sampleItems[1],
        licitacaoId: "lic-homologada",
        licitacaoNumero: "CP 102/2025",
        situacao: "homologada",
      },
    ];

    render(
      <LicitacoesEmAndamentoSection licitacoes={itensComSituacaoDiferente} />,
    );

    const searchInput = screen.getByPlaceholderText(
      /Buscar por objeto.*modalidade/i,
    );
    fireEvent.change(searchInput, { target: { value: "em andamento" } });

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent("PE 101/2025");
    expect(rows[1]).toHaveTextContent("Em andamento");
    expect(rows[1]).not.toHaveTextContent("CP 102/2025");
  });

  it("exibe estado vazio na tabela quando a busca não retorna resultados", () => {
    render(<LicitacoesEmAndamentoSection licitacoes={sampleItems} />);

    const searchInput = screen.getByPlaceholderText(
      /Buscar por objeto.*modalidade/i,
    );
    fireEvent.change(searchInput, { target: { value: "termo_inexistente" } });

    expect(screen.getByText("Nenhum registro encontrado.")).toBeInTheDocument();
  });

  it("exibe estado vazio padrão quando a lista de itens é vazia", () => {
    render(<LicitacoesEmAndamentoSection licitacoes={[]} />);

    expect(
      screen.getByText(
        "Nenhuma licitação em andamento ou aberta encontrada para este exercício.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
