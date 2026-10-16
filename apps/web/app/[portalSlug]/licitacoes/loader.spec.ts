import * as dbModule from "@transparencia/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadLicitacoesData, parseLicitacoesContext } from "./loader";

vi.mock("@transparencia/db", () => ({
  getAdesaoDeAtaMetrics: vi.fn(),
  getAdesaoExternaMetrics: vi.fn(),
  getAnomaliasContratuaisMetrics: vi.fn(),
  getContratosServicosVigentes: vi.fn(),
  getDistribucaoModalidadesMetrics: vi.fn(),
  getEntidades: vi.fn(),
  getLicitacaoGapsMetrics: vi.fn(),
  getLicitacaoItensBatch: vi.fn(),
  getLicitacoesEmAndamentoMetrics: vi.fn(),
  getLimiteDispensaComprasServicos: vi.fn(),
  getPortalConfig: vi.fn(),
  getRadarCivicoAlertas: vi.fn(),
}));

describe("licitacoes/loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseLicitacoesContext", () => {
    it("extrai ano válido e identifica se é o ano corrente", () => {
      const currentYear = new Date().getFullYear();
      const ctx = parseLicitacoesContext({ ano: "2024" });
      expect(ctx.selectedYear).toBe(2024);
      expect(ctx.isCurrentYear).toBe(2024 === currentYear);
    });

    it("usa fallback para o ano corrente se não informado ou inválido", () => {
      const currentYear = new Date().getFullYear();
      const ctx = parseLicitacoesContext({});
      expect(ctx.selectedYear).toBe(currentYear);
      expect(ctx.isCurrentYear).toBe(true);

      const ctxInvalido = parseLicitacoesContext({ ano: "invalido" });
      expect(ctxInvalido.selectedYear).toBe(currentYear);
    });

    it("extrai lista de entidades a partir de string separada por vírgula", () => {
      const ctx = parseLicitacoesContext({ entidades: "1,2,3" });
      expect(ctx.entidadesIds).toEqual(["1", "2", "3"]);
    });
  });

  describe("loadLicitacoesData / fetchRawLicitacoesData", () => {
    it("chama getLicitacaoItensBatch com números de licitação filtrados e anexa itensByLicitacao", async () => {
      vi.mocked(dbModule.getPortalConfig).mockResolvedValue({
        portalSlug: "porciuncula_prefeitura",
        nomeMunicipio: "Porciúncula",
      } as unknown as Awaited<ReturnType<typeof dbModule.getPortalConfig>>);

      vi.mocked(dbModule.getEntidades).mockResolvedValue([
        { id: "1", nome: "Prefeitura" },
      ] as unknown as Awaited<ReturnType<typeof dbModule.getEntidades>>);

      vi.mocked(dbModule.getLicitacoesEmAndamentoMetrics).mockResolvedValue([
        { licitacaoNumero: "001/2024", objeto: "Reforma" },
        { licitacaoNumero: "   ", objeto: "Em branco" },
        { licitacaoNumero: "002/2024", objeto: "Material" },
      ] as unknown as Awaited<
        ReturnType<typeof dbModule.getLicitacoesEmAndamentoMetrics>
      >);

      vi.mocked(dbModule.getLicitacaoItensBatch).mockResolvedValue({
        "001/2024": [
          {
            itemId: "item-1",
            descricao: "Tijolo",
          } as unknown as dbModule.LicitacaoItemDTO,
        ],
        "002/2024": [
          {
            itemId: "item-2",
            descricao: "Cimento",
          } as unknown as dbModule.LicitacaoItemDTO,
        ],
      });

      vi.mocked(dbModule.getLicitacaoGapsMetrics).mockResolvedValue([]);
      vi.mocked(dbModule.getAdesaoDeAtaMetrics).mockResolvedValue(
        {} as unknown as Awaited<
          ReturnType<typeof dbModule.getAdesaoDeAtaMetrics>
        >,
      );
      vi.mocked(dbModule.getAdesaoExternaMetrics).mockResolvedValue([]);
      vi.mocked(dbModule.getAnomaliasContratuaisMetrics).mockResolvedValue([]);
      vi.mocked(dbModule.getDistribucaoModalidadesMetrics).mockResolvedValue(
        [],
      );
      vi.mocked(dbModule.getContratosServicosVigentes).mockResolvedValue([]);
      vi.mocked(dbModule.getLimiteDispensaComprasServicos).mockResolvedValue(
        {} as unknown as Awaited<
          ReturnType<typeof dbModule.getLimiteDispensaComprasServicos>
        >,
      );
      vi.mocked(dbModule.getRadarCivicoAlertas).mockResolvedValue([]);

      const data = await loadLicitacoesData("porciuncula_prefeitura", {
        ano: "2024",
      });

      expect(dbModule.getLicitacaoItensBatch).toHaveBeenCalledWith(
        "porciuncula_prefeitura",
        {
          ano: 2024,
          licitacoesNumeros: ["001/2024", "002/2024"],
        },
      );

      expect(data.itensByLicitacao).toEqual({
        "001/2024": [{ itemId: "item-1", descricao: "Tijolo" }],
        "002/2024": [{ itemId: "item-2", descricao: "Cimento" }],
      });
      expect(data.portalSlug).toBe("porciuncula_prefeitura");
    });
  });
});
