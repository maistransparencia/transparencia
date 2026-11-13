import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getAnaliseDespesasMetrics: vi.fn(),
  getDespesasPorFuncaoMetrics: vi.fn(),
  getEntidades: vi.fn(),
  getFrescorFontes: vi.fn(),
  getOpacidadeContabilMetrics: vi.fn(),
  getPortalConfig: vi.fn(),
  getPosicaoFiscalDetalhesMetrics: vi.fn(),
  getRadarGastosSensiveisMetrics: vi.fn(),
  getRestosAPagarHistoricoMetrics: vi.fn(),
  getRestosAPagarResumoMetrics: vi.fn(),
  getTopFornecedoresExecucaoMetrics: vi.fn(),
}));

vi.mock("@transparencia/db", () => dbMocks);

const { loadDespesasData } = await import("./loader");

describe("loadDespesasData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getEntidades.mockResolvedValue([{ id: "e1" }, { id: "e2" }]);
    dbMocks.getFrescorFontes.mockResolvedValue([]);
    dbMocks.getAnaliseDespesasMetrics.mockResolvedValue([]);
    dbMocks.getRadarGastosSensiveisMetrics.mockResolvedValue({ itens: [] });
    dbMocks.getRestosAPagarResumoMetrics.mockResolvedValue({});
    dbMocks.getRestosAPagarHistoricoMetrics.mockResolvedValue([
      { ano: 2024, restosInscritos: 10, restosPagos: 4, saldoRestos: 6 },
    ]);
    dbMocks.getPosicaoFiscalDetalhesMetrics.mockResolvedValue({
      restosPendentes: [],
      restosPendentesTotal: 0,
    });
    dbMocks.getOpacidadeContabilMetrics.mockResolvedValue(null);
    dbMocks.getPortalConfig.mockResolvedValue(null);
    dbMocks.getDespesasPorFuncaoMetrics.mockResolvedValue([
      { funcaoCodigo: "10" },
    ]);
    dbMocks.getTopFornecedoresExecucaoMetrics.mockResolvedValue([
      { fornecedorNome: "Fornecedor" },
    ]);
  });

  it("consulta áreas e fornecedores com tenant, ano e entidades corretos", async () => {
    const resultado = await loadDespesasData("portal_x", { ano: "2024" });

    expect(dbMocks.getDespesasPorFuncaoMetrics).toHaveBeenCalledWith(
      "portal_x",
      2024,
      ["e1", "e2"],
    );
    expect(dbMocks.getTopFornecedoresExecucaoMetrics).toHaveBeenCalledWith({
      portalSlug: "portal_x",
      year: 2024,
      empresaIds: ["e1", "e2"],
      limit: 10,
    });
    expect(dbMocks.getRestosAPagarHistoricoMetrics).toHaveBeenCalledWith(
      "portal_x",
      2024,
      ["e1", "e2"],
    );
    expect(resultado.restosHistorico).toEqual([
      { ano: 2024, restosInscritos: 10, restosPagos: 4, saldoRestos: 6 },
    ]);
    expect(resultado.areasPorFuncao).toEqual([{ funcaoCodigo: "10" }]);
    expect(resultado.topFornecedores).toEqual([
      { fornecedorNome: "Fornecedor" },
    ]);
  });
});
