import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./dispatch-digest/route";

const mockDispatchRadarDigest = vi.fn();

vi.mock("../../../lib/radar-digest", () => ({
  dispatchRadarDigest: (...args: unknown[]) => mockDispatchRadarDigest(...args),
}));

describe("POST /api/newsletter/dispatch-digest", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "super-secret-token";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("deve retornar 401 Unauthorized se o header Authorization estiver ausente ou incorreto", async () => {
    // Sem header
    const req1 = new Request(
      "http://localhost:3001/api/newsletter/dispatch-digest",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalSlug: "porciuncula_prefeitura" }),
      },
    );
    const res1 = await POST(req1);
    expect(res1.status).toBe(401);

    // Header com token incorreto
    const req2 = new Request(
      "http://localhost:3001/api/newsletter/dispatch-digest",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-errado",
        },
        body: JSON.stringify({ portalSlug: "porciuncula_prefeitura" }),
      },
    );
    const res2 = await POST(req2);
    expect(res2.status).toBe(401);
  });

  it("deve retornar 400 se o portalSlug não for informado", async () => {
    const req = new Request(
      "http://localhost:3001/api/newsletter/dispatch-digest",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer super-secret-token",
        },
        body: JSON.stringify({ ano: 2025 }),
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("portalSlug");
  });

  it("deve executar com sucesso e retornar 200 com o resultado do despacho", async () => {
    mockDispatchRadarDigest.mockResolvedValueOnce({
      success: true,
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      totalSubscribers: 10,
      sentCount: 10,
      failedCount: 0,
      errors: [],
      dryRun: false,
    });

    const req = new Request(
      "http://localhost:3001/api/newsletter/dispatch-digest",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer super-secret-token",
        },
        body: JSON.stringify({
          portalSlug: "porciuncula_prefeitura",
          ano: 2025,
          dryRun: false,
        }),
      },
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.sentCount).toBe(10);
    expect(mockDispatchRadarDigest).toHaveBeenCalledWith({
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      dryRun: false,
    });
  });

  it("deve retornar 500 se o despacho falhar", async () => {
    mockDispatchRadarDigest.mockResolvedValueOnce({
      success: false,
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      totalSubscribers: 1,
      sentCount: 0,
      failedCount: 1,
      errors: [{ email: "all", error: "Falha de conexão" }],
      dryRun: false,
    });

    const req = new Request(
      "http://localhost:3001/api/newsletter/dispatch-digest",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer super-secret-token",
        },
        body: JSON.stringify({
          portalSlug: "porciuncula_prefeitura",
        }),
      },
    );

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});
