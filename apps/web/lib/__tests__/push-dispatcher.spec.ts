import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetActivePushSubscriptions = vi.fn();
const mockPrunePushSubscriptions = vi.fn();
const mockRecordPushNotificationSuccess = vi.fn();
const mockRecordPushNotificationFailure = vi.fn();

vi.mock("@transparencia/db", () => ({
  getActivePushSubscriptions: (...args: unknown[]) =>
    mockGetActivePushSubscriptions(...args),
  prunePushSubscriptions: (...args: unknown[]) =>
    mockPrunePushSubscriptions(...args),
  recordPushNotificationSuccess: (...args: unknown[]) =>
    mockRecordPushNotificationSuccess(...args),
  recordPushNotificationFailure: (...args: unknown[]) =>
    mockRecordPushNotificationFailure(...args),
}));

const mockSendNotification = vi.fn();
const mockSetVapidDetails = vi.fn();

vi.mock("web-push", () => ({
  default: {
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
    setVapidDetails: (...args: unknown[]) => mockSetVapidDetails(...args),
  },
}));

let mockEnv: {
  NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT: string;
} = {
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: "mock-public-key",
  VAPID_PRIVATE_KEY: "mock-private-key",
  VAPID_SUBJECT: "mailto:contato@maistransparencia.com",
};

vi.mock("@/env", () => ({
  get env() {
    return mockEnv;
  },
}));

