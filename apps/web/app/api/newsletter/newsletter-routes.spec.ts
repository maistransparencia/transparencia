import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimits } from "../../../lib/rate-limit";
import { GET as confirmGet } from "./confirm/route";
import { POST as subscribePost } from "./subscribe/route";
import { GET as unsubGet, POST as unsubPost } from "./unsubscribe/route";

interface MockSubscriber {
  id: string;
  portalSlug: string;
  email: string;
  status: string;
  tokenConfirmacao: string;
  tokenCancelamento: string;
  createdAt: Date;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
  resendContactId: string | null;
}

vi.mock("@transparencia/db", () => {
  const subscribers: Record<string, MockSubscriber> = {};
  return {
    getPortalConfig: vi.fn(async (portalSlug: string) => ({
      portalSlug,
      displayName: "Porciúncula",
      uf: "RJ",
    })),
    subscribeNewsletter: vi.fn(async (portalSlug: string, email: string) => {
      const sub = {
        id: "sub-123",
        portalSlug,
        email,
        status: "pendente",
        tokenConfirmacao: "token-conf-123",
        tokenCancelamento: "token-unsub-123",
        createdAt: new Date(),
        confirmedAt: null,
        unsubscribedAt: null,
        resendContactId: null,
      };
      subscribers[email] = sub;
      subscribers[`by-token-conf:${sub.tokenConfirmacao}`] = sub;
      subscribers[`by-token-unsub:${sub.tokenCancelamento}`] = sub;
      return sub;
    }),
    confirmNewsletterSubscription: vi.fn(async (token: string) => {
      const sub = subscribers[`by-token-conf:${token}`];
      if (!sub) return null;
      sub.status = "confirmado";
      sub.confirmedAt = new Date();
      return sub;
    }),
    unsubscribeNewsletterByToken: vi.fn(async (token: string) => {
      const sub = subscribers[`by-token-unsub:${token}`];
      if (!sub) return null;
      sub.status = "cancelado";
      sub.unsubscribedAt = new Date();
      return sub;
    }),
  };
});

describe("newsletter api routes", () => {
  beforeEach(() => {
    clearRateLimits();
    vi.clearAllMocks();
  });

  describe("POST /api/newsletter/subscribe", () => {
    it("deve rejeitar e-mail inválido com 400", async () => {
      const req = new Request(
        "http://localhost:3001/api/newsletter/subscribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "invalido",
            portalSlug: "porciuncula_prefeitura",
          }),
        },
      );

      const res = await subscribePost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("deve descartar silenciosamente submissão com honeypot preenchido", async () => {
      const req = new Request(
        "http://localhost:3001/api/newsletter/subscribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "bot@spam.com",
            portalSlug: "porciuncula_prefeitura",
            b_empresa_url: "http://bot.com",
          }),
        },
      );

      const res = await subscribePost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("deve cadastrar com sucesso para dados válidos", async () => {
      const req = new Request(
        "http://localhost:3001/api/newsletter/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "203.0.113.195",
          },
          body: JSON.stringify({
            email: "cidadao.valido@exemplo.com",
            portalSlug: "porciuncula_prefeitura",
            clientRenderTime: Date.now() - 5000,
          }),
        },
      );

      const res = await subscribePost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("confirmação");
    });

    it("deve retornar 429 após estourar rate limit por IP", async () => {
      const ip = "198.51.100.1";
      for (let i = 0; i < 5; i++) {
        const req = new Request(
          "http://localhost:3001/api/newsletter/subscribe",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-forwarded-for": ip,
            },
            body: JSON.stringify({
              email: `teste${i}@exemplo.com`,
              portalSlug: "porciuncula_prefeitura",
            }),
          },
        );
        const res = await subscribePost(req);
        expect(res.status).toBe(200);
      }

      const blockedReq = new Request(
        "http://localhost:3001/api/newsletter/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": ip,
          },
          body: JSON.stringify({
            email: "teste_blocked@exemplo.com",
            portalSlug: "porciuncula_prefeitura",
          }),
        },
      );
      const blockedRes = await subscribePost(blockedReq);
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get("Retry-After")).toBeDefined();
    });
  });

  describe("GET /api/newsletter/confirm", () => {
    it("deve confirmar e redirecionar para o portal do assinante", async () => {
      // Cria primeiro a subscrição
      const subReq = new Request(
        "http://localhost:3001/api/newsletter/subscribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "confirm_user@exemplo.com",
            portalSlug: "porciuncula_prefeitura",
          }),
        },
      );
      await subscribePost(subReq);

      const confirmReq = new Request(
        "http://localhost:3001/api/newsletter/confirm?token=token-conf-123",
      );
      const res = await confirmGet(confirmReq);
      expect(res.status).toBe(307); // Redirect status
      expect(res.headers.get("Location")).toContain(
        "/porciuncula_prefeitura?newsletter=confirmed",
      );
    });

    it("deve redirecionar com erro quando o token for inválido", async () => {
      const req = new Request(
        "http://localhost:3001/api/newsletter/confirm?token=token-invalido",
      );
      const res = await confirmGet(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toContain("newsletter=invalid_token");
    });
  });

  describe("GET e POST /api/newsletter/unsubscribe", () => {
    it("deve cancelar via GET e redirecionar", async () => {
      const req = new Request(
        "http://localhost:3001/api/newsletter/unsubscribe?token=token-unsub-123",
      );
      const res = await unsubGet(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toContain(
        "/porciuncula_prefeitura?newsletter=unsubscribed",
      );
    });

    it("deve cancelar via POST com RFC 8058 e retornar 200 JSON", async () => {
      const req = new Request(
        "http://localhost:3001/api/newsletter/unsubscribe?token=token-unsub-123",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "List-Unsubscribe=One-Click",
        },
      );
      const res = await unsubPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("deve cancelar via POST com token no formData", async () => {
      const formData = new FormData();
      formData.append("token", "token-unsub-123");
      const req = new Request(
        "http://localhost:3001/api/newsletter/unsubscribe",
        {
          method: "POST",
          body: formData,
        },
      );
      const res = await unsubPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
