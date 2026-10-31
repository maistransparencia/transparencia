import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedHistoriaSaudeMetrica,
  seedLicitacaoMetrica,
} from "../../../tests/fixtures/seed";
import { PORTAL_SLUG, TEST_YEAR } from "../../test-helpers";
import {
  getHistoriaSaudeMetrics,
  getSaudeEmendasMetrics,
  getSaudeExecutionTrendMetrics,
  getSaudeFontesReceitaMetrics,
  getSaudeFornecedoresCountMetrics,
  getSaudeLicitacoesMetrics,
} from "../historia-saude-metrics";

const PORTAL_A = createFixturePortalSlug();
const PORTAL_B = createFixturePortalSlug();

afterEach(async () => {
  await Promise.all([cleanupFixtures(PORTAL_A), cleanupFixtures(PORTAL_B)]);
});

describe("getHistoriaSaudeMetrics", () => {
  it("deve buscar história da saúde via mart atômico", async () => {
    const metrics = await getHistoriaSaudeMetrics(PORTAL_SLUG, TEST_YEAR);
    if (metrics !== null) {
      expect(typeof metrics.historiaSaudeId).toBe("string");
      expect(typeof metrics.portalSlug).toBe("string");
      expect(typeof metrics.ano).toBe("number");
      expect(typeof metrics.dotacaoTotal).toBe("number");
      expect(typeof metrics.medicamentosInsumosEmpenhado).toBe("number");
      expect(typeof metrics.medicamentosInsumosPago).toBe("number");
      expect(typeof metrics.judicializacaoEmpenhado).toBe("number");
      expect(typeof metrics.judicializacaoPago).toBe("number");
      expect(typeof metrics.hhiConcentracaoFornecedores).toBe("number");
    }
  });
});

describe("getSaudeFornecedoresCountMetrics", () => {
  it("deve buscar fornecedores ativos da Saúde", async () => {
    const saudeFornecedoresCount = await getSaudeFornecedoresCountMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
      ["2"],
    );
    expect(typeof saudeFornecedoresCount).toBe("number");
    expect(saudeFornecedoresCount).toBeGreaterThanOrEqual(0);
  });
});

describe("getSaudeEmendasMetrics", () => {
  it("deve retornar métricas vazias quando lista de empresaIds for vazia", async () => {
    const res = await getSaudeEmendasMetrics(PORTAL_SLUG, TEST_YEAR, []);
    expect(res.totalAutorizado).toBe(0);
    expect(res.totalEmpenhado).toBe(0);
    expect(res.lista).toEqual([]);
  });

  it("deve retornar emendas e estrutura consistente de empenhos vinculados para o exercício", async () => {
    const res = await getSaudeEmendasMetrics(PORTAL_SLUG, 2026, ["2"]);
    expect(res).toBeDefined();
    expect(typeof res.totalAutorizado).toBe("number");
    expect(typeof res.totalEmpenhado).toBe("number");
    expect(Array.isArray(res.lista)).toBe(true);

    for (const emenda of res.lista) {
      expect(typeof emenda.numero).toBe("string");
      expect(typeof emenda.valorAutorizado).toBe("number");
      expect(typeof emenda.quantidadeEmpenhos).toBe("number");
      expect(Array.isArray(emenda.empenhos)).toBe(true);
      expect(emenda.quantidadeEmpenhos).toBe(emenda.empenhos.length);

      for (const emp of emenda.empenhos) {
        expect(emp.empenhoId).toBeTruthy();
        expect(typeof emp.valorEmpenhado).toBe("number");
        expect(typeof emp.valorLiquidado).toBe("number");
        expect(typeof emp.valorPago).toBe("number");
      }
    }

    // Deve dar precedência a emendas que têm empenho
    let foundWithoutEmpenho = false;
    for (const emenda of res.lista) {
      const hasEmpenho =
        (emenda.empenhado ?? 0) > 0 || emenda.quantidadeEmpenhos > 0;
      if (!hasEmpenho) {
        foundWithoutEmpenho = true;
      }
      if (foundWithoutEmpenho && hasEmpenho) {
        throw new Error(
          "Emenda com empenho encontrada após emenda sem empenho na lista!",
        );
      }
    }
  });
});

