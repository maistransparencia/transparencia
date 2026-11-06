import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedSaudeMinimo,
} from "../../../tests/fixtures/seed";
import { getSaudeMinimoConstitucional } from "../saude-minimo-constitucional";

const PORTAL_A = createFixturePortalSlug();
const PORTAL_B = createFixturePortalSlug();

afterEach(async () => {
  await Promise.all([cleanupFixtures(PORTAL_A), cleanupFixtures(PORTAL_B)]);
});

describe("getSaudeMinimoConstitucional", () => {
  it("compara o ano encerrado com o mínimo em pontos percentuais", async () => {
    await seedSaudeMinimo([
      {
        portalSlug: PORTAL_A,
        ano: 2023,
        percentualAplicadoSaude: 14.2,
        minimoAplicacaoSaudePercentual: 15,
        cumpreMinimo: false,
      },
      {
        portalSlug: PORTAL_A,
        ano: 2024,
        percentualAplicadoSaude: 21.4,
        minimoAplicacaoSaudePercentual: 15,
        cumpreMinimo: true,
        coletadoEm: "2026-11-01T10:00:00Z",
      },
    ]);

    const resultado = await getSaudeMinimoConstitucional({
      portalSlug: PORTAL_A,
      ano: 2024,
    });

    expect(resultado.minimo).toMatchObject({
      limite: 15,
      percentualAplicado: 21.4,
      resultado: "cumpriu",
    });
    expect(resultado.atual?.coletadoEm).toBe("2026-11-01T10:00:00.000Z");
    expect(resultado.serie.map((item) => item.ano)).toEqual([2023, 2024]);
    expect([resultado.anoInicial, resultado.anoFinal]).toEqual([2023, 2024]);
  });

  it("marca abaixo do mínimo sem tratar como zero", async () => {
    await seedSaudeMinimo({
      portalSlug: PORTAL_A,
      ano: 2023,
      percentualAplicadoSaude: 14.2,
      minimoAplicacaoSaudePercentual: 15,
      cumpreMinimo: false,
    });

    const { minimo } = await getSaudeMinimoConstitucional({
      portalSlug: PORTAL_A,
      ano: 2023,
    });

    expect(minimo.resultado).toBe("abaixo");
  });

  it("não compara o ano parcial com o mínimo, mesmo acima de 100%", async () => {
    await seedSaudeMinimo({
      portalSlug: PORTAL_A,
      ano: 2026,
      periodo: 3,
      situacao: "parcial",
      percentualAplicadoSaude: 121.91,
      minimoAplicacaoSaudePercentual: 15,
      cumpreMinimo: null,
    });

    const resultado = await getSaudeMinimoConstitucional({
      portalSlug: PORTAL_A,
      ano: 2026,
    });

    expect(resultado.minimo.resultado).toBe("parcial");
    expect(resultado.atual?.situacao).toBe("parcial");
    expect(resultado.serie).toEqual([]);
  });

  it("devolve indeterminado quando as vias divergem e cita os indicadores", async () => {
    await seedSaudeMinimo({
      portalSlug: PORTAL_A,
      ano: 2024,
      percentualAplicadoSaude: 20,
      minimoAplicacaoSaudePercentual: 15,
      cumpreMinimo: null,
      divergenciaEntreVias: true,
      indicadoresDivergentes:
        "percentual_aplicado_saude,despesa_saude_por_habitante",
    });

    const resultado = await getSaudeMinimoConstitucional({
      portalSlug: PORTAL_A,
      ano: 2024,
    });

    expect(resultado.minimo.resultado).toBe("indeterminado");
    expect(resultado.atual?.divergenciaEntreVias).toBe(true);
    expect(resultado.atual?.indicadoresDivergentes).toEqual([
      "percentual_aplicado_saude",
      "despesa_saude_por_habitante",
    ]);
  });

  it("devolve sem_dado e preserva nulo quando não há linha ou transmissão", async () => {
    await seedSaudeMinimo({
      portalSlug: PORTAL_A,
      ano: 2022,
      situacao: "sem_dado",
      minimoAplicacaoSaudePercentual: 15,
    });

    const semTransmissao = await getSaudeMinimoConstitucional({
      portalSlug: PORTAL_A,
      ano: 2022,
    });
    const semLinha = await getSaudeMinimoConstitucional({
      portalSlug: PORTAL_A,
      ano: 2026,
    });

    expect(semTransmissao.minimo.resultado).toBe("sem_dado");
    expect(semTransmissao.atual?.percentualAplicadoSaude).toBeNull();
    expect(semLinha.atual).toBeNull();
    expect(semLinha.minimo.percentualAplicado).toBeNull();
    expect(semLinha.minimo.resultado).toBe("sem_dado");
    expect(semTransmissao.serie).toEqual([]);
    expect(semTransmissao.anoInicial).toBeNull();
  });

  it("isola os portais e devolve vazio para slug em branco", async () => {
    await seedSaudeMinimo([
      { portalSlug: PORTAL_A, ano: 2024, percentualAplicadoSaude: 18 },
      { portalSlug: PORTAL_B, ano: 2024, percentualAplicadoSaude: 30 },
    ]);

    const b = await getSaudeMinimoConstitucional({
      portalSlug: PORTAL_B,
      ano: 2024,
    });
    const vazio = await getSaudeMinimoConstitucional({
      portalSlug: "  ",
      ano: 2024,
    });

    expect(b.atual?.percentualAplicadoSaude).toBe(30);
    expect(b.serie).toHaveLength(1);
    expect(vazio.atual).toBeNull();
    expect(vazio.minimo.resultado).toBe("sem_dado");
  });
});
