import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimits } from "@/lib/rate-limit";
import { GET } from "./route";

vi.mock("@transparencia/db", () => ({
  getContratoByNumero: vi.fn(async (portalSlug, numero, ano) => {
    if (numero === "0043/24" || numero === "ctr-1") {
      return {
        contratoServicoId: "ctr-1",
        portalSlug,
        ano: ano || 2024,
        contratoNumero: "0043/24",
        fornecedorNome: "JUSTINA REGINA R. MONTEIRO",
        fornecedorCnpj: "12345678000190",
        objetoDescricao: "Locação de Imóvel Residencial",
        dataInicio: "2024-01-01",
        vencimentoAtual: "2024-12-31",
        totalEmpenhado: 24000,
        totalLiquidado: 20000,
        totalPago: 18000,
        saldoPendente: 6000,
        percentualPago: 75,
        statusExecucao: "em_execucao",
      };
    }
    return null;
  }),
}));

describe("API GET /api/[portalSlug]/contratos/details", () => {
  beforeEach(() => {
    clearRateLimits();
    vi.clearAllMocks();
  });

  const createReq = (url: string) => {
    return {
      url,
      headers: new Headers({ "x-forwarded-for": "127.0.0.1" }),
    } as unknown as NextRequest;
  };

  it("retorna 400 se o número ou ID não for informado", async () => {
    const req = createReq(
      "http://localhost/api/porciuncula_prefeitura/contratos/details",
    );
    const res = await GET(req, {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("não informado");
  });

  it("retorna 404 se o contrato não for encontrado", async () => {
    const req = createReq(
      "http://localhost/api/porciuncula_prefeitura/contratos/details?numero=9999%2F99",
    );
    const res = await GET(req, {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("não encontrado");
  });

  it("retorna 200 e dados do contrato para número válido", async () => {
    const req = createReq(
      "http://localhost/api/porciuncula_prefeitura/contratos/details?numero=0043%2F24&ano=2024",
    );
    const res = await GET(req, {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.contrato).toBeDefined();
    expect(data.contrato.contratoNumero).toBe("0043/24");
    expect(data.contrato.fornecedorNome).toBe("JUSTINA REGINA R. MONTEIRO");
    expect(data.contrato.totalEmpenhado).toBe(24000);
  });
});
