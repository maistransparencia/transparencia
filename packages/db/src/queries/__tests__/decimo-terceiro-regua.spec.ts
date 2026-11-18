import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  type PessoalDecimoTerceiroMensalRow,
  seedPessoalDecimoTerceiroMensal,
} from "../../../tests/fixtures/seed";
import { TEST_YEAR } from "../../test-helpers";
import { getExecucaoDecimoTerceiroMetrics } from "../pessoal-metrics";

const PORTAL = createFixturePortalSlug();
const ANO_ANTERIOR = TEST_YEAR - 1;

afterEach(async () => {
  await cleanupFixtures(PORTAL);
});

const seed = (
  linhas: Omit<PessoalDecimoTerceiroMensalRow, "portalSlug">[],
): Promise<undefined[]> =>
  Promise.all(
    linhas.map((linha) =>
      seedPessoalDecimoTerceiroMensal({ portalSlug: PORTAL, ...linha }),
    ),
  );

const grupo = (
  dto: Awaited<ReturnType<typeof getExecucaoDecimoTerceiroMetrics>>,
  codigo: string,
) => dto?.grupos.find((item) => item.grupo === codigo);

describe("getExecucaoDecimoTerceiroMetrics: régua do ano anterior", () => {
  it("ano corrente abaixo do anterior no mesmo mês, com um grupo por vez", async () => {
    await seed([
      {
        ano: TEST_YEAR,
        grupoBeneficiario: "inativos_pensionistas",
        mesEmpenho: 6,
        pago13: 1_000,
      },
      {
        ano: TEST_YEAR,
        grupoBeneficiario: "ativos",
        mesEmpenho: 6,
        pago13: 20,
      },
      {
        ano: ANO_ANTERIOR,
        grupoBeneficiario: "inativos_pensionistas",
        mesEmpenho: 6,
        pago13: 900,
      },
      {
        ano: ANO_ANTERIOR,
        grupoBeneficiario: "ativos",
        mesEmpenho: 6,
        pago13: 100,
      },
      {
        ano: ANO_ANTERIOR,
        grupoBeneficiario: "ativos",
        mesEmpenho: 8,
        pago13: 2_000,
      },
      {
        ano: ANO_ANTERIOR,
        grupoBeneficiario: "ativos",
        mesEmpenho: 12,
        pago13: 3_000,
      },
    ]);

    const dto = await getExecucaoDecimoTerceiroMetrics(PORTAL, TEST_YEAR);

    expect(dto).toMatchObject({
      ano: TEST_YEAR,
      anoAnterior: ANO_ANTERIOR,
      mesReferencia: 6,
      pago: 1_020,
      pagoAnoAnterior: 6_000,
      pagoAnoAnteriorAteMesmoMes: 1_000,
    });
    expect(grupo(dto, "ativos")).toEqual({
      grupo: "ativos",
      pago: 20,
      pagoAnoAnterior: 5_100,
      pagoAnoAnteriorAteMesmoMes: 100,
      abaixoDoMesmoPeriodo: true,
    });
    expect(grupo(dto, "inativos_pensionistas")).toEqual({
      grupo: "inativos_pensionistas",
      pago: 1_000,
      pagoAnoAnterior: 900,
      pagoAnoAnteriorAteMesmoMes: 900,
      abaixoDoMesmoPeriodo: false,
    });
  });

  it("ano corrente igual ou acima do anterior no mesmo mês", async () => {
    await seed([
      {
        ano: TEST_YEAR,
        grupoBeneficiario: "ativos",
        mesEmpenho: 8,
        pago13: 500,
      },
      {
        ano: ANO_ANTERIOR,
        grupoBeneficiario: "ativos",
        mesEmpenho: 8,
        pago13: 500,
      },
    ]);

    const dto = await getExecucaoDecimoTerceiroMetrics(PORTAL, TEST_YEAR);

    expect(grupo(dto, "ativos")?.pago).toBe(
      grupo(dto, "ativos")?.pagoAnoAnteriorAteMesmoMes,
    );
  });

  it("sem ano anterior devolve só o pago acumulado", async () => {
    await seed([
      {
        ano: TEST_YEAR,
        grupoBeneficiario: "ativos",
        mesEmpenho: 6,
        pago13: 300,
      },
    ]);

    const dto = await getExecucaoDecimoTerceiroMetrics(PORTAL, TEST_YEAR);

    expect(dto?.anoAnterior).toBeNull();
    expect(dto?.pago).toBe(300);
    expect(grupo(dto, "ativos")).toMatchObject({
      pagoAnoAnterior: null,
      pagoAnoAnteriorAteMesmoMes: null,
    });
  });

  it("pago zerado ainda devolve o card com zero", async () => {
    await seed([
      { ano: TEST_YEAR, grupoBeneficiario: "ativos", mesEmpenho: 6, pago13: 0 },
    ]);

    expect(
      (await getExecucaoDecimoTerceiroMetrics(PORTAL, TEST_YEAR))?.pago,
    ).toBe(0);
  });

  it("município sem 13º devolve null", async () => {
    expect(
      await getExecucaoDecimoTerceiroMetrics(PORTAL, TEST_YEAR),
    ).toBeNull();
  });

  it("grupo sem valor aparece zerado e a soma dos grupos é o total", async () => {
    await seed([
      {
        ano: TEST_YEAR,
        grupoBeneficiario: "inativos_pensionistas",
        mesEmpenho: 6,
        pago13: 700,
      },
      {
        ano: TEST_YEAR,
        grupoBeneficiario: "inativos_pensionistas",
        mesEmpenho: 12,
        pago13: 300,
      },
    ]);

    const dto = await getExecucaoDecimoTerceiroMetrics(PORTAL, TEST_YEAR);

    expect(grupo(dto, "ativos")?.pago).toBe(0);
    expect(dto?.grupos.reduce((total, item) => total + item.pago, 0)).toBe(
      dto?.pago,
    );
    expect(dto?.mesReferencia).toBe(12);
  });

  it("empresa filtrada não mistura outras empresas", async () => {
    await seed([
      {
        ano: TEST_YEAR,
        grupoBeneficiario: "ativos",
        mesEmpenho: 6,
        pago13: 100,
        empresaId: "1",
      },
      {
        ano: TEST_YEAR,
        grupoBeneficiario: "ativos",
        mesEmpenho: 6,
        pago13: 900,
        empresaId: "2",
      },
    ]);

    expect(
      (await getExecucaoDecimoTerceiroMetrics(PORTAL, TEST_YEAR, ["1"]))?.pago,
    ).toBe(100);
  });

  it("mês de referência é o último mês com qualquer despesa, não o do último 13º", async () => {
    await seed([
      {
        ano: TEST_YEAR,
        grupoBeneficiario: "ativos",
        mesEmpenho: 6,
        mesUltimoRegistro: 10,
        pago13: 16,
      },
      {
        ano: ANO_ANTERIOR,
        grupoBeneficiario: "ativos",
        mesEmpenho: 6,
        pago13: 100,
      },
      {
        ano: ANO_ANTERIOR,
        grupoBeneficiario: "ativos",
        mesEmpenho: 8,
        pago13: 2_000,
      },
    ]);

    const dto = await getExecucaoDecimoTerceiroMetrics(PORTAL, TEST_YEAR);

    expect(dto?.mesReferencia).toBe(10);
    expect(grupo(dto, "ativos")?.pagoAnoAnteriorAteMesmoMes).toBe(2_100);
  });
});
