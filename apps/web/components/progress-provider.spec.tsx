import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProgressProvider } from "./progress-provider";

const mockBProgressStart = vi.fn();
const mockBProgressDone = vi.fn();

vi.mock("@bprogress/core", () => ({
  BProgress: {
    start: () => mockBProgressStart(),
    done: () => mockBProgressDone(),
  },
}));

const mockDisableAutoStop = vi.fn();
vi.mock("@bprogress/next", () => ({
  useProgress: () => ({
    disableAutoStop: mockDisableAutoStop,
  }),
}));

const mockBProgressProviderProps = vi.fn();
vi.mock("@bprogress/next/app", () => ({
  ProgressProvider: ({
    children,
    ...props
  }: { children: React.ReactNode } & Record<string, unknown>) => {
    mockBProgressProviderProps(props);
    return <div data-testid="bprogress-provider-mock">{children}</div>;
  },
}));

let currentPathname = "/porciuncula_prefeitura/obras";
let currentSearchParams = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useSearchParams: () => currentSearchParams,
}));

describe("ProgressProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPathname = "/porciuncula_prefeitura/obras";
    currentSearchParams = new URLSearchParams("");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza children e invoca disableAutoStop no mount", () => {
    render(
      <ProgressProvider>
        <div data-testid="child-content">Conteúdo Teste</div>
      </ProgressProvider>,
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(mockDisableAutoStop).toHaveBeenCalled();
  });

  it("dispara BProgress.done quando o pathname é atualizado (nova rota carregada)", () => {
    const { rerender } = render(
      <ProgressProvider>
        <div>Página Inicial</div>
      </ProgressProvider>,
    );

    // Initial mount ignores initial done to avoid cancelling active navigation
    expect(mockBProgressDone).not.toHaveBeenCalled();

    // Simula navegação concluída para outra rota
    currentPathname = "/porciuncula_prefeitura/contratos";
    rerender(
      <ProgressProvider>
        <div>Nova Página</div>
      </ProgressProvider>,
    );

    expect(mockBProgressDone).toHaveBeenCalledTimes(1);
  });

  it("dispara BProgress.start ao clicar em link interno para outra rota", () => {
    render(
      <ProgressProvider>
        <a href="/porciuncula_prefeitura/licitacoes">Ir para Licitações</a>
      </ProgressProvider>,
    );

    const link = screen.getByRole("link", { name: "Ir para Licitações" });
    fireEvent.click(link);

    expect(mockBProgressStart).toHaveBeenCalledTimes(1);
  });

  it("mostra a barra em links que mudam só a query (índice A-Z, 'Ver mais')", () => {
    render(
      <ProgressProvider>
        <div />
      </ProgressProvider>,
    );

    expect(mockBProgressProviderProps).toHaveBeenCalledWith(
      expect.not.objectContaining({ shallowRouting: true }),
    );
  });

  it("dispara BProgress.start ao enviar formulário GET interno", () => {
    render(
      <ProgressProvider>
        <form method="get" action="/porciuncula_prefeitura/farmacia">
          <button type="submit">Buscar</button>
        </form>
      </ProgressProvider>,
    );

    fireEvent.submit(
      screen
        .getByRole("button", { name: "Buscar" })
        .closest("form") as HTMLFormElement,
    );

    expect(mockBProgressStart).toHaveBeenCalledTimes(1);
  });

  it("dispara BProgress.start mesmo quando o envio é assumido pelo roteador (next/form cancela o envio nativo)", () => {
    render(
      <ProgressProvider>
        <form
          method="get"
          action="/porciuncula_prefeitura/farmacia"
          onSubmit={(e) => e.preventDefault()}
        >
          <input name="q" defaultValue="dipirona" />
          <button type="submit">Buscar</button>
        </form>
      </ProgressProvider>,
    );

    fireEvent.submit(
      screen
        .getByRole("button", { name: "Buscar" })
        .closest("form") as HTMLFormElement,
    );

    expect(mockBProgressStart).toHaveBeenCalledTimes(1);
  });

  it("não dispara BProgress.start em formulário POST, externo, sem action ou para a URL atual", () => {
    const currentPath = `${window.location.pathname}${window.location.search}`;
    render(
      <ProgressProvider>
        <form method="post" action="/porciuncula_prefeitura/farmacia">
          <button type="submit">Post</button>
        </form>
        <form method="get" action="https://google.com/search">
          <button type="submit">Externo</button>
        </form>
        <form onSubmit={(e) => e.preventDefault()}>
          <button type="submit">Sem action</button>
        </form>
        <form method="get" action={currentPath}>
          <button type="submit">Mesma URL</button>
        </form>
      </ProgressProvider>,
    );

    for (const name of ["Post", "Externo", "Sem action", "Mesma URL"]) {
      fireEvent.submit(
        screen.getByRole("button", { name }).closest("form") as HTMLFormElement,
      );
    }

    expect(mockBProgressStart).not.toHaveBeenCalled();
  });

  it("não dispara BProgress.start em links externos ou target=_blank", () => {
    render(
      <ProgressProvider>
        <a href="https://google.com" target="_blank" rel="noopener noreferrer">
          Externo
        </a>
      </ProgressProvider>,
    );

    const link = screen.getByRole("link", { name: "Externo" });
    fireEvent.click(link);

    expect(mockBProgressStart).not.toHaveBeenCalled();
  });

  it("não dispara BProgress.start em âncoras/hash no mesmo pathname e search", () => {
    render(
      <ProgressProvider>
        <a href="#secao-detalhes">Ir para Seção</a>
      </ProgressProvider>,
    );

    const link = screen.getByRole("link", { name: "Ir para Seção" });
    fireEvent.click(link);

    expect(mockBProgressStart).not.toHaveBeenCalled();
  });

  it("não dispara BProgress.start quando clicado com tecla modificadora (ctrl/meta/alt/shift)", () => {
    render(
      <ProgressProvider>
        <a href="/porciuncula_prefeitura/despesas">Despesas em Nova Aba</a>
      </ProgressProvider>,
    );

    const link = screen.getByRole("link", { name: "Despesas em Nova Aba" });
    fireEvent.click(link, { metaKey: true });

    expect(mockBProgressStart).not.toHaveBeenCalled();
  });

  it("dispara BProgress.done quando apenas searchParams são atualizados (mesmo pathname)", () => {
    const { rerender } = render(
      <ProgressProvider>
        <div>Página com Filtros</div>
      </ProgressProvider>,
    );

    mockBProgressDone.mockClear();

    // Atualiza apenas searchParams (ex: filtro de ano ou busca)
    currentSearchParams = new URLSearchParams("ano=2025");
    rerender(
      <ProgressProvider>
        <div>Página com Filtros Atualizados</div>
      </ProgressProvider>,
    );

    expect(mockBProgressDone).toHaveBeenCalledTimes(1);
  });

  it("não dispara BProgress.start quando event.defaultPrevented for verdadeiro", () => {
    render(
      <ProgressProvider>
        <a
          href="/porciuncula_prefeitura/licitacoes"
          onClick={(e) => e.preventDefault()}
        >
          Link Cancelado
        </a>
      </ProgressProvider>,
    );

    const link = screen.getByRole("link", { name: "Link Cancelado" });
    fireEvent.click(link);

    expect(mockBProgressStart).not.toHaveBeenCalled();
  });

  it("não dispara BProgress.start para downloads, endpoints de API ou arquivos estáticos", () => {
    render(
      <ProgressProvider>
        <a href="/api/export">API Export</a>
        <a href="/dados.pdf">Documento PDF</a>
        <a href="/dados.csv">Planilha CSV</a>
        <a href="/arquivo.zip" download>
          Download Zip
        </a>
      </ProgressProvider>,
    );

    fireEvent.click(screen.getByRole("link", { name: "API Export" }));
    fireEvent.click(screen.getByRole("link", { name: "Documento PDF" }));
    fireEvent.click(screen.getByRole("link", { name: "Planilha CSV" }));
    fireEvent.click(screen.getByRole("link", { name: "Download Zip" }));

    expect(mockBProgressStart).not.toHaveBeenCalled();
  });

  it("aciona timeout de fallback de 8s para finalizar barra se a navegação travar", () => {
    vi.useFakeTimers();
    try {
      render(
        <ProgressProvider>
          <a href="/porciuncula_prefeitura/receitas">Ir para Receitas</a>
        </ProgressProvider>,
      );

      const link = screen.getByRole("link", { name: "Ir para Receitas" });
      fireEvent.click(link);

      expect(mockBProgressStart).toHaveBeenCalledTimes(1);
      expect(mockBProgressDone).not.toHaveBeenCalled();

      // Avança o tempo além do limite de 8 segundos
      vi.advanceTimersByTime(8100);

      expect(mockBProgressDone).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("chama BProgress.done ao receber evento de erro da janela", () => {
    render(
      <ProgressProvider>
        <div>Página com Erro</div>
      </ProgressProvider>,
    );

    mockBProgressDone.mockClear();
    window.dispatchEvent(new Event("error"));

    expect(mockBProgressDone).toHaveBeenCalledTimes(1);
  });
});
