import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ContratoServicoVigente } from "@transparencia/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContratosServicosVigentesSection } from "./contratos-servicos-vigentes-section";

describe("ContratosServicosVigentesSection", () => {
  const mockContratos: ContratoServicoVigente[] = [
    {
      contratoServicoId: "ctr-1",
      portalSlug: "porciuncula_prefeitura",
      empresaId: "2",
      orgaoNome: "Fundo Municipal de Saúde",
      ano: 2024,
      contratoNumero: "0043/24",
      licitacaoNumero: "0015/24",
      fontePrincipal: "1.500 - Recursos Livres",
      fontesRecursos: "1.500 - Recursos Livres; 1.600 - Transferências do SUS",
      programaNome: "ATENÇÃO BÁSICA EM SAÚDE",
      projetoAtividadeNome: "Manutenção dos Postos de Saúde da Família",
      fornecedorNome: "JUSTINA REGINA R. MONTEIRO",
      fornecedorCnpj: "12345678000190",
      objetoDescricao:
        "Locação de Imóvel Residencial para funcionamento de unidade administrativa pública municipal.",
      dataInicio: "2024-01-01",
      vencimentoAtual: "2024-12-31",
      totalEmpenhado: 24000,
      totalLiquidado: 20000,
      totalPago: 18000,
      saldoPendente: 6000,
      percentualPago: 75,
      statusExecucao: "em_execucao",
    },
    {
      contratoServicoId: "ctr-2",
      portalSlug: "porciuncula_prefeitura",
      ano: 2024,
      contratoNumero: "0010/24",
      fornecedorNome: "AUTO POSTO CENTRAL LTDA",
      fornecedorCnpj: "98765432000109",
      objetoDescricao: "Fornecimento de combustível para a frota municipal.",
      dataInicio: "2024-02-01",
      vencimentoAtual: "2024-11-30",
      totalEmpenhado: 120000,
      totalLiquidado: 120000,
      totalPago: 120000,
      saldoPendente: 0,
      percentualPago: 100,
      statusExecucao: "concluido",
    },
    {
      contratoServicoId: "ctr-3",
      portalSlug: "porciuncula_prefeitura",
      ano: 2024,
      contratoNumero: "0005/24",
      fornecedorNome: "CONSTRUTORA NORTE LTDA",
      fornecedorCnpj: "11222333000144",
      objetoDescricao: "Serviços de recapeamento asfáltico.",
      dataInicio: "2024-03-01",
      vencimentoAtual: "2024-08-31",
      totalEmpenhado: 50000,
      totalLiquidado: 0,
      totalPago: 0,
      saldoPendente: 50000,
      percentualPago: 0,
      statusExecucao: "inexecutado",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.history.replaceState(null, "", "/porciuncula_prefeitura/licitacoes");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza cabeçalho, contagens de filtro, cards top 3 e tabela", () => {
    render(
      <ContratosServicosVigentesSection
        contratos={mockContratos}
        portalSlug="porciuncula_prefeitura"
        ano={2024}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Contratos de Serviços Vigentes" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 contratos/i)).toBeInTheDocument();
    expect(screen.getByText(/Em Execução \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Concluídos \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Não Executados \(1\)/i)).toBeInTheDocument();

    // Top cards
    expect(
      screen.getAllByText("JUSTINA REGINA R. MONTEIRO").length,
    ).toBeGreaterThan(0);
  });

  it("abre automaticamente o Modal de Detalhes 360° via deep-link de URL (?contratoNumero=...)", async () => {
    window.history.replaceState(
      null,
      "",
      "/porciuncula_prefeitura/licitacoes?contratoNumero=0043%2F24",
    );

    render(
      <ContratosServicosVigentesSection
        contratos={mockContratos}
        portalSlug="porciuncula_prefeitura"
        ano={2024}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Contrato nº 0043/24")).toBeInTheDocument();
    expect(within(dialog).getByText("12.345.678/0001-90")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Locação de Imóvel Residencial/i),
    ).toBeInTheDocument();

    // Validar métricas financeiras
    expect(within(dialog).getByText("R$ 24.000,00")).toBeInTheDocument(); // Empenhado
    expect(within(dialog).getByText("R$ 20.000,00")).toBeInTheDocument(); // Liquidado
    expect(within(dialog).getByText("R$ 18.000,00")).toBeInTheDocument(); // Pago
    expect(within(dialog).getByText("R$ 6.000,00")).toBeInTheDocument(); // Saldo Pendente
    expect(within(dialog).getByText(/75[.,]00%/)).toBeInTheDocument(); // % Pago

    // Validar rastreabilidade de órgão e recursos
    expect(
      within(dialog).getByText("Fundo Municipal de Saúde"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("0015/24")).toBeInTheDocument();
    expect(
      within(dialog).getByText("1.500 - Recursos Livres"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("1.600 - Transferências do SUS"),
    ).toBeInTheDocument();

    // Verifica scroll suave
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("abre o modal via evento customizado 'contrato:selected' com retenção de busca e botão de voltar", async () => {
    render(
      <ContratosServicosVigentesSection
        contratos={mockContratos}
        portalSlug="porciuncula_prefeitura"
        ano={2024}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    window.dispatchEvent(
      new CustomEvent("contrato:selected", {
        detail: {
          contratoNumero: "0043/24",
          fromSearch: true,
        },
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Botão Voltar aos resultados da busca
    const backBtn = screen.getByRole("button", {
      name: /Voltar aos resultados da busca/i,
    });
    expect(backBtn).toBeInTheDocument();

    // Clicar em voltar fecha o modal de contrato
    fireEvent.click(backBtn);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("comuta automaticamente o statusFilter para 'todos' se o contrato selecionado tiver outro status", async () => {
    // Por padrão o filtro é 'em_execucao'. O contrato 0010/24 é 'concluido'.
    render(
      <ContratosServicosVigentesSection
        contratos={mockContratos}
        portalSlug="porciuncula_prefeitura"
        ano={2024}
      />,
    );

    window.dispatchEvent(
      new CustomEvent("contrato:selected", {
        detail: {
          contratoNumero: "0010/24",
        },
      }),
    );

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(
        within(dialog).getByText("Contrato nº 0010/24"),
      ).toBeInTheDocument();
    });

    // O filtro 'Todos' deve estar ativo
    const todosBtn = screen.getByRole("button", { name: /Todos \(3\)/i });
    expect(todosBtn).toHaveClass("bg-blue-600");
  });

  it("busca detalhes via API quando o contrato não constar na lista pré-carregada", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        contrato: {
          contratoServicoId: "ctr-externo-99",
          portalSlug: "porciuncula_prefeitura",
          ano: 2024,
          contratoNumero: "0999/24",
          fornecedorNome: "FORNECEDOR EXTERNO API LTDA",
          fornecedorCnpj: "44555666000177",
          objetoDescricao: "Serviço vindo via endpoint de detalhes.",
          dataInicio: "2024-05-01",
          vencimentoAtual: "2024-12-31",
          totalEmpenhado: 99000,
          totalLiquidado: 50000,
          totalPago: 40000,
          saldoPendente: 59000,
          percentualPago: 40.4,
          statusExecucao: "em_execucao",
        },
      }),
    } as unknown as Response);

    render(
      <ContratosServicosVigentesSection
        contratos={mockContratos}
        portalSlug="porciuncula_prefeitura"
        ano={2024}
      />,
    );

    window.dispatchEvent(
      new CustomEvent("contrato:selected", {
        detail: {
          contratoNumero: "0999/24",
        },
      }),
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("numero=0999%2F24"),
      );
    });

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(
        within(dialog).getAllByText("FORNECEDOR EXTERNO API LTDA").length,
      ).toBeGreaterThan(0);
      expect(
        within(dialog).getByText("44.555.666/0001-77"),
      ).toBeInTheDocument();
      expect(within(dialog).getByText("R$ 99.000,00")).toBeInTheDocument();
    });
  });

  it("abre o modal ao clicar no botão 'Detalhes' na tabela ou no card", async () => {
    render(
      <ContratosServicosVigentesSection
        contratos={mockContratos}
        portalSlug="porciuncula_prefeitura"
        ano={2024}
      />,
    );

    const detalhesButtons = screen.getAllByRole("button", { name: "Detalhes" });
    expect(detalhesButtons.length).toBeGreaterThan(0);

    fireEvent.click(detalhesButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("destaca a linha correspondente da tabela quando o contrato está selecionado via deep link", async () => {
    window.history.replaceState(
      null,
      "",
      "/porciuncula_prefeitura/licitacoes?contratoNumero=0043%2F24",
    );

    render(
      <ContratosServicosVigentesSection
        contratos={mockContratos}
        portalSlug="porciuncula_prefeitura"
        ano={2024}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const highlightedRow = rows.find((r) =>
      r.className.includes("border-l-amber-500"),
    );
    expect(highlightedRow).toBeDefined();
    expect(highlightedRow).toHaveClass("bg-amber-50/70");
  });

  it("exibe a fonte principal em destaque e a destinação orçamentária no modal de detalhes", async () => {
    window.history.replaceState(
      null,
      "",
      "/porciuncula_prefeitura/licitacoes?contratoNumero=0043%2F24",
    );

    render(
      <ContratosServicosVigentesSection
        contratos={mockContratos}
        portalSlug="porciuncula_prefeitura"
        ano={2024}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(/Fonte de Recursos & Destinação Orçamentária/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("1.500 - Recursos Livres"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Principal")).toBeInTheDocument();
    expect(
      within(dialog).getByText("1.600 - Transferências do SUS"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("ATENÇÃO BÁSICA EM SAÚDE"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Manutenção dos Postos de Saúde da Família"),
    ).toBeInTheDocument();
  });

  it("permite navegar para o processo licitatório vinculado a partir do modal do contrato", async () => {
    window.history.replaceState(
      null,
      "",
      "/porciuncula_prefeitura/licitacoes?contratoNumero=0043%2F24",
    );

    const licitacaoSelectedListener = vi.fn();
    window.addEventListener("licitacao:selected", licitacaoSelectedListener);

    render(
      <ContratosServicosVigentesSection
        contratos={mockContratos}
        portalSlug="porciuncula_prefeitura"
        ano={2024}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const licitacaoButton = screen.getByRole("button", {
      name: /0015\/24/i,
    });
    expect(licitacaoButton).toBeInTheDocument();

    fireEvent.click(licitacaoButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(licitacaoSelectedListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            numero: "0015/24",
            portalSlug: "porciuncula_prefeitura",
            fromContrato: expect.objectContaining({
              contratoNumero: "0043/24",
              ano: 2024,
            }),
          }),
        }),
      );
    });

    window.removeEventListener("licitacao:selected", licitacaoSelectedListener);
  });

  it("exibe aviso de exercício diferente e restaura o ano base na URL ao fechar contrato aberto via busca", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: new URL(
        "http://localhost:3000/porciuncula_prefeitura/licitacoes?ano=2026",
      ),
    });

    render(
      <ContratosServicosVigentesSection
        contratos={mockContratos}
        portalSlug="porciuncula_prefeitura"
        ano={2026}
      />,
    );

    window.dispatchEvent(
      new CustomEvent("contrato:selected", {
        detail: {
          contratoNumero: "0099/24",
          numero: "0099/24",
          ano: 2024,
          objeto: "Reforma de unidade escolar",
          fornecedorNome: "CONSTRUTORA ALVORADA LTDA",
          valor: 120000,
          fromSearch: true,
        },
      }),
    );

    const banner = await screen.findByText(/pertence ao exercício de/i);
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent("2024");
    expect(banner).toHaveTextContent("2026");
    expect(
      screen.getByRole("link", { name: /mudar painel para 2024/i }),
    ).toBeInTheDocument();

    const backButton = screen.getByRole("button", {
      name: /voltar aos resultados da busca/i,
    });
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    const currentUrl = new URL(window.location.href);
    expect(currentUrl.searchParams.get("ano")).toBe("2026");
    expect(currentUrl.searchParams.has("contratoNumero")).toBe(false);
  });
});
