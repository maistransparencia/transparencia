import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimits } from "../../../../lib/rate-limit";

// Mock @transparencia/db
vi.mock("@transparencia/db", () => ({
  getPortalConfig: vi.fn(async (slug: string) => {
    if (slug === "porciuncula_prefeitura") {
      return {
        portalSlug: "porciuncula_prefeitura",
        displayName: "Prefeitura de Porciúncula",
        uf: "RJ",
        portalUrl: "https://transparencia.porciuncula.rj.gov.br",
        baseHost: "porciuncula.rj.gov.br",
        cidadeClean: "Porciúncula",
        anoInicial: 2021,
        empresaPadrao: "1",
        brasaoAsset: "porciuncula.png",
        dataExtracao: "2025-01-01",
      };
    }
    return null;
  }),
  getRawDespesasExportRecords: vi.fn(async () => [
    {
      numeroEmpenho: "123/2025",
      dataEmpenho: "2025-03-15",
      orgaoNome: "Secretaria de Saúde",
      credorNome: "Posto Central Ltda",
      credorCpfCnpj: "12.345.678/0001-90",
      objetoDescricao: 'Aquisição de combustível; frota municipal "emergência"',
      naturezaCodigo: "3.3.90.30.01",
      valorEmpenhado: 5000.5,
      valorLiquidado: 5000.5,
      valorPago: 5000.5,
      categoriaSensivel: "combustivel_frota",
    },
  ]),
  CATEGORIAS_GASTOS_SENSIVEIS: [
    "combustivel_frota",
    "locacao_maquinas_veiculos",
    "locacao_imoveis",
    "eventos_festas",
    "diarias_viagens",
    "obras_infraestrutura",
  ],
}));

describe("API Route: /api/[portalSlug]/export", () => {
  beforeEach(() => {
    clearRateLimits();
    vi.clearAllMocks();
  });

  it("deve retornar 400 se o parâmetro 'tipo' for inválido ou ausente", async () => {
    const { GET } = await import("./route");
    const req = new Request(
      "https://example.com/api/porciuncula_prefeitura/export?ano=2025",
    );
    const context = {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    };

    const res = await GET(req, context);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("tipo");
  });

  it("deve retornar 400 se o parâmetro 'ano' for inválido", async () => {
    const { GET } = await import("./route");
    const req = new Request(
      "https://example.com/api/porciuncula_prefeitura/export?tipo=opacidade_99&ano=abc",
    );
    const context = {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    };

    const res = await GET(req, context);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("ano");
  });

  it("deve retornar 400 se tipo for gasto_sensivel e categoria estiver ausente ou inválida", async () => {
    const { GET } = await import("./route");
    const req = new Request(
      "https://example.com/api/porciuncula_prefeitura/export?tipo=gasto_sensivel&ano=2025",
    );
    const context = {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    };

    const res = await GET(req, context);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("categoria");
  });

  it("deve retornar 400 se tipo for funcao e funcaoCodigo estiver ausente", async () => {
    const { GET } = await import("./route");
    const req = new Request(
      "https://example.com/api/porciuncula_prefeitura/export?tipo=funcao&ano=2025",
    );
    const context = {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    };

    const res = await GET(req, context);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("funcaoCodigo");
  });

  it("deve retornar 404 se portalSlug for desconhecido", async () => {
    const { GET } = await import("./route");
    const req = new Request(
      "https://example.com/api/portal_inexistente/export?tipo=opacidade_99&ano=2025",
    );
    const context = {
      params: Promise.resolve({ portalSlug: "portal_inexistente" }),
    };

    const res = await GET(req, context);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("não encontrado");
  });

  it("deve retornar status 200, cabeçalhos CSV, BOM UTF-8 e dados para gasto_sensivel", async () => {
    const { GET } = await import("./route");
    const req = new Request(
      "https://example.com/api/porciuncula_prefeitura/export?tipo=gasto_sensivel&ano=2025&categoria=combustivel_frota&entidades=1,2",
    );
    const context = {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    };

    const res = await GET(req, context);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="despesas_porciuncula_prefeitura_combustivel_frota_2025.csv"',
    );

    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // BOM UTF-8 bytes: 0xEF, 0xBB, 0xBF
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const text = new TextDecoder("utf-8").decode(buffer);
    // Cabeçalhos de coluna separados por ';'
    expect(text).toContain(
      "numero_empenho;data_empenho;orgao_nome;credor_nome;credor_cpf_cnpj;objeto_descricao;natureza_codigo;valor_empenhado;valor_liquidado;valor_pago;categoria_sensivel",
    );

    // Escape de aspas e ponto e vírgula na descrição
    expect(text).toContain(
      '"Aquisição de combustível; frota municipal ""emergência"""',
    );
    // Formatação monetária com vírgula decimal
    expect(text).toContain("5000,50");
  });

  it("deve suportar delimitador vírgula ',' e formatar decimais com ponto", async () => {
    const { GET } = await import("./route");
    const req = new Request(
      "https://example.com/api/porciuncula_prefeitura/export?tipo=opacidade_99&ano=2025&delimitador=,",
    );
    const context = {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    };

    const res = await GET(req, context);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="despesas_opacidade_residual_99_porciuncula_prefeitura_2025.csv"',
    );

    const text = await res.text();
    expect(text).toContain(
      "numero_empenho,data_empenho,orgao_nome,credor_nome,credor_cpf_cnpj,objeto_descricao,natureza_codigo,valor_empenhado,valor_liquidado,valor_pago,categoria_sensivel",
    );
    expect(text).toContain("5000.50");
  });

  it("deve retornar nome de arquivo correto para tipo funcao", async () => {
    const { GET } = await import("./route");
    const req = new Request(
      "https://example.com/api/porciuncula_prefeitura/export?tipo=funcao&ano=2025&funcaoCodigo=10",
    );
    const context = {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    };

    const res = await GET(req, context);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="despesas_funcao_10_porciuncula_prefeitura_2025.csv"',
    );
  });

  it("deve aplicar rate limit e retornar HTTP 429 após 30 requisições", async () => {
    const { GET } = await import("./route");
    const context = {
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
    };

    for (let i = 0; i < 30; i++) {
      const req = new Request(
        "https://example.com/api/porciuncula_prefeitura/export?tipo=opacidade_99&ano=2025",
        { headers: { "x-forwarded-for": "192.168.1.50" } },
      );
      const res = await GET(req, context);
      expect(res.status).toBe(200);
    }

    // 31ª requisição deve ser bloqueada
    const blockedReq = new Request(
      "https://example.com/api/porciuncula_prefeitura/export?tipo=opacidade_99&ano=2025",
      { headers: { "x-forwarded-for": "192.168.1.50" } },
    );
    const blockedRes = await GET(blockedReq, context);
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get("retry-after")).toBeDefined();
    const body = await blockedRes.json();
    expect(body.error).toContain("Muitos downloads");
  });
});
