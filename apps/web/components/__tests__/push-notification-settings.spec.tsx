import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushNotificationSettings } from "../push-notification-settings";

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

vi.mock("@/hooks/use-push-notifications", () => ({
  usePushNotifications: () => mockHookState,
}));

describe("PushNotificationSettings", () => {
  beforeEach(() => {
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

  it("não renderiza nada quando Web Push não é suportado", () => {
    mockHookState.isSupported = false;
    const { container } = render(<PushNotificationSettings />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza aviso quando notificações estão bloqueadas no navegador", () => {
    mockHookState.permission = "denied";
    render(<PushNotificationSettings />);

    expect(screen.getByText(/Notificações bloqueadas/i)).toBeInTheDocument();
    expect(screen.getByText(/Desbloquear/i)).toBeInTheDocument();
  });

  it("renderiza status ativo com botão de desativar quando inscrito", () => {
    mockHookState.isSubscribed = true;
    mockHookState.permission = "granted";

    render(<PushNotificationSettings />);

    expect(screen.getByText(/Notificações ativas/i)).toBeInTheDocument();

    const disableBtn = screen.getByRole("button", { name: /Desativar/i });
    expect(disableBtn).toBeInTheDocument();

    fireEvent.click(disableBtn);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("renderiza status desativado com botão de ativar quando não inscrito", () => {
    mockHookState.isSubscribed = false;
    mockHookState.permission = "default";

    const onSubscribeSuccess = vi.fn();
    render(
      <PushNotificationSettings onSubscribeSuccess={onSubscribeSuccess} />,
    );

    expect(screen.getByText(/Notificações desativadas/i)).toBeInTheDocument();

    const activateBtn = screen.getByRole("button", {
      name: /Ativar/i,
    });
    expect(activateBtn).toBeInTheDocument();

    fireEvent.click(activateBtn);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });
});
