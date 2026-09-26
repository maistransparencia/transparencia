import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushNotificationPrompt } from "../push-notification-prompt";

const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();

let mockHookState = {
  isSupported: true,
  isSubscribed: false,
  permission: "default" as NotificationPermission | "unsupported",
  isLoading: false,
  error: null as string | null,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
};

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/porciuncula_prefeitura",
}));

vi.mock("@/hooks/use-push-notifications", () => ({
  usePushNotifications: () => mockHookState,
}));

describe("PushNotificationPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    mockHookState = {
      isSupported: true,
      isSubscribed: false,
      permission: "default",
      isLoading: false,
      error: null,
      subscribe: mockSubscribe.mockResolvedValue(true),
      unsubscribe: mockUnsubscribe.mockResolvedValue(true),
    };
  });

  it("não renderiza quando Web Push não é suportado", () => {
    mockHookState.isSupported = false;
    const { container } = render(<PushNotificationPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza quando o hook está em estado de carregamento", () => {
    mockHookState.isLoading = true;
    const { container } = render(<PushNotificationPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza quando o usuário já está inscrito", () => {
    mockHookState.isSubscribed = true;
    const { container } = render(<PushNotificationPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza quando a permissão foi negada no navegador", () => {
    mockHookState.permission = "denied";
    const { container } = render(<PushNotificationPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza o card educativo e dispara telemetria de impressão", () => {
    render(<PushNotificationPrompt portalSlug="porciuncula_prefeitura" />);

    expect(
      screen.getByText(/Notificações de Contas Públicas/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Acompanhe em tempo real novos gastos/i),
    ).toBeInTheDocument();

    const link = screen.getByRole("link", {
      name: /Art\. 48-A da LC 101\/2000 \(LRF\)/i,
    });
    expect(link).toHaveAttribute(
      "href",
      "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm#art48a",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    expect(posthog.capture).toHaveBeenCalledWith("push_prompt_impression", {
      portal_slug: "porciuncula_prefeitura",
    });
  });

  it("descarta o prompt e persiste timestamp em localStorage ao clicar em 'Agora não'", () => {
    render(<PushNotificationPrompt portalSlug="porciuncula_prefeitura" />);

    const dismissBtn = screen.getByRole("button", { name: "Agora não" });
    fireEvent.click(dismissBtn);

    expect(
      localStorage.getItem("push_prompt_dismissed_at_porciuncula_prefeitura") ??
        localStorage.getItem("push_prompt_dismissed_at"),
    ).toBeTruthy();
    expect(posthog.capture).toHaveBeenCalledWith("push_prompt_dismissed", {
      portal_slug: "porciuncula_prefeitura",
    });
    expect(
      screen.queryByText(/Notificações de Contas Públicas/i),
    ).not.toBeInTheDocument();
  });

  it("respeita o período de cooldown de 30 dias após descarte prévio", () => {
    // 5 dias atrás
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    localStorage.setItem("push_prompt_dismissed_at", String(fiveDaysAgo));

    const { container } = render(<PushNotificationPrompt cooldownDays={30} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("reexibe se o cooldown tiver expirado (ex: 35 dias atrás)", () => {
    const thirtyFiveDaysAgo = Date.now() - 35 * 24 * 60 * 60 * 1000;
    localStorage.setItem("push_prompt_dismissed_at", String(thirtyFiveDaysAgo));

    render(<PushNotificationPrompt cooldownDays={30} />);
    expect(
      screen.getByText(/Notificações de Contas Públicas/i),
    ).toBeInTheDocument();
  });

  it("invoca subscribe ao clicar em 'Ativar Notificações'", async () => {
    render(<PushNotificationPrompt portalSlug="porciuncula_prefeitura" />);

    const activateBtn = screen.getByRole("button", {
      name: "Ativar Notificações",
    });
    fireEvent.click(activateBtn);

    expect(posthog.capture).toHaveBeenCalledWith("push_prompt_accepted", {
      portal_slug: "porciuncula_prefeitura",
    });
    expect(mockSubscribe).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(
        screen.queryByText(/Notificações de Contas Públicas/i),
      ).not.toBeInTheDocument();
    });
  });

  it("fecha o prompt ao pressionar tecla Escape", () => {
    render(<PushNotificationPrompt portalSlug="porciuncula_prefeitura" />);

    expect(
      screen.getByText(/Notificações de Contas Públicas/i),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.queryByText(/Notificações de Contas Públicas/i),
    ).not.toBeInTheDocument();
    expect(posthog.capture).toHaveBeenCalledWith("push_prompt_dismissed", {
      portal_slug: "porciuncula_prefeitura",
    });
  });

  it("não renderiza na primeira página quando minPageViews for 2", () => {
    // Primeira visualização (session_page_views = 0 antes do mount, vira 1)
    const { container } = render(
      <PushNotificationPrompt
        portalSlug="porciuncula_prefeitura"
        minPageViews={2}
      />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByText(/Notificações de Contas Públicas/i),
    ).not.toBeInTheDocument();
  });

  it("renderiza quando minPageViews for atingido na sessão", () => {
    // Simula que o usuário já navegou por 1 página prévia
    sessionStorage.setItem("session_page_views", "1");

    render(
      <PushNotificationPrompt
        portalSlug="porciuncula_prefeitura"
        minPageViews={2}
      />,
    );

    expect(
      screen.getByText(/Notificações de Contas Públicas/i),
    ).toBeInTheDocument();
  });
});
