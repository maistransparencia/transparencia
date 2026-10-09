import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "../share-button";

describe("ShareButton Component", () => {
  const originalLocation = window.location;
  const originalNavigator = window.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", {
      value: new URL(
        "https://transparencia.app/porciuncula_prefeitura?ano=2024",
      ),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("renderiza a variante compacta com ícone e label acessível", () => {
    render(<ShareButton variant="compact" />);

    const button = screen.getByRole("button", { name: "Compartilhar página" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("title", "Compartilhar página");
  });

  it("renderiza a variante sidebar com texto descritivo e ícone", () => {
    render(<ShareButton variant="sidebar" />);

    const button = screen.getByRole("button", {
      name: "Compartilhar página atual",
    });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Compartilhar página")).toBeInTheDocument();
  });

  it("chama navigator.share quando a Web Share API estiver disponível", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockOnShare = vi.fn();

    Object.defineProperty(window, "navigator", {
      value: {
        ...originalNavigator,
        share: mockShare,
      },
      writable: true,
      configurable: true,
    });

    render(
      <ShareButton
        variant="compact"
        title="Título de Teste"
        url="https://transparencia.app/custom"
        onShare={mockOnShare}
      />,
    );

    const button = screen.getByRole("button", { name: "Compartilhar página" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: "Título de Teste",
        url: "https://transparencia.app/custom",
      });
      expect(mockOnShare).toHaveBeenCalledWith({
        method: "native",
        url: "https://transparencia.app/custom",
      });
    });
  });

  it("normaliza URLs relativas para absolutas ao compartilhar", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window, "navigator", {
      value: {
        ...originalNavigator,
        share: mockShare,
      },
      writable: true,
      configurable: true,
    });

    render(<ShareButton variant="compact" url="/outra_rota?ano=2023" />);

    const button = screen.getByRole("button", { name: "Compartilhar página" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: "MaisTransparência",
        url: "https://transparencia.app/outra_rota?ano=2023",
      });
    });
  });

  it("trata cancelamento pelo usuário (AbortError) sem disparar cópia para a área de transferência", async () => {
    const abortError = new Error("Abort error");
    abortError.name = "AbortError";
    const mockShare = vi.fn().mockRejectedValue(abortError);
    const mockClipboardWrite = vi.fn();

    Object.defineProperty(window, "navigator", {
      value: {
        ...originalNavigator,
        share: mockShare,
        clipboard: { writeText: mockClipboardWrite },
      },
      writable: true,
      configurable: true,
    });

    render(<ShareButton variant="sidebar" />);

    const button = screen.getByRole("button", {
      name: "Compartilhar página atual",
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalled();
    });

    expect(mockClipboardWrite).not.toHaveBeenCalled();
    expect(screen.queryByText("Link copiado!")).not.toBeInTheDocument();
  });

  it("trata InvalidStateError sem disparar fallback espúrio", async () => {
    const invalidStateError = new Error("Already sharing");
    invalidStateError.name = "InvalidStateError";
    const mockShare = vi.fn().mockRejectedValue(invalidStateError);
    const mockClipboardWrite = vi.fn();

    Object.defineProperty(window, "navigator", {
      value: {
        ...originalNavigator,
        share: mockShare,
        clipboard: { writeText: mockClipboardWrite },
      },
      writable: true,
      configurable: true,
    });

    render(<ShareButton variant="sidebar" />);

    const button = screen.getByRole("button", {
      name: "Compartilhar página atual",
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalled();
    });

    expect(mockClipboardWrite).not.toHaveBeenCalled();
    expect(screen.queryByText("Link copiado!")).not.toBeInTheDocument();
  });

  it("copia URL para área de transferência e exibe feedback quando navigator.share não existir", async () => {
    const mockClipboardWrite = vi.fn().mockResolvedValue(undefined);
    const mockOnShare = vi.fn();

    Object.defineProperty(window, "navigator", {
      value: {
        ...originalNavigator,
        share: undefined,
        clipboard: { writeText: mockClipboardWrite },
      },
      writable: true,
      configurable: true,
    });

    render(<ShareButton variant="sidebar" onShare={mockOnShare} />);

    const button = screen.getByRole("button", {
      name: "Compartilhar página atual",
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockClipboardWrite).toHaveBeenCalledWith(
        "https://transparencia.app/porciuncula_prefeitura?ano=2024",
      );
      expect(screen.getByText("Link copiado!")).toBeInTheDocument();
      expect(mockOnShare).toHaveBeenCalledWith({
        method: "clipboard",
        url: "https://transparencia.app/porciuncula_prefeitura?ano=2024",
      });
    });
  });

  it("reverte automaticamente o estado de feedback copiado após 2500ms", async () => {
    vi.useFakeTimers();
    const mockClipboardWrite = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window, "navigator", {
      value: {
        ...originalNavigator,
        share: undefined,
        clipboard: { writeText: mockClipboardWrite },
      },
      writable: true,
      configurable: true,
    });

    render(<ShareButton variant="sidebar" />);

    const button = screen.getByRole("button", {
      name: "Compartilhar página atual",
    });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText("Link copiado!")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.queryByText("Link copiado!")).not.toBeInTheDocument();
    expect(screen.getByText("Compartilhar página")).toBeInTheDocument();
  });

  it("utiliza fallback legado com document.execCommand('copy') quando Clipboard API não existir", async () => {
    const execCommandSpy = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandSpy;

    Object.defineProperty(window, "navigator", {
      value: {
        ...originalNavigator,
        share: undefined,
        clipboard: undefined,
      },
      writable: true,
      configurable: true,
    });

    render(<ShareButton variant="compact" />);

    const button = screen.getByRole("button", { name: "Compartilhar página" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(execCommandSpy).toHaveBeenCalledWith("copy");
      expect(screen.getByRole("status")).toHaveTextContent("Link copiado!");
    });
  });

  it("bloqueia cliques concorrentes enquanto uma operação de compartilhamento estiver em andamento", async () => {
    let resolveShare: () => void;
    const pendingSharePromise = new Promise<void>((resolve) => {
      resolveShare = resolve;
    });
    const mockShare = vi.fn().mockReturnValue(pendingSharePromise);

    Object.defineProperty(window, "navigator", {
      value: {
        ...originalNavigator,
        share: mockShare,
      },
      writable: true,
      configurable: true,
    });

    render(<ShareButton variant="compact" />);

    const button = screen.getByRole("button", { name: "Compartilhar página" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockShare).toHaveBeenCalledTimes(1);

    resolveShare?.();
    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledTimes(1);
    });
  });
});
