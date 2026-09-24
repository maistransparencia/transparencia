import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
      valorHomologado: null,
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
      valorHomologado: null,
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

    const destaquesGrid = screen.getByTestId("top-destaques-grid");
    const cards = within(destaquesGrid).getAllByRole("article");
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

    const destaquesGrid = screen.getByTestId("top-destaques-grid");
    const cards = within(destaquesGrid).getAllByRole("article");
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

  it("renderiza link para sala de disputa externa (linkSistemaOrigem) e badge de fonte de objeto", () => {
    const itensEnriquecidos: LicitacaoEmAndamentoDTO[] = [
      {
        ...sampleItems[0],
        fonteObjeto: "pncp",
        linkSistemaOrigem: "https://pncp.gov.br/app/editais/12345/2025/1",
      },
      {
        ...sampleItems[1],
        fonteObjeto: "contrato_local",
      },
    ];

    render(<LicitacoesEmAndamentoSection licitacoes={itensEnriquecidos} />);

    // Badges de fonte do objeto
    expect(screen.getAllByText("PNCP").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Contrato Local").length).toBeGreaterThanOrEqual(
      1,
    );

    // Link da sala de disputa
    const disputeLinks = screen.getAllByRole("link", {
      name: /sala de disputa/i,
    });
    expect(disputeLinks.length).toBeGreaterThanOrEqual(1);
    expect(disputeLinks[0]).toHaveAttribute(
      "href",
      "https://pncp.gov.br/app/editais/12345/2025/1",
    );
    expect(disputeLinks[0]).toHaveAttribute("target", "_blank");
    expect(disputeLinks[0]).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("abre modal com itens da licitação ao clicar no botão e permite fechar", () => {
    const itensMock = [
      {
        itemId: "item-1",
        licitacaoNumero: "PE 001/2025",
        ano: 2025,
        portalSlug: "porciuncula_prefeitura",
        numeroItem: 1,
        descricao: "Paracetamol 500mg comprimido",
        quantidade: 1000,
        unidadeMedida: "UN",
        valorUnitarioEstimado: 0.5,
        valorTotalEstimado: 500,
        valorUnitarioHomologado: 0.45,
        valorTotalHomologado: 450,
        percentualDesconto: 10,
        situacaoItem: "adjudicado",
        fornecedorNome: "Distribuidora Farmacêutica LTDA",
        fornecedorCpfCnpj: "12.345.678/0001-90",
      },
    ];

    const licitacaoComItens: LicitacaoEmAndamentoDTO[] = [
      {
        ...sampleItems[0],
      },
    ];

    render(
      <LicitacoesEmAndamentoSection
        licitacoes={licitacaoComItens}
        itensByLicitacao={{
          "PE 001/2025": itensMock,
        }}
      />,
    );

    const buttons = screen.getAllByRole("button", {
      name: /detalhes/i,
    });
    expect(buttons.length).toBeGreaterThanOrEqual(1);

    // Abre o modal
    fireEvent.click(buttons[0]);
    expect(
      screen.getByRole("heading", { name: /Itens Licitados/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Paracetamol 500mg comprimido"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Distribuidora Farmacêutica LTDA"),
    ).toBeInTheDocument();

    // Fecha o modal
    const closeBtn = screen.getByRole("button", { name: /fechar/i });
    fireEvent.click(closeBtn);
    expect(
      screen.queryByText("Distribuidora Farmacêutica LTDA"),
    ).not.toBeInTheDocument();
  });

  it("exibe valorHomologado e badge de economia quando homologado", () => {
    const itemHomologado: LicitacaoEmAndamentoDTO[] = [
      {
        ...sampleItems[0],
        valorEstimado: 200000,
        valorHomologado: 150000,
      },
    ];

    render(<LicitacoesEmAndamentoSection licitacoes={itemHomologado} />);

    // Valor homologado de 150.000 (economia de 25%)
    expect(screen.getAllByText(/150\.000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("-25%").length).toBeGreaterThanOrEqual(1);
  });

  it("exibe badge 'Em disputa' quando valorHomologado é nulo", () => {
    render(<LicitacoesEmAndamentoSection licitacoes={[sampleItems[0]]} />);

    expect(screen.getAllByText(/Em disputa/i).length).toBeGreaterThanOrEqual(1);
  });

  it("abre automaticamente o modal de itens quando URL possui ?numero=...#itens", () => {
    const itensMock = [
      {
        itemId: "item-1",
        licitacaoNumero: "PE 001/2025",
        ano: 2025,
        portalSlug: "porciuncula_prefeitura",
        numeroItem: 1,
        descricao: "Item de Teste Deep Link",
        quantidade: 10,
        unidadeMedida: "UN",
        valorUnitarioEstimado: 100,
        valorTotalEstimado: 1000,
        valorUnitarioHomologado: null,
        valorTotalHomologado: null,
        percentualDesconto: null,
        situacaoItem: "em_andamento",
        fornecedorNome: null,
        fornecedorCpfCnpj: null,
      },
    ];

    // Simula a URL com query param e hash
    Object.defineProperty(window, "location", {
      writable: true,
      value: new URL(
        "http://localhost:3000/porciuncula/licitacoes?numero=PE 001/2025#itens",
      ),
    });

    render(
      <LicitacoesEmAndamentoSection
        licitacoes={sampleItems}
        itensByLicitacao={{
          "PE 001/2025": itensMock,
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /Itens Licitados/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Item de Teste Deep Link")).toBeInTheDocument();
  });

  it("exibe botão de voltar aos resultados e fecha o modal ao clicar quando aberto a partir da busca", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: new URL("http://localhost:3000/porciuncula/licitacoes"),
    });

    render(<LicitacoesEmAndamentoSection licitacoes={sampleItems} />);

    window.dispatchEvent(
      new CustomEvent("licitacao:selected", {
        detail: {
          numero: "PE 001/2025",
          fromSearch: true,
        },
      }),
    );

    const backButton = await screen.findByRole("button", {
      name: /voltar aos resultados da busca/i,
    });
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("renderiza controles de navegação e rolagem horizontal na tabela de itens", async () => {
    const itensMock = [
      {
        itemId: "item-1",
        licitacaoNumero: "PE 001/2025",
        ano: 2025,
        portalSlug: "porciuncula_prefeitura",
        numeroItem: 1,
        descricao: "Item de Teste Scroll",
        quantidade: 10,
        unidadeMedida: "UN",
        valorUnitarioEstimado: 100,
        valorTotalEstimado: 1000,
        valorUnitarioHomologado: null,
        valorTotalHomologado: null,
        percentualDesconto: null,
        situacaoItem: "em_andamento",
        fornecedorNome: null,
        fornecedorCpfCnpj: null,
      },
    ];

    Object.defineProperty(window, "location", {
      writable: true,
      value: new URL("http://localhost:3000/porciuncula/licitacoes"),
    });

    render(
      <LicitacoesEmAndamentoSection
        licitacoes={sampleItems}
        itensByLicitacao={{
          "PE 001/2025": itensMock,
          "CP 002/2025": itensMock,
        }}
      />,
    );

    const btnItens = screen.getAllByRole("button", {
      name: /detalhes/i,
    })[0];
    fireEvent.click(btnItens);

    const btnScrollLeft = await screen.findByRole("button", {
      name: /rolar tabela para a esquerda/i,
    });
    const btnScrollRight = screen.getByRole("button", {
      name: /rolar tabela para a direita/i,
    });

    expect(btnScrollLeft).toBeInTheDocument();
    expect(btnScrollRight).toBeInTheDocument();

    fireEvent.click(btnScrollRight);
    fireEvent.click(btnScrollLeft);
  });

  it("abre modal mesmo para licitação que não está na lista em andamento (ex: homologada da busca)", async () => {
    render(
      <LicitacoesEmAndamentoSection
        licitacoes={sampleItems}
        portalSlug="porciuncula_prefeitura"
        ano={2026}
      />,
    );

    window.dispatchEvent(
      new CustomEvent("licitacao:selected", {
        detail: {
          numero: "000397",
          id: "lic-homologada-397",
          objeto: "Locação de tenda para a feira do livro",
          modalidade: "DISPENSA",
          status: "Homologada",
          valor: 3200,
          fromSearch: true,
        },
      }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Processo 000397/i)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Locação de tenda para a feira do livro/i),
    ).toBeInTheDocument();
  });

  it("abre o modal completo 360° ao clicar no botão do número do processo na tabela", async () => {
    render(<LicitacoesEmAndamentoSection licitacoes={sampleItems} />);

    const processoButtons = screen.getAllByRole("button", {
      name: "PE 001/2025",
    });
    expect(processoButtons.length).toBeGreaterThan(0);

    fireEvent.click(processoButtons[0]);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Processo PE 001\/2025/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByText(/Fundo Municipal de Saúde/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      within(dialog).getByText(/Aquisição de medicamentos hospitalares/i),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Valor Estimado")).toBeInTheDocument();
    expect(within(dialog).getByText("R$ 250.000,00")).toBeInTheDocument();
  });
});
