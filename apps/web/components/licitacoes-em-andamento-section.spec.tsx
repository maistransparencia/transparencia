import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { LicitacaoEmAndamentoDTO } from "@transparencia/db";
import { describe, expect, it, vi } from "vitest";
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
      situacaoCodigo: "em_andamento",
      entidadeNome: "Fundo Municipal de Saúde",
      valorEstimado: 250000,
      valorHomologado: null,
      valor: 250000,
      carona: null,
      fontesRecursos: "1.600 - Transferências do SUS; 1.500 - Recursos Livres",
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
      situacaoCodigo: "em_andamento",
      entidadeNome: "Secretaria de Educação",
      valorEstimado: 1200000,
      valorHomologado: null,
      valor: 1200000,
      carona: null,
    },
  ];

  it("renderiza cabeçalho, contagem e tabela DenseTable sem cartões de destaque", () => {
    render(<LicitacoesEmAndamentoSection licitacoes={sampleItems} />);

    expect(
      screen.getByText("Licitações Abertas e em Andamento"),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 processos em aberto/i)).toBeInTheDocument();

    expect(
      screen.queryByText("Processos em Destaque por Relevância"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("top-destaques-grid")).not.toBeInTheDocument();

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

  const expandirPrimeiraLinha = (container: HTMLElement) => {
    const tbody = container.querySelector("tbody") as HTMLElement;
    fireEvent.click(
      within(tbody).getAllByRole("button", {
        name: "Expandir detalhes da linha",
      })[0],
    );
    return tbody;
  };

  const numerosNaTabela = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("tbody tr"))
      .map((tr) => tr.querySelector("td")?.textContent ?? "")
      .filter((texto) => /\d{3}\/2025/.test(texto));

  it("ordena a tabela por padrão pelo maior valor estimado (destaques no topo)", () => {
    const { container } = render(
      <LicitacoesEmAndamentoSection licitacoes={sampleItems} />,
    );
    expect(numerosNaTabela(container)).toEqual(["CP 002/2025", "PE 001/2025"]);
  });

  it("mantém a ordem decrescente por valor com mais de 4 licitações e permite ordenar por coluna", () => {
    const cincoItens: LicitacaoEmAndamentoDTO[] = [
      ...sampleItems,
      ...[
        ["PE 003/2025", 500000],
        ["PE 004/2025", 800000],
        ["PE 005/2025", 100000],
      ].map(([numero, valor], idx) => ({
        ...sampleItems[0],
        licitacaoId: `lic-00${idx + 3}`,
        licitacaoNumero: String(numero),
        valorEstimado: Number(valor),
        valor: Number(valor),
      })),
    ];

    const { container } = render(
      <LicitacoesEmAndamentoSection licitacoes={cincoItens} />,
    );
    expect(numerosNaTabela(container)).toEqual([
      "CP 002/2025",
      "PE 004/2025",
      "PE 003/2025",
      "PE 001/2025",
      "PE 005/2025",
    ]);

    fireEvent.click(
      screen.getByRole("button", { name: /ordenar por processo/i }),
    );
    expect(numerosNaTabela(container)[0]).toBe("CP 002/2025");
    fireEvent.click(
      screen.getByRole("button", { name: /ordenar por processo/i }),
    );
    expect(numerosNaTabela(container)[0]).toBe("PE 005/2025");
  });

  it("expande a linha no desktop com objeto completo, ações e sem remover o sort", () => {
    const { container } = render(
      <LicitacoesEmAndamentoSection licitacoes={sampleItems} />,
    );
    const tbody = container.querySelector("tbody") as HTMLElement;
    expect(within(tbody).queryByText("Ver detalhes")).not.toBeInTheDocument();
    fireEvent.click(
      within(tbody).getAllByRole("button", {
        name: "Expandir detalhes da linha",
      })[0],
    );
    expect(within(tbody).getByText("Ver detalhes")).toBeInTheDocument();
    expect(within(tbody).getByText("Homologação")).toBeInTheDocument();
    expect(within(tbody).getByText("Modalidade")).toBeInTheDocument();
  });

  it("não exibe busca própria da tabela (a busca é única, via Spotlight)", () => {
    render(<LicitacoesEmAndamentoSection licitacoes={sampleItems} />);

    expect(
      screen.queryByPlaceholderText(/Buscar por objeto.*modalidade/i),
    ).not.toBeInTheDocument();
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

    const { container } = render(
      <LicitacoesEmAndamentoSection licitacoes={itensEnriquecidos} />,
    );

    // Fonte do objeto aparece no painel expandido (CP 002 é a 1ª linha por valor)
    const tbody = expandirPrimeiraLinha(container);
    expect(tbody).toHaveTextContent("Contrato Local");
    fireEvent.click(
      within(tbody).getByRole("button", { name: "Recolher detalhes da linha" }),
    );
    fireEvent.click(
      within(tbody).getAllByRole("button", {
        name: "Expandir detalhes da linha",
      })[1],
    );
    expect(tbody).toHaveTextContent("PNCP");

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

    const buttons = screen.getAllByRole("button", { name: "PE 001/2025" });
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

    const { container } = render(
      <LicitacoesEmAndamentoSection licitacoes={itemHomologado} />,
    );
    expandirPrimeiraLinha(container);

    // Valor homologado de 150.000 (economia de 25%)
    expect(screen.getAllByText(/150\.000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("-25%").length).toBeGreaterThanOrEqual(1);
  });

  it("exibe 'ainda não homologada' quando valorHomologado é nulo, sem 'Em disputa'", () => {
    const { container } = render(
      <LicitacoesEmAndamentoSection licitacoes={[sampleItems[0]]} />,
    );
    expandirPrimeiraLinha(container);

    expect(
      screen.getAllByText(/ainda não homologada/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Em disputa/i)).not.toBeInTheDocument();
  });

  it("licitação homologada mostra o valor homologado e nunca 'Em andamento' no mesmo registro", () => {
    const { container } = render(
      <LicitacoesEmAndamentoSection
        licitacoes={[
          {
            ...sampleItems[0],
            situacao: "Em Andamento",
            situacaoCodigo: "homologada",
            valorHomologado: 90000,
          },
        ]}
      />,
    );

    expandirPrimeiraLinha(container);
    expect(screen.getAllByText("Homologada").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Em andamento")).not.toBeInTheDocument();
    expect(screen.queryByText(/Em disputa/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ainda não homologada/i)).not.toBeInTheDocument();
  });

  it("texto de valor homologado ausente depende da situação", () => {
    const base = sampleItems[0];
    const comCodigo = (
      licitacaoId: string,
      situacaoCodigo: LicitacaoEmAndamentoDTO["situacaoCodigo"],
    ): LicitacaoEmAndamentoDTO => ({
      ...base,
      licitacaoId,
      licitacaoNumero: licitacaoId,
      situacaoCodigo,
      valorHomologado: null,
    });
    const { container } = render(
      <LicitacoesEmAndamentoSection
        licitacoes={[
          comCodigo("EM-ANDAMENTO", "em_andamento"),
          comCodigo("HOMOLOGADA", "homologada"),
          comCodigo("CANCELADA", "cancelada"),
        ]}
      />,
    );

    const tbody = container.querySelector("tbody") as HTMLElement;
    // Accordion: abre uma linha por vez e devolve o painel dela
    const linha = (numero: string) => {
      const principal = Array.from(tbody.querySelectorAll("tr")).find((tr) =>
        tr.textContent?.includes(numero),
      ) as HTMLElement;
      const seta = within(principal).getByRole("button", {
        name: /detalhes da linha/,
      });
      if (seta.getAttribute("aria-expanded") !== "true") fireEvent.click(seta);
      return principal.nextElementSibling as HTMLElement;
    };
    expect(linha("EM-ANDAMENTO")).toHaveTextContent("ainda não homologada");
    expect(linha("HOMOLOGADA")).toHaveTextContent("valor não informado");
    expect(linha("HOMOLOGADA")).not.toHaveTextContent("ainda não homologada");
    expect(linha("CANCELADA")).not.toHaveTextContent("ainda não homologada");
  });

  it("fallback da busca não trata valor como homologado quando situação não é homologada", async () => {
    render(<LicitacoesEmAndamentoSection licitacoes={sampleItems} />);

    window.dispatchEvent(
      new CustomEvent("licitacao:selected", {
        detail: {
          numero: "XX 999/2025",
          objeto: "Objeto vindo da busca",
          valor: 7777,
          status: "Em Andamento",
          statusCodigo: "em_andamento",
          fromSearch: true,
        },
      }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("ainda não homologada"),
    ).toBeInTheDocument();
  });

  it("renderiza linhas mobile tocáveis em accordion com o mesmo painel do desktop", () => {
    const { container } = render(
      <LicitacoesEmAndamentoSection licitacoes={sampleItems} />,
    );

    const linhas = container.querySelectorAll(
      "div[role='button'][aria-expanded]",
    );
    expect(linhas).toHaveLength(sampleItems.length);
    expect(linhas[0]).toHaveTextContent("CP 002/2025");
    expect(container.querySelectorAll("details")).toHaveLength(0);

    fireEvent.click(linhas[0]);
    expect(linhas[0]).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(linhas[1]);
    expect(linhas[0]).toHaveAttribute("aria-expanded", "false");
    expect(linhas[1]).toHaveAttribute("aria-expanded", "true");
  });

  it("no mobile, tocar no número do processo abre o modal e não expande a linha", async () => {
    const { container } = render(
      <LicitacoesEmAndamentoSection licitacoes={sampleItems} />,
    );
    const linha = container.querySelector(
      "div[role='button'][aria-expanded]",
    ) as HTMLElement;
    fireEvent.click(within(linha).getByRole("button", { name: "CP 002/2025" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(linha).toHaveAttribute("aria-expanded", "false");
  });

  it("não oferece Baixar CSV no mobile e oferece ordenação compacta", () => {
    const { container } = render(
      <LicitacoesEmAndamentoSection licitacoes={sampleItems} />,
    );
    expect(
      container.querySelector('button[aria-label="Baixar CSV"]'),
    ).toBeNull();
    expect(screen.getByLabelText("Ordenar por")).toBeInTheDocument();
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

  it("exibe aviso de exercício diferente e restaura o ano base na URL ao fechar detalhe aberto via busca", async () => {
    window.history.replaceState(
      null,
      "",
      "/porciuncula_prefeitura/licitacoes?ano=2026",
    );

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
          numero: "PE 001/2024",
          ano: 2024,
          objeto: "Contratação de internet escolar",
          modalidade: "Pregão Eletrônico",
          status: "Em andamento",
          fromSearch: true,
        },
      }),
    );

    const banner = await screen.findByText(/pertence ao exercício de/i);
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent("2024");
    expect(banner).toHaveTextContent("2026");
    const link = screen.getByRole("link", { name: /mudar painel para 2024/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "/porciuncula_prefeitura/licitacoes?ano=2024&numero=PE%20001%2F2024#licitacoes-em-andamento",
    );

    // Simula a URL intermediária aplicada pelo Spotlight ao selecionar o item de 2024
    Object.defineProperty(window, "location", {
      writable: true,
      value: new URL(
        "http://localhost:3000/porciuncula_prefeitura/licitacoes?ano=2024&numero=PE%20001%2F2024#licitacoes-em-andamento",
      ),
    });

    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    const backButton = screen.getByRole("button", {
      name: /voltar aos resultados da busca/i,
    });
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      "",
      expect.stringContaining("ano=2026"),
    );
    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      "",
      expect.not.stringContaining("numero="),
    );
    replaceStateSpy.mockRestore();
  });

  it("desambigua exercício e não seleciona processo homônimo pré-carregado de ano divergente", async () => {
    render(
      <LicitacoesEmAndamentoSection
        licitacoes={sampleItems}
        portalSlug="porciuncula_prefeitura"
        ano={2026}
      />,
    );

    // Dispara busca por processo com mesmo número PE 001/2025, mas ano 2024
    window.dispatchEvent(
      new CustomEvent("licitacao:selected", {
        detail: {
          numero: "PE 001/2025",
          ano: 2024,
          objeto: "Processo de 2024",
          fromSearch: true,
        },
      }),
    );

    const banner = await screen.findByText(/pertence ao exercício de/i);
    expect(banner).toHaveTextContent("2024");
    expect(banner).not.toHaveTextContent("2025");
  });

  it("exibe botão 'Voltar ao Contrato' e reabre o contrato ao clicar quando aberto a partir de um contrato", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: new URL("http://localhost:3000/porciuncula_prefeitura/licitacoes"),
    });

    const contratoSelectedListener = vi.fn();
    window.addEventListener("contrato:selected", contratoSelectedListener);

    render(
      <LicitacoesEmAndamentoSection
        licitacoes={sampleItems}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    window.dispatchEvent(
      new CustomEvent("licitacao:selected", {
        detail: {
          numero: "PE 001/2025",
          portalSlug: "porciuncula_prefeitura",
          fromContrato: {
            contratoNumero: "0462/25",
            ano: 2025,
            portalSlug: "porciuncula_prefeitura",
          },
        },
      }),
    );

    const backButton = await screen.findByRole("button", {
      name: /voltar ao contrato nº 0462\/25/i,
    });
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(contratoSelectedListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            contratoNumero: "0462/25",
            ano: 2025,
            portalSlug: "porciuncula_prefeitura",
          }),
        }),
      );
    });

    window.removeEventListener("contrato:selected", contratoSelectedListener);
  });

  it("fecha o modal da licitação ao disparar evento popstate sem numero na URL", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: new URL(
        "http://localhost:3000/porciuncula_prefeitura/licitacoes?numero=PE 001/2025",
      ),
    });

    render(
      <LicitacoesEmAndamentoSection
        licitacoes={sampleItems}
        portalSlug="porciuncula_prefeitura"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Simula clique em voltar no navegador: a URL muda e remove o param ?numero=
    Object.defineProperty(window, "location", {
      writable: true,
      value: new URL("http://localhost:3000/porciuncula_prefeitura/licitacoes"),
    });

    window.dispatchEvent(new PopStateEvent("popstate"));

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
      name: "PE 001/2025",
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

  it("abre o modal completo 360° ao clicar em Ver detalhes no painel expandido da tabela", async () => {
    render(<LicitacoesEmAndamentoSection licitacoes={sampleItems} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Expandir detalhes da linha" })[1],
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Ver detalhes" })[0]);

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
    expect(
      within(dialog).getByText("1.600 - Transferências do SUS"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("1.500 - Recursos Livres"),
    ).toBeInTheDocument();
  });

  it("clicar na linha expande; clicar no número do processo abre o modal sem expandir", async () => {
    const { container } = render(
      <LicitacoesEmAndamentoSection licitacoes={sampleItems} />,
    );
    const tbody = container.querySelector("tbody") as HTMLElement;
    fireEvent.click(within(tbody).getByText(/Reforma e ampliação/));
    expect(within(tbody).getByText("Homologação")).toBeInTheDocument();

    const { container: c2 } = render(
      <LicitacoesEmAndamentoSection licitacoes={sampleItems} />,
    );
    const tbody2 = c2.querySelector("tbody") as HTMLElement;
    fireEvent.click(
      within(tbody2).getByRole("button", { name: "PE 001/2025" }),
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(within(tbody2).queryByText("Homologação")).not.toBeInTheDocument();
  });
});
