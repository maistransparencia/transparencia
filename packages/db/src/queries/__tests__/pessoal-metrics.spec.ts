import { describe, expect, it } from "vitest";
import { PORTAL_SLUG, TEST_YEAR } from "../../test-helpers";
import {
  getDepartmentalPayrollMetrics,
  getDistribuicaoProventosMetrics,
  getExecucaoDecimoTerceiroMetrics,
  getFolhaVsServicosMetrics,
  getLimiteMaximoLrfPessoal,
  getPercentualChefiasEfetivasMetrics,
} from "../pessoal-metrics";

describe("pessoal-metrics", () => {
  it("deve buscar métricas de Pessoal via leitores atômicos *-metrics", async () => {
    const folha = await getFolhaVsServicosMetrics({
      years: [TEST_YEAR],
      portalSlug: PORTAL_SLUG,
    });
    expect(Array.isArray(folha)).toBe(true);

    const decimo13 = await getExecucaoDecimoTerceiroMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
    );
    if (decimo13) {
      expect(typeof decimo13.pago).toBe("number");
    }

    const chefias = await getPercentualChefiasEfetivasMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
    );
    if (chefias !== null) {
      expect(typeof chefias).toBe("number");
    }

    const proventos = await getDistribuicaoProventosMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
    );
    expect(Array.isArray(proventos)).toBe(true);
    expect(proventos.length).toBe(9);

    const dept = await getDepartmentalPayrollMetrics(PORTAL_SLUG, TEST_YEAR);
    expect(Array.isArray(dept)).toBe(true);

    const limiteLrf = await getLimiteMaximoLrfPessoal(TEST_YEAR);
    expect(limiteLrf).toBe(54);
  });

  it("deve manter rclProxy consolidado mesmo com empresaIds filtrados", async () => {
    const folhaConsolidada = await getFolhaVsServicosMetrics({
      years: [TEST_YEAR],
      portalSlug: PORTAL_SLUG,
    });
    const folhaEntidade = await getFolhaVsServicosMetrics({
      years: [TEST_YEAR],
      portalSlug: PORTAL_SLUG,
      empresaIds: ["3"],
    });

    expect(folhaConsolidada.length).toBeGreaterThan(0);
    expect(folhaEntidade.length).toBeGreaterThan(0);

    // O denominador rclProxy deve ser idêntico (a receita consolidada do município)
    expect(folhaEntidade[0].rclProxy).toBe(folhaConsolidada[0].rclProxy);
    expect(folhaEntidade[0].rclProxy).toBeGreaterThan(0);

    // O percentual da entidade individual deve ser proporcional à sua folha, abaixo do total consolidado
    expect(folhaEntidade[0].percentualFolha).toBeLessThanOrEqual(
      folhaConsolidada[0].percentualFolha,
    );
  });
});
