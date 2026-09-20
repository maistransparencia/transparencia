import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../subscribe/route";

const mockSavePushSubscription = vi.fn();
const mockGetPortalConfig = vi.fn();

vi.mock("@transparencia/db", () => ({
  savePushSubscription: (...args: unknown[]) =>
    mockSavePushSubscription(...args),
  getPortalConfig: (...args: unknown[]) => mockGetPortalConfig(...args),
}));

describe("POST /api/push/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPortalConfig.mockResolvedValue({
      slug: "porciuncula_prefeitura",
      name: "Porciúncula",
    });
  });

  it("retorna 400 se o JSON do corpo for malformado", async () => {
    const req = new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Corpo da requisição inválido (JSON esperado)");
  });

  it("retorna 404 se o portalSlug não for encontrado", async () => {
    mockGetPortalConfig.mockResolvedValue(null);

    const req = new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portalSlug: "portal_inexistente",
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/test-token",
          keys: {
            p256dh: "key-p256dh",
            auth: "key-auth",
          },
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Portal 'portal_inexistente' não encontrado.");
  });

  it("retorna 400 se o payload for inválido", async () => {
    const req = new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        subscription: {
          endpoint: "not-a-valid-url",
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Payload inválido");
    expect(mockSavePushSubscription).not.toHaveBeenCalled();
  });

  it("retorna 200 e salva subscrição com payload válido", async () => {
    mockSavePushSubscription.mockResolvedValue({
      id: "sub-123",
      endpoint: "https://fcm.googleapis.com/fcm/send/test-token",
    });

    const req = new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/test-token",
          keys: {
            p256dh: "key-p256dh",
            auth: "key-auth",
          },
        },
        userAgent: "Mozilla/5.0 Test",
        topics: ["extracoes"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe("Subscription saved");

    expect(mockSavePushSubscription).toHaveBeenCalledWith({
      portalSlug: "porciuncula_prefeitura",
      endpoint: "https://fcm.googleapis.com/fcm/send/test-token",
      p256dh: "key-p256dh",
      auth: "key-auth",
      userAgent: "Mozilla/5.0 Test",
      topics: ["extracoes"],
    });
  });

  it("retorna 500 se ocorrer erro ao salvar no banco", async () => {
    mockSavePushSubscription.mockRejectedValue(
      new Error("Database connection error"),
    );

    const req = new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/test-token",
          keys: {
            p256dh: "key-p256dh",
            auth: "key-auth",
          },
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Database connection error");
  });
});
