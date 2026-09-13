import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushNotificationTopbarButton } from "../push-notification-topbar-button";

const mockSubscribe = vi.fn();

let mockHookState = {
  isSupported: true,
  isSubscribed: false,
  permission: "default" as NotificationPermission | "unsupported",
  isLoading: false,
  subscribe: mockSubscribe,
};

vi.mock("@/hooks/use-push-notifications", () => ({
  usePushNotifications: () => mockHookState,
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

describe("PushNotificationTopbarButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = {
      isSupported: true,
      isSubscribed: false,
      permission: "default",
      isLoading: false,
      subscribe: mockSubscribe.mockResolvedValue(true),
    };
  });

  it("não renderiza nada se o navegador não suportar Web Push", () => {
    mockHookState.isSupported = false;
    const { container } = render(<PushNotificationTopbarButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza nada se o usuário já estiver inscrito", () => {
    mockHookState.isSubscribed = true;
    mockHookState.permission = "granted";
    const { container } = render(<PushNotificationTopbarButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza nada se as notificações estiverem bloqueadas pelo navegador", () => {
    mockHookState.permission = "denied";
    const { container } = render(<PushNotificationTopbarButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza o botão 'Ativar avisos' quando não inscrito e com permissão default", () => {
    render(
      <PushNotificationTopbarButton portalSlug="porciuncula_prefeitura" />,
    );

    const button = screen.getByRole("button", {
      name: /Ativar notificações push de contas públicas/i,
    });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Ativar avisos")).toBeInTheDocument();
  });

  it("chama subscribe() e registra evento no posthog ao clicar no botão", async () => {
    const onSubscribeSuccess = vi.fn();
    render(
      <PushNotificationTopbarButton
        portalSlug="porciuncula_prefeitura"
        onSubscribeSuccess={onSubscribeSuccess}
      />,
    );

    const button = screen.getByRole("button", {
      name: /Ativar notificações push de contas públicas/i,
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith(
        "push_topbar_button_clicked",
        {
          portal_slug: "porciuncula_prefeitura",
        },
      );
      expect(mockSubscribe).toHaveBeenCalledTimes(1);
      expect(onSubscribeSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
