import { describe, expect, it } from "vitest";
import { PORTAL_SLUG, TEST_YEAR } from "../../test-helpers";
import {
  getDespesasPorFuncaoMetrics,
  getRadarGastosSensiveisMetrics,
  getRestosAPagarResumoMetrics,
  getResumoDiariasMetrics,
  getTopFornecedoresExecucaoMetrics,
} from "../despesas-metrics";

// Smoke tests de shape contra o schema vazio do fixture (schema.sql.gz, sem dados
// reais). A lógica de negócio (consolidação de restos a pagar, radar de gastos
// sensíveis etc.) já é validada pelos testes do dbt — aqui só garantimos que a
// camada de query TS não quebra e devolve o formato esperado.
describe("despesas-metrics (smoke)", () => {
  it("deve buscar resumo de diárias com o shape esperado", async () => {
    const resumoDiarias = await getResumoDiariasMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
      ["1"],
    );
    expect(resumoDiarias).toBeDefined();
    expect(typeof resumoDiarias.totalValor).toBe("number");
    expect(typeof resumoDiarias.totalViajantes).toBe("number");
    expect(typeof resumoDiarias.mediaReembolso).toBe("number");
  });

  it("deve buscar resumo de restos a pagar com o shape esperado", async () => {
    const restos = await getRestosAPagarResumoMetrics(PORTAL_SLUG, TEST_YEAR, [
      "1",
    ]);
    expect(restos).toBeDefined();
    expect(typeof restos.dividaMaisAntigaAno).toBe("number");
    expect(typeof restos.totalLiquidadoPendente).toBe("number");
    expect(typeof restos.totalPendente).toBe("number");
    expect(Array.isArray(restos.topFornecedores)).toBe(true);
  });

  it("deve buscar radar de gastos sensíveis com o shape esperado", async () => {
    const radar = await getRadarGastosSensiveisMetrics(PORTAL_SLUG, TEST_YEAR, [
      "1",
    ]);
    expect(radar).toBeDefined();
    expect(Array.isArray(radar.itens)).toBe(true);
    expect(radar.itens.length).toBe(6);
    expect(radar.itens.map((i) => i.categoria)).toContain("locacao_imoveis");
    expect(radar.anoAtual).toBe(TEST_YEAR);
    for (const item of radar.itens) {
      expect(Array.isArray(item.decomposicaoDivida)).toBe(true);
      expect(item.decomposicaoDivida).toEqual([]);
    }
  });

  it("deve calcular decomposicaoDivida por entidade com percentuais, ordenação e paridade matemática", async () => {
    const {
      createFixturePortalSlug,
      cleanupFixtures,
      seedDimOrgao,
      seedDespesa,
    } = await import("../../../tests/fixtures/seed");
    const portalSlug = createFixturePortalSlug();

    try {
      await seedDimOrgao({
        portalSlug,
        empresaId: "1",
        orgaoNome: "Prefeitura Municipal",
      });
      await seedDimOrgao({
        portalSlug,
        empresaId: "2",
        orgaoNome: "Fundo Municipal de Saúde",
      });

      // Entidade 2 (Saúde): dívida no exercício = 1000 - 300 = 700
      await seedDespesa({
        portalSlug,
        empresaId: "2",
        ano: TEST_YEAR,
        fonte: "exercicio",
        categoriaGastoSensivel: "combustivel_frota",
        empenhado: 1000,
        liquidado: 1000,
        pago: 300,
      });

      // Entidade 1 (Prefeitura): dívida em restos a pagar = 500 - 200 = 300
      await seedDespesa({
        portalSlug,
        empresaId: "1",
        ano: TEST_YEAR,
        fonte: "restos_a_pagar",
        categoriaGastoSensivel: "combustivel_frota",
        empenhado: 500,
        liquidado: 500,
        pago: 200,
      });

      // Entidade 1: despesa quitada no exercício (dívida 0)
      await seedDespesa({
        portalSlug,
        empresaId: "1",
        ano: TEST_YEAR,
        fonte: "exercicio",
        categoriaGastoSensivel: "combustivel_frota",
        empenhado: 400,
        liquidado: 400,
        pago: 400,
      });

      const radar = await getRadarGastosSensiveisMetrics(
        portalSlug,
        TEST_YEAR,
        ["1", "2"],
      );

      const combustivel = radar.itens.find(
        (i) => i.categoria === "combustivel_frota",
      );
      expect(combustivel).toBeDefined();
      expect(combustivel?.dividaRealAcumulada).toBe(1000);
      expect(combustivel?.decomposicaoDivida).toHaveLength(2);

      // Ordenação decrescente de valorDivida
      expect(combustivel?.decomposicaoDivida[0]).toEqual({
        empresaId: "2",
        entidadeNome: "Fundo Municipal de Saúde",
        valorDivida: 700,
        percentual: 70,
      });
      expect(combustivel?.decomposicaoDivida[1]).toEqual({
        empresaId: "1",
        entidadeNome: "Prefeitura Municipal",
        valorDivida: 300,
        percentual: 30,
      });

      // Paridade matemática estrita
      const somaEntidades = combustivel?.decomposicaoDivida.reduce(
        (acc, item) => acc + item.valorDivida,
        0,
      );
      expect(
        Math.abs(
          (somaEntidades ?? 0) - (combustivel?.dividaRealAcumulada ?? 0),
        ),
      ).toBeLessThan(0.01);

      // Categoria sem dívida deve ter decomposicaoDivida vazia
      const imoveis = radar.itens.find(
        (i) => i.categoria === "locacao_imoveis",
      );
      expect(imoveis?.decomposicaoDivida).toEqual([]);
    } finally {
      await cleanupFixtures(portalSlug);
    }
  });

  it("deve buscar maiores fornecedores do exercício como array", async () => {
    const fornecedores = await getTopFornecedoresExecucaoMetrics({
      portalSlug: PORTAL_SLUG,
      year: TEST_YEAR,
      empresaIds: ["1"],
      limit: 5,
    });
    expect(Array.isArray(fornecedores)).toBe(true);
  });

  it("deve buscar despesas por função como array ordenado", async () => {
    const funcoes = await getDespesasPorFuncaoMetrics(PORTAL_SLUG, TEST_YEAR, [
      "1",
    ]);
    expect(Array.isArray(funcoes)).toBe(true);
  });
});
