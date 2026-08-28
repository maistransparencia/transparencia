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
    expect(radar.itens.length).toBe(5);
    expect(radar.anoAtual).toBe(TEST_YEAR);
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
