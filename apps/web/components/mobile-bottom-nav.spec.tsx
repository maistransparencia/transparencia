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

describe("MobileBottomNav Component (Início, Saúde, Educação, Obras + Mais)", () => {
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
      const slug = "portal_teste";
      expect(resolveActiveTabIndex("/", slug)).toBe(0);
      expect(resolveActiveTabIndex(`/${slug}/saude`, slug)).toBe(1);
      expect(resolveActiveTabIndex(`/${slug}/educacao`, slug)).toBe(2);
      expect(resolveActiveTabIndex(`/${slug}/obras`, slug)).toBe(3);
      for (const rota of [
        "receitas",
        "despesas",
        "licitacoes",
        "orcamento",
        "pessoal",
        "caprem",
        "previdencia",
      ]) {
        expect(resolveActiveTabIndex(`/${slug}/${rota}`, slug)).toBe(4);
      }
    });

    it("não deve incluir abas contábeis nem Previdência entre as primárias", () => {
      expect(PRIMARY_NAV_TABS.map((tab) => tab.shortLabel)).toEqual([
        "Início",
        "Saúde",
        "Educação",
        "Obras",
      ]);
    });
  });

  describe("Renderização e Interações da Barra", () => {
    it("não deve renderizar na página raiz (landing page)", () => {
      mockUsePathname.mockReturnValue("/");
      const { container } = render(
        <MobileBottomNav portalSlug="porciuncula_prefeitura" />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("deve renderizar as 4 abas primárias e o botão Mais", () => {
      render(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);

      for (const tab of PRIMARY_NAV_TABS) {
        const link = screen.getByRole("link", { name: tab.label });
        expect(link).toBeInTheDocument();
        expect(link).toHaveClass("min-h-[44px]");
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

      const saudeLink = screen.getByRole("link", { name: /^saúde$/i });
      expect(saudeLink).not.toHaveAttribute("aria-current");
    });

    it("deve marcar Educação como ativa na rota de educação", () => {
      mockUsePathname.mockReturnValue("/porciuncula_prefeitura/educacao");
      render(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);

      const educacaoLink = screen.getByRole("link", { name: /^educação$/i });
      expect(educacaoLink).toHaveAttribute("aria-current", "page");

      const homeLink = screen.getByRole("link", { name: /visão geral/i });
      expect(homeLink).not.toHaveAttribute("aria-current");
    });

    it("deve ativar o botão Mais ao navegar em seção do menu lateral como Receitas", () => {
      mockUsePathname.mockReturnValue("/porciuncula_prefeitura/receitas");
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
      mockUsePathname.mockReturnValue("/portal_teste/despesas");
      mockUseQueryState.mockImplementation(((key: string) => {
        if (key === "ano") return ["2024", vi.fn()];
        if (key === "entidades") return ["1,2", vi.fn()];
        return [null, vi.fn()];
      }) as unknown as typeof useQueryState);

      render(<MobileBottomNav portalSlug="portal_teste" />);

      const obrasLink = screen.getByRole("link", { name: /^obras públicas$/i });
      expect(obrasLink).toHaveAttribute(
        "href",
        "/portal_teste/obras?ano=2024&entidades=1%2C2",
      );
    });

    it("sem slug, links nao tem prefixo de tenant e so a raiz ativa Inicio", () => {
      mockUsePathname.mockReturnValue("/receitas");
      mockUseQueryState.mockImplementation(((key: string) => {
        if (key === "ano") return [null, vi.fn()];
        return [null, vi.fn()];
      }) as unknown as typeof useQueryState);
      const { container } = render(<MobileBottomNav />);

      const hrefs = Array.from(container.querySelectorAll("a")).map((link) =>
        link.getAttribute("href"),
      );
      expect(hrefs.every((href) => !href?.includes("porciuncula"))).toBe(true);
      expect(
        screen.getByRole("link", { name: /^saúde$/i }).getAttribute("href"),
      ).toMatch(/^\/saude/);
      for (const link of container.querySelectorAll("a")) {
        expect(link).not.toHaveAttribute("aria-current");
      }
      expect(isTabActive("/saude", "/", undefined)).toBe(false);
      expect(isTabActive("/receitas", "/saude", undefined)).toBe(false);
      expect(isTabActive("/saude", "/saude", undefined)).toBe(true);
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

    it("deve exibir dot de notificação no botão Mais quando radarAlertCount > 0", () => {
      render(
        <MobileBottomNav
          portalSlug="porciuncula_prefeitura"
          radarAlertCount={3}
        />,
      );

      const dot = screen.getByTestId("radar-alert-dot");
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveAttribute("aria-label", "3 alertas críticos no Radar");

      const innerPulse = dot.querySelector(".motion-safe\\:animate-pulse");
      expect(innerPulse).toBeInTheDocument();
      expect(innerPulse).toHaveClass("motion-reduce:animate-none");
    });

    it("não deve exibir dot de notificação quando radarAlertCount for 0 ou indefinido", () => {
      const { rerender } = render(
        <MobileBottomNav
          portalSlug="porciuncula_prefeitura"
          radarAlertCount={0}
        />,
      );

      expect(screen.queryByTestId("radar-alert-dot")).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(/alertas críticos no Radar/i),
      ).not.toBeInTheDocument();

      rerender(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);
      expect(screen.queryByTestId("radar-alert-dot")).not.toBeInTheDocument();
    });

    it("deve reagir ao ano selecionado quando radarAlertsCountByYear for fornecido", () => {
      // Mock ano = 2024 (onde há alertas)
      mockUseQueryState.mockImplementation(((key: string) => {
        if (key === "ano") return ["2024", vi.fn()];
        return [null, vi.fn()];
      }) as unknown as typeof useQueryState);

      const { rerender } = render(
        <MobileBottomNav
          portalSlug="porciuncula_prefeitura"
          radarAlertsCountByYear={{ 2024: 4, 2026: 0 }}
        />,
      );

      expect(screen.getByTestId("radar-alert-dot")).toBeInTheDocument();
      expect(
        screen.getByLabelText("4 alertas críticos no Radar"),
      ).toBeInTheDocument();

      // Troca para 2026 (onde contagem é 0)
      mockUseQueryState.mockImplementation(((key: string) => {
        if (key === "ano") return ["2026", vi.fn()];
        return [null, vi.fn()];
      }) as unknown as typeof useQueryState);

      rerender(
        <MobileBottomNav
          portalSlug="porciuncula_prefeitura"
          radarAlertsCountByYear={{ 2024: 4, 2026: 0 }}
        />,
      );

      expect(screen.queryByTestId("radar-alert-dot")).not.toBeInTheDocument();
    });

    it("não deve exibir dot de notificação quando o menu lateral estiver aberto (isMenuOpen === true)", () => {
      vi.spyOn(MobileNavContextModule, "useMobileNav").mockReturnValue({
        isMenuOpen: true,
        setIsMenuOpen: vi.fn(),
        toggleMenu: vi.fn(),
        closeMenu: vi.fn(),
      });

      render(
        <MobileBottomNav
          portalSlug="porciuncula_prefeitura"
          radarAlertCount={3}
        />,
      );

      expect(screen.queryByTestId("radar-alert-dot")).not.toBeInTheDocument();
      expect(screen.getByText("Fechar")).toBeInTheDocument();
    });
  });
});
