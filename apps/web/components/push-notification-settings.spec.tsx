import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushNotificationSettings } from "./push-notification-settings";

const subscribe = vi.fn();
const unsubscribe = vi.fn();
let hookState = {
  isSupported: true,
  isSubscribed: false,
  permission: "default" as NotificationPermission | "unsupported",
  isLoading: false,
  error: null as string | null,
};

vi.mock("@/hooks/use-push-notifications", () => ({
  usePushNotifications: () => ({ ...hookState, subscribe, unsubscribe }),
}));

describe("PushNotificationSettings", () => {
  beforeEach(() => {
    subscribe.mockReset();
    unsubscribe.mockReset();
    hookState = {
      isSupported: true,
      isSubscribed: false,
      permission: "default",
      isLoading: false,
      error: null,
    };
  });

  it("bloqueado: botão com aria-expanded revela o passo a passo", () => {
    hookState.permission = "denied";
    render(<PushNotificationSettings portalSlug="x" />);
    const botao = screen.getByRole("button", { name: /como desbloquear/i });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/ícone de cadeado/i)).not.toBeVisible();
    fireEvent.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/ícone de cadeado/i)).toBeVisible();
  });

  it("bloqueado com erro após ação exibe o alerta", () => {
    hookState.permission = "denied";
    hookState.error =
      "Não foi possível ativar as notificações. Tente novamente.";
    render(<PushNotificationSettings portalSlug="x" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível ativar",
    );
  });

  it("carregando com erro exibe o alerta", () => {
    hookState.isLoading = true;
    hookState.error =
      "Não foi possível verificar suas notificações. Tente novamente.";
    render(<PushNotificationSettings portalSlug="x" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível verificar",
    );
  });

  it("carregando: não mostra ativas nem desativadas", () => {
    hookState.isLoading = true;
    render(<PushNotificationSettings portalSlug="x" />);
    expect(screen.queryByText(/desativadas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ativas/i)).not.toBeInTheDocument();
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it("desativar rejeitado não gera rejeição não tratada", async () => {
    hookState.isSubscribed = true;
    hookState.error = "Não foi possível desativar. Tente novamente.";
    unsubscribe.mockRejectedValue(new Error("boom"));
    render(<PushNotificationSettings portalSlug="x" />);
    fireEvent.click(screen.getByRole("button", { name: "Desativar" }));
    await waitFor(() => expect(unsubscribe).toHaveBeenCalled());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível desativar",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Desativar" })).toBeEnabled(),
    );
  });

  it("ativar com erro mostra o alerta e sucesso chama o callback", async () => {
    const onSuccess = vi.fn();
    subscribe.mockResolvedValue(true);
    hookState.error =
      "Não foi possível ativar as notificações. Tente novamente.";
    render(
      <PushNotificationSettings
        portalSlug="x"
        onSubscribeSuccess={onSuccess}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ativar" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});
