import { fireEvent, render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { useQueryState } from "nuqs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isTabActive,
  MobileBottomNav,
  PRIMARY_NAV_TABS,
  resolveActiveTabIndex,
} from "./mobile-bottom-nav";
import * as MobileNavContextModule from "./mobile-nav-context";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("nuqs", () => ({
  parseAsString: {
    withDefault: () => ({
      withOptions: () => ({}),
    }),
    withOptions: () => ({}),
  },
  useQueryState: vi.fn(),
}));

const mockUsePathname = vi.mocked(usePathname);
const mockUseQueryState = vi.mocked(useQueryState);

describe("MobileBottomNav Component (5 Tabs: 4 Primárias + Mais)", () => {
  const mockToggleMenu = vi.fn();
  const mockSetIsMenuOpen = vi.fn();
  const mockCloseMenu = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/porciuncula_prefeitura");
    mockUseQueryState.mockImplementation(((key: string) => {
      if (key === "ano") return ["2026", vi.fn()];
      if (key === "entidades") return [null, vi.fn()];
      return [null, vi.fn()];
    }) as unknown as typeof useQueryState);

    vi.spyOn(MobileNavContextModule, "useMobileNav").mockReturnValue({
      isMenuOpen: false,
      setIsMenuOpen: mockSetIsMenuOpen,
      toggleMenu: mockToggleMenu,
      closeMenu: mockCloseMenu,
    });
  });

  describe("Helper Functions", () => {
    it("isTabActive deve reconhecer corretamente páginas e sub-rotas", () => {
      expect(isTabActive("/", "/", "porciuncula_prefeitura")).toBe(true);
      expect(
        isTabActive("/porciuncula_prefeitura", "/", "porciuncula_prefeitura"),
      ).toBe(true);
      expect(
        isTabActive(
          "/porciuncula_prefeitura/receitas",
          "/receitas",
          "porciuncula_prefeitura",
        ),
      ).toBe(true);
      expect(
        isTabActive(
          "/porciuncula_prefeitura/despesas/subitem/123",
          "/despesas",
          "porciuncula_prefeitura",
        ),
      ).toBe(true);
      expect(
        isTabActive(
          "/porciuncula_prefeitura/saude",
          "/receitas",
          "porciuncula_prefeitura",
        ),
      ).toBe(false);
    });

    it("resolveActiveTabIndex deve retornar o índice da aba ou 4 para Mais", () => {
      expect(resolveActiveTabIndex("/", "porciuncula_prefeitura")).toBe(0);
      expect(
        resolveActiveTabIndex(
          "/porciuncula_prefeitura/receitas",
          "porciuncula_prefeitura",
        ),
      ).toBe(1);
      expect(
        resolveActiveTabIndex(
          "/porciuncula_prefeitura/despesas",
          "porciuncula_prefeitura",
        ),
      ).toBe(2);
      expect(
        resolveActiveTabIndex(
          "/porciuncula_prefeitura/licitacoes",
          "porciuncula_prefeitura",
        ),
      ).toBe(3);
      // Rotas do menu lateral retornam 4 ("Mais")
      expect(
        resolveActiveTabIndex(
          "/porciuncula_prefeitura/orcamento",
          "porciuncula_prefeitura",
        ),
      ).toBe(4);
      expect(
        resolveActiveTabIndex(
          "/porciuncula_prefeitura/pessoal",
          "porciuncula_prefeitura",
        ),
      ).toBe(4);
      expect(
        resolveActiveTabIndex(
          "/porciuncula_prefeitura/saude",
          "porciuncula_prefeitura",
        ),
      ).toBe(4);
      expect(
        resolveActiveTabIndex(
          "/porciuncula_prefeitura/caprem",
          "porciuncula_prefeitura",
        ),
      ).toBe(4);
    });
  });

  describe("Renderização e Interações da Barra", () => {
    it("deve renderizar as 4 abas primárias e o botão Mais", () => {
      render(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);

      for (const tab of PRIMARY_NAV_TABS) {
        expect(
          screen.getByRole("link", { name: tab.label }),
        ).toBeInTheDocument();
      }

      const moreBtn = screen.getByRole("button", {
        name: /mais opções e seções/i,
      });
      expect(moreBtn).toBeInTheDocument();
      expect(screen.getByText("Mais")).toBeInTheDocument();
    });

    it("deve marcar Visão Geral como ativa quando estiver na raiz", () => {
      mockUsePathname.mockReturnValue("/porciuncula_prefeitura");
      render(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);

      const homeLink = screen.getByRole("link", { name: /visão geral/i });
      expect(homeLink).toHaveAttribute("aria-current", "page");

      const receitasLink = screen.getByRole("link", { name: /^receitas$/i });
      expect(receitasLink).not.toHaveAttribute("aria-current");
    });

    it("deve marcar Despesas como ativa na rota de despesas", () => {
      mockUsePathname.mockReturnValue("/porciuncula_prefeitura/despesas");
      render(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);

      const despesasLink = screen.getByRole("link", {
        name: /despesas detalhadas/i,
      });
      expect(despesasLink).toHaveAttribute("aria-current", "page");

      const homeLink = screen.getByRole("link", { name: /visão geral/i });
      expect(homeLink).not.toHaveAttribute("aria-current");
    });

    it("deve ativar o botão Mais ao navegar em seção do menu lateral como Saúde", () => {
      mockUsePathname.mockReturnValue("/porciuncula_prefeitura/saude");
      render(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);

      const moreBtn = screen.getByRole("button", {
        name: /mais opções e seções/i,
      });
      expect(moreBtn).toHaveClass("text-[oklch(0.55_0.11_250)]");
    });

    it("deve disparar toggleMenu ao clicar no botão Mais", () => {
      render(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);

      const moreBtn = screen.getByRole("button", {
        name: /mais opções e seções/i,
      });
      fireEvent.click(moreBtn);
      expect(mockToggleMenu).toHaveBeenCalledTimes(1);
    });

    it("deve refletir aria-expanded quando o menu lateral estiver aberto", () => {
      vi.spyOn(MobileNavContextModule, "useMobileNav").mockReturnValue({
        isMenuOpen: true,
        setIsMenuOpen: mockSetIsMenuOpen,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
      });

      render(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);

      const moreBtn = screen.getByRole("button", {
        name: /fechar menu de seções/i,
      });
      expect(moreBtn).toHaveAttribute("aria-expanded", "true");
    });

    it("deve preservar parâmetros de busca de ano e entidades nos links", () => {
      mockUsePathname.mockReturnValue("/porciuncula_prefeitura/despesas");
      mockUseQueryState.mockImplementation(((key: string) => {
        if (key === "ano") return ["2024", vi.fn()];
        if (key === "entidades") return ["1,2", vi.fn()];
        return [null, vi.fn()];
      }) as unknown as typeof useQueryState);

      render(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);

      const receitasLink = screen.getByRole("link", { name: /^receitas$/i });
      expect(receitasLink).toHaveAttribute(
        "href",
        "/porciuncula_prefeitura/receitas?ano=2024&entidades=1%2C2",
      );
    });

    it("deve conter as classes de responsividade mobile e fixação z-30", () => {
      const { container } = render(
        <MobileBottomNav portalSlug="porciuncula_prefeitura" />,
      );
      const nav = container.querySelector("nav");
      expect(nav).toHaveClass("fixed");
      expect(nav).toHaveClass("bottom-0");
      expect(nav).toHaveClass("md:hidden");
      expect(nav).toHaveClass("z-30");
    });

    it("deve alternar entre ícone de Menu e X conforme o estado de abertura", () => {
      const { rerender } = render(
        <MobileBottomNav portalSlug="porciuncula_prefeitura" />,
      );
      expect(screen.getByText("Mais")).toBeInTheDocument();

      vi.spyOn(MobileNavContextModule, "useMobileNav").mockReturnValue({
        isMenuOpen: true,
        setIsMenuOpen: mockSetIsMenuOpen,
        toggleMenu: mockToggleMenu,
        closeMenu: mockCloseMenu,
      });

      rerender(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);
      expect(screen.getByText("Fechar")).toBeInTheDocument();
    });
  });
});
