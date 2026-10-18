import { describe, expect, it, vi } from "vitest";

const {
  getEntidadesMock,
  getObrasPorPortalMock,
  getPosicaoFiscalMetricsMock,
  getRadarCivicoAlertasMock,
  getResumoEducacaoMock,
  getResumoObrasPorPortalMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getEntidadesMock: vi.fn(),
  getObrasPorPortalMock: vi.fn(),
  getPosicaoFiscalMetricsMock: vi.fn(),
  getRadarCivicoAlertasMock: vi.fn(),
  getResumoEducacaoMock: vi.fn(),
  getResumoObrasPorPortalMock: vi.fn(),
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
  getObrasPorPortal: getObrasPorPortalMock,
  getResumoObrasPorPortal: getResumoObrasPorPortalMock,
  getResumoEducacao: getResumoEducacaoMock,
  getLicitacoesEmAndamentoMetrics: vi.fn().mockResolvedValue([]),
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

  it("loads obras summary and obras preview with portal slug, year, and limit", async () => {
    getEntidadesMock.mockResolvedValue([{ id: "empresa-1" }]);
    getPosicaoFiscalMetricsMock.mockResolvedValue(null);
    const mockResumoObras = {
      totalObras: 4,
      emExecucao: 2,
      paralisadas: 1,
      concluidas: 1,
      cadastradas: 0,
      canceladas: 0,
      valorTotalInvestimento: 10000000,
      valorEmExecucao: 6000000,
      valorParalisadas: 3000000,
      valorConcluidas: 1000000,
      valorCadastradas: 0,
      percentualMedioExecucaoFisica: 50,
      obrasSemMedicaoCount: 0,
    };
    const mockObrasPreview = [
      {
        idProjeto: "1",
        numeroControleObrasgov: "101",
        ano: 2024,
        titulo: "Construção de Escola",
        situacao: "em_execucao",
        valorTotalInvestimento: 1000000,
        latitude: -20.963,
        longitude: -42.04,
      },
    ];
    getResumoObrasPorPortalMock.mockResolvedValue(mockResumoObras);
    getObrasPorPortalMock.mockResolvedValue(mockObrasPreview);

    const result = await loadVisaoGeralData("porciuncula", { ano: "2024" });

    expect(getResumoObrasPorPortalMock).toHaveBeenCalledWith("porciuncula", {
      ano: 2024,
    });
    expect(getObrasPorPortalMock).toHaveBeenCalledWith("porciuncula", {
      ano: 2024,
      limite: 25,
    });
    expect(result.resumoObras).toEqual(mockResumoObras);
    expect(result.obrasPreview).toEqual(mockObrasPreview);
  });

  it("loads education summary in parallel by portal slug", async () => {
    getEntidadesMock.mockResolvedValue([{ id: "empresa-1" }]);
    getPosicaoFiscalMetricsMock.mockResolvedValue(null);
    const mockResumoEducacao = { portalSlug: "porciuncula", ano: 2023 };
    getResumoEducacaoMock.mockResolvedValue(mockResumoEducacao);

    const result = await loadVisaoGeralData("porciuncula", { ano: "2024" });

    expect(getResumoEducacaoMock).toHaveBeenCalledWith("porciuncula", 2024);
    expect(result.resumoEducacao).toEqual(mockResumoEducacao);
  });

  it("propaga resumoEducacao nulo quando não há dados educacionais", async () => {
    getEntidadesMock.mockResolvedValue([{ id: "empresa-1" }]);
    getPosicaoFiscalMetricsMock.mockResolvedValue(null);
    getResumoEducacaoMock.mockResolvedValue(null);

    const result = await loadVisaoGeralData("porciuncula", { ano: "2024" });

    expect(result.resumoEducacao).toBeNull();
  });
});
