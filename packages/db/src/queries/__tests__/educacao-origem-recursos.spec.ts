import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedDimOrgao,
  seedEducacaoOrigemRecursos,
} from "../../../tests/fixtures/seed";
import { getEducacaoOrigemRecursos } from "../educacao-origem-recursos";

const PORTAL_A = createFixturePortalSlug();
const PORTAL_B = createFixturePortalSlug();
const PORTAL_SEM_FUNDO = createFixturePortalSlug();

afterEach(async () => {
  await Promise.all([
    cleanupFixtures(PORTAL_A),
    cleanupFixtures(PORTAL_B),
    cleanupFixtures(PORTAL_SEM_FUNDO),
  ]);
});

describe("getEducacaoOrigemRecursos", () => {
  it("retorna null quando o portal não tem órgão de Educação", async () => {
    await seedDimOrgao({
      portalSlug: PORTAL_SEM_FUNDO,
      empresaId: "1",
      orgaoNome: "Fundo Municipal de Saúde",
    });
    expect(
      await getEducacaoOrigemRecursos({
        portalSlug: PORTAL_SEM_FUNDO,
        ano: 2025,
      }),
    ).toBeNull();
  });

  it("agrupa por fonte, calcula percentuais, histórico e composição", async () => {
    await seedDimOrgao({
      portalSlug: PORTAL_A,
      empresaId: "8",
      orgaoNome: "Fundo Municipal de Educação",
    });
    await seedEducacaoOrigemRecursos([
      {
        portalSlug: PORTAL_A,
        empresaId: "8",
        ano: 2024,
        grupoFonte: "fundeb",
        codigoNatureza: "1751.50",
        descricaoNatureza: "FUNDEB",
        arrecadadoReceita: 500,
      },
      {
        portalSlug: PORTAL_A,
        empresaId: "8",
        ano: 2025,
        grupoFonte: "fundeb",
        codigoNatureza: "1751.50",
        descricaoNatureza: "FUNDEB",
        arrecadadoReceita: 600,
      },
      {
        portalSlug: PORTAL_A,
        empresaId: "8",
        ano: 2025,
        grupoFonte: "pnae",
        codigoNatureza: "1714.52",
        descricaoNatureza: "PNAE",
        arrecadadoReceita: 300,
      },
      {
        portalSlug: PORTAL_A,
        empresaId: "8",
        ano: 2025,
        grupoFonte: "outras_receitas",
        codigoNatureza: "1321.01.a",
        descricaoNatureza: "Rendimentos A",
        arrecadadoReceita: 40,
      },
      {
        portalSlug: PORTAL_A,
        empresaId: "8",
        ano: 2025,
        grupoFonte: "outras_receitas",
        codigoNatureza: "1321.01.b",
        descricaoNatureza: "Rendimentos B",
        arrecadadoReceita: 60,
      },
      {
        portalSlug: PORTAL_A,
        empresaId: "8",
        ano: 2025,
        grupoFonte: "pnate",
        codigoNatureza: "1714.53",
        descricaoNatureza: "PNATE",
        arrecadadoReceita: 0,
      },
    ]);

    const resultado = await getEducacaoOrigemRecursos({
      portalSlug: PORTAL_A,
      ano: 2025,
    });

    expect(resultado).not.toBeNull();
    expect(resultado?.nomeOrgao).toBe("Fundo Municipal de Educação");
    expect(resultado?.anoMin).toBe(2024);
    expect(resultado?.anoMax).toBe(2025);
    expect(resultado?.totalArrecadado).toBe(1000);
    expect(resultado?.fontes.map((f) => f.grupoFonte)).toEqual([
      "fundeb",
      "pnae",
      "outras_receitas",
    ]);
    expect(resultado?.fontes.map((f) => f.percentualTotal)).toEqual([
      60, 30, 10,
    ]);
    expect(resultado?.fontes[0]?.historicoAnual).toEqual([
      { ano: 2024, totalArrecadado: 500 },
      { ano: 2025, totalArrecadado: 600 },
    ]);
    expect(resultado?.fontes[2]?.composicao).toEqual([
      {
        codigoNatureza: "1321.01.b",
        descricaoNatureza: "Rendimentos B",
        totalArrecadado: 60,
      },
      {
        codigoNatureza: "1321.01.a",
        descricaoNatureza: "Rendimentos A",
        totalArrecadado: 40,
      },
    ]);
    const somaPercentuais = (resultado?.fontes ?? []).reduce(
      (acc, f) => acc + f.percentualTotal,
      0,
    );
    expect(somaPercentuais).toBeCloseTo(100, 6);
  });

  it("não inclui fonte sem valor no ano e retorna total zero sem receitas", async () => {
    await seedDimOrgao({
      portalSlug: PORTAL_A,
      empresaId: "8",
      orgaoNome: "Fundo Municipal de Educação",
    });
    await seedEducacaoOrigemRecursos({
      portalSlug: PORTAL_A,
      empresaId: "8",
      ano: 2024,
      grupoFonte: "fundeb",
      codigoNatureza: "1751.50",
      descricaoNatureza: "FUNDEB",
      arrecadadoReceita: 500,
    });

    const resultado = await getEducacaoOrigemRecursos({
      portalSlug: PORTAL_A,
      ano: 2025,
    });

    expect(resultado?.fontes).toEqual([]);
    expect(resultado?.totalArrecadado).toBe(0);
    expect(resultado?.anoMax).toBe(2024);
  });

  it("isola os dados por portal", async () => {
    await seedDimOrgao({
      portalSlug: PORTAL_A,
      empresaId: "8",
      orgaoNome: "Fundo Municipal de Educação",
    });
    await seedDimOrgao({
      portalSlug: PORTAL_B,
      empresaId: "8",
      orgaoNome: "Fundo Municipal de Educação e Cultura",
    });
    await seedEducacaoOrigemRecursos([
      {
        portalSlug: PORTAL_A,
        empresaId: "8",
        ano: 2025,
        grupoFonte: "fundeb",
        codigoNatureza: "1751.50",
        arrecadadoReceita: 100,
      },
      {
        portalSlug: PORTAL_B,
        empresaId: "8",
        ano: 2025,
        grupoFonte: "fundeb",
        codigoNatureza: "1751.50",
        arrecadadoReceita: 900,
      },
    ]);

    const [a, b] = await Promise.all([
      getEducacaoOrigemRecursos({ portalSlug: PORTAL_A, ano: 2025 }),
      getEducacaoOrigemRecursos({ portalSlug: PORTAL_B, ano: 2025 }),
    ]);

    expect(a?.totalArrecadado).toBe(100);
    expect(b?.totalArrecadado).toBe(900);
    expect(b?.nomeOrgao).toBe("Fundo Municipal de Educação e Cultura");
  });
});

