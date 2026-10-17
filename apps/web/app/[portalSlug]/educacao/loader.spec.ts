import * as dbModule from "@transparencia/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadEducacaoData,
  parseEducacaoContext,
  requirePortalSlug,
} from "./loader";

vi.mock("@transparencia/db", () => ({
  getPortalConfig: vi.fn(),
  getEducacaoMetrics: vi.fn(),
  getResumoEducacao: vi.fn(),
  getEducacaoContratos: vi.fn(),
}));

describe("educacao/loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requirePortalSlug", () => {
    it("lança erro se o slug for vazio ou apenas espaços", () => {
      expect(() => requirePortalSlug("")).toThrow("portalSlug vazio");
      expect(() => requirePortalSlug("   ")).toThrow("portalSlug vazio");
    });

    it("retorna o slug limpo quando válido", () => {
      expect(requirePortalSlug(" porciuncula_prefeitura ")).toBe(
        "porciuncula_prefeitura",
      );
    });
  });

  describe("parseEducacaoContext", () => {
    it("extrai ano válido e identifica se é o ano corrente", () => {
      const currentYear = new Date().getFullYear();
      const ctx = parseEducacaoContext({ ano: "2025" }, 2025);
      expect(ctx.selectedYear).toBe(2025);
      expect(ctx.isCurrentYear).toBe(2025 === currentYear);
      expect(ctx.selectedEtapa).toBe("anosIniciais");
    });

    it("extrai etapa anosFinais quando fornecida", () => {
      const ctx = parseEducacaoContext({ etapa: "anosFinais" }, 2025);
      expect(ctx.selectedEtapa).toBe("anosFinais");
    });

    it("usa fallback para anosIniciais quando etapa for inválida ou omitida", () => {
      const ctx = parseEducacaoContext({}, 2025);
      expect(ctx.selectedEtapa).toBe("anosIniciais");

      const ctx2 = parseEducacaoContext({ etapa: "outra" }, 2025);
      expect(ctx2.selectedEtapa).toBe("anosIniciais");
    });

    it("usa defaultYear quando ano for omitido ou inválido", () => {
      const ctx = parseEducacaoContext({}, 2025);
      expect(ctx.selectedYear).toBe(2025);

      const ctxInvalido = parseEducacaoContext({ ano: "invalido" }, 2025);
      expect(ctxInvalido.selectedYear).toBe(2025);
    });
  });

  describe("loadEducacaoData", () => {
    it("carrega métricas, contratos, resumo e portalConfig em paralelo", async () => {
      const mockPortalConfig = {
        portalSlug: "porciuncula_prefeitura",
        displayName: "Prefeitura Municipal de Porciúncula",
        cidadeClean: "Porciúncula",
        uf: "RJ",
      };
      const mockMetrics = [
        {
          educacaoMetricaId: "1",
          portalSlug: "porciuncula_prefeitura",
          codIbge: 3304102,
          ano: 2025,
          rede: "municipal",
          etapaEnsino: "anosIniciais" as const,
          notaIdeb: 5.9,
          metaIdeb: null,
          atingiuMeta: null,
          saebMatematica: 218.39,
          saebLinguaPortuguesa: 210.91,
          indicadorFluxoAprovacao: 0.985,
          crescimentoPontosIdeb: 1.4,
          variacaoSaebMatematica: 16.29,
          variacaoSaebPortugues: 16.41,
          despesaLiquidadaEducacao: 34291936.64,
          totalMatriculasRedeMunicipal: 2290,
          custoAnualPorAluno: 14974.64,
        },
      ];
      const mockResumo = {
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        notaIdeb: 5.9,
        metaIdeb: null,
        atingiuMeta: null,
        crescimentoPontosIdeb: 1.4,
        saebMatematica: 218.39,
        saebLinguaPortuguesa: 210.91,
        indicadorFluxoAprovacao: 0.985,
        despesaLiquidadaEducacao: 34291936.64,
        totalMatriculasRedeMunicipal: 2290,
        custoAnualPorAluno: 14974.64,
        anosIniciais: mockMetrics[0],
        anosFinais: null,
      };
      const mockContratos = [
        {
          contratoId: "ctr_1",
          portalSlug: "porciuncula_prefeitura",
          ano: 2025,
          empresaId: "1",
          contratoNumero: "0443/25",
          licitacaoNumero: "012/2025",
          modalidade: "pregao_eletronico",
          fornecedorNome: "DISTRIBUIDORA DE ALIMENTOS",
          fornecedorCpfCnpj: "00.000.000/0001-00",
          objeto: "Merenda escolar PNAE",
          categoria: "merenda_pnae" as const,
          valorContrato: 450000,
          valorAditado: 0,
          totalEmpenhado: 450000,
          totalLiquidado: 200000,
          totalPago: 180000,
          saldoAPagar: 270000,
          fontePrincipal: "PNAE",
          fontesRecursos: "PNAE",
          orgaoNome: "Secretaria de Educação",
          principalFuncao: "Educação",
          principalPrograma: null,
          principalAcao: null,
          dataInicio: "2025-02-01",
          vencimentoAtual: "2025-12-31",
        },
      ];

      vi.mocked(dbModule.getPortalConfig).mockResolvedValue(
        mockPortalConfig as any,
      );
      vi.mocked(dbModule.getEducacaoMetrics).mockResolvedValue(mockMetrics);
      vi.mocked(dbModule.getResumoEducacao).mockResolvedValue(mockResumo);
      vi.mocked(dbModule.getEducacaoContratos).mockResolvedValue(mockContratos);

      const data = await loadEducacaoData("porciuncula_prefeitura", {
        ano: "2025",
        contratoNumero: "0443/25",
      });

      expect(data.portalSlug).toBe("porciuncula_prefeitura");
      expect(data.portalConfig?.cidadeClean).toBe("Porciúncula");
      expect(data.allMetrics).toHaveLength(1);
      expect(data.resumo?.notaIdeb).toBe(5.9);
      expect(data.contratos).toHaveLength(1);
      expect(data.context.selectedYear).toBe(2025);
      expect(data.searchParams.contratoNumero).toBe("0443/25");

      expect(dbModule.getPortalConfig).toHaveBeenCalledWith(
        "porciuncula_prefeitura",
      );
      expect(dbModule.getEducacaoMetrics).toHaveBeenCalledWith(
        "porciuncula_prefeitura",
      );
      expect(dbModule.getResumoEducacao).toHaveBeenCalledWith(
        "porciuncula_prefeitura",
        2025,
      );
      expect(dbModule.getEducacaoContratos).toHaveBeenCalledWith(
        "porciuncula_prefeitura",
        2025,
      );
    });
  });
});
