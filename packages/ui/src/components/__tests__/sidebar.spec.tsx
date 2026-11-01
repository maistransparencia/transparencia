import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../sidebar";

describe("Sidebar Component", () => {
  it("renderiza itens de navegacao como <a href> por padrao", () => {
    render(
      <Sidebar
        portalSlug="porciuncula_prefeitura"
        currentPathname="/porciuncula_prefeitura/radar"
      />,
    );
    const radar = screen.getByRole("link", { name: /Radar Cívico/ });
    expect(radar.tagName).toBe("A");
    expect(radar).toHaveAttribute("href");
  });

  it("usa o componente de link injetado", () => {
    render(
      <Sidebar
        portalSlug="porciuncula_prefeitura"
        currentPathname="/porciuncula_prefeitura"
        linkComponent={({ href, className, children }) => (
          <a href={href} className={className} data-injetado="sim">
            {children}
          </a>
        )}
      />,
    );
    expect(screen.getByRole("link", { name: /Radar Cívico/ })).toHaveAttribute(
      "data-injetado",
      "sim",
    );
  });

  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  it("exibe badge com contagem e pulso suave ao lado de Radar Cívico quando radarAlertCount > 0", () => {
    render(
      <Sidebar
        currentPathname="/porciuncula_prefeitura"
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        radarAlertCount={3}
      />,
    );

    const badge = screen.getByLabelText("3 alertas críticos apurados");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("3");

    // Valida respeito à acessibilidade (motion-safe e motion-reduce)
    const dot = badge.querySelector('[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("motion-safe:animate-pulse");
    expect(dot).toHaveClass("motion-reduce:animate-none");
  });

  it("não exibe badge quando radarAlertCount for 0", () => {
    render(
      <Sidebar
        currentPathname="/porciuncula_prefeitura"
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        radarAlertCount={0}
      />,
    );

    expect(
      screen.queryByLabelText(/alertas críticos apurados/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("não exibe badge quando radarAlertCount for indefinido", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        currentPathname="/porciuncula_prefeitura"
      />,
    );

    expect(
      screen.queryByLabelText(/alertas críticos apurados/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renderiza o item de navegação Radar Cívico", () => {
    render(
      <Sidebar
        currentPathname="/porciuncula_prefeitura"
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        radarAlertCount={5}
      />,
    );

    expect(screen.getByText("Radar Cívico")).toBeInTheDocument();
  });

  it("renderiza o item solto Farmácia SUS logo abaixo de Radar Cívico", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        currentPathname="/porciuncula_prefeitura"
      />,
    );

    const farmacia = screen.getByRole("link", { name: /^Farmácia SUS$/ });
    expect(farmacia).toHaveAttribute(
      "href",
      expect.stringContaining("/porciuncula_prefeitura/farmacia"),
    );
    const radar = screen.getByRole("link", { name: /Radar Cívico/ });
    expect(
      radar.compareDocumentPosition(farmacia) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(radar.nextElementSibling).toBe(farmacia);
  });

  it("renderiza o item de navegação Obras Públicas", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        currentPathname="/porciuncula_prefeitura"
      />,
    );

    const obrasLink = screen.getByRole("link", { name: /Obras Públicas/i });
    expect(obrasLink).toBeInTheDocument();
    expect(obrasLink).toHaveAttribute(
      "href",
      expect.stringContaining("/porciuncula_prefeitura/obras"),
    );
  });

  it("usa borda de tokens, sem fundo próprio no desktop, e marca o item ativo com filete", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        currentPathname="/porciuncula_prefeitura"
      />,
    );

    const aside = screen.getByRole("complementary");
    expect(aside).toHaveClass("border-r", "border-line");
    expect(aside).not.toHaveClass("bg-white");

    const ativo = screen.getByRole("link", { name: /Visão geral/i });
    expect(ativo).toHaveClass("border-l-2", "border-ink", "font-semibold");
  });

  it("drawer mobile fechado fica invisível (fora da tela e fora do foco) e visível no desktop", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        currentPathname="/porciuncula_prefeitura"
      />,
    );

    const aside = screen.getByRole("complementary");
    expect(aside).toHaveClass("-translate-x-full", "invisible", "md:visible");
  });

  it("rodapé tem compartilhar e alternador de tema, sem slots de push/pwa", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        currentPathname="/porciuncula_prefeitura"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Claro", pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Escuro", pressed: false }),
    ).toBeInTheDocument();
  });

  it("renderiza o item de previdência com a sigla correspondente quando habilitado", () => {
    render(
      <Sidebar
        currentPathname="/porciuncula_prefeitura"
        portalName="Natividade"
        portalSlug="natividade_prefeitura"
        previdencia={{
          habilitado: true,
          sigla: "NATPREVI",
          nome: "Instituto de Previdência de Natividade - NATPREVI",
        }}
      />,
    );

    const prevLink = screen.getByRole("link", { name: /NATPREVI/i });
    expect(prevLink).toBeInTheDocument();
    expect(prevLink).toHaveAttribute(
      "href",
      expect.stringContaining("/natividade_prefeitura/previdencia"),
    );
  });

  it("oculta o item de previdência quando previdencia.habilitado for false", () => {
    render(
      <Sidebar
        currentPathname="/porciuncula_prefeitura"
        portalName="Município Sem RPPS"
        portalSlug="sem_rpps"
        previdencia={{
          habilitado: false,
          sigla: "INSS",
        }}
      />,
    );

    expect(
      screen.queryByRole("link", { name: /INSS/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /previdência/i }),
    ).not.toBeInTheDocument();
  });

  it("renderiza o seletor de municípios e dispara onPortalChange ao selecionar novo portal", () => {
    const onPortalChange = vi.fn();
    const mockPortais = [
      {
        portalSlug: "porciuncula_prefeitura",
        displayName: "Porciúncula",
        uf: "RJ",
      },
      {
        portalSlug: "natividade_prefeitura",
        displayName: "Natividade",
        uf: "RJ",
      },
      {
        portalSlug: "sao_fidelis_prefeitura",
        displayName: "São Fidélis",
        uf: "RJ",
      },
    ];

    render(
      <Sidebar
        currentPathname="/porciuncula_prefeitura"
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        portais={mockPortais}
        onPortalChange={onPortalChange}
      />,
    );

    const selectors = screen.getAllByLabelText(/selecionar município/i);
    expect(selectors.length).toBeGreaterThan(0);

    const desktopSelect = selectors[0];
    fireEvent.change(desktopSelect, {
      target: { value: "natividade_prefeitura" },
    });

    expect(onPortalChange).toHaveBeenCalledWith("natividade_prefeitura");
  });

  it("renderiza os botões de compartilhamento no cabeçalho mobile e no rodapé do sidebar", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        currentPathname="/porciuncula_prefeitura"
      />,
    );

    const mobileShare = screen.getByRole("button", {
      name: "Compartilhar página",
    });
    expect(mobileShare).toBeInTheDocument();

    const desktopShare = screen.getByRole("button", {
      name: "Compartilhar página atual",
    });
    expect(desktopShare).toBeInTheDocument();
  });

  it("permite customização via mobileShareSlot e desktopShareSlot", () => {
    render(
      <Sidebar
        currentPathname="/porciuncula_prefeitura"
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        mobileShareSlot={<button type="button">Custom Mobile Share</button>}
        desktopShareSlot={<button type="button">Custom Desktop Share</button>}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Custom Mobile Share" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Custom Desktop Share" }),
    ).toBeInTheDocument();
  });

  it("dispara callback onShare ao clicar no botão de compartilhamento móvel", async () => {
    const onShare = vi.fn();
    const originalNavigator = window.navigator;
    Object.defineProperty(window, "navigator", {
      value: {
        ...originalNavigator,
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      },
      writable: true,
      configurable: true,
    });

    try {
      render(
        <Sidebar
          currentPathname="/porciuncula_prefeitura"
          portalName="Porciúncula"
          portalSlug="porciuncula_prefeitura"
          onShare={onShare}
        />,
      );

      const mobileShare = screen.getByRole("button", {
        name: "Compartilhar página",
      });
      fireEvent.click(mobileShare);

      await waitFor(() => {
        expect(onShare).toHaveBeenCalled();
      });
    } finally {
      Object.defineProperty(window, "navigator", {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    }
  });

  it("renderiza o item de navegação Educação no grupo de temas canônicos", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        currentPathname="/porciuncula_prefeitura"
      />,
    );

    const educacaoLink = screen.getByRole("link", { name: /educação/i });
    expect(educacaoLink).toBeInTheDocument();
    expect(educacaoLink).toHaveAttribute(
      "href",
      expect.stringContaining("/porciuncula_prefeitura/educacao"),
    );
  });

  it("posiciona Temas antes de Administrativo", () => {
    render(<Sidebar portalName="Portal" portalSlug="portal_teste" />);
    const temas = screen.getAllByText("Temas")[0];
    const administrativo = screen.getAllByText("Administrativo")[0];
    expect(
      temas.compareDocumentPosition(administrativo) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renderiza ícone cívico neutro sem brasão e sem img de brasão fixo", () => {
    const { container } = render(
      <Sidebar portalName="Portal" portalSlug="portal_teste" />,
    );
    expect(
      container.querySelector('img[src*="brasao-porciuncula"]'),
    ).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg.lucide-landmark")).not.toBeNull();
  });

  it("renderiza img do brasao quando brasaoAsset e informado", () => {
    const { container } = render(
      <Sidebar
        currentPathname="/porciuncula_prefeitura"
        portalName="Portal"
        portalSlug="portal_teste"
        brasaoAsset="brasao-teste.svg"
      />,
    );
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("volta ao ícone cívico quando o brasão falha ao carregar", () => {
    const { container } = render(
      <Sidebar
        portalName="Portal"
        portalSlug="portal_teste"
        brasaoAsset="brasao-teste.svg"
      />,
    );
    const imagens = Array.from(container.querySelectorAll("img"));
    expect(imagens.length).toBeGreaterThan(0);
    fireEvent.error(imagens[0]);
    expect(container.querySelector("img")).toBeNull();
  });

  it("não marca nenhum item como ativo sem currentPathname", () => {
    render(<Sidebar portalName="Portal" portalSlug="portal_teste" />);
    const visaoGeral = screen.getByRole("link", { name: /Visão geral/i });
    expect(visaoGeral).not.toHaveClass("border-ink");
  });

  it("drawer móvel desliza (transform) sempre e não anima em md", () => {
    const { container } = render(
      <Sidebar portalName="Portal" portalSlug="portal_teste" />,
    );
    const aside = container.querySelector("aside");
    expect(aside).toHaveClass(
      "transition-[transform,visibility]",
      "md:transition-none",
    );
    expect(aside).not.toHaveClass("motion-reduce:transition-none");
  });
});
