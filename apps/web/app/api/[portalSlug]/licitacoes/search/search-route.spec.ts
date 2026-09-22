import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimits } from "@/lib/rate-limit";
import { GET } from "./route";

vi.mock("@transparencia/db", () => ({
  searchLicitacoesEContratos: vi.fn(async ({ termo, ano }) => {
    if (termo === "0043/24") {
      return {
        licitacoes: [
          {
            id: "lic-1",
            tipo: "licitacao",
            numero: "0043/24",
            objeto: "Locação de veículos escolares",
            fornecedorNome: null,
            valor: 150000,
            status: "em_andamento",
            modalidade: "Pregão Eletrônico",
            ano: ano || 2024,
            portalSlug: "porciuncula_prefeitura",
            href: "/porciuncula_prefeitura/licitacoes?ano=2024&numero=0043%2F24#licitacoes-em-andamento",
          },
        ],
        contratos: [
          {
            id: "ctr-1",
            tipo: "contrato",
            numero: "0043/24",
            objeto: "Locação de Imóvel Residencial",
            fornecedorNome: "JUSTINA REGINA R. MONTEIRO",
            valor: 24000,
            status: "vigente",
            modalidade: "Dispensa",
            ano: ano || 2024,
            portalSlug: "porciuncula_prefeitura",
            href: "/porciuncula_prefeitura/licitacoes?ano=2024&numero=0043%2F24#contratos-servicos-vigentes",
          },
        ],
        total: 2,
      };
    }
    return {
      licitacoes: [],
      contratos: [],
      total: 0,
    };
  }),
}));

describe("API /api/[portalSlug]/licitacoes/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimits();
  });

  it("deve retornar vazio se o termo tiver menos de 2 caracteres sem chamar o banco", async () => {
    const req = new Request(
      "http://localhost:3000/api/porciuncula_prefeitura/licitacoes/search?q=a",
    );
    const res = await GET(req as unknown as NextRequest, {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(0);
    expect(data.licitacoes).toEqual([]);
    expect(data.contratos).toEqual([]);
  });

  it("deve retornar resultados formatados para termo válido", async () => {
    const req = new Request(
      "http://localhost:3000/api/porciuncula_prefeitura/licitacoes/search?q=0043/24&ano=2024",
    );
    const res = await GET(req as unknown as NextRequest, {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(2);
    expect(data.licitacoes.length).toBe(1);
    expect(data.contratos.length).toBe(1);
    expect(data.contratos[0].fornecedorNome).toBe("JUSTINA REGINA R. MONTEIRO");
  });

  it("deve respeitar rate limiting ao exceder 60 requisições", async () => {
    const makeReq = () =>
      new Request(
        "http://localhost:3000/api/porciuncula_prefeitura/licitacoes/search?q=termo",
        {
          headers: { "x-forwarded-for": "192.168.1.10" },
        },
      );

    for (let i = 0; i < 60; i++) {
      const res = await GET(makeReq() as unknown as NextRequest, {
        params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      });
      expect(res.status).toBe(200);
    }

    // 61ª requisição deve estourar o limite de 60/min
    const blockedRes = await GET(makeReq() as unknown as NextRequest, {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    });
    expect(blockedRes.status).toBe(429);
    const errorData = await blockedRes.json();
    expect(errorData.error).toContain("Muitas buscas");
  });
});
