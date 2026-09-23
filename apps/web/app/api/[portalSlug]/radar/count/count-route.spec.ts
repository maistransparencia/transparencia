import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimits } from "@/lib/rate-limit";
import { GET } from "./route";

vi.mock("@transparencia/db", () => ({
  getRadarAnomaliasCount: vi.fn(async ({ portalSlug, ano }) => {
    if (ano !== undefined && Number.isNaN(ano)) return 0;
    if (portalSlug === "porciuncula_prefeitura") {
      if (ano === 2024) return 3;
      if (ano === 2026) return 0;
      if (ano === undefined) return 5;
    }
    return 0;
  }),
}));

describe("API /api/[portalSlug]/radar/count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimits();
  });

  it("deve retornar 400 se portalSlug não for especificado", async () => {
    const req = new Request(
      "http://localhost:3000/api//radar/count",
    ) as unknown as NextRequest;
    const res = await GET(req, {
      params: Promise.resolve({ portalSlug: "" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Portal não especificado.");
  });

  it("deve retornar contagem correta para portal e ano especificados", async () => {
    const req = new Request(
      "http://localhost:3000/api/porciuncula_prefeitura/radar/count?ano=2024",
    ) as unknown as NextRequest;
    const res = await GET(req, {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ count: 3 });
  });

  it("deve retornar contagem consolidada quando ano não for informado", async () => {
    const req = new Request(
      "http://localhost:3000/api/porciuncula_prefeitura/radar/count",
    ) as unknown as NextRequest;
    const res = await GET(req, {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ count: 5 });
  });

  it("deve retornar 0 se ano for inválido", async () => {
    const req = new Request(
      "http://localhost:3000/api/porciuncula_prefeitura/radar/count?ano=invalido",
    ) as unknown as NextRequest;
    const res = await GET(req, {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Parâmetro 'ano' inválido.");
  });

  it("deve retornar 429 se exceder o limite de requisições por minuto", async () => {
    const req = new Request(
      "http://localhost:3000/api/porciuncula_prefeitura/radar/count?ano=2024",
      {
        headers: { "x-forwarded-for": "192.168.1.50" },
      },
    ) as unknown as NextRequest;

    // Executa 60 requisições permitidas
    for (let i = 0; i < 60; i++) {
      const res = await GET(req, {
        params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      });
      expect(res.status).toBe(200);
    }

    // A 61ª requisição deve sofrer rate limit (429)
    const blockedRes = await GET(req, {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    });
    expect(blockedRes.status).toBe(429);
    const body = await blockedRes.json();
    expect(body.error).toContain("Muitas requisições consecutivas");
    expect(blockedRes.headers.get("Retry-After")).toBeDefined();
  });
});
