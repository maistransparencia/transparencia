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
      ano: 2024,
      contratoNumero: "0043/24",
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
    (global.fetch as any).mockResolvedValueOnce({
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
    });

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
});
