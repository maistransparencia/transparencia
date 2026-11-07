import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedDimMetadata,
  seedSaudeOrigemRecursos,
} from "../../../tests/fixtures/seed";
import { getSaudeOrigemRecursos } from "../saude-origem-recursos";

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

describe("getSaudeOrigemRecursos", () => {
  it("retorna null quando o portal não tem receitas de órgão de Saúde", async () => {
    expect(
      await getSaudeOrigemRecursos({ portalSlug: PORTAL_SEM_FUNDO, ano: 2025 }),
    ).toBeNull();
  });

  it("agrupa por esfera, calcula percentuais, histórico e composição", async () => {
    await seedSaudeOrigemRecursos([
      {
        portalSlug: PORTAL_A,
        empresaId: "2",
        orgaoNome: "FUNDO MUNICIPAL DE SAUDE",
        ano: 2024,
        grupoFonte: "uniao",
        codigoNatureza: "1713.50",
        descricaoNatureza: "SUS",
        arrecadadoReceita: 500,
      },
      {
        portalSlug: PORTAL_A,
        empresaId: "2",
        ano: 2025,
        grupoFonte: "uniao",
        codigoNatureza: "1713.50",
        descricaoNatureza: "SUS",
        arrecadadoReceita: 600,
      },
      {
        portalSlug: PORTAL_A,
        empresaId: "2",
        ano: 2025,
        grupoFonte: "estado",
        codigoNatureza: "1723.50",
        descricaoNatureza: "Estado SUS",
        arrecadadoReceita: 300,
      },
      {
        portalSlug: PORTAL_A,
        empresaId: "2",
        ano: 2025,
        grupoFonte: "outras_receitas",
        codigoNatureza: "1321.01.a",
        descricaoNatureza: "Rendimentos A",
        arrecadadoReceita: 40,
      },
      {
        portalSlug: PORTAL_A,
        empresaId: "2",
        ano: 2025,
        grupoFonte: "outras_receitas",
        codigoNatureza: "1321.01.b",
        descricaoNatureza: "Rendimentos B",
        arrecadadoReceita: 60,
      },
    ]);

    const resultado = await getSaudeOrigemRecursos({
      portalSlug: PORTAL_A,
      ano: 2025,
    });

    expect(resultado?.nomeOrgao).toBe("FUNDO MUNICIPAL DE SAUDE");
    expect(resultado?.anoMin).toBe(2024);
    expect(resultado?.anoMax).toBe(2025);
    expect(resultado?.totalArrecadado).toBe(1000);
    expect(resultado?.fontes.map((f) => f.grupoFonte)).toEqual([
      "uniao",
      "estado",
      "outras_receitas",
    ]);
    expect(resultado?.fontes.map((f) => f.percentualTotal)).toEqual([
      60, 30, 10,
    ]);
    expect(resultado?.fontes[0]?.historicoAnual).toEqual([
      { ano: 2024, totalArrecadado: 500 },
      { ano: 2025, totalArrecadado: 600 },
    ]);
    expect(
      resultado?.fontes[2]?.composicao.map((c) => c.codigoNatureza),
    ).toEqual(["1321.01.b", "1321.01.a"]);
  });

  it("não inclui esfera sem valor no ano e devolve total zero", async () => {
    await seedSaudeOrigemRecursos({
      portalSlug: PORTAL_A,
      ano: 2024,
      grupoFonte: "uniao",
      codigoNatureza: "1713.50",
      arrecadadoReceita: 500,
    });

    const resultado = await getSaudeOrigemRecursos({
      portalSlug: PORTAL_A,
      ano: 2025,
    });

    expect(resultado?.fontes).toEqual([]);
    expect(resultado?.totalArrecadado).toBe(0);
    expect(resultado?.anoMax).toBe(2024);
  });

  it("isola os dados por portal", async () => {
    await seedSaudeOrigemRecursos([
      {
        portalSlug: PORTAL_A,
        ano: 2025,
        grupoFonte: "uniao",
        codigoNatureza: "1713.50",
        arrecadadoReceita: 100,
      },
      {
        portalSlug: PORTAL_B,
        ano: 2025,
        grupoFonte: "uniao",
        codigoNatureza: "1713.50",
        arrecadadoReceita: 900,
      },
    ]);

    const [a, b] = await Promise.all([
      getSaudeOrigemRecursos({ portalSlug: PORTAL_A, ano: 2025 }),
      getSaudeOrigemRecursos({ portalSlug: PORTAL_B, ano: 2025 }),
    ]);

    expect(a?.totalArrecadado).toBe(100);
    expect(b?.totalArrecadado).toBe(900);
  });

  it("ignora anos anteriores ao ano inicial do município", async () => {
    await seedSaudeOrigemRecursos(
      [2019, 2020, 2021, 2022].map((ano) => ({
        portalSlug: PORTAL_A,
        ano,
        grupoFonte: "uniao",
        codigoNatureza: "1713.50",
        arrecadadoReceita: 100,
      })),
    );

    const resultado = await getSaudeOrigemRecursos({
      portalSlug: PORTAL_A,
      ano: 2022,
      anoInicial: 2021,
    });

    expect(resultado?.anoMin).toBe(2021);
    expect(resultado?.fontes[0]?.historicoAnual.map((p) => p.ano)).toEqual([
      2021, 2022,
    ]);
    expect(
      await getSaudeOrigemRecursos({
        portalSlug: PORTAL_A,
        ano: 2022,
        anoInicial: 2030,
      }),
    ).toBeNull();
  });

  it("marca o ano em andamento pela data da última extração", async () => {
    await seedSaudeOrigemRecursos({
      portalSlug: PORTAL_A,
      ano: 2025,
      grupoFonte: "uniao",
      codigoNatureza: "1713.50",
      arrecadadoReceita: 100,
    });
    await seedDimMetadata({
      portalSlug: PORTAL_A,
      key: "last_extracted_at",
      value: "2025-06-15T10:00:00Z",
    });

    const resultado = await getSaudeOrigemRecursos({
      portalSlug: PORTAL_A,
      ano: 2025,
    });

    expect(resultado?.anoParcial).toBe(2025);
    expect(resultado?.mesReferencia).toBe(6);
  });
});
