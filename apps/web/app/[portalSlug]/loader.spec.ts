import { describe, expect, it, vi } from "vitest";

const { getEntidadesMock, getPosicaoFiscalMetricsMock, notFoundMock } =
  vi.hoisted(() => ({
    getEntidadesMock: vi.fn(),
    getPosicaoFiscalMetricsMock: vi.fn(),
    notFoundMock: vi.fn(() => {
      throw new Error("NEXT_NOT_FOUND");
    }),
  }));

vi.mock("@transparencia/db", () => ({
  getContratosServicosVigentes: vi.fn(),
  getEntidades: getEntidadesMock,
  getExecucaoOrcamentariaMetrics: vi.fn(),
  getFolhaVsServicosMetrics: vi.fn(),
  getFontesReceitaMetrics: vi.fn(),
  getLicitacaoGapsMetrics: vi.fn(),
  getPercentualChefiasEfetivasMetrics: vi.fn(),
  getPortalConfig: vi.fn(),
  getPosicaoFiscalDetalhesMetrics: vi.fn(),
  getPosicaoFiscalMetrics: getPosicaoFiscalMetricsMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

const { loadVisaoGeralData } = await import("./loader");

describe("loadVisaoGeralData", () => {
  it("returns a 404 for an unknown slug without a metrics lookup", async () => {
    getEntidadesMock.mockResolvedValue([]);

    await expect(loadVisaoGeralData("wp-access.php", {})).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );

    expect(notFoundMock).toHaveBeenCalledOnce();
    expect(getPosicaoFiscalMetricsMock).not.toHaveBeenCalled();
  });
});
