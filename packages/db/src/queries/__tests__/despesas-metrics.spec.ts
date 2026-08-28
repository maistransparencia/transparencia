import { describe, expect, it } from "vitest";
import { PORTAL_SLUG, TEST_YEAR } from "../../test-helpers";
import {
  getConcentracaoFornecedoresMetrics,
  getDespesasPorUnidadeMetrics,
  getImpactoGastosLocaisMetrics,
  getPrincipaisBeneficiariosDiariasMetrics,
  getRestosAPagarResumoMetrics,
  getResumoDiariasMetrics,
} from "../despesas-metrics";

// Smoke tests de shape contra o schema vazio do fixture (schema.sql.gz, sem dados
// reais). A lógica de negócio (cálculo de HHI, consolidação de restos a pagar,
// impacto de gastos locais etc.) já é validada pelos testes do dbt — aqui só
// garantimos que a camada de query TS não quebra e devolve o formato esperado.
describe("despesas-metrics (smoke)", () => {
  it("deve buscar resumo de diárias com o shape esperado", async () => {
    const resumoDiarias = await getResumoDiariasMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
      ["1"],
    );
    expect(resumoDiarias).toBeDefined();
    expect(typeof resumoDiarias.totalValor).toBe("number");
  });

  it("deve buscar principais beneficiários de diárias como array", async () => {
    const beneficiarios = await getPrincipaisBeneficiariosDiariasMetrics({
      portalSlug: PORTAL_SLUG,
      year: TEST_YEAR,
      limit: 5,
      empresaIds: ["1"],
    });
    expect(Array.isArray(beneficiarios)).toBe(true);
  });

  it("deve buscar impacto de gastos locais com o shape esperado", async () => {
    const impacto = await getImpactoGastosLocaisMetrics({
      portalSlug: PORTAL_SLUG,
      year: TEST_YEAR,
      empresaIds: ["1"],
      cidadeClean: "PORCIUNCULA",
    });
    expect(impacto).toBeDefined();
    expect(typeof impacto.pctLocal).toBe("number");
  });

  it("deve buscar concentração de fornecedores (HHI) com o shape esperado", async () => {
    const conc = await getConcentracaoFornecedoresMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
      ["1"],
    );
    expect(conc).toBeDefined();
    expect(typeof conc.hhi).toBe("number");
  });

  it("deve buscar resumo de restos a pagar com o shape esperado", async () => {
    const restos = await getRestosAPagarResumoMetrics(PORTAL_SLUG, TEST_YEAR, [
      "1",
    ]);
    expect(restos).toBeDefined();
    expect(typeof restos.dividaMaisAntigaAno).toBe("number");
    expect(typeof restos.totalLiquidadoPendente).toBe("number");
    expect(Array.isArray(restos.topFornecedores)).toBe(true);
  });

  it("deve buscar despesas por unidade como array", async () => {
    const unidades = await getDespesasPorUnidadeMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
      ["1"],
    );
    expect(Array.isArray(unidades)).toBe(true);
  });

  it("deve buscar radar de gastos sensíveis com o shape esperado", async () => {
    const { getRadarGastosSensiveisMetrics } = await import(
      "../despesas-metrics"
    );
    const radar = await getRadarGastosSensiveisMetrics(PORTAL_SLUG, TEST_YEAR, [
      "1",
    ]);
    expect(radar).toBeDefined();
    expect(Array.isArray(radar.itens)).toBe(true);
    expect(radar.itens.length).toBe(5);
    expect(radar.anoAtual).toBe(TEST_YEAR);
  });

  it("deve buscar maiores fornecedores do exercício como array", async () => {
    const { getTopFornecedoresExecucaoMetrics } = await import(
      "../despesas-metrics"
    );
    const fornecedores = await getTopFornecedoresExecucaoMetrics({
      portalSlug: PORTAL_SLUG,
      year: TEST_YEAR,
      empresaIds: ["1"],
      limit: 5,
    });
    expect(Array.isArray(fornecedores)).toBe(true);
  });
});
