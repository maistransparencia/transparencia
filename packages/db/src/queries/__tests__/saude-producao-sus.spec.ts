import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedSaudeProducaoSus,
} from "../../../tests/fixtures/seed";
import { getSaudeProducaoSus } from "../saude-producao-sus";

const PORTAL_A = createFixturePortalSlug();
const PORTAL_B = createFixturePortalSlug();
const PORTAL_VAZIO = createFixturePortalSlug();

afterEach(async () => {
  await Promise.all([
    cleanupFixtures(PORTAL_A),
    cleanupFixtures(PORTAL_B),
    cleanupFixtures(PORTAL_VAZIO),
  ]);
});

describe("getSaudeProducaoSus", () => {
  it("retorna null sem dados no mart", async () => {
    expect(await getSaudeProducaoSus(PORTAL_VAZIO)).toBeNull();
    expect(await getSaudeProducaoSus("  ")).toBeNull();
  });

  it("devolve a série ordenada com intervalo real e isola portais", async () => {
    await seedSaudeProducaoSus([
      {
        portalSlug: PORTAL_A,
        ano: 2024,
        competenciasAmbulatoriais: 12,
        competenciasInternacoes: 12,
        totalProcedimentosAmbulatoriais: 1200,
        totalInternacoes: 60,
        anoCompletoAmbulatorial: true,
        anoCompletoInternacoes: true,
        populacaoResidente: 10000,
        procedimentosAmbulatoriaisPorMilMoradores: 120,
        internacoesPorMilMoradores: 6,
      },
      {
        portalSlug: PORTAL_A,
        ano: 2022,
        competenciasAmbulatoriais: 12,
        totalProcedimentosAmbulatoriais: 900,
        anoCompletoAmbulatorial: true,
      },
      { portalSlug: PORTAL_B, ano: 2030, competenciasAmbulatoriais: 1 },
    ]);

    const resultado = await getSaudeProducaoSus(PORTAL_A);

    expect(resultado?.anoMin).toBe(2022);
    expect(resultado?.anoMax).toBe(2024);
    expect(resultado?.serie.map((a) => a.ano)).toEqual([2022, 2024]);
    expect(resultado?.serie[1].totalProcedimentosAmbulatoriais).toBe(1200);
    expect(resultado?.serie[1].internacoesPorMilMoradores).toBe(6);
    expect(resultado?.serie[1].anoCompletoInternacoes).toBe(true);
    expect(resultado?.serie[1].dataColeta).toBe("2026-11-07");
  });

  it("mantém SIH sem retorno como null e ano em curso como incompleto", async () => {
    await seedSaudeProducaoSus({
      portalSlug: PORTAL_A,
      ano: 2026,
      competenciasAmbulatoriais: 6,
      totalProcedimentosAmbulatoriais: 500,
      populacaoEstimada: true,
      anoPopulacaoReferencia: 2025,
    });

    const [ano] = (await getSaudeProducaoSus(PORTAL_A))?.serie ?? [];

    expect(ano.totalInternacoes).toBeNull();
    expect(ano.competenciasInternacoes).toBeNull();
    expect(ano.internacoesPorMilMoradores).toBeNull();
    expect(ano.anoCompletoAmbulatorial).toBe(false);
    expect(ano.ultimaCompetenciaAmbulatorial).toBe(202606);
    expect(ano.populacaoEstimada).toBe(true);
  });
});