describe("getSaudeLicitacoesMetrics", () => {
  it("agrupa por tipo de contratação só do portal, ano e entidades pedidos", async () => {
    const base = { portalSlug: PORTAL_A, ano: 2025, empresaId: "1" };
    await seedLicitacaoMetrica({
      ...base,
      tipoContratacao: "licitacao_propria",
      empenhadoContrato: 100,
    });
    await seedLicitacaoMetrica({
      ...base,
      tipoContratacao: "licitacao_propria",
      empenhadoContrato: 50,
    });
    await seedLicitacaoMetrica({
      ...base,
      tipoContratacao: "sem_licitacao",
      empenhadoContrato: 30,
    });
    await seedLicitacaoMetrica({
      ...base,
      empresaId: "2",
      tipoContratacao: "licitacao_propria",
      empenhadoContrato: 9000,
    });
    await seedLicitacaoMetrica({
      ...base,
      ano: 2024,
      tipoContratacao: "licitacao_propria",
      empenhadoContrato: 9000,
    });
    await seedLicitacaoMetrica({
      ...base,
      portalSlug: PORTAL_B,
      tipoContratacao: "licitacao_propria",
      empenhadoContrato: 9000,
    });

    const resultado = await getSaudeLicitacoesMetrics(PORTAL_A, 2025, ["1"]);

    expect(resultado.caminhos).toEqual([
      {
        tipoContratacao: "licitacao_propria",
        quantidade: 2,
        valorEmpenhado: 150,
      },
      { tipoContratacao: "sem_licitacao", quantidade: 1, valorEmpenhado: 30 },
    ]);
  });

  it("devolve código neutro quando o tipo de contratação é nulo", async () => {
    await seedLicitacaoMetrica({
      portalSlug: PORTAL_A,
      ano: 2025,
      empresaId: "1",
      tipoContratacao: null,
      empenhadoContrato: 10,
    });

    const resultado = await getSaudeLicitacoesMetrics(PORTAL_A, 2025, ["1"]);

    expect(resultado.caminhos.map((c) => c.tipoContratacao)).toEqual([
      "nao_informado",
    ]);
  });

  it("retorna vazio sem entidades", async () => {
    expect(await getSaudeLicitacoesMetrics(PORTAL_A, 2025, [])).toEqual({
      caminhos: [],
    });
  });
});

describe("getSaudeFontesReceitaMetrics", () => {
  it("mapeia cada coluna para o campo certo do DTO", async () => {
    await seedHistoriaSaudeMetrica({
      portalSlug: PORTAL_A,
      ano: 2025,
      receitaUniao: 60,
      receitaEstado: 30,
      repassesPrefeitura: 100,
      receitaOutras: 10,
      totalEntrada: 200,
      percentualUniaoSus: 30,
      percentualEstado: 15,
      percentualPropria: 50,
      percentualOutrasReceitas: 5,
    });
    await seedHistoriaSaudeMetrica({
      portalSlug: PORTAL_B,
      ano: 2025,
      receitaUniao: 9999,
    });

    const fontes = await getSaudeFontesReceitaMetrics({
      portalSlug: PORTAL_A,
      ano: 2025,
    });

    expect(fontes).toMatchObject({
      receitaUniao: 60,
      receitaEstado: 30,
      repassesPrefeitura: 100,
      receitaOutras: 10,
      totalEntrada: 200,
      percentualUniaoSus: 30,
      percentualEstado: 15,
      percentualPropria: 50,
      percentualOutrasReceitas: 5,
    });
  });
});

describe("getSaudeExecutionTrendMetrics", () => {
  it("devolve o pago a partir de total_pago", async () => {
    await seedHistoriaSaudeMetrica({
      portalSlug: PORTAL_A,
      ano: 2025,
      totalPago: 777,
    });

    const tendencia = await getSaudeExecutionTrendMetrics(PORTAL_A);

    expect(tendencia.find((item) => item.ano === 2025)?.pago).toBe(777);
  });
});
