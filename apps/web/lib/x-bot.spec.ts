import type { RadarDigestMetricsDTO } from "@transparencia/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCustomTweet,
  buildExtractionTweet,
  buildFiscalDigestTweet,
  buildReleaseTweet,
  calculateTweetLength,
  generateOAuth1Header,
  postTweet,
  truncateTweet,
} from "./x-bot";

describe("x-bot module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("calculateTweetLength", () => {
    it("deve calcular o comprimento de texto simples sem URLs", () => {
      const text = "Olá Porciúncula!";
      expect(calculateTweetLength(text)).toBe(text.length);
    });

    it("deve ponderar qualquer URL como 23 caracteres (regra t.co do X)", () => {
      // URL curta (< 23 chars)
      const shortUrl = "http://a.co";
      expect(calculateTweetLength(shortUrl)).toBe(23);

      // URL longa (> 23 chars)
      const longUrl =
        "https://transparencia.app/porciuncula_prefeitura/despesas?ano=2025&origem=twitter_bot";
      expect(calculateTweetLength(longUrl)).toBe(23);

      // Texto com URL
      const textWithUrl = `Confira os gastos: ${longUrl} #Transparencia`;
      // "Confira os gastos: " (19) + 23 + " #Transparencia" (15) = 57
      expect(calculateTweetLength(textWithUrl)).toBe(19 + 23 + 15);
    });

    it("deve computar múltiplas URLs onde cada uma conta 23 caracteres", () => {
      const text =
        "Link 1: https://link1.com e Link 2: https://link2.com/muito/longo";
      // "Link 1: " (8) + 23 + " e Link 2: " (11) + 23 = 65
      expect(calculateTweetLength(text)).toBe(8 + 23 + 11 + 23);
    });
  });

  describe("truncateTweet", () => {
    it("não deve alterar texto com comprimento <= 280", () => {
      const text = "Mensagem curta de transparência fiscal.";
      expect(truncateTweet(text)).toBe(text);
    });

    it("deve truncar texto que excede 280 caracteres mantendo links e hashtags intactos", () => {
      const longBody = "A".repeat(300);
      const url = "https://transparencia.app/porciuncula_prefeitura";
      const hashtags = "#Porciuncula #TransparenciaFiscal";
      const input = `${longBody} ${url} ${hashtags}`;

      const truncated = truncateTweet(input, 280);

      expect(calculateTweetLength(truncated)).toBeLessThanOrEqual(280);
      expect(truncated).toContain(url);
      expect(truncated).toContain(hashtags);
      expect(truncated).toContain("...");
    });
  });

  describe("formatadores especializados para o X", () => {
    const mockMetrics: RadarDigestMetricsDTO = {
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      posicaoFiscal: {
        totalArrecadado: 120000000,
        despesasPagas: 110000000,
        restosPagosNoAno: 5000000,
        saldoEstimado: 10000000,
      },
      opacidade: {
        taxaValorOpacidadePct: 4.8,
        classificacaoRisco: "atencao",
        pagoResidual99: 5280000,
        pagoDesvioSensivel99: 1200000,
        totalPago: 110000000,
      },
      destaquesContratos: [],
      destaquesCredoresOpacidade: [],
    };

    it("buildFiscalDigestTweet: deve gerar tweet cívico respeitando 280 caracteres", () => {
      const tweet = buildFiscalDigestTweet({
        portalSlug: "porciuncula_prefeitura",
        municipioNome: "Porciúncula",
        ano: 2025,
        metrics: mockMetrics,
        baseUrl: "https://transparencia.app",
      });

      expect(tweet).toContain("Balanço Fiscal de Porciúncula (2025)");
      expect(tweet).toContain("Total Pago:");
      expect(tweet).toContain(
        "https://transparencia.app/porciuncula_prefeitura",
      );
      expect(tweet).toContain("#Porciuncula");
      expect(tweet).toContain("#TransparenciaFiscal");
      expect(calculateTweetLength(tweet)).toBeLessThanOrEqual(280);
    });

    it("buildExtractionTweet: deve gerar tweet de carga de dados concluída <= 280 caracteres", () => {
      const tweet = buildExtractionTweet({
        portalSlug: "porciuncula_prefeitura",
        municipioNome: "Porciúncula",
        ano: 2025,
        baseUrl: "https://transparencia.app",
      });

      expect(tweet).toContain("Dados Atualizados");
      expect(tweet).toContain("Porciúncula");
      expect(tweet).toContain(
        "https://transparencia.app/porciuncula_prefeitura",
      );
      expect(calculateTweetLength(tweet)).toBeLessThanOrEqual(280);
    });

    it("buildReleaseTweet: deve gerar tweet de release do portal <= 280 caracteres", () => {
      const tweet = buildReleaseTweet({
        version: "v2.5.0",
        summary:
          "Novo módulo de acompanhamento de despesas da saúde e alertas cívicos.",
        baseUrl: "https://transparencia.app",
      });

      expect(tweet).toContain("v2.5.0");
      expect(tweet).toContain("saúde e alertas cívicos");
      expect(tweet).toContain("https://transparencia.app");
      expect(calculateTweetLength(tweet)).toBeLessThanOrEqual(280);
    });

    it("buildCustomTweet: deve validar e truncar se exceder 280 caracteres", () => {
      expect(() => buildCustomTweet("")).toThrow("Mensagem não pode ser vazia");
      const short = buildCustomTweet("Mensagem personalizada de teste.");
      expect(short).toBe("Mensagem personalizada de teste.");

      const long = buildCustomTweet("X".repeat(320));
      expect(calculateTweetLength(long)).toBeLessThanOrEqual(280);
    });
  });

  describe("autenticação OAuth 1.0a", () => {
    it("deve gerar cabeçalho Authorization OAuth 1.0a válido com parâmetros obrigatórios", () => {
      const header = generateOAuth1Header({
        method: "POST",
        url: "https://api.twitter.com/2/tweets",
        apiKey: "test-consumer-key",
        apiSecret: "test-consumer-secret",
        accessToken: "test-access-token",
        accessTokenSecret: "test-access-token-secret",
        nonce: "fixed-nonce-123",
        timestamp: 1700000000,
      });

      expect(header).toContain('OAuth oauth_consumer_key="test-consumer-key"');
      expect(header).toContain('oauth_nonce="fixed-nonce-123"');
      expect(header).toContain('oauth_signature_method="HMAC-SHA1"');
      expect(header).toContain('oauth_timestamp="1700000000"');
      expect(header).toContain('oauth_token="test-access-token"');
      expect(header).toContain('oauth_version="1.0"');
      expect(header).toContain('oauth_signature="');
    });
  });

  describe("postTweet client", () => {
    it("deve simular envio com sucesso em modo dry-run sem disparar fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const result = await postTweet("Mensagem de teste", { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.tweetId).toBeDefined();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("deve postar tweet na API v2 do X quando credenciais estão presentes", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            id: "1234567890123456789",
            text: "Mensagem de teste no X",
          },
        }),
      } as Response);

      const result = await postTweet("Mensagem de teste no X", {
        credentials: {
          apiKey: "key",
          apiSecret: "secret",
          accessToken: "token",
          accessTokenSecret: "token_secret",
        },
      });

      expect(result.success).toBe(true);
      expect(result.tweetId).toBe("1234567890123456789");
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.twitter.com/2/tweets",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("OAuth oauth_consumer_key="),
          }),
          body: JSON.stringify({ text: "Mensagem de teste no X" }),
        }),
      );
    });

    it("deve tratar erros da API v2 do X sem lançar exceção não tratada", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({
          detail:
            "You are not allowed to create a Tweet with duplicate content.",
          title: "Forbidden",
        }),
      } as Response);

      const result = await postTweet("Tweet duplicado", {
        credentials: {
          apiKey: "key",
          apiSecret: "secret",
          accessToken: "token",
          accessTokenSecret: "token_secret",
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("duplicate content");
    });

    it("deve capturar falha de rede sem quebrar a execução", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("Connection reset by peer"),
      );

      const result = await postTweet("Falha de rede", {
        credentials: {
          apiKey: "key",
          apiSecret: "secret",
          accessToken: "token",
          accessTokenSecret: "token_secret",
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection reset by peer");
    });
  });
});