describe("getEducacaoOrigemRecursos nao_detalhado", () => {
  it("inclui a fonte não detalhada por último e sem composição", async () => {
    await seedDimOrgao({
      portalSlug: PORTAL_A,
      empresaId: "8",
      orgaoNome: "Fundo Municipal de Educação",
    });
    await seedEducacaoOrigemRecursos([
      {
        portalSlug: PORTAL_A,
        empresaId: "8",
        ano: 2025,
        grupoFonte: "nao_detalhado",
        codigoNatureza: "nao_detalhado",
        descricaoNatureza: "Não detalhado",
        arrecadadoReceita: 50,
      },
      {
        portalSlug: PORTAL_A,
        empresaId: "8",
        ano: 2025,
        grupoFonte: "fundeb",
        codigoNatureza: "1751.50",
        arrecadadoReceita: 150,
      },
    ]);
    const resultado = await getEducacaoOrigemRecursos({
      portalSlug: PORTAL_A,
      ano: 2025,
    });
    expect(resultado?.fontes.map((f) => f.grupoFonte)).toEqual([
      "fundeb",
      "nao_detalhado",
    ]);
    expect(resultado?.fontes[1]?.composicao).toEqual([]);
    expect(resultado?.fontes[1]?.percentualTotal).toBe(25);
  });
});
