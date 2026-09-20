import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../dispatch/route";

const mockDispatchPushNotification = vi.fn();

vi.mock("@/lib/push-dispatcher", () => ({
  dispatchPushNotification: (...args: unknown[]) =>
    mockDispatchPushNotification(...args),
}));

vi.mock("@/env", () => ({
  env: {
    INTERNAL_API_SECRET: "test-internal-secret",
    CRON_SECRET: "test-cron-secret",
  },
}));

describe("POST /api/push/dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 se Authorization estiver ausente", async () => {
    const req = new Request("http://localhost/api/push/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Atualização Fiscal",
        body: "Novos dados disponíveis",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
    expect(mockDispatchPushNotification).not.toHaveBeenCalled();
  });

  it("retorna 401 se token de Authorization for inválido", async () => {
    const req = new Request("http://localhost/api/push/dispatch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer wrong-token",
      },
      body: JSON.stringify({
        title: "Atualização Fiscal",
        body: "Novos dados disponíveis",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
    expect(mockDispatchPushNotification).not.toHaveBeenCalled();
  });

  it("retorna 400 se o JSON do corpo for malformado", async () => {
    const req = new Request("http://localhost/api/push/dispatch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-internal-secret",
      },
      body: "invalid-json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Corpo da requisição inválido (JSON esperado)");
  });

  it("retorna 400 se o payload for inválido", async () => {
    const req = new Request("http://localhost/api/push/dispatch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-internal-secret",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        // title e body ausentes
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Payload inválido");
  });

  it("retorna 200 ao despachar com sucesso com token INTERNAL_API_SECRET", async () => {
    const mockResult = {
      totalSubscribers: 5,
      sentCount: 5,
      failedCount: 0,
      prunedCount: 0,
      dryRun: false,
      success: true,
      errors: [],
    };
    mockDispatchPushNotification.mockResolvedValue(mockResult);

    const req = new Request("http://localhost/api/push/dispatch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-internal-secret",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        title: "Atualização de Receitas",
        body: "Dados do 2º quadrimestre",
        url: "/porciuncula_prefeitura/receitas",
        topic: "extracoes",
        dryRun: false,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(mockResult);

    expect(mockDispatchPushNotification).toHaveBeenCalledWith({
      portalSlug: "porciuncula_prefeitura",
      title: "Atualização de Receitas",
      body: "Dados do 2º quadrimestre",
      url: "/porciuncula_prefeitura/receitas",
      topic: "extracoes",
      dryRun: false,
    });
  });

  it("retorna 200 ao despachar com token CRON_SECRET", async () => {
    const mockResult = {
      totalSubscribers: 2,
      sentCount: 2,
      failedCount: 0,
      prunedCount: 0,
      dryRun: true,
      success: true,
      errors: [],
    };
    mockDispatchPushNotification.mockResolvedValue(mockResult);

    const req = new Request("http://localhost/api/push/dispatch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-cron-secret",
      },
      body: JSON.stringify({
        title: "Teste",
        body: "Corpo do teste",
        dryRun: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.dryRun).toBe(true);
  });
});
