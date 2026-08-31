import { beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchRadarDigest } from "./radar-digest";

const mockSubscribers = [
  {
    id: "sub-1",
    portalSlug: "porciuncula_prefeitura",
    email: "cidadao1@exemplo.com",
    status: "confirmado" as const,
    tokenConfirmacao: "token-conf-1",
    tokenCancelamento: "token-unsub-1",
    createdAt: new Date(),
    confirmedAt: new Date(),
    unsubscribedAt: null,
    resendContactId: null,
  },
  {
    id: "sub-2",
    portalSlug: "porciuncula_prefeitura",
    email: "cidadao2@exemplo.com",
    status: "confirmado" as const,
    tokenConfirmacao: "token-conf-2",
    tokenCancelamento: "token-unsub-2",
    createdAt: new Date(),
    confirmedAt: new Date(),
    unsubscribedAt: null,
    resendContactId: null,
  },
];

const mockMetrics = {
  portalSlug: "porciuncula_prefeitura",
  ano: 2025,
  posicaoFiscal: {
    totalArrecadado: 50000000,
    despesasPagas: 42000000,
    restosPagosNoAno: 1500000,
    saldoEstimado: 8000000,
  },
  opacidade: {
    taxaValorOpacidadePct: 15.0,
    classificacaoRisco: "atencao" as const,
    pagoResidual99: 6300000,
    pagoDesvioSensivel99: 2000000,
    totalPago: 42000000,
  },
  destaquesContratos: [
    {
      fornecedorNome: "Construtora Alfa",
      objetoDescricao: "Pavimentação",
      totalPago: 1000000,
      statusExecucao: "em_execucao",
    },
  ],
  destaquesCredoresOpacidade: [
    {
      credorNome: "Empresa Limpeza",
      totalPago: 2000000,
      categoriaPredominante: "limpeza_residuos",
    },
  ],
};

const sendMock = vi.fn();

vi.mock("@transparencia/db", () => ({
  getConfirmedNewsletterSubscribers: vi.fn(async (slug: string) => {
    if (slug === "empty_portal") return [];
    return mockSubscribers;
  }),
  getPortalConfig: vi.fn(async (slug: string) => ({
    portalSlug: slug,
    displayName: "Porciúncula",
    uf: "RJ",
    cidadeClean: "Porciuncula",
  })),
  getRadarDigestMetrics: vi.fn(async (slug: string, ano: number) => {
    if (slug === "no_metrics_portal") return null;
    return { ...mockMetrics, portalSlug: slug, ano };
  }),
}));

vi.mock("./resend", () => ({
  resend: {
    emails: {
      send: (...args: unknown[]) => sendMock(...args),
    },
  },
}));

describe("dispatchRadarDigest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar sentCount: 0 quando não houver assinantes confirmados", async () => {
    const result = await dispatchRadarDigest({
      portalSlug: "empty_portal",
      ano: 2025,
      baseUrl: "https://transparencia.porciuncula.rj.gov.br",
    });

    expect(result.success).toBe(true);
    expect(result.totalSubscribers).toBe(0);
    expect(result.sentCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("deve executar em modo dryRun sem invocar API externa", async () => {
    const result = await dispatchRadarDigest({
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      dryRun: true,
      baseUrl: "https://transparencia.porciuncula.rj.gov.br",
    });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.totalSubscribers).toBe(2);
    expect(result.sentCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("deve despachar e-mails reais via Resend com headers RFC 8058 e unsubscribe individual", async () => {
    sendMock.mockResolvedValue({ data: { id: "resend-msg-123" }, error: null });

    const result = await dispatchRadarDigest({
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      dryRun: false,
      baseUrl: "https://transparencia.porciuncula.rj.gov.br",
    });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.totalSubscribers).toBe(2);
    expect(result.sentCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(sendMock).toHaveBeenCalledTimes(2);

    const firstCallArgs = sendMock.mock.calls[0][0];
    expect(firstCallArgs.to).toEqual(["cidadao1@exemplo.com"]);
    expect(firstCallArgs.subject).toContain("Radar Porciúncula");
    expect(firstCallArgs.headers["List-Unsubscribe"]).toBe(
      "<https://transparencia.porciuncula.rj.gov.br/api/newsletter/unsubscribe?token=token-unsub-1>",
    );
    expect(firstCallArgs.headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
  });

  it("deve isolar falhas de envio por destinatário sem abortar o lote", async () => {
    sendMock
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Resend rate limit exceeded" },
      })
      .mockResolvedValueOnce({
        data: { id: "resend-msg-2" },
        error: null,
      });

    const result = await dispatchRadarDigest({
      portalSlug: "porciuncula_prefeitura",
      ano: 2025,
      dryRun: false,
      baseUrl: "https://transparencia.porciuncula.rj.gov.br",
    });

    expect(result.totalSubscribers).toBe(2);
    expect(result.sentCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].email).toBe("cidadao1@exemplo.com");
    expect(result.errors[0].error).toContain("Resend rate limit exceeded");
  });

  it("deve falhar se não encontrar métricas para o portal", async () => {
    const result = await dispatchRadarDigest({
      portalSlug: "no_metrics_portal",
      ano: 2025,
      baseUrl: "https://transparencia.porciuncula.rj.gov.br",
    });

    expect(result.success).toBe(false);
    expect(result.errors[0].error).toContain(
      "Métricas do radar não encontradas",
    );
  });
});
