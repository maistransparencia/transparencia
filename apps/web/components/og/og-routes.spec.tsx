import { describe, expect, it, vi } from "vitest";

vi.mock("@transparencia/db", () => ({
  getPortalConfig: vi.fn().mockResolvedValue({
    displayName: "Prefeitura de Porciúncula",
    uf: "RJ",
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

describe("OpenGraph Image Route Handlers", () => {
  const params = Promise.resolve({ portalSlug: "porciuncula_prefeitura" });

  it("gera o card da Visão Geral (Homepage)", async () => {
    const { default: generateImage } = await import(
      "../../app/[portalSlug]/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
    expect(response).toHaveProperty("options");
  });

  it("gera o card de Despesas", async () => {
    const { default: generateImage } = await import(
      "../../app/[portalSlug]/despesas/opengraph-image"
    );
    const response = await generateImage({ params });
    expect(response).toBeDefined();
    expect(response).toHaveProperty("jsx");
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
