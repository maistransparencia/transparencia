import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedPessoal,
  seedPessoalRegime,
} from "../../../tests/fixtures/seed";
import { TEST_YEAR } from "../../test-helpers";
import {
  getCountDivergenciasCadastraisPessoal,
  getPessoalRegimeMetrics,
  getServidoresDivergenciasCadastraisPessoal,
} from "../pessoal-regime-metrics";

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

  describe("getCountDivergenciasCadastraisPessoal", () => {
    it("deve retornar 0 para parâmetros inválidos", async () => {
      expect(await getCountDivergenciasCadastraisPessoal("", TEST_YEAR)).toBe(
        0,
      );
      expect(
        await getCountDivergenciasCadastraisPessoal(PORTAL, Number.NaN),
      ).toBe(0);
    });

    it("deve retornar 0 quando não houver registros divergentes", async () => {
      await seedPessoal({
        portalSlug: PORTAL,
        ano: TEST_YEAR,
        matricula: "MAT-001",
        categoriaRegime: "efetivo_concurso",
        formaProvimento: "CONCURSO PUBLICO",
        vinculo: "Estatutario",
        categoriaFuncional: "Efetivo",
      });

      const total = await getCountDivergenciasCadastraisPessoal(
        PORTAL,
        TEST_YEAR,
      );
      expect(total).toBe(0);
    });

    it("deve contabilizar comissionados ou contratos temporários com inconsistência de agente político ou excepcional interesse", async () => {
      // Divergente 1: comissionado com vínculo 'Agentes Politicos (INSS)'
      await seedPessoal({
        portalSlug: PORTAL,
        ano: TEST_YEAR,
        matricula: "MAT-COM-1",
        categoriaRegime: "comissionado",
        formaProvimento: "LIVRE PROVIMENTO",
        vinculo: "Agentes Politicos (INSS)",
        categoriaFuncional: "Contratação por excepcional interesse público",
      });

      // Divergente 2: contrato temporário com categoria_funcional 'Contratação por excepcional interesse público'
      await seedPessoal({
        portalSlug: PORTAL,
        ano: TEST_YEAR,
        matricula: "MAT-TEMP-1",
        categoriaRegime: "contrato_temporario",
        formaProvimento: "Processo Seletivo",
        vinculo: "Contrato Administrativo",
        categoriaFuncional: "Contratação por excepcional interesse público",
      });

      // Regular: agente político legítimo (Prefeito / Secretário)
      await seedPessoal({
        portalSlug: PORTAL,
        ano: TEST_YEAR,
        matricula: "MAT-POL-1",
        categoriaRegime: "agente_politico",
        formaProvimento: "ELEICAO",
        vinculo: "Agentes Politicos",
        categoriaFuncional: "Prefeito",
      });

      const total = await getCountDivergenciasCadastraisPessoal(
        PORTAL,
        TEST_YEAR,
      );
      expect(total).toBe(2);

      const lista = await getServidoresDivergenciasCadastraisPessoal(
        PORTAL,
        TEST_YEAR,
      );
      expect(lista).toHaveLength(2);
      expect(lista.map((s) => s.matricula)).toContain("MAT-COM-1");
      expect(lista.map((s) => s.matricula)).toContain("MAT-TEMP-1");
      expect(lista.map((s) => s.matricula)).not.toContain("MAT-POL-1");
    });
  });
});
