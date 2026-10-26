import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("mantém uma única entrada de busca visível, sem pílula flutuante", () => {
    render(
      <LicitacoesSearchBar portalSlug="porciuncula_prefeitura" ano={2024} />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(
      screen.queryByLabelText(/Abrir busca rápida de licitações e contratos/i),
    ).not.toBeInTheDocument();
  });
});
