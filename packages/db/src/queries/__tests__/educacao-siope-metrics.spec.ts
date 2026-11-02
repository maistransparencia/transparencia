import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedEducacaoSiope,
} from "../../../tests/fixtures/seed";
import { getEducacaoSiope } from "../educacao-siope-metrics";

const PORTAL_A = createFixturePortalSlug();
const PORTAL_B = createFixturePortalSlug();

afterEach(async () => {
  await Promise.all([cleanupFixtures(PORTAL_A), cleanupFixtures(PORTAL_B)]);
});

describe("getEducacaoSiope", () => {
  it("devolve o ano encerrado e a série anual em ordem crescente", async () => {
    await seedEducacaoSiope([
      {
        portalSlug: PORTAL_A,
        ano: 2025,
        investimentoPorAluno: 16767.14,
        percentualAplicadoMde: 27.5,
      },
      { portalSlug: PORTAL_A, ano: 2024, investimentoPorAluno: 16789.15 },
    ]);

    const resultado = await getEducacaoSiope({
      portalSlug: PORTAL_A,
      ano: 2025,
    });

    expect(resultado.portalSlug).toBe(PORTAL_A);
    expect(resultado.atual).toMatchObject({
      ano: 2025,
      periodo: 6,
      situacao: "encerrado",
      investimentoPorAluno: 16767.14,
      percentualAplicadoMde: 27.5,
    });
    expect(
      resultado.serie.map((item) => [item.ano, item.investimentoPorAluno]),
    ).toEqual([
      [2024, 16789.15],
      [2025, 16767.14],
    ]);
  });

  it("marca o ano em andamento como parcial", async () => {
    await seedEducacaoSiope({
      portalSlug: PORTAL_A,
      ano: 2026,
      periodo: 4,
      situacao: "parcial",
      investimentoPorAluno: 11325.75,
    });

    const { atual } = await getEducacaoSiope({
      portalSlug: PORTAL_A,
      ano: 2026,
    });

    expect(atual).toMatchObject({ periodo: 4, situacao: "parcial" });
  });

  it("mantém indicador ausente como null, nunca zero", async () => {
    await seedEducacaoSiope({
      portalSlug: PORTAL_A,
      ano: 2025,
      investimentoPorAluno: 100,
    });

    const { atual } = await getEducacaoSiope({
      portalSlug: PORTAL_A,
      ano: 2025,
    });

    expect(atual?.investimentoPorAlunoInfantil).toBeNull();
    expect(atual?.percentualAplicadoMde).toBeNull();
    expect(atual?.percentualAplicadoFundebProfissionais).toBeNull();
  });

  it("retorna atual nulo quando o ano não existe, preservando a série", async () => {
    await seedEducacaoSiope({ portalSlug: PORTAL_A, ano: 2024 });

    const resultado = await getEducacaoSiope({
      portalSlug: PORTAL_A,
      ano: 2030,
    });

    expect(resultado.atual).toBeNull();
    expect(resultado.serie).toHaveLength(1);
  });

  it("isola os portais que compartilham o mesmo ano", async () => {
    await seedEducacaoSiope([
      { portalSlug: PORTAL_A, ano: 2025, investimentoPorAluno: 1000 },
      { portalSlug: PORTAL_B, ano: 2025, investimentoPorAluno: 9999 },
      { portalSlug: PORTAL_B, ano: 2023, investimentoPorAluno: 8888 },
    ]);

    const resultado = await getEducacaoSiope({
      portalSlug: PORTAL_A,
      ano: 2025,
    });

    expect(resultado.atual?.investimentoPorAluno).toBe(1000);
    expect(resultado.serie.map((item) => item.ano)).toEqual([2025]);
  });

  it("não consulta com slug vazio", async () => {
    expect(await getEducacaoSiope({ portalSlug: "  ", ano: 2025 })).toEqual({
      portalSlug: "",
      ano: 2025,
      atual: null,
      serie: [],
    });
  });
});
