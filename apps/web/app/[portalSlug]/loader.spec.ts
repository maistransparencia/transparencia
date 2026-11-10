import { describe, expect, it, vi } from "vitest";

const {
  getEntidadesMock,
  getObrasPorPortalMock,
  getPosicaoFiscalMetricsMock,
  getRadarCivicoAlertasMock,
  getResumoEducacaoMock,
  getFarmaciaSentinelasMock,
  getResumoFarmaciaSusMock,
  getResumoObrasPorPortalMock,
  getSaudeMinimoConstitucionalMock,
  getEducacaoSiopeMock,
  getDecimoTerceiroHomeMock,
  calcularSituacaoHomeMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getEntidadesMock: vi.fn(),
  getObrasPorPortalMock: vi.fn(),
  getPosicaoFiscalMetricsMock: vi.fn(),
  getRadarCivicoAlertasMock: vi.fn(),
  getResumoEducacaoMock: vi.fn(),
  getFarmaciaSentinelasMock: vi.fn(),
  getResumoFarmaciaSusMock: vi.fn().mockResolvedValue(null),
  getResumoObrasPorPortalMock: vi.fn(),
  getSaudeMinimoConstitucionalMock: vi.fn().mockResolvedValue(null),
  getEducacaoSiopeMock: vi.fn().mockResolvedValue(null),
  getDecimoTerceiroHomeMock: vi.fn().mockResolvedValue(null),
  calcularSituacaoHomeMock: vi.fn().mockReturnValue({ sentinela: true }),
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
  getFarmaciaSentinelas: getFarmaciaSentinelasMock,
  getResumoFarmaciaSus: getResumoFarmaciaSusMock,
  getLicitacoesEmAndamentoMetrics: vi.fn().mockResolvedValue([]),
  getSaudeMinimoConstitucional: getSaudeMinimoConstitucionalMock,
  getEducacaoSiope: getEducacaoSiopeMock,
  getDecimoTerceiroHome: getDecimoTerceiroHomeMock,
  calcularSituacaoHome: calcularSituacaoHomeMock,
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

  it("propaga resumoFarmacia consultado com o tenant", async () => {
    getEntidadesMock.mockResolvedValue([{ id: "empresa-1" }]);
    getPosicaoFiscalMetricsMock.mockResolvedValue(null);
    getRadarCivicoAlertasMock.mockResolvedValue([]);
    const resumoFarmacia = {
      status: "apagao",
      diasDesdePosicaoMaisRecente: 20,
    };
    getResumoFarmaciaSusMock.mockResolvedValue(resumoFarmacia);

    const result = await loadVisaoGeralData("porciuncula", {});

    expect(getResumoFarmaciaSusMock).toHaveBeenCalledWith("porciuncula");
    expect(result.resumoFarmacia).toEqual(resumoFarmacia);
  });

  it("isola a falha de getResumoFarmaciaSus como indisponivel", async () => {
    getEntidadesMock.mockResolvedValue([{ id: "empresa-1" }]);
    getPosicaoFiscalMetricsMock.mockResolvedValue(null);
    getRadarCivicoAlertasMock.mockResolvedValue([]);
    getResumoFarmaciaSusMock.mockRejectedValue(new Error("falha"));

    const result = await loadVisaoGeralData("porciuncula", {});

    expect(result.resumoFarmacia).toEqual({
      status: "indisponivel",
      dataColeta: null,
      dataPosicaoMaisRecente: null,
      diasDesdePosicaoMaisRecente: null,
    });
  });

  describe("sentinelasFarmacia", () => {
    const preparar = () => {
      getEntidadesMock.mockResolvedValue([{ id: "empresa-1" }]);
      getPosicaoFiscalMetricsMock.mockResolvedValue(null);
      getRadarCivicoAlertasMock.mockResolvedValue([]);
      getFarmaciaSentinelasMock.mockReset();
    };

    it("consulta as sentinelas quando o status e conforme", async () => {
      preparar();
      const sentinelas = { totalUnidadesAtivas: 2, sentinelas: [] };
      getResumoFarmaciaSusMock.mockResolvedValue({ status: "conforme" });
      getFarmaciaSentinelasMock.mockResolvedValue(sentinelas);

      const result = await loadVisaoGeralData("porciuncula", {});

      expect(getFarmaciaSentinelasMock).toHaveBeenCalledWith("porciuncula");
      expect(result.sentinelasFarmacia).toEqual(sentinelas);
    });

    it("nao consulta as sentinelas fora de conforme", async () => {
      preparar();
      getResumoFarmaciaSusMock.mockResolvedValue({ status: "apagao" });

      const result = await loadVisaoGeralData("porciuncula", {});

      expect(getFarmaciaSentinelasMock).not.toHaveBeenCalled();
      expect(result.sentinelasFarmacia.sentinelas).toEqual([]);
    });

    it("isola a falha das sentinelas como resultado vazio", async () => {
      preparar();
      getResumoFarmaciaSusMock.mockResolvedValue({ status: "conforme" });
      getFarmaciaSentinelasMock.mockRejectedValue(new Error("falha"));

      const result = await loadVisaoGeralData("porciuncula", {});

      expect(result.sentinelasFarmacia.totalUnidadesAtivas).toBe(0);
      expect(result.sentinelasFarmacia.sentinelas).toEqual([]);
      expect(result.resumoFarmacia).toEqual({ status: "conforme" });
    });
  });

  describe("contrato de situação da home", () => {
    const minimoSaude = {
      limite: 15,
      percentualAplicado: 18.2,
      resultado: "cumpriu",
      comparavel: true,
      mesesCobertos: null,
      baseLegal: "LC 141/2012",
      urlBaseLegal: "https://example.test/lc141",
    };
    const minimoEducacao = {
      limite: 25,
      percentualAplicado: 27.1,
      resultado: "cumpriu",
      baseLegal: "CF/88 Art. 212",
      urlBaseLegal: "https://example.test/cf212",
    };

    it("traz o 13º da camada de dados para o ano ativo", async () => {
      const decimoTerceiro = { pago: 10, percentual_pago: 0.5 };
      getEntidadesMock.mockResolvedValue([{ id: "empresa-1" }]);
      getPosicaoFiscalMetricsMock.mockResolvedValue(null);
      getDecimoTerceiroHomeMock.mockResolvedValue(decimoTerceiro);

      const result = await loadVisaoGeralData("porciuncula", { ano: "2020" });

      expect(getDecimoTerceiroHomeMock).toHaveBeenCalledWith(
        "porciuncula",
        2020,
        { empresaIds: expect.anything() },
      );
      expect(result.decimoTerceiro).toBe(decimoTerceiro);
      getDecimoTerceiroHomeMock.mockResolvedValue(null);
    });

    it("traz os mínimos das mesmas queries das páginas internas, sem recalcular", async () => {
      getEntidadesMock.mockResolvedValue([{ id: "empresa-1" }]);
      getPosicaoFiscalMetricsMock.mockResolvedValue(null);
      getSaudeMinimoConstitucionalMock.mockResolvedValue({
        minimo: minimoSaude,
      });
      getEducacaoSiopeMock.mockResolvedValue({
        minimos: { mde: minimoEducacao },
      });

      const result = await loadVisaoGeralData("porciuncula", { ano: "2020" });

      expect(getSaudeMinimoConstitucionalMock).toHaveBeenCalledWith(
        expect.objectContaining({ portalSlug: "porciuncula", ano: 2020 }),
      );
      expect(getEducacaoSiopeMock).toHaveBeenCalledWith({
        portalSlug: "porciuncula",
        ano: 2020,
      });
      expect(result.minimoSaude).toBe(minimoSaude);
      expect(result.minimoEducacao).toBe(minimoEducacao);
      expect(calcularSituacaoHomeMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          anoFechado: true,
          minimoSaude,
          minimoEducacao,
        }),
      );
      expect(result.situacaoHome).toEqual({ sentinela: true });
    });

    it("não derruba a página quando uma fonte falha: área indisponível", async () => {
      getEntidadesMock.mockResolvedValue([{ id: "empresa-1" }]);
      getPosicaoFiscalMetricsMock.mockResolvedValue(null);
      getSaudeMinimoConstitucionalMock.mockRejectedValue(new Error("falhou"));
      getEducacaoSiopeMock.mockRejectedValue(new Error("falhou"));

      const result = await loadVisaoGeralData("porciuncula", { ano: "2020" });

      expect(result.minimoSaude).toBeNull();
      expect(result.minimoEducacao).toBeNull();
      expect(calcularSituacaoHomeMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ minimoSaude: null, minimoEducacao: null }),
      );
    });

    it("trata o ano corrente como não fechado", async () => {
      getEntidadesMock.mockResolvedValue([{ id: "empresa-1" }]);
      getPosicaoFiscalMetricsMock.mockResolvedValue(null);
      getSaudeMinimoConstitucionalMock.mockResolvedValue(null);
      getEducacaoSiopeMock.mockResolvedValue(null);

      await loadVisaoGeralData("porciuncula", {});

      expect(calcularSituacaoHomeMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ anoFechado: false }),
      );
    });
  });
});
