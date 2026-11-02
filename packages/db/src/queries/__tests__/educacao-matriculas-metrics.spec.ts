import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedEducacaoMatriculas,
} from "../../../tests/fixtures/seed";
import { getEducacaoMatriculas } from "../educacao-matriculas-metrics";

const PORTAL_A = createFixturePortalSlug();
const PORTAL_B = createFixturePortalSlug();

afterEach(async () => {
  await Promise.all([cleanupFixtures(PORTAL_A), cleanupFixtures(PORTAL_B)]);
});

describe("getEducacaoMatriculas", () => {
  it("usa o Censo mais recente até o ano pedido", async () => {
    await seedEducacaoMatriculas([
      {
        portalSlug: PORTAL_A,
        ano: 2023,
        matriculasEducacaoInfantil: 100,
        matriculasEnsinoFundamental: 1900,
      },
      {
        portalSlug: PORTAL_A,
        ano: 2024,
        matriculasEducacaoInfantil: 100,
        matriculasEnsinoFundamental: 2001,
      },
    ]);

    const exato = await getEducacaoMatriculas({
      portalSlug: PORTAL_A,
      ano: 2024,
    });
    expect(exato).toMatchObject({
      anoCenso: 2024,
      matriculasEnsinoFundamental: 2001,
      matriculasEducacaoBasica: 2101,
    });

    const posterior = await getEducacaoMatriculas({
      portalSlug: PORTAL_A,
      ano: 2026,
    });
    expect(posterior?.anoCenso).toBe(2024);

    const anterior = await getEducacaoMatriculas({
      portalSlug: PORTAL_A,
      ano: 2023,
    });
    expect(anterior?.matriculasEnsinoFundamental).toBe(1900);
  });

  it("devolve null sem registro até o ano e não mistura portais", async () => {
    await seedEducacaoMatriculas([
      {
        portalSlug: PORTAL_B,
        ano: 2024,
        matriculasEducacaoInfantil: 100,
        matriculasEnsinoFundamental: 500,
      },
      {
        portalSlug: PORTAL_A,
        ano: 2024,
        matriculasEducacaoInfantil: 100,
        matriculasEnsinoFundamental: 2001,
      },
    ]);

    expect(
      await getEducacaoMatriculas({ portalSlug: PORTAL_A, ano: 2020 }),
    ).toBeNull();
    expect(
      await getEducacaoMatriculas({ portalSlug: PORTAL_B, ano: 2024 }),
    ).toMatchObject({ matriculasEnsinoFundamental: 500 });
    expect(
      await getEducacaoMatriculas({ portalSlug: "", ano: 2024 }),
    ).toBeNull();
  });
});
