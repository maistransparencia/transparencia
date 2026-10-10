import { describe, expect, it, vi } from "vitest";

vi.mock("@transparencia/db", () => ({
  getAllPortais: vi.fn().mockResolvedValue([
    {
      portalSlug: "porciuncula_prefeitura",
      displayName: "Prefeitura de Porciúncula",
      uf: "RJ",
      brasaoAsset: "brasao-porciuncula.png",
    },
    {
      portalSlug: "natividade_prefeitura",
      displayName: "Prefeitura de Natividade",
      uf: "RJ",
      brasaoAsset: "brasao-natividade.png",
    },
  ]),
  getPortalConfig: vi.fn().mockResolvedValue({
    displayName: "Prefeitura de Porciúncula",
    uf: "RJ",
    brasaoAsset: "brasao-porciuncula.png",
  }),
  getEntidades: vi.fn().mockResolvedValue([{ id: "1", nome: "Prefeitura" }]),
  getPosicaoFiscalMetrics: vi.fn().mockResolvedValue({
    totalArrecadado: 40_000_000,
    despesasPagas: 35_000_000,
    saldoEstimado: 5_000_000,
  }),
  getLimiteMaximoLrfPessoal: vi.fn().mockResolvedValue(54),
  getAnaliseDespesasMetrics: vi
    .fn()
    .mockResolvedValue([{ totalPago: 35_000_000, totalEmpenhado: 38_000_000 }]),
  getOpacidadeContabilMetrics: vi.fn().mockResolvedValue({
    exercicioAtual: {
      taxaValorOpacidadePct: 12.5,
      pagoResidual99: 4_500_000,
    },
  }),
  getRadarGastosSensiveisMetrics: vi.fn().mockResolvedValue({
    itens: [{ categoria: "combustivel_frota", valorPagoAnoAtual: 1_200_000 }],
  }),
  getDistribucaoModalidadesMetrics: vi.fn().mockResolvedValue([
    {
      modalidade: "pregao_eletronico",
      valorTotal: 10_000_000,
      quantidade: 45,
    },
  ]),
  getContratosServicosVigentes: vi
    .fn()
    .mockResolvedValue([{ totalPago: 500_000 }, { totalPago: 300_000 }]),
  getHistoriaSaudeMetrics: vi.fn().mockResolvedValue({
    dotacaoTotal: 12_000_000,
    totalPago: 11_000_000,
    medicamentosInsumosPago: 5_000_000,
    emendasSaudeArrecadado: 1_500_000,
  }),
  getSaudeEmendasMetrics: vi.fn().mockResolvedValue({
    totalAutorizado: 1_500_000,
    totalEmpenhado: 1_200_000,
    taxaEmpenho: 80,
    maiorEmenda: 500_000,
    lista: [],
  }),
  getFontesReceitaMetrics: vi.fn().mockResolvedValue({
    totalArrecadado: 40_000_000,
    receitaPropriaArrecadado: 8_000_000,
    transferenciasUniaoArrecadado: 22_000_000,
    transferenciasEstadoArrecadado: 10_000_000,
  }),
  getExecucaoOrcamentariaMetrics: vi.fn().mockResolvedValue([
    {
      totalDotacaoAtualizada: 50_000_000,
      totalEmpenhado: 45_000_000,
      totalPago: 40_000_000,
    },
  ]),
  getFolhaVsServicosMetrics: vi
    .fn()
    .mockResolvedValue([
      { totalFolha: 20_000_000, totalPago: 19_000_000, percentualFolha: 48.5 },
    ]),
  getPercentualChefiasEfetivasMetrics: vi.fn().mockResolvedValue(75.0),
  getHistoriaCapremMetrics: vi.fn().mockResolvedValue({
    totalPago: 8_000_000,
    totalAporteQuitado: 9_000_000,
    totalPagoPatronal: 2_000_000,
    servidoresEfetivos: 120,
  }),
  getRadarCivicoAlertas: vi.fn().mockResolvedValue([]),
}));

// Mock ImageResponse from next/og as a class constructor
vi.mock("next/og", () => {
  return {
    ImageResponse: class MockImageResponse {
      jsx: unknown;
      options: unknown;
      constructor(jsx: unknown, options: unknown) {
        this.jsx = jsx;
        this.options = options;
      }
    },
  };
});

const mockCaptureException = vi.fn();
vi.mock("@/posthog-server", () => ({
  getPostHogServer: vi.fn(() => ({
    captureException: mockCaptureException,
  })),
}));

type MockResponse = {
  jsx: {
    props: {
      cities?: unknown[];
      brasaoAsset?: string;
    };
  };
  options: unknown;
};

