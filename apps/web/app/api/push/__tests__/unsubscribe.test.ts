import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../unsubscribe/route";

const mockRemovePushSubscription = vi.fn();

vi.mock("@transparencia/db", () => ({
  removePushSubscription: (...args: unknown[]) =>
    mockRemovePushSubscription(...args),
}));

describe("POST /api/push/unsubscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 400 se o JSON do corpo for malformado", async () => {
    const req = new Request("http://localhost/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Corpo da requisição inválido (JSON esperado)");
    expect(mockRemovePushSubscription).not.toHaveBeenCalled();
  });

  it("retorna 400 se o endpoint for inválido ou ausente", async () => {
    const req = new Request("http://localhost/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "invalid-url",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Payload inválido");
    expect(mockRemovePushSubscription).not.toHaveBeenCalled();
  });

  it("retorna 200 e remove subscrição com payload válido", async () => {
    mockRemovePushSubscription.mockResolvedValue(true);

    const req = new Request("http://localhost/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "https://fcm.googleapis.com/fcm/send/token-to-remove",
        portalSlug: "porciuncula_prefeitura",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe("Subscription removed");

    expect(mockRemovePushSubscription).toHaveBeenCalledWith(
      "https://fcm.googleapis.com/fcm/send/token-to-remove",
      "porciuncula_prefeitura",
    );
  });

  it("retorna 500 se o banco falhar", async () => {
    mockRemovePushSubscription.mockRejectedValue(new Error("Database error"));

    const req = new Request("http://localhost/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "https://fcm.googleapis.com/fcm/send/token-to-remove",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Database error");
  });
});
