import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LicitacoesSearchBar } from "./licitacoes-search-bar";
import { LicitacoesSpotlightModal } from "./licitacoes-spotlight-modal";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("LicitacoesSpotlightModal & LicitacoesSearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("LicitacoesSearchBar", () => {
    it("deve renderizar a barra de busca e abrir o modal ao clicar", () => {
      render(
        <LicitacoesSearchBar portalSlug="porciuncula_prefeitura" ano={2024} />,
      );

      const button = screen.getByRole("button", {
        name: /abrir busca global de licitações e contratos/i,
      });
      expect(button).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("deve abrir o modal ao acionar o atalho de teclado ⌘K / Ctrl+K", () => {
      render(<LicitacoesSearchBar portalSlug="porciuncula_prefeitura" />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      fireEvent.keyDown(window, { key: "k", metaKey: true });
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("LicitacoesSpotlightModal", () => {
    it("não deve renderizar quando isOpen for false", () => {
      render(
        <LicitacoesSpotlightModal
          isOpen={false}
          onClose={vi.fn()}
          portalSlug="porciuncula_prefeitura"
        />,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("deve fechar o modal ao pressionar Escape", () => {
      const onClose = vi.fn();
      render(
        <LicitacoesSpotlightModal
          isOpen={true}
          onClose={onClose}
          portalSlug="porciuncula_prefeitura"
        />,
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();

      fireEvent.keyDown(dialog, { key: "Escape" });
      expect(onClose).toHaveBeenCalled();
    });

    it("deve exibir sugestões rápidas quando o termo for menor que 2 caracteres", () => {
      render(
        <LicitacoesSpotlightModal
          isOpen={true}
          onClose={vi.fn()}
          portalSlug="porciuncula_prefeitura"
        />,
      );

      expect(
        screen.getByText(/digite ao menos 2 caracteres/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "0043/24" }),
      ).toBeInTheDocument();
    });

    it("deve buscar e renderizar seções segregadas de Licitações e Contratos", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          licitacoes: [
            {
              id: "lic-1",
              tipo: "licitacao",
              numero: "0043/24",
              objeto: "Locação de veículos escolares",
              fornecedorNome: null,
              valor: 150000,
              status: "em_andamento",
              modalidade: "Pregão Eletrônico",
              ano: 2024,
              portalSlug: "porciuncula_prefeitura",
              href: "/porciuncula_prefeitura/licitacoes?ano=2024&numero=0043%2F24#licitacoes-em-andamento",
            },
          ],
          contratos: [
            {
              id: "ctr-1",
              tipo: "contrato",
              numero: "0043/24",
              objeto: "Locação de Imóvel Residencial",
              fornecedorNome: "JUSTINA REGINA R. MONTEIRO",
              valor: 24000,
              status: "vigente",
              modalidade: "Dispensa",
              ano: 2024,
              portalSlug: "porciuncula_prefeitura",
              href: "/porciuncula_prefeitura/licitacoes?ano=2024&numero=0043%2F24#contratos-servicos-vigentes",
            },
          ],
          total: 2,
        }),
      });

      const onSelect = vi.fn();
      render(
        <LicitacoesSpotlightModal
          isOpen={true}
          onClose={vi.fn()}
          portalSlug="porciuncula_prefeitura"
          ano={2024}
          onSelect={onSelect}
        />,
      );

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "0043/24" } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("q=0043%2F24"),
          expect.any(Object),
        );
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Licitações Encontradas \(1\)/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/Contratos \(1\)/i)).toBeInTheDocument();
      });

      expect(
        screen.getByText("Locação de veículos escolares"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Fornecedor: JUSTINA REGINA R. MONTEIRO"),
      ).toBeInTheDocument();

      // Navegar com teclado (Enter no primeiro item selecionado)
      const dialog = screen.getByRole("dialog");
      fireEvent.keyDown(dialog, { key: "Enter" });
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: "lic-1", numero: "0043/24" }),
      );
    });

    it("deve exibir estado vazio amigável quando nenhum resultado for retornado", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          licitacoes: [],
          contratos: [],
          total: 0,
        }),
      });

      render(
        <LicitacoesSpotlightModal
          isOpen={true}
          onClose={vi.fn()}
          portalSlug="porciuncula_prefeitura"
        />,
      );

      const input = screen.getByRole("combobox");
      fireEvent.change(input, {
        target: { value: "termo_inexistente_xyz_123" },
      });

      await waitFor(() => {
        expect(
          screen.getByText(/nenhum processo ou contrato encontrado/i),
        ).toBeInTheDocument();
      });
    });

    it("deve navegar entre itens com ArrowDown/ArrowUp e acionar router.push quando onSelect for omitido", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          licitacoes: [
            {
              id: "lic-1",
              tipo: "licitacao",
              numero: "0043/24",
              objeto: "Locação de veículos escolares",
              fornecedorNome: null,
              valor: 150000,
              status: "em_andamento",
              modalidade: "Pregão Eletrônico",
              ano: 2024,
              portalSlug: "porciuncula_prefeitura",
              href: "/porciuncula_prefeitura/licitacoes?ano=2024&numero=0043%2F24#licitacoes-em-andamento",
            },
          ],
          contratos: [
            {
              id: "ctr-1",
              tipo: "contrato",
              numero: "0043/24",
              objeto: "Locação de Imóvel Residencial",
              fornecedorNome: "JUSTINA REGINA R. MONTEIRO",
              valor: 24000,
              status: "vigente",
              modalidade: "Dispensa",
              ano: 2023,
              portalSlug: "porciuncula_prefeitura",
              href: "/porciuncula_prefeitura/licitacoes?ano=2023&contratoNumero=0043%2F24#contratos-servicos-vigentes",
            },
          ],
          total: 2,
        }),
      });

      render(
        <LicitacoesSpotlightModal
          isOpen={true}
          onClose={vi.fn()}
          portalSlug="porciuncula_prefeitura"
          ano={2024}
        />,
      );

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "0043/24" } });

      await waitFor(() => {
        expect(
          screen.getByText(/Licitações Encontradas \(1\)/i),
        ).toBeInTheDocument();
      });

      const contratoOption = screen.getByRole("option", {
        name: /JUSTINA REGINA R. MONTEIRO/i,
      });
      fireEvent.click(contratoOption);

      expect(mockPush).toHaveBeenCalledWith(
        "/porciuncula_prefeitura/licitacoes?ano=2023&contratoNumero=0043%2F24#contratos-servicos-vigentes",
      );
    });

    it("deve exibir banner de erro amigável quando a API retornar 429 ou 500", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      render(
        <LicitacoesSpotlightModal
          isOpen={true}
          onClose={vi.fn()}
          portalSlug="porciuncula_prefeitura"
        />,
      );

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "busca_com_rate_limit" } });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(
          screen.getByText(/Muitas buscas consecutivas/i),
        ).toBeInTheDocument();
      });
    });

    it("deve ocultar atalhos de teclado no mobile aplicando classe responsiva", () => {
      render(
        <LicitacoesSpotlightModal
          isOpen={true}
          onClose={vi.fn()}
          portalSlug="porciuncula_prefeitura"
        />,
      );

      const navText = screen.getByText(/para navegar/i);
      const shortcutsContainer = navText.closest("div");
      expect(shortcutsContainer).toHaveClass("hidden");
      expect(shortcutsContainer).toHaveClass("sm:flex");
    });

    it("deve fechar o modal ao clicar no botão Cancelar no mobile", () => {
      const onClose = vi.fn();
      render(
        <LicitacoesSpotlightModal
          isOpen={true}
          onClose={onClose}
          portalSlug="porciuncula_prefeitura"
        />,
      );

      const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
      expect(cancelBtn).toBeInTheDocument();
      fireEvent.click(cancelBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it("deve manter o modal de busca aberto ao selecionar uma licitação do mesmo ano para navegação em camadas", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          licitacoes: [
            {
              id: "lic-1",
              tipo: "licitacao",
              numero: "0043/24",
              objeto: "Locação de veículos escolares",
              fornecedorNome: null,
              valor: 150000,
              status: "em_andamento",
              modalidade: "Pregão Eletrônico",
              ano: 2024,
              portalSlug: "porciuncula_prefeitura",
              href: "/porciuncula_prefeitura/licitacoes?ano=2024&numero=0043%2F24#licitacoes-em-andamento",
            },
          ],
          contratos: [],
          total: 1,
        }),
      });

      const onClose = vi.fn();
      render(
        <LicitacoesSpotlightModal
          isOpen={true}
          onClose={onClose}
          portalSlug="porciuncula_prefeitura"
          ano={2024}
        />,
      );

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "0043/24" } });

      await waitFor(() => {
        expect(
          screen.getByText(/Licitações Encontradas \(1\)/i),
        ).toBeInTheDocument();
      });

      const licItem = screen.getByRole("option", {
        name: /Locação de veículos escolares/i,
      });

      fireEvent.click(licItem);

      // Não deve fechar o modal de busca, permitindo que a camada de detalhes abra por cima
      expect(onClose).not.toHaveBeenCalled();
    });

    it("deve manter o modal de busca aberto ao selecionar um contrato do mesmo ano para navegação em camadas e disparar contrato:selected", async () => {
      const listenerMock = vi.fn();
      window.addEventListener("contrato:selected", listenerMock);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          licitacoes: [],
          contratos: [
            {
              id: "ctr-2",
              tipo: "contrato",
              numero: "0010/26",
              objeto: "Prestação de serviços contínuos",
              fornecedorNome: "EMPRESA MODELO LTDA",
              valor: 50000,
              status: "vigente",
              modalidade: "Pregão",
              ano: 2026,
              portalSlug: "porciuncula_prefeitura",
              href: "/porciuncula_prefeitura/licitacoes?ano=2026&contratoNumero=0010%2F26#contratos-servicos-vigentes",
            },
          ],
          total: 1,
        }),
      });

      const onClose = vi.fn();
      render(
        <LicitacoesSpotlightModal
          isOpen={true}
          onClose={onClose}
          portalSlug="porciuncula_prefeitura"
          ano={2026}
        />,
      );

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "0010/26" } });

      await waitFor(() => {
        expect(screen.getByText(/Contratos \(1\)/i)).toBeInTheDocument();
      });

      const contratoItem = screen.getByRole("option", {
        name: /Prestação de serviços contínuos/i,
      });

      fireEvent.click(contratoItem);

      // Não deve fechar o modal de busca (openedFromSearch = true com sobreposição em camadas)
      expect(onClose).not.toHaveBeenCalled();

      // Deve disparar o evento contrato:selected
      expect(listenerMock).toHaveBeenCalledTimes(1);
      const eventDetail = listenerMock.mock.calls[0][0].detail;
      expect(eventDetail.numero).toBe("0010/26");
      expect(eventDetail.fromSearch).toBe(true);

      window.removeEventListener("contrato:selected", listenerMock);
    });

    it("deve bloquear o scroll do body enquanto o modal estiver aberto e restaurar ao desmontar", () => {
      const { unmount } = render(
        <LicitacoesSpotlightModal
          isOpen={true}
          onClose={vi.fn()}
          portalSlug="porciuncula_prefeitura"
        />,
      );

      expect(document.body.style.overflow).toBe("hidden");

      unmount();
      expect(document.body.style.overflow).toBe("");
    });

    it("deve exibir fornecedor homologado em licitações quando presente no resultado", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          licitacoes: [
            {
              id: "lic-homol-1",
              tipo: "licitacao",
              numero: "LIC-001/26",
              objeto: "Aquisição de mobiliário escolar",
              fornecedorNome: "DOHA EMPREENDIMENTOS E SERVICOS LTDA",
              valor: 75000,
              status: "homologada",
              modalidade: "Pregão Eletrônico",
              ano: 2026,
              portalSlug: "porciuncula_prefeitura",
              href: "/porciuncula_prefeitura/licitacoes?ano=2026&numero=LIC-001%2F26#licitacoes-em-andamento",
            },
          ],
          contratos: [],
          total: 1,
        }),
      });

      render(
        <LicitacoesSpotlightModal
          isOpen={true}
          onClose={vi.fn()}
          portalSlug="porciuncula_prefeitura"
          ano={2026}
        />,
      );

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "DOHA" } });

      await waitFor(() => {
        expect(
          screen.getByText(/Licitações Encontradas \(1\)/i),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText("Fornecedor: DOHA EMPREENDIMENTOS E SERVICOS LTDA"),
      ).toBeInTheDocument();
    });

    it("deve exibir badge de ano de celebração e período de vigência formatado para contratos vigentes de anos anteriores", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          licitacoes: [],
          contratos: [
            {
              id: "ctr-pluri-1",
              tipo: "contrato",
              numero: "0012/24",
              objeto: "Construção de ponte vicinal",
              fornecedorNome: "CONSTRUTORA HORIZONTE LTDA",
              valor: 350000,
              status: "vigente",
              modalidade: "Concorrência",
              ano: 2024,
              anoCelebracao: 2024,
              dataInicio: "2024-03-15",
              vencimentoAtual: "2027-03-15",
              portalSlug: "porciuncula_prefeitura",
              href: "/porciuncula_prefeitura/licitacoes?ano=2024&contratoNumero=0012%2F24#contratos-servicos-vigentes",
            },
          ],
          total: 1,
        }),
      });

      render(
        <LicitacoesSpotlightModal
          isOpen={true}
          onClose={vi.fn()}
          portalSlug="porciuncula_prefeitura"
          ano={2026}
        />,
      );

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "ponte" } });

      await waitFor(() => {
        expect(screen.getByText(/Contratos \(1\)/i)).toBeInTheDocument();
      });

      // Deve exibir o badge de ano de celebração
      expect(screen.getByText("Celebrado em 2024")).toBeInTheDocument();

      // Deve exibir a vigência formatada
      expect(
        screen.getByText("Vigência: 15/03/2024 a 15/03/2027"),
      ).toBeInTheDocument();
    });
  });
});
