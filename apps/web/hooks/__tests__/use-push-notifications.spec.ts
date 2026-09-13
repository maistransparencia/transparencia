import { act, renderHook, waitFor } from "@testing-library/react";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePushNotifications } from "../use-push-notifications";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: "BEl62iUYgUivxIkv69yViEuiBIa",
  },
}));

describe("usePushNotifications", () => {
  let mockGetSubscription: ReturnType<typeof vi.fn>;
  let mockSubscribe: ReturnType<typeof vi.fn>;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;
  let mockRequestPermission: ReturnType<typeof vi.fn>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUnsubscribe = vi.fn().mockResolvedValue(true);
    mockGetSubscription = vi.fn().mockResolvedValue(null);
    mockSubscribe = vi.fn().mockResolvedValue({
      endpoint: "https://push.example.com/sub/123",
      toJSON: () => ({
        endpoint: "https://push.example.com/sub/123",
        keys: {
          p256dh: "key-p256dh",
          auth: "key-auth",
        },
      }),
      getKey: vi.fn(),
      unsubscribe: mockUnsubscribe,
    });

    mockRequestPermission = vi.fn().mockResolvedValue("granted");

    // Setup global mocks
    Object.defineProperty(window, "PushManager", {
      value: () => {},
      configurable: true,
      writable: true,
    });

    Object.defineProperty(window, "Notification", {
      value: Object.assign(() => {}, {
        permission: "default",
        requestPermission: mockRequestPermission,
      }),
      configurable: true,
      writable: true,
    });

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: mockGetSubscription,
            subscribe: mockSubscribe,
          },
        }),
      },
      configurable: true,
      writable: true,
    });

    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as unknown as Response);
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  it("inicializa com estado unsupported quando APIs de push não estão disponíveis", async () => {
    // @ts-expect-error test unsupported
    delete window.PushManager;

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isSupported).toBe(false);
    expect(result.current.permission).toBe("unsupported");
    expect(result.current.isSubscribed).toBe(false);
  });

  it("detecta subscrição ativa existente durante inicialização", async () => {
    mockGetSubscription.mockResolvedValue({
      endpoint: "https://push.example.com/sub/already-exists",
      unsubscribe: mockUnsubscribe,
    });

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isSupported).toBe(true);
    expect(result.current.isSubscribed).toBe(true);
  });

  it("realiza fluxo de subscribe com sucesso quando permissão é concedida", async () => {
    const { result } = renderHook(() =>
      usePushNotifications({ portalSlug: "porciuncula_prefeitura" }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.subscribe();
    });

    expect(success).toBe(true);
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      }),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/push/subscribe",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"portalSlug":"porciuncula_prefeitura"'),
      }),
    );
    expect(result.current.isSubscribed).toBe(true);
    expect(posthog.capture).toHaveBeenCalledWith(
      "push_notification_subscribed",
      { portal_slug: "porciuncula_prefeitura" },
    );
  });

  it("reverte subscrição do navegador caso a rota da API falhe", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Erro interno no servidor" }),
    } as unknown as Response);

    const { result } = renderHook(() =>
      usePushNotifications({ portalSlug: "porciuncula_prefeitura" }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success = true;
    await act(async () => {
      success = await result.current.subscribe();
    });

    expect(success).toBe(false);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(result.current.isSubscribed).toBe(false);
  });

  it("lida com recusa de permissão do usuário no subscribe", async () => {
    mockRequestPermission.mockResolvedValue("denied");

    const { result } = renderHook(() =>
      usePushNotifications({ portalSlug: "porciuncula_prefeitura" }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.subscribe();
    });

    expect(success).toBe(false);
    expect(result.current.permission).toBe("denied");
    expect(result.current.isSubscribed).toBe(false);
    expect(posthog.capture).toHaveBeenCalledWith("push_permission_denied", {
      portal_slug: "porciuncula_prefeitura",
    });
  });

  it("realiza unsubscribe com sucesso", async () => {
    mockGetSubscription.mockResolvedValue({
      endpoint: "https://push.example.com/sub/active",
      unsubscribe: mockUnsubscribe,
    });

    const { result } = renderHook(() =>
      usePushNotifications({ portalSlug: "porciuncula_prefeitura" }),
    );

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    let success = false;
    await act(async () => {
      success = await result.current.unsubscribe();
    });

    expect(success).toBe(true);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/push/unsubscribe",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "https://push.example.com/sub/active",
          portalSlug: "porciuncula_prefeitura",
        }),
      }),
    );
    expect(result.current.isSubscribed).toBe(false);
    expect(posthog.capture).toHaveBeenCalledWith(
      "push_notification_unsubscribed",
      { portal_slug: "porciuncula_prefeitura" },
    );
  });
});
