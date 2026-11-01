import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalFooter } from "./global-footer";

let mockPathname = "/porciuncula_prefeitura";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("./push-notification-settings", () => ({
  PushNotificationSettings: ({ portalSlug }: { portalSlug?: string }) => (
    <div data-testid="push-stub">{portalSlug}</div>
  ),
}));

let mockCanInstall = true;
let mockPushSupported = true;

vi.mock("./pwa-installer", () => ({
  PwaInstallButton: () => <div data-testid="pwa-stub" />,
  usePwaInstallAvailability: () => mockCanInstall,
}));

vi.mock("@/hooks/use-push-notifications", () => ({
  usePushNotifications: () => ({ isSupported: mockPushSupported }),
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

describe("GlobalFooter", () => {
  beforeEach(() => {
    mockPathname = "/porciuncula_prefeitura";
    mockCanInstall = true;
    mockPushSupported = true;
  });

  it("renderiza link 'Termos de Uso' apontando para /termos", () => {
    render(<GlobalFooter />);
    const link = screen.getByRole("link", { name: /termos de uso/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/termos");
  });

  it("renderiza link 'Privacidade' apontando para /privacidade", () => {
    render(<GlobalFooter />);
    const link = screen.getByRole("link", { name: /privacidade/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/privacidade");
  });

  it("os links institucionais não têm target=_blank (são internos)", () => {
    render(<GlobalFooter />);
    const termosLink = screen.getByRole("link", { name: /termos de uso/i });
    const privacidadeLink = screen.getByRole("link", {
      name: /privacidade/i,
    });
    expect(termosLink).not.toHaveAttribute("target", "_blank");
    expect(privacidadeLink).not.toHaveAttribute("target", "_blank");
  });

  it("usa fundo invertido por tokens footer, logo com nome e botão primário de alertas", () => {
    render(<GlobalFooter portalName="Porciúncula" />);
    expect(screen.getByRole("contentinfo")).toHaveClass(
      "footer-surface",
      "border-t-2",
      "border-footer-line",
    );
    expect(screen.getByRole("contentinfo")).not.toHaveClass("bg-page");
    expect(
      screen.getByRole("contentinfo").querySelector('img[src="/favicon.svg"]'),
    ).toHaveAttribute("alt", "");
    expect(screen.getByText("Neste dispositivo")).toBeInTheDocument();
    expect(screen.getByText("Alertas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /receber alertas por e-mail/i }),
    ).toHaveClass("bg-ink", "text-onink");
  });

  it("coluna Neste dispositivo renderiza push (com slug) e instalação em rota de portal", () => {
    render(
      <GlobalFooter
        portais={[
          { portalSlug: "porciuncula_prefeitura", displayName: "Porciúncula" },
        ]}
      />,
    );
    expect(screen.getByTestId("push-stub")).toHaveTextContent(
      "porciuncula_prefeitura",
    );
    expect(screen.getByTestId("pwa-stub")).toBeInTheDocument();
  });

  it("na rota raiz não exibe município nem UF, sem push, mas com instalação", () => {
    mockPathname = "/";
    render(
      <GlobalFooter
        portalName="Porciúncula"
        stateUF="RJ"
        portalSlug="porciuncula_prefeitura"
      />,
    );
    expect(screen.queryByText(/Porciúncula/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\/ RJ/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("push-stub")).not.toBeInTheDocument();
    expect(screen.getByTestId("pwa-stub")).toBeInTheDocument();
  });

  it("renderiza botão de alertas por e-mail e abre modal ao clicar", () => {
    render(<GlobalFooter portalName="Porciúncula" />);
    const button = screen.getByRole("button", {
      name: /receber alertas por e-mail/i,
    });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(
      screen.getByRole("dialog", { name: /boletim cívico/i }),
    ).toBeInTheDocument();
  });

  it("renderiza botão 'Reportar erro' e abre modal de feedback ao clicar", () => {
    render(<GlobalFooter portalName="Porciúncula" />);
    const button = screen.getByRole("button", {
      name: /reportar erro/i,
    });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(
      screen.getByRole("dialog", { name: /reportar inconsistência ou erro/i }),
    ).toBeInTheDocument();
  });

  it("renderiza link do portal oficial e data de extração quando informados em página de portal", () => {
    mockPathname = "/porciuncula_prefeitura";
    render(
      <GlobalFooter
        portalName="Porciúncula"
        officialPortalUrl="porciuncula.rj.gov.br"
        lastExtractionDate="2026-09-20T10:00:00Z"
      />,
    );

    const portalLink = screen.getByRole("link", {
      name: /portal oficial/i,
    });
    expect(portalLink).toBeInTheDocument();
    expect(portalLink).toHaveAttribute("href", "https://porciuncula.rj.gov.br");
    expect(portalLink).toHaveAttribute("target", "_blank");
    expect(portalLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(screen.getByText(/Dados extraídos em/i)).toBeInTheDocument();
  });

  it("não renderiza link para portal oficial nem nome de prefeitura na página raiz ('/')", () => {
    mockPathname = "/";
    render(
      <GlobalFooter
        portalName="Prefeitura de Porciúncula"
        officialPortalUrl="porciuncula.rj.gov.br"
        lastExtractionDate="2026-09-20T10:00:00Z"
      />,
    );

    expect(
      screen.queryByRole("link", { name: /portal oficial/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Prefeitura de Porciúncula/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Dados extraídos em/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Lei de Acesso à Informação/i)).toBeInTheDocument();
  });

  it("sem push e sem instalação não renderiza a coluna Neste dispositivo e usa duas colunas", () => {
    mockCanInstall = false;
    mockPushSupported = false;
    const { container } = render(<GlobalFooter portalName="Porciúncula" />);
    expect(screen.queryByText("Neste dispositivo")).not.toBeInTheDocument();
    const grid = container.querySelector("footer .grid");
    expect(grid).toHaveClass("sm:grid-cols-2");
    expect(grid).not.toHaveClass("sm:grid-cols-3");
  });

  it("com instalação disponível mantém três colunas", () => {
    mockPushSupported = false;
    const { container } = render(<GlobalFooter portalName="Porciúncula" />);
    expect(screen.getByText("Neste dispositivo")).toBeInTheDocument();
    expect(container.querySelector("footer .grid")).toHaveClass(
      "sm:grid-cols-3",
    );
  });

  it("push suportado sem slug de portal (rota raiz) e sem instalação omite a coluna", () => {
    mockPathname = "/";
    mockCanInstall = false;
    mockPushSupported = true;
    render(<GlobalFooter />);
    expect(screen.queryByText("Neste dispositivo")).not.toBeInTheDocument();
    expect(screen.queryByTestId("push-stub")).not.toBeInTheDocument();
  });

  it("push suportado sem slug mas com instalação disponível mostra só a instalação", () => {
    mockPathname = "/";
    mockCanInstall = true;
    mockPushSupported = true;
    render(<GlobalFooter />);
    expect(screen.getByText("Neste dispositivo")).toBeInTheDocument();
    expect(screen.queryByTestId("push-stub")).not.toBeInTheDocument();
    expect(screen.getByTestId("pwa-stub")).toBeInTheDocument();
  });
});
