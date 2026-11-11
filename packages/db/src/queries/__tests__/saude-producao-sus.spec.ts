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

  it("usa o ano completo mais recente como referência e o anterior completo para comparar", async () => {
    await seedSaudeProducaoSus([
      {
        portalSlug: PORTAL_A,
        ano: 2022,
        competenciasAmbulatoriais: 12,
        anoCompletoAmbulatorial: true,
        procedimentosAmbulatoriaisPorMilMoradores: 100,
      },
      {
        portalSlug: PORTAL_A,
        ano: 2023,
        competenciasAmbulatoriais: 12,
        anoCompletoAmbulatorial: true,
        procedimentosAmbulatoriaisPorMilMoradores: 110,
      },
      {
        portalSlug: PORTAL_A,
        ano: 2024,
        competenciasAmbulatoriais: 7,
        anoCompletoAmbulatorial: false,
        procedimentosAmbulatoriaisPorMilMoradores: 60,
      },
    ]);

    const resultado = await getSaudeProducaoSus(PORTAL_A);

    expect(resultado?.referenciaAmbulatorial).toEqual({
      ano: 2023,
      completo: true,
      ultimaCompetencia: 202312,
      anoAnterior: 2022,
    });
    expect(resultado?.referenciaInternacoes).toBeNull();
  });

  it("sem ano completo a referência é o mais recente com dado, incompleto e sem anterior", async () => {
    await seedSaudeProducaoSus({
      portalSlug: PORTAL_A,
      ano: 2024,
      competenciasAmbulatoriais: 5,
      anoCompletoAmbulatorial: false,
      procedimentosAmbulatoriaisPorMilMoradores: 40,
    });

    const resultado = await getSaudeProducaoSus(PORTAL_A);

    expect(resultado?.referenciaAmbulatorial).toEqual({
      ano: 2024,
      completo: false,
      ultimaCompetencia: 202405,
      anoAnterior: null,
    });
  });

  it("não chama de em andamento o último ano fechado de município sem SIH", async () => {
    await seedSaudeProducaoSus({
      portalSlug: PORTAL_A,
      ano: 2023,
      competenciasAmbulatoriais: 12,
      anoCompletoAmbulatorial: true,
      procedimentosAmbulatoriaisPorMilMoradores: 100,
    });

    const resultado = await getSaudeProducaoSus(PORTAL_A);

    expect(resultado?.semInternacoes).toBe(true);
    expect(resultado?.serie[0].anoIncompleto).toBe(false);
    expect(resultado?.anoEmAndamento).toBeNull();
  });

  it("marca ano passado com 11 competências como incompleto, mas não como em andamento", async () => {
    await seedSaudeProducaoSus({
      portalSlug: PORTAL_A,
      ano: 2023,
      competenciasAmbulatoriais: 11,
      anoCompletoAmbulatorial: false,
      procedimentosAmbulatoriaisPorMilMoradores: 90,
    });

    const resultado = await getSaudeProducaoSus(PORTAL_A);

    expect(resultado?.serie[0].anoIncompleto).toBe(true);
    expect(resultado?.anoEmAndamento).toBeNull();
  });

  it("aponta o ano corrente incompleto como em andamento, com a última competência", async () => {
    const anoAtual = new Date().getFullYear();
    await seedSaudeProducaoSus({
      portalSlug: PORTAL_A,
      ano: anoAtual,
      competenciasAmbulatoriais: 3,
      anoCompletoAmbulatorial: false,
      procedimentosAmbulatoriaisPorMilMoradores: 30,
    });

    const resultado = await getSaudeProducaoSus(PORTAL_A);

    expect(resultado?.anoEmAndamento).toEqual({
      ano: anoAtual,
      ateCompetencia: anoAtual * 100 + 3,
    });
  });

  it("tira da série o ano em que a fonte não trouxe atendimentos nem internações", async () => {
    await seedSaudeProducaoSus([
      {
        portalSlug: PORTAL_A,
        ano: 2017,
        competenciasAmbulatoriais: 12,
        totalProcedimentosAmbulatoriais: 900,
      },
      { portalSlug: PORTAL_A, ano: 2020 },
      {
        portalSlug: PORTAL_A,
        ano: 2027,
        competenciasInternacoes: 12,
        totalInternacoes: 30,
      },
    ]);

    const resultado = await getSaudeProducaoSus(PORTAL_A);

    expect(resultado?.serie.map((a) => a.ano)).toEqual([2017, 2027]);
    expect(resultado?.anoMin).toBe(2017);
    expect(resultado?.anoMax).toBe(2027);
  });

  it("devolve null quando nenhum ano trouxe dado", async () => {
    await seedSaudeProducaoSus({ portalSlug: PORTAL_A, ano: 2024 });

    expect(await getSaudeProducaoSus(PORTAL_A)).toBeNull();
  });
});
