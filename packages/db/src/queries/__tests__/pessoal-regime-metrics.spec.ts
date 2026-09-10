import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedPessoalRegime,
} from "../../../tests/fixtures/seed";
import { TEST_YEAR } from "../../test-helpers";
import { getPessoalRegimeMetrics } from "../pessoal-regime-metrics";

const PORTAL = createFixturePortalSlug();

afterEach(async () => {
  await cleanupFixtures(PORTAL);
});

describe("pessoal-regime-metrics", () => {
  it("deve retornar array vazio se parâmetros obrigatórios forem inválidos", async () => {
    expect(await getPessoalRegimeMetrics("", TEST_YEAR)).toEqual([]);
    expect(await getPessoalRegimeMetrics(PORTAL, Number.NaN)).toEqual([]);
    expect(
      await getPessoalRegimeMetrics(PORTAL, TEST_YEAR, { empresaIds: [] }),
    ).toEqual([]);
  });

  it("deve agregar e calcular métricas de regime funcional corretamente", async () => {
    await seedPessoalRegime({
      portalSlug: PORTAL,
      empresaId: "1",
      ano: TEST_YEAR,
      categoriaRegime: "efetivo_concurso",
      totalProfissionais: 80,
      totalProventos: 400_000,
      proventoMedio: 5_000,
      percentualProfissionais: 80,
      percentualFolha: 66.67,
    });

    await seedPessoalRegime({
      portalSlug: PORTAL,
      empresaId: "1",
      ano: TEST_YEAR,
      categoriaRegime: "comissionado",
      totalProfissionais: 20,
      totalProventos: 200_000,
      proventoMedio: 10_000,
      percentualProfissionais: 20,
      percentualFolha: 33.33,
    });

    const metrics = await getPessoalRegimeMetrics(PORTAL, TEST_YEAR);

    expect(metrics).toHaveLength(2);

    const [concursados, comissionados] = metrics;

    expect(concursados.categoriaRegime).toBe("efetivo_concurso");
    expect(concursados.totalProfissionais).toBe(80);
    expect(concursados.totalProventos).toBe(400_000);
    expect(concursados.proventoMedio).toBe(5_000);
    expect(concursados.percentualProfissionais).toBe(80);
    expect(concursados.percentualFolha).toBe(66.67);

    expect(comissionados.categoriaRegime).toBe("comissionado");
    expect(comissionados.totalProfissionais).toBe(20);
    expect(comissionados.totalProventos).toBe(200_000);
    expect(comissionados.proventoMedio).toBe(10_000);
    expect(comissionados.percentualProfissionais).toBe(20);
    expect(comissionados.percentualFolha).toBe(33.33);
  });

  it("deve filtrar por empresaIds quando fornecido", async () => {
    await seedPessoalRegime({
      portalSlug: PORTAL,
      empresaId: "1",
      ano: TEST_YEAR,
      categoriaRegime: "efetivo_concurso",
      totalProfissionais: 50,
      totalProventos: 250_000,
    });

    await seedPessoalRegime({
      portalSlug: PORTAL,
      empresaId: "2",
      ano: TEST_YEAR,
      categoriaRegime: "efetivo_concurso",
      totalProfissionais: 30,
      totalProventos: 150_000,
    });

    const filterEmpresa1 = await getPessoalRegimeMetrics(PORTAL, TEST_YEAR, {
      empresaIds: ["1"],
    });
    expect(filterEmpresa1).toHaveLength(1);
    expect(filterEmpresa1[0].totalProfissionais).toBe(50);
    expect(filterEmpresa1[0].totalProventos).toBe(250_000);

    const filterBoth = await getPessoalRegimeMetrics(PORTAL, TEST_YEAR, {
      empresaIds: ["1", "2"],
    });
    expect(filterBoth).toHaveLength(1);
    expect(filterBoth[0].totalProfissionais).toBe(80);
    expect(filterBoth[0].totalProventos).toBe(400_000);
  });
});
