import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const mockDispatchPushNotification = vi.fn();
const mockGetPortalConfig = vi.fn();
const mockGetRadarCivicoAlertas = vi.fn();

vi.mock("@/lib/push-dispatcher", () => ({
  dispatchPushNotification: (...args: unknown[]) =>
    mockDispatchPushNotification(...args),
}));

vi.mock("@transparencia/db", () => ({
  getPortalConfig: (...args: unknown[]) => mockGetPortalConfig(...args),
  getRadarCivicoAlertas: (...args: unknown[]) =>
    mockGetRadarCivicoAlertas(...args),
}));

vi.mock("@/env", () => ({
  env: {
    INTERNAL_API_SECRET: "test-internal-secret",
    CRON_SECRET: "test-cron-secret",
  },
}));

describe("POST /api/ingestion/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPortalConfig.mockResolvedValue({
      displayName: "Porciúncula",
    });
    mockGetRadarCivicoAlertas.mockResolvedValue([]);
  });

  it("retorna 401 se cabeçalho de autorização estiver ausente", async () => {
    const req = new Request("http://localhost/api/ingestion/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        status: "success",
        timestamp: new Date().toISOString(),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("retorna 401 se token de autorização for inválido", async () => {
    const req = new Request("http://localhost/api/ingestion/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        status: "success",
        timestamp: new Date().toISOString(),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("retorna 400 se o corpo da requisição não for JSON válido", async () => {
    const req = new Request("http://localhost/api/ingestion/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-internal-secret",
      },
      body: "invalid-json-body",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("JSON esperado");
  });

  it("retorna 400 se faltar o campo portalSlug", async () => {
    const req = new Request("http://localhost/api/ingestion/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-internal-secret",
      },
      body: JSON.stringify({
        status: "success",
        timestamp: new Date().toISOString(),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Payload inválido");
  });

  it("retorna 400 se status for 'failure' e errorMessage estiver ausente", async () => {
    const req = new Request("http://localhost/api/ingestion/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-internal-secret",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        status: "failure",
        timestamp: new Date().toISOString(),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Payload inválido");
    expect(data.details.fieldErrors.errorMessage).toBeDefined();
  });

  it("retorna 200 ao receber evento de sucesso com token INTERNAL_API_SECRET", async () => {
    const req = new Request("http://localhost/api/ingestion/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-internal-secret",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        status: "success",
        timestamp: new Date().toISOString(),
        durationMs: 45000,
        recordsProcessed: 1250,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      success: true,
      message: "Ingestion recorded successfully",
    });
    expect(mockDispatchPushNotification).toHaveBeenCalledWith({
      portalSlug: "porciuncula_prefeitura",
      title: expect.stringContaining("MaisTransparencia - Atualização Fiscal"),
      body: expect.stringContaining("Art. 48-A da LC 101/2000 (LRF)"),
      url: "/porciuncula_prefeitura",
      topic: "extracoes",
    });
  });

  it("retorna 200 ao receber evento de sucesso com token CRON_SECRET", async () => {
    const req = new Request("http://localhost/api/ingestion/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-cron-secret",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        status: "success",
        timestamp: new Date().toISOString(),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDispatchPushNotification).toHaveBeenCalled();
  });

  it("retorna 200 mesmo se o disparo de push falhar de forma não-bloqueante", async () => {
    mockDispatchPushNotification.mockRejectedValue(
      new Error("Push service unreachable"),
    );

    const req = new Request("http://localhost/api/ingestion/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-internal-secret",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        status: "success",
        timestamp: new Date().toISOString(),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      success: true,
      message: "Ingestion recorded successfully",
    });
  });

  it("retorna 200 e confirma falha quando status for 'failure' com errorMessage", async () => {
    const req = new Request("http://localhost/api/ingestion/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-internal-secret",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        status: "failure",
        timestamp: new Date().toISOString(),
        errorMessage: "Timeout ao conectar no portal municipal",
        durationMs: 12000,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      success: false,
      message: "Ingestion failure acknowledged",
    });
    expect(mockDispatchPushNotification).not.toHaveBeenCalled();
  });

  it("aceita header de autorização com prefixo 'bearer' em minúsculas e timestamp com offset", async () => {
    const req = new Request("http://localhost/api/ingestion/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "bearer test-internal-secret",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        status: "success",
        timestamp: "2026-09-13T02:20:00+00:00",
        durationMs: 4500,
        recordsProcessed: 120,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("dispara notificação Web Push com alerta crítico e deep link quando houver anomalias de severidade 'critico'", async () => {
    mockGetRadarCivicoAlertas.mockResolvedValueOnce([
      {
        anomaliaId: "crit-anom-1",
        portalSlug: "porciuncula_prefeitura",
        ano: 2025,
        tipoAnomalia: "explosao_comissionados",
        dimensaoReferencia: "comissionados",
        grauSeveridade: "critico",
        desvioPercentual: 65,
        valorObservado: 165,
        valorEsperado: 100,
        mesInicial: 1,
        mesFinal: 12,
        licitacaoNumero: null,
        metodoDeteccao: "iqr_estoque",
      },
    ]);

    const req = new Request("http://localhost/api/ingestion/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-internal-secret",
      },
      body: JSON.stringify({
        portalSlug: "porciuncula_prefeitura",
        status: "success",
        timestamp: new Date().toISOString(),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockGetRadarCivicoAlertas).toHaveBeenCalledWith(
      "porciuncula_prefeitura",
      {
        ano: new Date().getFullYear(),
        severidadeMinima: "critico",
      },
    );
    expect(mockDispatchPushNotification).toHaveBeenCalledWith({
      portalSlug: "porciuncula_prefeitura",
      title: expect.stringContaining("Alerta Crítico - Radar Cívico"),
      body: expect.stringContaining("cargos comissionados"),
      url: "/porciuncula_prefeitura/pessoal?ano=2025#comissionados",
    });
  });
});
