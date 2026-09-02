import type { RadarDigestMetricsDTO } from "@transparencia/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCustomFacebookPost,
  buildExtractionFacebookPost,
  buildFiscalDigestFacebookPost,
  buildReleaseFacebookPost,
  postFacebookPost,
} from "./facebook-bot";

describe("facebook-bot module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("formatadores para o Facebook Pages", () => {
    const mockMetrics: RadarDigestMetricsDTO = {
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      posicaoFiscal: {
        totalArrecadado: 125000000,
        despesasPagas: 115000000,
        restosPagosNoAno: 4500000,
        saldoEstimado: 10000000,
      },
      opacidade: {
        taxaValorOpacidadePct: 5.2,
        classificacaoRisco: "atencao",
        pagoResidual99: 5980000,
        pagoDesvioSensivel99: 1500000,
        totalPago: 115000000,
      },
      destaquesContratos: [
        {
          fornecedorNome: "Construtora Alfa Ltda",
          objetoDescricao: "Reforma de escolas municipais",
          totalPago: 2500000,
          statusExecucao: "normal",
        },
      ],
      destaquesCredoresOpacidade: [],
    };

    it("buildFiscalDigestFacebookPost: deve gerar publicação completa com tópicos e link do portal", () => {
      const post = buildFiscalDigestFacebookPost({
        portalSlug: "porciuncula_prefeitura",
        municipioNome: "Porciúncula",
        ano: 2025,
        metrics: mockMetrics,
        baseUrl: "https://transparencia.app",
      });

      expect(post.message).toContain(
        "BOLETIM FISCAL MUNICIPAL: PORCIÚNCULA (2025)",
      );
      expect(post.message).toContain("Execução Orçamentária");
      expect(post.message).toContain("Total Pago:");
      expect(post.message).toContain("Opacidade Contábil");
      expect(post.message).toContain("Construtora Alfa Ltda");
      expect(post.message).toContain("#MaisTransparencia");
      expect(post.message).toContain("#Porciuncula");
      expect(post.link).toBe(
        "https://transparencia.app/porciuncula_prefeitura",
      );
    });

    it("buildExtractionFacebookPost: deve gerar post com dados de atualização e link", () => {
      const post = buildExtractionFacebookPost({
        portalSlug: "porciuncula_prefeitura",
        municipioNome: "Porciúncula",
        ano: 2025,
        summary: "Foram adicionados novos empenhos de saúde e educação.",
        baseUrl: "https://transparencia.app",
      });

      expect(post.message).toContain("BASE DE DADOS ATUALIZADA: PORCIÚNCULA");
      expect(post.message).toContain("saúde e educação");
      expect(post.message).toContain("2025");
      expect(post.link).toBe(
        "https://transparencia.app/porciuncula_prefeitura",
      );
    });

    it("buildReleaseFacebookPost: deve gerar post detalhado de nova versão", () => {
      const post = buildReleaseFacebookPost({
        version: "v2.5.0",
        summary:
          "Lançamento da integração social automatizada e envio de alertas cívicos.",
        baseUrl: "https://transparencia.app",
      });

      expect(post.message).toContain(
        "NOVIDADES NO MAIS TRANSPARÊNCIA: VERSÃO v2.5.0",
      );
      expect(post.message).toContain("integração social automatizada");
      expect(post.link).toBe("https://transparencia.app");
    });

    it("buildCustomFacebookPost: deve validar mensagem e permitir link opcional", () => {
      expect(() => buildCustomFacebookPost("")).toThrow(
        "Mensagem não pode ser vazia",
      );

      const postSimple = buildCustomFacebookPost("Aviso cívico geral");
      expect(postSimple.message).toBe("Aviso cívico geral");
      expect(postSimple.link).toBeUndefined();

      const postWithLink = buildCustomFacebookPost({
        text: "Aviso cívico com link",
        link: "https://transparencia.app/porciuncula_prefeitura",
      });
      expect(postWithLink.message).toBe("Aviso cívico com link");
      expect(postWithLink.link).toBe(
        "https://transparencia.app/porciuncula_prefeitura",
      );
    });
  });

  describe("postFacebookPost client", () => {
    it("deve simular envio com sucesso em modo dry-run sem chamar fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const result = await postFacebookPost(
        { message: "Teste Facebook", link: "https://transparencia.app" },
        { dryRun: true },
      );

      expect(result.success).toBe(true);
      expect(result.postId).toBeDefined();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("deve postar na Graph API v21.0 quando credenciais estão presentes", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "pageid_postid12345",
        }),
      } as Response);

      const result = await postFacebookPost(
        {
          message: "Mensagem pública na página",
          link: "https://transparencia.app/porciuncula_prefeitura",
        },
        {
          credentials: {
            pageId: "123456789",
            pageAccessToken: "page-token-secret",
          },
        },
      );

      expect(result.success).toBe(true);
      expect(result.postId).toBe("pageid_postid12345");
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://graph.facebook.com/v21.0/123456789/feed",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            message: "Mensagem pública na página",
            link: "https://transparencia.app/porciuncula_prefeitura",
            access_token: "page-token-secret",
          }),
        }),
      );
    });

    it("deve tratar erros da Graph API sem lançar exceção não tratada", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
          error: {
            message: "Invalid OAuth access token - Cannot parse access token",
            type: "OAuthException",
            code: 190,
          },
        }),
      } as Response);

      const result = await postFacebookPost(
        { message: "Tentativa com token inválido" },
        {
          credentials: {
            pageId: "123456789",
            pageAccessToken: "token-invalido",
          },
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid OAuth access token");
    });

    it("deve capturar falha de rede sem quebrar a execução", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("Network timeout"),
      );

      const result = await postFacebookPost(
        { message: "Falha de rede" },
        {
          credentials: {
            pageId: "123456789",
            pageAccessToken: "token",
          },
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network timeout");
    });

    it("deve reportar erro se Graph API responder com objeto error mesmo com status HTTP 200", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          error: {
            message: "Permissions error",
            type: "OAuthException",
            code: 200,
          },
        }),
      } as Response);

      const result = await postFacebookPost(
        { message: "Tentativa com erro no body" },
        {
          credentials: {
            pageId: "123456789",
            pageAccessToken: "token-sem-permissao",
          },
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Permissions error");
    });
  });

  describe("tratamento gracioso de métricas nulas", () => {
    it("buildFiscalDigestFacebookPost: deve indicar apuração contábil quando posicaoFiscal for nula", () => {
      const post = buildFiscalDigestFacebookPost({
        portalSlug: "porciuncula_prefeitura",
        municipioNome: "Porciúncula",
        ano: 2025,
        metrics: {
          portalSlug: "porciuncula_prefeitura",
          ano: 2025,
          posicaoFiscal: null,
          opacidade: null,
          destaquesContratos: [],
          destaquesCredoresOpacidade: [],
        },
      });

      expect(post.message).toContain(
        "Posição fiscal do exercício em apuração contábil",
      );
      expect(post.message).not.toContain("Total Arrecadado: R$ 0");
    });
  });
});
