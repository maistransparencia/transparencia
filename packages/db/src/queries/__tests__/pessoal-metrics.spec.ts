import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedFontesReceita,
  seedPessoalDepartamento,
  seedPessoalFolha,
} from "../../../tests/fixtures/seed";
import { TEST_YEAR } from "../../test-helpers";
import {
  getDepartmentalPayrollMetrics,
  getDistribuicaoProventosMetrics,
  getExecucaoDecimoTerceiroMetrics,
  getFolhaVsServicosMetrics,
  getLimiteMaximoLrfPessoal,
  getPercentualChefiasEfetivasMetrics,
} from "../pessoal-metrics";

const PORTAL = createFixturePortalSlug();

afterEach(async () => {
  await cleanupFixtures(PORTAL);
});

describe("pessoal-metrics", () => {
  it("deve buscar métricas de Pessoal via leitores atômicos *-metrics", async () => {
    await seedPessoalFolha({
      portalSlug: PORTAL,
      empresaId: "1",
      ano: TEST_YEAR,
      totalFolha: 1_000_000,
      totalPago: 900_000,
      pago13: 80_000,
      efetivosConfianca: 8,
      comissionadosExternos: 2,
      bin0_25k: 10,
    });
    await seedPessoalDepartamento({
      portalSlug: PORTAL,
      empresaId: "1",
      ano: TEST_YEAR,
      descricao: "Secretaria de Educação",
      totalPago: 500_000,
    });

    const folha = await getFolhaVsServicosMetrics({
      years: [TEST_YEAR],
      portalSlug: PORTAL,
    });
    expect(Array.isArray(folha)).toBe(true);
    expect(folha.length).toBe(1);

    const decimo13 = await getExecucaoDecimoTerceiroMetrics(PORTAL, TEST_YEAR);
    expect(decimo13).toBeDefined();
    expect(decimo13?.pago).toBe(80_000);

    const chefias = await getPercentualChefiasEfetivasMetrics(
      PORTAL,
      TEST_YEAR,
    );
    expect(chefias).toBe(80);

    const proventos = await getDistribuicaoProventosMetrics(PORTAL, TEST_YEAR);
    expect(Array.isArray(proventos)).toBe(true);
    expect(proventos.length).toBe(9);
    expect(proventos[0].count).toBe(10);

    const dept = await getDepartmentalPayrollMetrics(PORTAL, TEST_YEAR);
    expect(Array.isArray(dept)).toBe(true);
    expect(dept.length).toBe(1);
    expect(dept[0].descricao).toBe("Secretaria de Educação");
    expect(dept[0].pago).toBe(500_000);

    const limiteLrf = await getLimiteMaximoLrfPessoal(TEST_YEAR);
    expect(limiteLrf).toBe(54);
  });

  it("deve manter rclProxy consolidado mesmo com empresaIds filtrados", async () => {
    await seedFontesReceita({
      portalSlug: PORTAL,
      empresaId: "1",
      ano: TEST_YEAR,
      totalArrecadado: 10_000_000,
    });
    await seedPessoalFolha({
      portalSlug: PORTAL,
      empresaId: "1",
      ano: TEST_YEAR,
      totalFolha: 3_000_000,
      totalPago: 3_000_000,
    });
    await seedPessoalFolha({
      portalSlug: PORTAL,
      empresaId: "3",
      ano: TEST_YEAR,
      totalFolha: 1_000_000,
      totalPago: 1_000_000,
    });

    const folhaConsolidada = await getFolhaVsServicosMetrics({
      years: [TEST_YEAR],
      portalSlug: PORTAL,
    });
    const folhaEntidade = await getFolhaVsServicosMetrics({
      years: [TEST_YEAR],
      portalSlug: PORTAL,
      empresaIds: ["3"],
    });

    expect(folhaConsolidada.length).toBeGreaterThan(0);
    expect(folhaEntidade.length).toBeGreaterThan(0);

    // O denominador rclProxy deve ser idêntico (a receita consolidada do município)
    expect(folhaEntidade[0].rclProxy).toBe(folhaConsolidada[0].rclProxy);
    expect(folhaEntidade[0].rclProxy).toBeGreaterThan(0);
    expect(folhaEntidade[0].rclProxy).toBe(10_000_000);

    // O total da folha consolidada soma as entidades
    expect(folhaConsolidada[0].totalFolha).toBe(4_000_000);
    expect(folhaEntidade[0].totalFolha).toBe(1_000_000);

    // O percentual da entidade individual deve ser proporcional à sua folha, abaixo do total consolidado
    expect(folhaEntidade[0].percentualFolha).toBeLessThanOrEqual(
      folhaConsolidada[0].percentualFolha,
    );
    expect(folhaEntidade[0].percentualFolha).toBe(10);
    expect(folhaConsolidada[0].percentualFolha).toBe(40);
  });
});
