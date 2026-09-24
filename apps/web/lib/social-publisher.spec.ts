import * as db from "@transparencia/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as facebookBot from "./facebook-bot";
import {
  buildCivicAnomalyFacebookPost,
  buildCivicAnomalyTweet,
  publishSocial,
  resolveAnomalyLink,
} from "./social-publisher";
import * as xBot from "./x-bot";

vi.mock("@transparencia/db", () => ({
  getPortalConfig: vi.fn(),
  getRadarDigestMetrics: vi.fn(),
  getRadarCivicoAlertas: vi.fn(),
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

  it("deve despachar alerta cívico crítico para X e Facebook quando type for civic_anomaly", async () => {
    vi.mocked(db.getPortalConfig).mockResolvedValueOnce({
      portalSlug: "porciuncula_prefeitura",
      displayName: "Prefeitura de Porciúncula",
      cidadeClean: "Porciúncula",
    } as any);

    const mockAlerta = {
      anomaliaId: "crit-1",
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      tipoAnomalia: "explosao_comissionados" as const,
      dimensaoReferencia: "comissionados",
      grauSeveridade: "critico" as const,
      desvioPercentual: 65,
      valorObservado: 165,
      valorEsperado: 100,
      mesInicial: 1,
      mesFinal: 12,
      licitacaoNumero: null,
      metodoDeteccao: "iqr_estoque",
    };

    vi.mocked(db.getRadarCivicoAlertas).mockResolvedValueOnce([mockAlerta]);

    const postTweetSpy = vi
      .spyOn(xBot, "postTweet")
      .mockResolvedValueOnce({ success: true, tweetId: "tweet-crit-1" });
    const postFbSpy = vi
      .spyOn(facebookBot, "postFacebookPost")
      .mockResolvedValueOnce({ success: true, postId: "fb-crit-1" });

    const result = await publishSocial({
      portalSlug: "porciuncula_prefeitura",
      type: "civic_anomaly",
      ano: 2025,
    });

    expect(result.success).toBe(true);
    expect(result.results.x?.tweetId).toBe("tweet-crit-1");
    expect(result.results.facebook?.postId).toBe("fb-crit-1");
    expect(postTweetSpy).toHaveBeenCalledWith(
      expect.stringContaining("🚨 Radar Cívico (Prefeitura de Porciúncula)"),
      expect.any(Object),
    );
    expect(postFbSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("ALERTA CRÍTICO"),
        link: expect.stringContaining("pessoal?ano=2025#comissionados"),
      }),
      expect.any(Object),
    );
  });

  it("deve retornar erro e success: false se nenhuma anomalia crítica for encontrada para civic_anomaly", async () => {
    vi.mocked(db.getPortalConfig).mockResolvedValueOnce({
      portalSlug: "porciuncula_prefeitura",
      displayName: "Prefeitura de Porciúncula",
    } as any);

    vi.mocked(db.getRadarCivicoAlertas).mockResolvedValueOnce([]);

    const result = await publishSocial({
      portalSlug: "porciuncula_prefeitura",
      type: "civic_anomaly",
      ano: 2025,
    });

    expect(result.success).toBe(false);
    expect(result.results.x?.error).toContain("Nenhuma anomalia crítica");
    expect(result.results.facebook?.error).toContain(
      "Nenhuma anomalia crítica",
    );
  });

  it("buildCivicAnomalyTweet gera tweet com limite <= 280 caracteres e hashtags oficiais", () => {
    const tweet = buildCivicAnomalyTweet({
      portalSlug: "porciuncula_prefeitura",
      municipioNome: "Porciúncula",
      alerta: {
        anomaliaId: "crit-1",
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        tipoAnomalia: "explosao_comissionados",
        dimensaoReferencia: "comissionados",
        grauSeveridade: "critico",
        desvioPercentual: 65,
        valorObservado: 165,
        valorEsperado: 100,
        mesInicial: 1,
        mesFinal: 12,
        licitacaoNumero: null,
        metodoDeteccao: "iqr_estoque",
      },
    });

    expect(tweet).toContain("🚨 Radar Cívico (Porciúncula)");
    expect(tweet).toContain("#ControleSocial #TransparenciaFiscal");
    expect(xBot.calculateTweetLength(tweet)).toBeLessThanOrEqual(280);
  });

  it("buildCivicAnomalyFacebookPost gera post estruturado com métricas e deep link", () => {
    const post = buildCivicAnomalyFacebookPost({
      portalSlug: "porciuncula_prefeitura",
      municipioNome: "Porciúncula",
      alerta: {
        anomaliaId: "crit-1",
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        tipoAnomalia: "explosao_comissionados",
        dimensaoReferencia: "comissionados",
        grauSeveridade: "critico",
        desvioPercentual: 65,
        valorObservado: 165,
        valorEsperado: 100,
        mesInicial: 1,
        mesFinal: 12,
        licitacaoNumero: null,
        metodoDeteccao: "iqr_estoque",
      },
    });

    expect(post.message).toContain("RADAR CÍVICO MUNICIPAL: ALERTA CRÍTICO");
    expect(post.message).toContain("165 cargos");
    expect(post.message).toContain("+65%");
    expect(post.link).toContain(
      "/porciuncula_prefeitura/pessoal?ano=2025#comissionados",
    );
  });

  it("deve selecionar anomalia especificada por anomaliaId quando fornecida", async () => {
    vi.mocked(db.getPortalConfig).mockResolvedValueOnce({
      portalSlug: "porciuncula_prefeitura",
      displayName: "Prefeitura de Porciúncula",
    } as any);

    vi.mocked(db.getRadarCivicoAlertas).mockResolvedValueOnce([
      {
        anomaliaId: "crit-1",
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        tipoAnomalia: "explosao_comissionados",
        grauSeveridade: "critico",
        desvioPercentual: 50,
      } as any,
      {
        anomaliaId: "crit-2",
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        tipoAnomalia: "concentracao_dispensa",
        grauSeveridade: "critico",
        desvioPercentual: 120,
        valorObservado: 45.5,
        valorEsperado: 20,
      } as any,
    ]);

    const postFbSpy = vi
      .spyOn(facebookBot, "postFacebookPost")
      .mockResolvedValueOnce({ success: true, postId: "fb-crit-2" });

    const result = await publishSocial({
      portalSlug: "porciuncula_prefeitura",
      type: "civic_anomaly",
      channels: ["facebook"],
      ano: 2025,
      anomaliaId: "crit-2",
    });

    expect(result.success).toBe(true);
    expect(postFbSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("45.5%"),
      }),
      expect.any(Object),
    );
  });

  it("resolveAnomalyLink sanitiza baseUrl com barra final sem duplicar barras", () => {
    const link = resolveAnomalyLink(
      {
        tipoAnomalia: "explosao_comissionados",
        ano: 2025,
      },
      "https://maistransparencia.com/",
      "porciuncula_prefeitura",
    );
    expect(link).toBe(
      "https://maistransparencia.com/porciuncula_prefeitura/pessoal?ano=2025#comissionados",
    );
    expect(link).not.toContain(".com//");
  });

  it("resolveAnomalyLink gera deep link correto para desidratacao_patrimonio_rpps", () => {
    const link = resolveAnomalyLink(
      {
        tipoAnomalia: "desidratacao_patrimonio_rpps",
        ano: 2025,
      },
      "https://maistransparencia.com",
      "porciuncula_prefeitura",
    );
    expect(link).toBe(
      "https://maistransparencia.com/porciuncula_prefeitura/caprem?ano=2025#patrimonio",
    );
  });

  it("buildCivicAnomalyFacebookPost formata sinal negativo para desidratacao_patrimonio_rpps", () => {
    const post = buildCivicAnomalyFacebookPost({
      portalSlug: "porciuncula_prefeitura",
      municipioNome: "Porciúncula",
      alerta: {
        anomaliaId: "crit-desidratacao",
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        tipoAnomalia: "desidratacao_patrimonio_rpps",
        dimensaoReferencia: "patrimonio_previdenciario",
        grauSeveridade: "critico",
        desvioPercentual: 20.8,
        valorObservado: 35980000,
        valorEsperado: 45420000,
        mesInicial: 1,
        mesFinal: 12,
        licitacaoNumero: null,
        metodoDeteccao: "variacao_trienal_patrimonio",
      },
    });

    expect(post.message).toContain("-20.8%");
    expect(post.message).toContain("patrimônio financeiro da previdência");
    expect(post.link).toContain(
      "/porciuncula_prefeitura/caprem?ano=2025#patrimonio",
    );
  });
});
