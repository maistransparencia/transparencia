import * as dbModule from "@transparencia/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadObrasData,
  parseObrasContext,
  parseObrasSearchParams,
  requirePortalSlug,
} from "./loader";

vi.mock("@transparencia/db", () => ({
  getPortalConfig: vi.fn(),
  getResumoObrasPorPortal: vi.fn(),
  getObrasPorPortal: vi.fn(),
}));

describe("obras/loader", () => {
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

  describe("parseObrasContext", () => {
    it("extrai ano válido e identifica se é o ano corrente", () => {
      const currentYear = new Date().getFullYear();
      const ctx = parseObrasContext({ ano: "2024" });
      expect(ctx.selectedYear).toBe(2024);
      expect(ctx.isCurrentYear).toBe(2024 === currentYear);
    });

    it("usa fallback para o ano corrente se não informado ou inválido", () => {
      const currentYear = new Date().getFullYear();
      const ctx = parseObrasContext({});
      expect(ctx.selectedYear).toBe(currentYear);
      expect(ctx.isCurrentYear).toBe(true);

      const ctxInvalido = parseObrasContext({ ano: "invalido" });
      expect(ctxInvalido.selectedYear).toBe(currentYear);
    });
  });

  describe("parseObrasSearchParams", () => {
    it("retorna valores padrão quando nenhum parâmetro é informado", () => {
      const parsed = parseObrasSearchParams({});
      expect(parsed.status).toBe("todas");
      expect(parsed.busca).toBeUndefined();
    });

    it("extrai status válido e busca com ao menos 2 caracteres", () => {
      const parsed = parseObrasSearchParams({
        status: "em_execucao",
        busca: "escola municipal",
      });
      expect(parsed.status).toBe("em_execucao");
      expect(parsed.busca).toBe("escola municipal");
    });

    it("reverte para 'todas' quando o status for desconhecido", () => {
      const parsed = parseObrasSearchParams({
        status: "invalido_status",
      });
      expect(parsed.status).toBe("todas");
    });

    it("descarta buscas com menos de 2 caracteres", () => {
      const parsed = parseObrasSearchParams({
        busca: "a",
      });
      expect(parsed.busca).toBeUndefined();
    });
  });

  describe("loadObrasData", () => {
    it("carrega dados agregados e lista de obras filtrada respeitando o contexto de ano", async () => {
      vi.mocked(dbModule.getPortalConfig).mockResolvedValue({
        displayName: "Porciúncula",
        uf: "RJ",
      } as unknown as Awaited<ReturnType<typeof dbModule.getPortalConfig>>);

      vi.mocked(dbModule.getResumoObrasPorPortal).mockResolvedValue({
        totalObras: 5,
        emExecucao: 2,
        paralisadas: 1,
        concluidas: 2,
        cadastradas: 0,
        canceladas: 0,
        valorTotalInvestimento: 5000000,
        valorEmExecucao: 2500000,
        valorParalisadas: 1000000,
        valorConcluidas: 1500000,
        valorCadastradas: 0,
        percentualMedioExecucaoFisica: 65.5,
        obrasSemMedicaoCount: 0,
      });

      vi.mocked(dbModule.getObrasPorPortal).mockResolvedValue([
        {
          idProjeto: "OBR-001",
          portalSlug: "porciuncula_prefeitura",
          nomeObra: "Reforma da UBS",
          situacao: "em_execucao",
          orgaoResponsavel: "Secretaria de Saúde",
          valorInvestimentoPrevisto: 1200000,
          percentualExecucaoFisica: 50,
          dataUltimaMedicao: "2026-05-10",
          latitude: -20.9634,
          longitude: -42.0408,
          motivoParalisacao: null,
          dataInicioPrevista: "2026-01-15",
          dataFimPrevista: "2026-12-31",
        },
      ]);

      const result = await loadObrasData("porciuncula_prefeitura", {
        ano: "2026",
        status: "em_execucao",
        busca: "UBS",
      });

      expect(dbModule.getPortalConfig).toHaveBeenCalledWith(
        "porciuncula_prefeitura",
      );
      expect(dbModule.getResumoObrasPorPortal).toHaveBeenCalledWith(
        "porciuncula_prefeitura",
        { ano: 2026 },
      );
      expect(dbModule.getObrasPorPortal).toHaveBeenCalledWith(
        "porciuncula_prefeitura",
        { ano: 2026 },
      );

      expect(result.portalSlug).toBe("porciuncula_prefeitura");
      expect(result.context.selectedYear).toBe(2026);
      expect(result.resumo.totalObras).toBe(5);
      expect(result.obras).toHaveLength(1);
      expect(result.obras[0].idProjeto).toBe("OBR-001");
    });
  });
});
