import { fireEvent, render, screen } from "@testing-library/react";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExtractionNotificationBanner } from "./extraction-notification-banner";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

const mockSubscribe = vi.fn();
const mockPushState = {
  isSupported: true,
  isSubscribed: false,
  permission: "default" as NotificationPermission | "unsupported",
  isLoading: false,
  error: null as string | null,
  subscribe: mockSubscribe,
  unsubscribe: vi.fn(),
};

vi.mock("@/hooks/use-push-notifications", () => ({
  usePushNotifications: () => mockPushState,
}));

describe("ExtractionNotificationBanner Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("does not render when lastExtractionDate is missing or matches localStorage", () => {
    const { container } = render(
      <ExtractionNotificationBanner portalName="Prefeitura de Porciúncula" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders notification banner and captures view event when lastExtractionDate is newer than stored value", () => {
    localStorage.setItem("last_seen_extraction", "2026-08-01");

    render(
      <ExtractionNotificationBanner
        lastExtractionDate="2026-08-19"
        portalName="Prefeitura de Porciúncula"
      />,
    );

    expect(screen.getByText(/Novos dados disponíveis!/i)).toBeInTheDocument();
    expect(screen.getByText(/Prefeitura de Porciúncula/i)).toBeInTheDocument();
    expect(screen.getByText(/19\/08\/2026/)).toBeInTheDocument();
    expect(posthog.capture).toHaveBeenCalledWith("extraction_banner_viewed", {
      last_extraction_date: "2026-08-19",
      portal_name: "Prefeitura de Porciúncula",
    });
  });

  it("saves new extraction date to localStorage and captures dismiss event on dismiss", () => {
    localStorage.setItem("last_seen_extraction", "2026-08-01");

    render(
      <ExtractionNotificationBanner
        lastExtractionDate="2026-08-19"
        portalName="Prefeitura de Porciúncula"
      />,
    );

    const dismissButton = screen.getByRole("button", { name: "Entendido" });
    fireEvent.click(dismissButton);

    expect(localStorage.getItem("last_seen_extraction")).toBe("2026-08-19");
    expect(
      screen.queryByText(/Novos dados disponíveis!/i),
    ).not.toBeInTheDocument();
    expect(posthog.capture).toHaveBeenCalledWith(
      "extraction_banner_dismissed",
      {
        last_extraction_date: "2026-08-19",
        portal_name: "Prefeitura de Porciúncula",
      },
    );
  });

  it("exibe atalho contextual de notificações quando push é suportado e permissão é default", () => {
    localStorage.setItem("last_seen_extraction", "2026-08-01");
    mockPushState.isSupported = true;
    mockPushState.isSubscribed = false;
    mockPushState.permission = "default";

    render(
      <ExtractionNotificationBanner
        lastExtractionDate="2026-08-19"
        portalName="Prefeitura de Porciúncula"
      />,
    );

    expect(
      screen.getByText(
        /Deseja receber avisos automáticos de novas contas públicas\?/i,
      ),
    ).toBeInTheDocument();

    const optInButton = screen.getByRole("button", {
      name: "Ativar notificações",
    });
    fireEvent.click(optInButton);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it("não exibe atalho contextual de notificações se o usuário já estiver inscrito", () => {
    localStorage.setItem("last_seen_extraction", "2026-08-01");
    mockPushState.isSupported = true;
    mockPushState.isSubscribed = true;
    mockPushState.permission = "granted";

    render(
      <ExtractionNotificationBanner
        lastExtractionDate="2026-08-19"
        portalName="Prefeitura de Porciúncula"
      />,
    );

    expect(
      screen.queryByText(
        /Deseja receber avisos automáticos de novas contas públicas\?/i,
      ),
    ).not.toBeInTheDocument();
  });
});
