import { fireEvent, render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { useQueryState } from "nuqs";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCivicStepperPages,
  MobileBottomNav,
  PORTAL_PAGES,
  resolveCurrentPageIndex,
} from "./mobile-bottom-nav";

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

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

const mockUsePathname = vi.mocked(usePathname);
const mockUseQueryState = vi.mocked(useQueryState);

describe("MobileBottomNav Component", () => {
  const mockSetAno = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/porciuncula_prefeitura");
    mockUseQueryState.mockImplementation(((key: string) => {
      if (key === "ano") return ["2026", mockSetAno];
      if (key === "entidades") return [null, vi.fn()];
      return [null, vi.fn()];
    }) as unknown as typeof useQueryState);
  });

  describe("Helper Functions", () => {
    it("resolveCurrentPageIndex deve mapear corretamente rotas e slugs", () => {
      expect(resolveCurrentPageIndex("/", "porciuncula_prefeitura")).toBe(0);
      expect(
        resolveCurrentPageIndex(
          "/porciuncula_prefeitura",
          "porciuncula_prefeitura",
        ),
      ).toBe(0);
      expect(
        resolveCurrentPageIndex(
          "/porciuncula_prefeitura/receitas",
          "porciuncula_prefeitura",
        ),
      ).toBe(1);
      expect(
        resolveCurrentPageIndex(
          "/porciuncula_prefeitura/orcamento",
          "porciuncula_prefeitura",
        ),
      ).toBe(2);
      expect(
        resolveCurrentPageIndex(
          "/porciuncula_prefeitura/despesas",
          "porciuncula_prefeitura",
        ),
      ).toBe(3);
      expect(
        resolveCurrentPageIndex(
          "/porciuncula_prefeitura/despesas/subitem/123",
          "porciuncula_prefeitura",
        ),
      ).toBe(3);
      expect(
        resolveCurrentPageIndex(
          "/porciuncula_prefeitura/licitacoes",
          "porciuncula_prefeitura",
        ),
      ).toBe(4);
      expect(
        resolveCurrentPageIndex(
          "/porciuncula_prefeitura/pessoal",
          "porciuncula_prefeitura",
        ),
      ).toBe(5);
      expect(
        resolveCurrentPageIndex(
          "/porciuncula_prefeitura/saude",
          "porciuncula_prefeitura",
        ),
      ).toBe(6);
      expect(
        resolveCurrentPageIndex(
          "/porciuncula_prefeitura/caprem",
          "porciuncula_prefeitura",
        ),
      ).toBe(7);
      // Rota não reconhecida faz fallback para 0
      expect(
        resolveCurrentPageIndex(
          "/porciuncula_prefeitura/pagina-inexistente",
          "porciuncula_prefeitura",
        ),
      ).toBe(0);
    });

    it("getCivicStepperPages deve retornar anterior e próximo apropriados", () => {
      const first = getCivicStepperPages(0);
      expect(first.isFirst).toBe(true);
      expect(first.isLast).toBe(false);
      expect(first.previousPage).toBeNull();
      expect(first.nextPage?.shortLabel).toBe("Receitas");

      const middle = getCivicStepperPages(3);
      expect(middle.isFirst).toBe(false);
      expect(middle.isLast).toBe(false);
      expect(middle.previousPage?.shortLabel).toBe("Orçamento");
      expect(middle.nextPage?.shortLabel).toBe("Licitações");

      const last = getCivicStepperPages(PORTAL_PAGES.length - 1);
      expect(last.isFirst).toBe(false);
      expect(last.isLast).toBe(true);
      expect(last.previousPage?.shortLabel).toBe("Saúde");
      expect(last.nextPage).toBeNull();
    });
  });

  describe("Renderização e Navegação", () => {
    it("deve renderizar na Visão Geral com Anterior oculto e Próximo apontando para Receitas", () => {
      mockUsePathname.mockReturnValue("/porciuncula_prefeitura");
      render(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);

      expect(screen.queryByText("Anterior")).not.toBeInTheDocument();

      const nextLink = screen.getByRole("link", {
        name: /próxima página: receitas/i,
      });
      expect(nextLink).toBeInTheDocument();
      expect(nextLink).toHaveAttribute(
        "href",
        "/porciuncula_prefeitura/receitas?ano=2026",
      );

      const homeLink = screen.getByRole("link", { name: /visão geral/i });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute(
        "href",
        "/porciuncula_prefeitura?ano=2026",
      );
    });

    it("deve renderizar em Despesas com Anterior apontando para Orçamento e Próximo para Licitações", () => {
      mockUsePathname.mockReturnValue("/porciuncula_prefeitura/despesas");
      render(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);

      const prevLink = screen.getByRole("link", {
        name: /página anterior: execução orçamentária/i,
      });
      expect(prevLink).toBeInTheDocument();
      expect(prevLink).toHaveAttribute(
        "href",
        "/porciuncula_prefeitura/orcamento?ano=2026",
      );

      const nextLink = screen.getByRole("link", {
        name: /próxima página: licitações e contratos/i,
      });
      expect(nextLink).toBeInTheDocument();
      expect(nextLink).toHaveAttribute(
        "href",
        "/porciuncula_prefeitura/licitacoes?ano=2026",
      );
    });

    it("deve renderizar na última página CAPREM com Próximo oculto e Anterior apontando para Saúde", () => {
      mockUsePathname.mockReturnValue("/porciuncula_prefeitura/caprem");
      render(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);

      const prevLink = screen.getByRole("link", {
        name: /página anterior: saúde/i,
      });
      expect(prevLink).toBeInTheDocument();
      expect(prevLink).toHaveAttribute(
        "href",
        "/porciuncula_prefeitura/saude?ano=2026",
      );

      expect(screen.queryByText("Próximo")).not.toBeInTheDocument();
    });

    it("deve preservar parâmetros de query string ano e entidades nos links", () => {
      mockUsePathname.mockReturnValue("/porciuncula_prefeitura/despesas");
      mockUseQueryState.mockImplementation(((key: string) => {
        if (key === "ano") return ["2024", mockSetAno];
        if (key === "entidades") return ["1,2", vi.fn()];
        return [null, vi.fn()];
      }) as unknown as typeof useQueryState);

      render(<MobileBottomNav portalSlug="porciuncula_prefeitura" />);

      const prevLink = screen.getByRole("link", {
        name: /página anterior: execução orçamentária/i,
      });
      expect(prevLink).toHaveAttribute(
        "href",
        "/porciuncula_prefeitura/orcamento?ano=2024&entidades=1%2C2",
      );

      const nextLink = screen.getByRole("link", {
        name: /próxima página: licitações e contratos/i,
      });
      expect(nextLink).toHaveAttribute(
        "href",
        "/porciuncula_prefeitura/licitacoes?ano=2024&entidades=1%2C2",
      );
    });

    it("deve interagir com o seletor de ano e emitir evento PostHog", () => {
      render(
        <MobileBottomNav
          portalSlug="porciuncula_prefeitura"
          anoInicial={2021}
        />,
      );

      const select = screen.getByRole("combobox", {
        name: /selecionar exercício/i,
      });
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue("2026");

      fireEvent.change(select, { target: { value: "2023" } });

      expect(posthog.capture).toHaveBeenCalledWith("year_filter_changed", {
        selected_year: "2023",
        previous_year: "2026",
        portal_slug: "porciuncula_prefeitura",
      });
      expect(mockSetAno).toHaveBeenCalledWith("2023");
    });

    it("deve conter as classes de responsividade mobile e fixação", () => {
      const { container } = render(
        <MobileBottomNav portalSlug="porciuncula_prefeitura" />,
      );
      const nav = container.querySelector("nav");
      expect(nav).toHaveClass("fixed");
      expect(nav).toHaveClass("bottom-0");
      expect(nav).toHaveClass("md:hidden");
    });
  });
});
