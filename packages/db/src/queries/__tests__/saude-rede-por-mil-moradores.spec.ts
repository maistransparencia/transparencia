import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedSaudeRede,
} from "../../../tests/fixtures/seed";
import { getSaudeRedePorMilMoradores } from "../saude-rede-por-mil-moradores";

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

describe("getSaudeRedePorMilMoradores", () => {
  it("retorna null sem dados no mart", async () => {
    expect(await getSaudeRedePorMilMoradores(PORTAL_VAZIO)).toBeNull();
    expect(await getSaudeRedePorMilMoradores("  ")).toBeNull();
  });

  it("devolve a série ordenada com intervalo real e isola portais", async () => {
    await seedSaudeRede([
      {
        portalSlug: PORTAL_A,
        ano: 2024,
        totalLeitosExistentes: 40,
        populacaoResidente: 10000,
        leitosExistentesPorMilMoradores: 4,
        totalLeitosSus: 30,
        leitosSusPorMilMoradores: 3,
        totalProfissionais: 200,
        totalProfissionaisSus: 150,
        profissionaisPorMilMoradores: 20,
        profissionaisSusPorMilMoradores: 15,
      },
      {
        portalSlug: PORTAL_A,
        ano: 2022,
        totalLeitosExistentes: 30,
        leitosExistentesPorMilMoradores: 3,
      },
      { portalSlug: PORTAL_B, ano: 2030, totalLeitosExistentes: 1 },
    ]);

    const resultado = await getSaudeRedePorMilMoradores(PORTAL_A);

    expect(resultado?.anoMin).toBe(2022);
    expect(resultado?.anoMax).toBe(2024);
    expect(resultado?.serie.map((a) => a.ano)).toEqual([2022, 2024]);
    expect(resultado?.serie[1].leitosExistentesPorMilMoradores).toBe(4);
    expect(resultado?.serie[1].dataColeta).toBe("2026-11-07");
    expect(resultado?.serie[1].totalLeitosSus).toBe(30);
    expect(resultado?.serie[1].leitosSusPorMilMoradores).toBe(3);
    expect(resultado?.serie[1].totalProfissionaisSus).toBe(150);
    expect(resultado?.serie[1].profissionaisSusPorMilMoradores).toBe(15);
  });

  it("mantém sem dado como null e não como zero", async () => {
    await seedSaudeRede({
      portalSlug: PORTAL_A,
      ano: 2023,
      totalLeitosExistentes: 12,
      leitosExistentesPorMilMoradores: 1.2,
      populacaoEstimada: true,
      anoPopulacaoReferencia: 2022,
    });

    const [ano] = (await getSaudeRedePorMilMoradores(PORTAL_A))?.serie ?? [];

    expect(ano.profissionaisPorMilMoradores).toBeNull();
    expect(ano.totalProfissionais).toBeNull();
    expect(ano.populacaoEstimada).toBe(true);
    expect(ano.anoPopulacaoReferencia).toBe(2022);
  });

  it("tira da série o ano em que a fonte não trouxe leitos nem profissionais", async () => {
    await seedSaudeRede([
      { portalSlug: PORTAL_A, ano: 2017, totalLeitosExistentes: 20 },
      { portalSlug: PORTAL_A, ano: 2020 },
      { portalSlug: PORTAL_A, ano: 2027, totalProfissionais: 90 },
    ]);

    const resultado = await getSaudeRedePorMilMoradores(PORTAL_A);

    expect(resultado?.serie.map((a) => a.ano)).toEqual([2017, 2027]);
    expect(resultado?.anoMin).toBe(2017);
    expect(resultado?.anoMax).toBe(2027);
  });

  it("devolve null quando nenhum ano trouxe dado", async () => {
    await seedSaudeRede([{ portalSlug: PORTAL_A, ano: 2024 }]);

    expect(await getSaudeRedePorMilMoradores(PORTAL_A)).toBeNull();
  });

  it("marca como estimada a população do último ano anterior", async () => {
    await seedSaudeRede([
      {
        portalSlug: PORTAL_A,
        ano: 2026,
        totalLeitosExistentes: 40,
        populacaoResidente: 10000,
        anoPopulacaoReferencia: 2025,
        populacaoEstimada: true,
        leitosExistentesPorMilMoradores: 4,
      },
    ]);

    const [ano] = (await getSaudeRedePorMilMoradores(PORTAL_A))?.serie ?? [];

    expect(ano.populacaoEstimada).toBe(true);
    expect(ano.anoPopulacaoReferencia).toBe(2025);
    expect(ano.leitosExistentesPorMilMoradores).toBe(4);
  });
});
