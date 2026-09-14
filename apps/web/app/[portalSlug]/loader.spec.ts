import { describe, expect, it, vi } from "vitest";

const {
  getEntidadesMock,
  getPosicaoFiscalMetricsMock,
  getRadarCivicoAlertasMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getEntidadesMock: vi.fn(),
  getPosicaoFiscalMetricsMock: vi.fn(),
  getRadarCivicoAlertasMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@transparencia/db", () => ({
  getContratosServicosVigentes: vi.fn().mockResolvedValue([]),
  getEntidades: getEntidadesMock,
  getExecucaoOrcamentariaMetrics: vi.fn().mockResolvedValue([]),
  getFolhaVsServicosMetrics: vi.fn().mockResolvedValue([]),
  getFontesReceitaMetrics: vi.fn().mockResolvedValue(null),
  getLicitacaoGapsMetrics: vi.fn().mockResolvedValue([]),
  getPercentualChefiasEfetivasMetrics: vi.fn().mockResolvedValue(null),
  getPortalConfig: vi.fn().mockResolvedValue(null),
  getPosicaoFiscalDetalhesMetrics: vi.fn().mockResolvedValue({
    restosPendentes: [],
    restosPendentesTotal: 0,
    restosPendentesAnteriores: 0,
    totalCredoresAdmAtual: 0,
  }),
  getPosicaoFiscalMetrics: getPosicaoFiscalMetricsMock,
  getLimiteMaximoLrfPessoal: vi.fn().mockResolvedValue(null),
  getSiconfiPosicaoFinanceira: vi.fn().mockResolvedValue(null),
  getRadarCivicoAlertas: getRadarCivicoAlertasMock,
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

  it("loads radar civic alerts with year and limit for a valid portal", async () => {
    getEntidadesMock.mockResolvedValue([{ id: "empresa-1" }]);
    getPosicaoFiscalMetricsMock.mockResolvedValue(null);
    const mockAlertas = [
      {
        id: "alerta-1",
        codigoRegra: "alerta_gastos_comissionados",
        tipoAnomalia: "comissionados_vs_efetivos",
        titulo: "Disparidade Salarial",
        descricaoFactual: "Narrativa factual",
        severidade: "critico",
        metodologia: "comparacao_homologa",
        metricaNome: "razao",
        metricaValorReferencia: 1,
        metricaValorObservado: 2,
        unidadeMedida: "razao",
        contexto: {},
        ctaUrl: "/pessoal",
        ano: 2024,
        mesInicio: 1,
        mesFim: 6,
      },
    ];
    getRadarCivicoAlertasMock.mockResolvedValue(mockAlertas);

    const result = await loadVisaoGeralData("porciuncula", { ano: "2024" });

    expect(getRadarCivicoAlertasMock).toHaveBeenCalledWith("porciuncula", {
      ano: 2024,
      limite: 6,
    });
    expect(result.radarAlertas).toEqual(mockAlertas);
  });
});