describe("OpenGraph Image Route Handlers", () => {
  const params = Promise.resolve({ portalSlug: "porciuncula_prefeitura" });

  it("gera o card da Página Inicial (Landing Page)", async () => {
    const { default: generateImage } = await import(
      "../../app/opengraph-image"
    );
    const response = await generateImage();
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
    expect(response).toHaveProperty("options");
    expect((response as unknown as MockResponse).jsx.props.cities).toHaveLength(
      2,
    );
  });

  it("captura exceção no PostHog e retorna card fallback na Página Inicial quando getAllPortais rejeita", async () => {
    const { getAllPortais } = await import("@transparencia/db");
    vi.mocked(getAllPortais).mockRejectedValueOnce(
      new Error("DB Connection Error"),
    );

    const { default: generateImage } = await import(
      "../../app/opengraph-image"
    );
    const response = await generateImage();
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
    expect(
      (response as unknown as MockResponse).jsx.props.cities,
    ).toBeUndefined();
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      undefined,
      expect.objectContaining({
        route: "og:landing",
      }),
    );
  });

  it("gera o card da Visão Geral (Homepage)", async () => {
    const { default: generateImage } = await import(
      "../../app/[portalSlug]/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
    expect(response).toHaveProperty("options");
    expect((response as unknown as MockResponse).jsx.props.brasaoAsset).toBe(
      "brasao-porciuncula.png",
    );
  });

  it("gera o card de Despesas", async () => {
    const { default: generateImage } = await import(
      "../../app/[portalSlug]/despesas/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
    expect((response as unknown as MockResponse).jsx.props.brasaoAsset).toBe(
      "brasao-porciuncula.png",
    );
  });

  it("gera o card de Licitações", async () => {
    const { default: generateImage } = await import(
      "../../app/[portalSlug]/licitacoes/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
  });

  it("gera o card de Saúde", async () => {
    const { default: generateImage } = await import(
      "../../app/[portalSlug]/saude/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
  });

  it("gera o card de Receitas", async () => {
    const { default: generateImage } = await import(
      "../../app/[portalSlug]/receitas/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
  });

  it("gera o card de Orçamento", async () => {
    const { default: generateImage } = await import(
      "../../app/[portalSlug]/orcamento/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
  });

  it("gera o card de Pessoal", async () => {
    const { default: generateImage } = await import(
      "../../app/[portalSlug]/pessoal/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
  });

  it("gera o card do CAPREM", async () => {
    const { default: generateImage } = await import(
      "../../app/[portalSlug]/caprem/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
  });

  it("gera o card da Previdência (/previdencia)", async () => {
    const { default: generateImage } = await import(
      "../../app/[portalSlug]/previdencia/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
  });

  it("gera o card do Radar Cívico com anomalias críticas destacadas", async () => {
    const { getRadarCivicoAlertas } = await import("@transparencia/db");
    vi.mocked(getRadarCivicoAlertas).mockResolvedValueOnce([
      {
        anomaliaId: "crit-1",
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        tipoAnomalia: "explosao_comissionados",
        grauSeveridade: "critico",
        desvioPercentual: 50,
      } as any,
    ]);

    const { default: generateImage } = await import(
      "../../app/[portalSlug]/radar/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
  });

  it("gera o card do Radar Cívico sem anomalias críticas (estado normal)", async () => {
    const { getRadarCivicoAlertas } = await import("@transparencia/db");
    vi.mocked(getRadarCivicoAlertas).mockResolvedValueOnce([
      {
        anomaliaId: "mod-1",
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        tipoAnomalia: "concentracao_dispensa",
        grauSeveridade: "moderado",
        desvioPercentual: 15,
      } as any,
    ]);

    const { default: generateImage } = await import(
      "../../app/[portalSlug]/radar/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
  });

  it("executa as queries da Visão Geral uma por vez (sem esgotar o pool)", async () => {
    const db = await import("@transparencia/db");
    let queriesEmAndamento = 0;
    let maximoQueriesSimultaneas = 0;
    const rastrearConcorrencia = async <T,>(resultado: T): Promise<T> => {
      queriesEmAndamento += 1;
      maximoQueriesSimultaneas = Math.max(
        maximoQueriesSimultaneas,
        queriesEmAndamento,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      queriesEmAndamento -= 1;
      return resultado;
    };
    vi.mocked(db.getPortalConfig).mockImplementationOnce(() =>
      rastrearConcorrencia({ displayName: "Prefeitura", uf: "RJ" } as any),
    );
    vi.mocked(db.getEntidades).mockImplementationOnce(() =>
      rastrearConcorrencia([{ id: "1", nome: "Prefeitura" }] as any),
    );
    vi.mocked(db.getPosicaoFiscalMetrics).mockImplementationOnce(() =>
      rastrearConcorrencia(null as any),
    );
    vi.mocked(db.getExecucaoOrcamentariaMetrics).mockImplementationOnce(() =>
      rastrearConcorrencia([] as any),
    );
    vi.mocked(db.getFolhaVsServicosMetrics).mockImplementationOnce(() =>
      rastrearConcorrencia([] as any),
    );
    vi.mocked(db.getLimiteMaximoLrfPessoal).mockImplementationOnce(() =>
      rastrearConcorrencia(54 as any),
    );

    const { default: generateImage } = await import(
      "../../app/[portalSlug]/opengraph-image"
    );
    await generateImage({ params });
    expect(maximoQueriesSimultaneas).toBe(1);
  });

  it("captura exceção no PostHog e retorna card fallback quando ocorre erro", async () => {
    const { getPortalConfig } = await import("@transparencia/db");
    vi.mocked(getPortalConfig).mockRejectedValueOnce(
      new Error("DB Connection Error"),
    );

    const { default: generateImage } = await import(
      "../../app/[portalSlug]/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      undefined,
      expect.objectContaining({
        portalSlug: "porciuncula_prefeitura",
        route: "og:homepage",
      }),
    );
  });
});
