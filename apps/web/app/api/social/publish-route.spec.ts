import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as publisher from "../../../lib/social-publisher";
import { POST as handlePublish } from "./publish/route";
import { POST as handlePublishX } from "./publish-x/route";

vi.mock("../../../lib/social-publisher", () => ({
  publishSocial: vi.fn(),
}));

describe("Social publish API routes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      CRON_SECRET: "super-secret-cron-token",
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("POST /api/social/publish: deve rejeitar requisição sem header de autorização com 401", async () => {
    const req = new Request("http://localhost/api/social/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        type: "extraction",
      }),
    });

    const res = await handlePublish(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Unauthorized");
  });

  it("POST /api/social/publish: deve rejeitar token Bearer inválido com 401", async () => {
    const req = new Request("http://localhost/api/social/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-errado",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        type: "extraction",
      }),
    });

    const res = await handlePublish(req);
    expect(res.status).toBe(401);
  });

  it("POST /api/social/publish: deve rejeitar payload sem portalSlug ou type com 400", async () => {
    const req = new Request("http://localhost/api/social/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer super-secret-cron-token",
      },
      body: JSON.stringify({ portalSlug: "" }),
    });

    const res = await handlePublish(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("POST /api/social/publish: deve processar despacho com sucesso quando autenticado", async () => {
    vi.mocked(publisher.publishSocial).mockResolvedValueOnce({
      success: true,
      portalSlug: "porciuncula_prefeitura",
      type: "fiscal_digest",
      dryRun: false,
      results: {
        x: { success: true, tweetId: "tweet-123" },
        facebook: { success: true, postId: "fb-123" },
      },
    });

    const req = new Request("http://localhost/api/social/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer super-secret-cron-token",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        type: "fiscal_digest",
        ano: 2025,
      }),
    });

    const res = await handlePublish(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.results.x.tweetId).toBe("tweet-123");
  });

  it("POST /api/social/publish-x: rota de retrocompatibilidade deve processar com canal X", async () => {
    vi.mocked(publisher.publishSocial).mockResolvedValueOnce({
      success: true,
      portalSlug: "porciuncula_prefeitura",
      type: "extraction",
      dryRun: false,
      results: {
        x: { success: true, tweetId: "tweet-legacy-x" },
      },
    });

    const req = new Request("http://localhost/api/social/publish-x", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer super-secret-cron-token",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        type: "extraction",
      }),
    });

    const res = await handlePublishX(req);
    expect(res.status).toBe(200);
    expect(publisher.publishSocial).toHaveBeenCalledWith(
      expect.objectContaining({
        channels: ["x"],
      }),
    );
  });
});
