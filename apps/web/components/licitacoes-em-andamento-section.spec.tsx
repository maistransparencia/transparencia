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

  it("renderiza cabeçalho, contagem e itens corretamente", () => {
    render(<LicitacoesEmAndamentoSection licitacoes={sampleItems} />);

    expect(
      screen.getByText("Licitações Abertas e em Andamento"),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 processos em aberto/i)).toBeInTheDocument();
    expect(screen.getByText(/PE 001\/2025/i)).toBeInTheDocument();
    expect(screen.getByText(/CP 002\/2025/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Aquisição de medicamentos hospitalares/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Fundo Municipal de Saúde/i)).toBeInTheDocument();
  });

  it("filtra itens pela busca de objeto", () => {
    render(<LicitacoesEmAndamentoSection licitacoes={sampleItems} />);

    const searchInput = screen.getByPlaceholderText(
      /Buscar por objeto da compra, edital ou órgão/i,
    );
    fireEvent.change(searchInput, { target: { value: "medicamentos" } });

    expect(screen.getByText(/PE 001\/2025/i)).toBeInTheDocument();
    expect(screen.queryByText(/CP 002\/2025/i)).not.toBeInTheDocument();
  });

  it("filtra itens pela busca de modalidade com espaços ou discriminação", () => {
    const itemsComDiscriminacao: LicitacaoEmAndamentoDTO[] = [
      {
        ...sampleItems[0],
        objeto: "Contratação de empresa especializada",
        discriminacao: "Fornecimento de antibióticos e seringas",
        modalidade: "pregao_eletronico",
      },
    ];

    render(<LicitacoesEmAndamentoSection licitacoes={itemsComDiscriminacao} />);
    const searchInput = screen.getByPlaceholderText(
      /Buscar por objeto da compra, edital ou órgão/i,
    );

    // Busca por termo na discriminação
    fireEvent.change(searchInput, { target: { value: "antibioticos" } });
    expect(screen.getByText(/PE 001\/2025/i)).toBeInTheDocument();

    // Busca por modalidade com espaços em vez de snake_case
    fireEvent.change(searchInput, { target: { value: "pregao eletronico" } });
    expect(screen.getByText(/PE 001\/2025/i)).toBeInTheDocument();
  });

  it("exibe estado vazio quando busca não retorna resultados", () => {
    render(<LicitacoesEmAndamentoSection licitacoes={sampleItems} />);

    const searchInput = screen.getByPlaceholderText(
      /Buscar por objeto da compra, edital ou órgão/i,
    );
    fireEvent.change(searchInput, { target: { value: "inexistente" } });

    expect(
      screen.getByText(/Nenhuma licitação encontrada para o termo/i),
    ).toBeInTheDocument();
  });

  it("exibe estado vazio padrão quando a lista de itens é vazia", () => {
    render(<LicitacoesEmAndamentoSection licitacoes={[]} />);

    expect(
      screen.getByText(
        "Nenhuma licitação em andamento ou aberta encontrada para este exercício.",
      ),
    ).toBeInTheDocument();
  });
});