describe("push-dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "mock-public-key",
      VAPID_PRIVATE_KEY: "mock-private-key",
      VAPID_SUBJECT: "mailto:contato@maistransparencia.com",
    };
  });

  it("deve despachar notificação para subscrições ativas com sucesso", async () => {
    const { dispatchPushNotification } = await import("../push-dispatcher");

    const subs = [
      {
        id: "sub-1",
        portalSlug: "porciuncula_prefeitura",
        endpoint: "https://push.service/sub-1",
        p256dh: "key1",
        auth: "auth1",
        topics: ["extrações"],
      },
      {
        id: "sub-2",
        portalSlug: "porciuncula_prefeitura",
        endpoint: "https://push.service/sub-2",
        p256dh: "key2",
        auth: "auth2",
        topics: ["extrações"],
      },
    ];

    mockGetActivePushSubscriptions.mockResolvedValue(subs);
    mockSendNotification.mockResolvedValue({ statusCode: 201 });

    const result = await dispatchPushNotification({
      portalSlug: "porciuncula_prefeitura",
      title: "Nova Atualização Fiscal",
      body: "Dados atualizados com sucesso",
      url: "/porciuncula_prefeitura",
    });

    expect(result.totalSubscribers).toBe(2);
    expect(result.sentCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.prunedCount).toBe(0);
    expect(result.success).toBe(true);

    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(mockSendNotification).toHaveBeenCalledWith(
      {
        endpoint: "https://push.service/sub-1",
        keys: {
          p256dh: "key1",
          auth: "auth1",
        },
      },
      JSON.stringify({
        title: "Nova Atualização Fiscal",
        body: "Dados atualizados com sucesso",
        url: "/porciuncula_prefeitura",
      }),
      { TTL: 86400 },
    );
    expect(mockRecordPushNotificationSuccess).toHaveBeenCalledWith([
      "https://push.service/sub-1",
      "https://push.service/sub-2",
    ]);
    expect(mockPrunePushSubscriptions).not.toHaveBeenCalled();
    expect(mockRecordPushNotificationFailure).not.toHaveBeenCalled();
  });

  it("deve realizar auto-poda em caso de erros HTTP 410 Gone e 404 Not Found", async () => {
    const { dispatchPushNotification } = await import("../push-dispatcher");

    const subs = [
      {
        id: "sub-1",
        portalSlug: "porciuncula_prefeitura",
        endpoint: "https://push.service/expired-410",
        p256dh: "key1",
        auth: "auth1",
      },
      {
        id: "sub-2",
        portalSlug: "porciuncula_prefeitura",
        endpoint: "https://push.service/active",
        p256dh: "key2",
        auth: "auth2",
      },
      {
        id: "sub-3",
        portalSlug: "porciuncula_prefeitura",
        endpoint: "https://push.service/expired-404",
        p256dh: "key3",
        auth: "auth3",
      },
    ];

    mockGetActivePushSubscriptions.mockResolvedValue(subs);
    mockSendNotification.mockImplementation((target: { endpoint: string }) => {
      if (target.endpoint === "https://push.service/expired-410") {
        const error = Object.assign(new Error("Subscription expired"), {
          statusCode: 410,
        });
        return Promise.reject(error);
      }
      if (target.endpoint === "https://push.service/expired-404") {
        const error = Object.assign(new Error("Not Found"), {
          statusCode: 404,
        });
        return Promise.reject(error);
      }
      return Promise.resolve({ statusCode: 201 });
    });

    const result = await dispatchPushNotification({
      portalSlug: "porciuncula_prefeitura",
      title: "Alerta Fiscal",
      body: "Atualização de receitas",
    });

    expect(result.totalSubscribers).toBe(3);
    expect(result.sentCount).toBe(1);
    expect(result.failedCount).toBe(2);
    expect(result.prunedCount).toBe(2);
    expect(result.success).toBe(true);

    expect(mockPrunePushSubscriptions).toHaveBeenCalledWith([
      "https://push.service/expired-410",
      "https://push.service/expired-404",
    ]);
    expect(mockRecordPushNotificationSuccess).toHaveBeenCalledWith([
      "https://push.service/active",
    ]);
  });

  it("deve filtrar subscrições pelo tópico especificado", async () => {
    const { dispatchPushNotification } = await import("../push-dispatcher");

    const subs = [
      {
        id: "sub-1",
        portalSlug: "porciuncula_prefeitura",
        endpoint: "https://push.service/sub-extracoes",
        p256dh: "key1",
        auth: "auth1",
        topics: ["extracoes"],
      },
      {
        id: "sub-2",
        portalSlug: "porciuncula_prefeitura",
        endpoint: "https://push.service/sub-versoes",
        p256dh: "key2",
        auth: "auth2",
        topics: ["versoes"],
      },
    ];

    mockGetActivePushSubscriptions.mockResolvedValue(subs);
    mockSendNotification.mockResolvedValue({ statusCode: 201 });

    const result = await dispatchPushNotification({
      portalSlug: "porciuncula_prefeitura",
      title: "Nova Extração",
      body: "Dados fiscais extraídos",
      topic: "extracoes",
    });

    expect(result.totalSubscribers).toBe(1);
    expect(result.sentCount).toBe(1);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "https://push.service/sub-extracoes",
      }),
      expect.any(String),
      { TTL: 86400 },
    );
  });

  it("deve registrar falha temporária (HTTP 500) via recordPushNotificationFailure sem podar o endpoint", async () => {
    const { dispatchPushNotification } = await import("../push-dispatcher");

    const subs = [
      {
        id: "sub-1",
        portalSlug: "porciuncula_prefeitura",
        endpoint: "https://push.service/sub-error-500",
        p256dh: "key1",
        auth: "auth1",
      },
    ];

    mockGetActivePushSubscriptions.mockResolvedValue(subs);
    mockSendNotification.mockRejectedValue(
      Object.assign(new Error("Internal Server Error"), { statusCode: 500 }),
    );

    const result = await dispatchPushNotification({
      portalSlug: "porciuncula_prefeitura",
      title: "Alerta de Falha",
      body: "Erro transitório no push service",
    });

    expect(result.totalSubscribers).toBe(1);
    expect(result.sentCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.prunedCount).toBe(0);
    expect(result.success).toBe(false);

    expect(mockRecordPushNotificationFailure).toHaveBeenCalledWith([
      "https://push.service/sub-error-500",
    ]);
    expect(mockPrunePushSubscriptions).not.toHaveBeenCalled();
  });

  it("deve simular o envio em modo dryRun sem chamar webpush.sendNotification", async () => {
    const { dispatchPushNotification } = await import("../push-dispatcher");

    const subs = [
      {
        id: "sub-1",
        portalSlug: "porciuncula_prefeitura",
        endpoint: "https://push.service/sub-1",
        p256dh: "k",
        auth: "a",
      },
    ];

    mockGetActivePushSubscriptions.mockResolvedValue(subs);

    const result = await dispatchPushNotification({
      portalSlug: "porciuncula_prefeitura",
      title: "Teste Dry-Run",
      body: "Corpo do teste",
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.totalSubscribers).toBe(1);
    expect(result.sentCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.success).toBe(true);
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(mockPrunePushSubscriptions).not.toHaveBeenCalled();
  });

  it("deve tratar a ausência de chaves VAPID graciosamente sem lançar exceções", async () => {
    // Para testar a ausência, podemos re-importar com chaves ausentes
    vi.resetModules();

    mockEnv = {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: undefined,
      VAPID_PRIVATE_KEY: undefined,
      VAPID_SUBJECT: "mailto:contato@maistransparencia.com",
    };

    const { dispatchPushNotification } = await import("../push-dispatcher");

    mockGetActivePushSubscriptions.mockResolvedValue([
      {
        id: "sub-1",
        portalSlug: "porciuncula_prefeitura",
        endpoint: "https://push.service/sub-1",
        p256dh: "k",
        auth: "a",
      },
    ]);

    const result = await dispatchPushNotification({
      portalSlug: "porciuncula_prefeitura",
      title: "Teste Sem VAPID",
      body: "Corpo",
    });

    expect(result.success).toBe(false);
    expect(result.sentCount).toBe(0);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        endpoint: "all",
        error: "VAPID credentials not configured on server",
      }),
    );
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});
