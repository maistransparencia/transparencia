import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LicitacoesSearchBar } from "./licitacoes-search-bar";

// Mock do spotlight modal para isolar os testes da barra de busca
vi.mock("./licitacoes-spotlight-modal", () => ({
  LicitacoesSpotlightModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="mock-spotlight-modal">
        <button type="button" onClick={onClose}>
          Fechar Modal
        </button>
      </div>
    ) : null,
}));

describe("LicitacoesSearchBar", () => {
  let observerCallback: IntersectionObserverCallback;
  let observerDisconnectMock: () => void;

  beforeEach(() => {
    observerDisconnectMock = vi.fn();
    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = "";
      readonly scrollMargin: string = "";
      readonly thresholds: ReadonlyArray<number> = [];
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = observerDisconnectMock;
      takeRecords = vi.fn(() => []);
    }
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
    global.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza a barra de busca principal corretamente", () => {
    render(
      <LicitacoesSearchBar portalSlug="porciuncula_prefeitura" ano={2024} />,
    );

    expect(
      screen.getByLabelText(/Abrir busca global de licitações e contratos/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Buscar por objeto, número do processo/i),
    ).toBeInTheDocument();
  });

  it("abre o modal spotlight ao clicar na barra de busca principal", () => {
    render(
      <LicitacoesSearchBar portalSlug="porciuncula_prefeitura" ano={2024} />,
    );

    expect(
      screen.queryByTestId("mock-spotlight-modal"),
    ).not.toBeInTheDocument();

    const mainButton = screen.getByLabelText(
      /Abrir busca global de licitações e contratos/i,
    );
    fireEvent.click(mainButton);

    expect(screen.getByTestId("mock-spotlight-modal")).toBeInTheDocument();
  });

  it("abre o modal spotlight ao pressionar Ctrl+K ou Cmd+K", () => {
    render(
      <LicitacoesSearchBar portalSlug="porciuncula_prefeitura" ano={2024} />,
    );

    expect(
      screen.queryByTestId("mock-spotlight-modal"),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByTestId("mock-spotlight-modal")).toBeInTheDocument();

    // Fecha o modal via atalho novamente
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(
      screen.queryByTestId("mock-spotlight-modal"),
    ).not.toBeInTheDocument();
  });

  it("exibe a pílula flutuante quando o scroll ultrapassa a barra de busca", () => {
    render(
      <LicitacoesSearchBar portalSlug="porciuncula_prefeitura" ano={2024} />,
    );

    const floatingButton = screen.getByLabelText(
      /Abrir busca rápida de licitações e contratos/i,
    );
    const floatingWrapper = floatingButton.parentElement;

    // Inicialmente a pílula flutuante está com opacidade 0 e pointer-events-none
    expect(floatingWrapper).toHaveClass("opacity-0");
    expect(floatingWrapper).toHaveClass("pointer-events-none");

    // Simula o scroll ultrapassando o campo de busca (fora de interseção e topo < 0)
    act(() => {
      observerCallback(
        [
          {
            isIntersecting: false,
            boundingClientRect: { top: -150 } as DOMRectReadOnly,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    // Agora deve estar visível
    expect(floatingWrapper).toHaveClass("opacity-100");
    expect(floatingWrapper).toHaveClass("pointer-events-auto");
  });

  it("abre o modal spotlight ao clicar na pílula flutuante", () => {
    render(
      <LicitacoesSearchBar portalSlug="porciuncula_prefeitura" ano={2024} />,
    );

    const floatingButton = screen.getByLabelText(
      /Abrir busca rápida de licitações e contratos/i,
    );

    fireEvent.click(floatingButton);
    expect(screen.getByTestId("mock-spotlight-modal")).toBeInTheDocument();
  });

  it("esconde a pílula flutuante quando o modal spotlight já está aberto", () => {
    render(
      <LicitacoesSearchBar portalSlug="porciuncula_prefeitura" ano={2024} />,
    );

    // Simula scroll passado
    act(() => {
      observerCallback(
        [
          {
            isIntersecting: false,
            boundingClientRect: { top: -150 } as DOMRectReadOnly,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    const floatingButton = screen.getByLabelText(
      /Abrir busca rápida de licitações e contratos/i,
    );
    const floatingWrapper = floatingButton.parentElement;
    expect(floatingWrapper).toHaveClass("opacity-100");

    // Abre o modal
    fireEvent.click(floatingButton);
    expect(screen.getByTestId("mock-spotlight-modal")).toBeInTheDocument();

    // Com o modal aberto, a pílula deve se ocultar
    expect(floatingWrapper).toHaveClass("opacity-0");
  });
});
