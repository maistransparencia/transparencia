import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedSaldoCaixaSiconfi,
} from "../../../tests/fixtures/seed";
import { getSiconfiPosicaoFinanceira } from "../siconfi-caixa-metrics";

const PORTAL = createFixturePortalSlug();

afterEach(async () => {
  await cleanupFixtures(PORTAL);
});

describe("getSiconfiPosicaoFinanceira", () => {
  it("retorna null quando não há registros para o portal e ano", async () => {
    const result = await getSiconfiPosicaoFinanceira(PORTAL, 2030);
    expect(result).toBeNull();
  });

  it("retorna a última competência homologada por padrão quando mês não é especificado", async () => {
    // Mês 11 (não é a última competência)
    await seedSaldoCaixaSiconfi({
      portalSlug: PORTAL,
      ano: 2024,
      mesReferencia: 11,
      poderOrgao: "10131",
      grupoDestinacao: "livre",
      empresaId: "7",
      orgaoNome: "PREFEITURA MUNICIPAL",
      entidadeNome: "PREFEITURA MUNICIPAL",
      cnpj: "28920999000106",
      dataReferencia: "2024-11-30",
      saldoCaixaBancos: 3000000,
      saldoRecursosLivres: 3000000,
      saldoRecursosVinculados: 0,
      ultimaCompetenciaFlag: false,
    });

    // Mês 12 (última competência homologada do exercício)
    await seedSaldoCaixaSiconfi({
      portalSlug: PORTAL,
      ano: 2024,
      mesReferencia: 12,
      poderOrgao: "10131",
      grupoDestinacao: "livre",
      empresaId: "7",
      orgaoNome: "PREFEITURA MUNICIPAL",
      entidadeNome: "PREFEITURA MUNICIPAL",
      cnpj: "28920999000106",
      dataReferencia: "2024-12-31",
      saldoCaixaBancos: 5000000,
      saldoRecursosLivres: 5000000,
      saldoRecursosVinculados: 0,
      ultimaCompetenciaFlag: true,
    });

    await seedSaldoCaixaSiconfi({
      portalSlug: PORTAL,
      ano: 2024,
      mesReferencia: 12,
      poderOrgao: "10131",
      grupoDestinacao: "saude",
      empresaId: "2",
      orgaoNome: "FUNDO MUNICIPAL DE SAUDE",
      entidadeNome: "FUNDO MUNICIPAL DE SAUDE",
      cnpj: "12097798000110",
      dataReferencia: "2024-12-31",
      saldoCaixaBancos: 1200000,
      saldoRecursosLivres: 0,
      saldoRecursosVinculados: 1200000,
      ultimaCompetenciaFlag: true,
    });

    const result = await getSiconfiPosicaoFinanceira(PORTAL, 2024);

    expect(result).not.toBeNull();
    expect(result?.portalSlug).toBe(PORTAL);
    expect(result?.ano).toBe(2024);
    expect(result?.mesMaisRecente).toBe(12);
    expect(result?.dataHomologacao).toBe("2024-12-31");
    expect(result?.totalCaixaGeral).toBe(6200000);
    expect(result?.totalRecursosLivres).toBe(5000000);
    expect(result?.totalRecursosVinculados).toBe(1200000);
    expect(result?.entidades).toHaveLength(2);

    // Garante que a Câmara Municipal não está presente em nenhuma entidade
    expect(result?.entidades.some((e) => e.poderOrgao === "20231")).toBe(false);
  });

  it("permite filtrar por mês de competência específico", async () => {
    await seedSaldoCaixaSiconfi({
      portalSlug: PORTAL,
      ano: 2024,
      mesReferencia: 6,
      poderOrgao: "10131",
      grupoDestinacao: "livre",
      empresaId: "7",
      orgaoNome: "PREFEITURA MUNICIPAL",
      entidadeNome: "PREFEITURA MUNICIPAL",
      cnpj: "28920999000106",
      dataReferencia: "2024-06-30",
      saldoCaixaBancos: 2500000,
      saldoRecursosLivres: 2500000,
      saldoRecursosVinculados: 0,
      ultimaCompetenciaFlag: false,
    });

    const result = await getSiconfiPosicaoFinanceira(PORTAL, 2024, 6);

    expect(result).not.toBeNull();
    expect(result?.mesMaisRecente).toBe(6);
    expect(result?.totalCaixaGeral).toBe(2500000);
    expect(result?.entidades).toHaveLength(1);
    expect(result?.entidades[0].empresaId).toBe("7");
    expect(result?.entidades[0].grupoDestinacao).toBe("livre");
  });
});
