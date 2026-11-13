import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimits } from "../../../lib/rate-limit";
import { POST } from "./route";

const registerFeedbackReport = vi.hoisted(() =>
  vi.fn(async () => ({ id: "id-1" })),
);
const getAllPortais = vi.hoisted(() =>
  vi.fn(async () => [{ portalSlug: "portal_a" }, { portalSlug: "portal_b" }]),
);

vi.mock("@transparencia/db", () => ({ registerFeedbackReport, getAllPortais }));

const validBody = {
  tipoRelato: "inconsistencia_dados",
  mensagem: "O valor da receita diverge da fonte oficial.",
  emailRetorno: "cidadao@exemplo.com",
  rotaPagina: "/portal_a/receitas",
  portalSlug: "portal_a",
};

function makeRequest(body: unknown, ip = "203.0.113.20") {
  return new Request("http://localhost:3001/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    clearRateLimits();
    vi.clearAllMocks();
  });

  it("grava relato válido com portal e rota", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(registerFeedbackReport).toHaveBeenCalledWith(
      expect.objectContaining({
        portalSlug: "portal_a",
        rotaPagina: "/portal_a/receitas",
        tipoRelato: "inconsistencia_dados",
      }),
    );
  });

  it("grava com portal nulo na página raiz", async () => {
    const { portalSlug: _portalSlug, ...semPortal } = validBody;
    const res = await POST(makeRequest({ ...semPortal, rotaPagina: "/" }));
    expect(res.status).toBe(200);
    expect(registerFeedbackReport).toHaveBeenCalledWith(
      expect.objectContaining({ portalSlug: null, rotaPagina: "/" }),
    );
  });

  it.each([
    ["mensagem curta", { mensagem: "curta" }],
    ["mensagem longa", { mensagem: "a".repeat(2001) }],
    ["e-mail inválido", { emailRetorno: "x" }],
    ["tipo inválido", { tipoRelato: "outro" }],
    ["rota inválida", { rotaPagina: "http://externo.com" }],
    ["rota com host implícito", { rotaPagina: "//externo.com" }],
    ["rota com caractere de controle", { rotaPagina: "/portal_a\nx" }],
  ])("rejeita %s com 400", async (_nome, patch) => {
    const res = await POST(makeRequest({ ...validBody, ...patch }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTruthy();
    expect(registerFeedbackReport).not.toHaveBeenCalled();
  });

  it("rejeita corpo que não é JSON com 400", async () => {
    const req = new Request("http://localhost:3001/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{nao e json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(registerFeedbackReport).not.toHaveBeenCalled();
  });

  it("responde 500 quando a consulta de portais falha", async () => {
    getAllPortais.mockRejectedValueOnce(new Error("banco fora"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    expect(registerFeedbackReport).not.toHaveBeenCalled();
  });

  it("rejeita portal inexistente", async () => {
    const res = await POST(makeRequest({ ...validBody, portalSlug: "outro" }));
    expect(res.status).toBe(400);
    expect(registerFeedbackReport).not.toHaveBeenCalled();
  });

  it("descarta honeypot sem gravar", async () => {
    const res = await POST(
      makeRequest({ ...validBody, site_url: "https://spam.com" }),
    );
    expect(res.status).toBe(200);
    expect(registerFeedbackReport).not.toHaveBeenCalled();
  });

  it("limita a 5 envios por IP com Retry-After", async () => {
    await Promise.all(
      Array.from({ length: 5 }, () => POST(makeRequest(validBody))),
    );
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("devolve 500 quando a gravação falha", async () => {
    registerFeedbackReport.mockRejectedValueOnce(new Error("db fora"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });
});
