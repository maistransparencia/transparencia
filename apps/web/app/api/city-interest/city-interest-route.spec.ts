import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimits } from "../../../lib/rate-limit";
import { POST } from "./route";

const registerCityInterest = vi.hoisted(() =>
  vi.fn(async (input: { cidade: string; uf: string }) => ({
    id: "id-1",
    ...input,
  })),
);

vi.mock("@transparencia/db", () => ({ registerCityInterest }));

const validBody = {
  email: "cidadao@exemplo.com",
  cidade: "Cidade Exemplo",
  uf: "MG",
  consentimento: true,
};

function makeRequest(body: unknown, ip = "203.0.113.10") {
  return new Request("http://localhost:3001/api/city-interest", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/city-interest", () => {
  beforeEach(() => {
    clearRateLimits();
    vi.clearAllMocks();
  });

  it("registra pedido válido", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.cidade).toBe("Cidade Exemplo");
    expect(registerCityInterest).toHaveBeenCalledTimes(1);
  });

  it("rejeita e-mail, UF e aceite inválidos com erros por campo", async () => {
    const res = await POST(
      makeRequest({ ...validBody, email: "x", uf: "ZZ", consentimento: false }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(Object.keys(json.fieldErrors).sort()).toEqual([
      "consentimento",
      "email",
      "uf",
    ]);
    expect(registerCityInterest).not.toHaveBeenCalled();
  });

  it("rejeita corpo inválido", async () => {
    const req = new Request("http://localhost:3001/api/city-interest", {
      method: "POST",
      body: "nao-json",
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("descarta silenciosamente honeypot preenchido", async () => {
    const res = await POST(
      makeRequest({ ...validBody, b_empresa_url: "http://bot.com" }),
    );
    expect(res.status).toBe(200);
    expect(registerCityInterest).not.toHaveBeenCalled();
  });

  it("aplica rate limit por IP com 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await POST(
        makeRequest(
          { ...validBody, email: `u${i}@exemplo.com` },
          "198.51.100.7",
        ),
      );
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it("retorna 500 quando a gravação falha", async () => {
    registerCityInterest.mockRejectedValueOnce(new Error("db"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });
});
