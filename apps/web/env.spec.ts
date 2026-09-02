import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { env } from "./env";

describe("apps/web/env (validação centralizada com t3-env e Zod)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Valores padrão centralizados (Defaults)", () => {
    it("deve carregar os defaults institucionais públicos corretamente", () => {
      expect(env.NEXT_PUBLIC_SITE_DOMAIN).toBe("maistransparencia.com");
      expect(env.NEXT_PUBLIC_SITE_NAME).toBe("MaisTransparencia");
      expect(env.NEXT_PUBLIC_PROJECT_NAME).toBe("MaisTransparência");
    });

    it("deve carregar os links e identificadores das redes sociais oficiais", () => {
      expect(env.NEXT_PUBLIC_X_URL).toBe("https://x.com/mtransparenciax");
      expect(env.NEXT_PUBLIC_X_HANDLE).toBe("@mtransparenciax");
      expect(env.NEXT_PUBLIC_GITHUB_URL).toBe(
        "https://github.com/maistransparencia/transparencia",
      );
      expect(env.NEXT_PUBLIC_FACEBOOK_URL).toBe(
        "https://facebook.com/maistransparencia",
      );
    });

    it("deve carregar o host padrão do PostHog", () => {
      expect(env.NEXT_PUBLIC_POSTHOG_HOST).toBe("https://us.i.posthog.com");
    });

    it("deve carregar o remetente oficial padrão da newsletter", () => {
      expect(env.RESEND_FROM_EMAIL).toBe(
        "Radar Porciúncula <newsletter@maistransparencia.org>",
      );
    });

    it("deve carregar o tamanho máximo do pool com coerção numérica", () => {
      expect(typeof env.DATABASE_POOL_MAX).toBe("number");
      expect(env.DATABASE_POOL_MAX).toBe(5);
      expect(env.DATABASE_POOL_MAX).toBeGreaterThan(0);
    });
  });

  describe("Variáveis opcionais e comportamento defensivo", () => {
    it("deve permitir que credenciais de bot e secrets opcionais sejam nulas/indefinidas em ambiente local", () => {
      // Se não foram injetadas no ambiente, devem ser undefined
      const isStringOrUndefined = (val: unknown) =>
        typeof val === "string" || val === undefined;

      expect(isStringOrUndefined(env.DATABASE_URL)).toBe(true);
      expect(isStringOrUndefined(env.DATABASE_WRITE_URL)).toBe(true);
      expect(isStringOrUndefined(env.RESEND_API_KEY)).toBe(true);
      expect(isStringOrUndefined(env.CRON_SECRET)).toBe(true);
      expect(isStringOrUndefined(env.INTERNAL_API_SECRET)).toBe(true);
      expect(isStringOrUndefined(env.DIGEST_SECRET)).toBe(true);
      expect(isStringOrUndefined(env.SOCIAL_SECRET)).toBe(true);
      expect(isStringOrUndefined(env.X_API_KEY)).toBe(true);
      expect(isStringOrUndefined(env.X_API_SECRET)).toBe(true);
      expect(isStringOrUndefined(env.X_ACCESS_TOKEN)).toBe(true);
      expect(isStringOrUndefined(env.X_ACCESS_TOKEN_SECRET)).toBe(true);
      expect(isStringOrUndefined(env.X_BEARER_TOKEN)).toBe(true);
      expect(isStringOrUndefined(env.FACEBOOK_PAGE_ID)).toBe(true);
      expect(isStringOrUndefined(env.FACEBOOK_PAGE_ACCESS_TOKEN)).toBe(true);
      expect(isStringOrUndefined(env.NEXT_PUBLIC_APP_URL)).toBe(true);
      expect(isStringOrUndefined(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN)).toBe(
        true,
      );
    });
  });

  describe("Suporte a overrides dinâmicos em tempo de teste", () => {
    it("deve refletir alterações dinâmicas de process.env durante a suíte de testes", () => {
      process.env.CRON_SECRET = "super-token-vitest";
      expect(env.CRON_SECRET).toBe("super-token-vitest");

      process.env.INTERNAL_API_SECRET = "internal-token-vitest";
      expect(env.INTERNAL_API_SECRET).toBe("internal-token-vitest");

      process.env.SOCIAL_SECRET = "social-token-vitest";
      expect(env.SOCIAL_SECRET).toBe("social-token-vitest");
    });
  });
});
