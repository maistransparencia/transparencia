import * as db from "@transparencia/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as facebookBot from "./facebook-bot";
import { publishSocial } from "./social-publisher";
import * as xBot from "./x-bot";

vi.mock("@transparencia/db", () => ({
  getPortalConfig: vi.fn(),
  getRadarDigestMetrics: vi.fn(),
}));

describe("social-publisher module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const mockMetrics = {
    portalSlug: "porciuncula_prefeitura",
    ano: 2025,
    posicaoFiscal: {
      totalArrecadado: 120000000,
      despesasPagas: 110000000,
      restosPagosNoAno: 5000000,
      saldoEstimado: 10000000,
      restosPendentesTotal: 30800000,
      restosLiquidadosPendentes: 2900000,
    },
    opacidade: {
      taxaValorOpacidadePct: 4.8,
      classificacaoRisco: "atencao" as const,
      pagoResidual99: 5280000,
      pagoDesvioSensivel99: 1200000,
      totalPago: 110000000,
    },
    destaquesContratos: [],
    destaquesCredoresOpacidade: [],
  };

  it("deve despachar boletim fiscal para todos os canais por padrão (x e facebook)", async () => {
    vi.mocked(db.getPortalConfig).mockResolvedValueOnce({
      portalSlug: "porciuncula_prefeitura",
      displayName: "Prefeitura de Porciúncula",
      cidadeClean: "Porciúncula",
      estado: "RJ",
      exercicioInicial: 2020,
    } as any);
    vi.mocked(db.getRadarDigestMetrics).mockResolvedValueOnce(
      mockMetrics as any,
    );

    const postTweetSpy = vi
      .spyOn(xBot, "postTweet")
      .mockResolvedValueOnce({ success: true, tweetId: "tweet-123" });
    const postFbSpy = vi
      .spyOn(facebookBot, "postFacebookPost")
      .mockResolvedValueOnce({ success: true, postId: "fb-post-456" });

    const result = await publishSocial({
      portalSlug: "porciuncula_prefeitura",
      type: "fiscal_digest",
      ano: 2025,
    });

    expect(result.success).toBe(true);
    expect(result.results.x?.tweetId).toBe("tweet-123");
    expect(result.results.facebook?.postId).toBe("fb-post-456");
    expect(postTweetSpy).toHaveBeenCalled();
    expect(postFbSpy).toHaveBeenCalled();
  });

  it("deve filtrar despacho apenas para o canal especificado", async () => {
    vi.mocked(db.getPortalConfig).mockResolvedValueOnce({
      portalSlug: "porciuncula_prefeitura",
      displayName: "Porciúncula",
    } as any);

    const postTweetSpy = vi
      .spyOn(xBot, "postTweet")
      .mockResolvedValueOnce({ success: true, tweetId: "tweet-x-only" });
    const postFbSpy = vi.spyOn(facebookBot, "postFacebookPost");

    const result = await publishSocial({
      portalSlug: "porciuncula_prefeitura",
      type: "extraction",
      channels: ["x"],
      ano: 2025,
    });

    expect(result.success).toBe(true);
    expect(result.results.x?.success).toBe(true);
    expect(result.results.facebook).toBeUndefined();
    expect(postTweetSpy).toHaveBeenCalledTimes(1);
    expect(postFbSpy).not.toHaveBeenCalled();
  });

  it("deve despachar notificação de release de software", async () => {
    const postTweetSpy = vi
      .spyOn(xBot, "postTweet")
      .mockResolvedValueOnce({ success: true, tweetId: "tweet-release" });
    const postFbSpy = vi
      .spyOn(facebookBot, "postFacebookPost")
      .mockResolvedValueOnce({ success: true, postId: "fb-release" });

    const result = await publishSocial({
      portalSlug: "porciuncula_prefeitura",
      type: "release",
      version: "v3.0.0",
      summary: "Novas funcionalidades de auditoria cívica.",
      channels: "all",
    });

    expect(result.success).toBe(true);
    expect(postTweetSpy).toHaveBeenCalledWith(
      expect.stringContaining("v3.0.0"),
      expect.any(Object),
    );
    expect(postFbSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("v3.0.0"),
      }),
      expect.any(Object),
    );
  });

  it("deve despachar mensagem personalizada customizada", async () => {
    const postTweetSpy = vi
      .spyOn(xBot, "postTweet")
      .mockResolvedValueOnce({ success: true, tweetId: "tweet-custom" });
    const postFbSpy = vi
      .spyOn(facebookBot, "postFacebookPost")
      .mockResolvedValueOnce({ success: true, postId: "fb-custom" });

    const result = await publishSocial({
      portalSlug: "porciuncula_prefeitura",
      type: "custom",
      text: "Comunicado oficial extraordinário à população.",
    });

    expect(result.success).toBe(true);
    expect(postTweetSpy).toHaveBeenCalled();
    expect(postFbSpy).toHaveBeenCalled();
  });

  it("deve garantir resiliência independente se uma das redes sociais falhar", async () => {
    vi.mocked(db.getPortalConfig).mockResolvedValueOnce({
      portalSlug: "porciuncula_prefeitura",
      displayName: "Porciúncula",
    } as any);

    vi.spyOn(xBot, "postTweet").mockResolvedValueOnce({
      success: false,
      error: "Rate limit excedido no X",
    });
    vi.spyOn(facebookBot, "postFacebookPost").mockResolvedValueOnce({
      success: true,
      postId: "fb-sucesso-mesmo-com-x-falho",
    });

    const result = await publishSocial({
      portalSlug: "porciuncula_prefeitura",
      type: "extraction",
      ano: 2025,
    });

    expect(result.success).toBe(false);
    expect(result.results.x?.success).toBe(false);
    expect(result.results.x?.error).toContain("Rate limit");
    expect(result.results.facebook?.success).toBe(true);
    expect(result.results.facebook?.postId).toBe(
      "fb-sucesso-mesmo-com-x-falho",
    );
  });

  it("deve repassar flag dryRun para os clientes sociais", async () => {
    const postTweetSpy = vi
      .spyOn(xBot, "postTweet")
      .mockResolvedValueOnce({ success: true, tweetId: "dry-run-id" });
    const postFbSpy = vi
      .spyOn(facebookBot, "postFacebookPost")
      .mockResolvedValueOnce({ success: true, postId: "dry-run-id" });

    const result = await publishSocial({
      portalSlug: "porciuncula_prefeitura",
      type: "custom",
      text: "Simulação dry-run",
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(postTweetSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ dryRun: true }),
    );
    expect(postFbSpy).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ dryRun: true }),
    );
  });
});
