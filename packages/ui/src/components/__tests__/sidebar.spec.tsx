import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "../sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/porciuncula_prefeitura",
}));

describe("Sidebar Component", () => {
  it("exibe badge com contagem e pulso suave ao lado de Radar Cívico quando radarAlertCount > 0", () => {
    render(
      <Sidebar
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
      <Sidebar portalName="Porciúncula" portalSlug="porciuncula_prefeitura" />,
    );

    expect(
      screen.queryByLabelText(/alertas críticos apurados/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renderiza o item de navegação Radar Cívico", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        radarAlertCount={5}
      />,
    );

    expect(screen.getByText("Radar Cívico")).toBeInTheDocument();
  });

  it("renderiza pwaInstallSlot quando fornecido", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        pwaInstallSlot={<button type="button">Instalar App Teste</button>}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Instalar App Teste" }),
    ).toBeInTheDocument();
  });

  it("renderiza o item de previdência com a sigla correspondente quando habilitado", () => {
    render(
      <Sidebar
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
      <Sidebar portalName="Porciúncula" portalSlug="porciuncula_prefeitura" />,
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
});
