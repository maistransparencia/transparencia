import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedCapremPatrimonioHistorico,
  seedCapremTendenciaAtuarial,
  seedHistoriaCaprem,
} from "../../../tests/fixtures/seed";
import { PORTAL_SLUG, TEST_YEAR } from "../../test-helpers";
import {
  getCapremActuarialTrendMetrics,
  getCapremCadprevMetrics,
  getCapremEntidadesMetrics,
  getCapremNaturezaMetrics,
  getCapremPatrimonioHistoricoMetrics,
  getHistoriaCapremMetrics,
} from "../historia-caprem-metrics";

const PORTAL = createFixturePortalSlug();

afterEach(async () => {
  await cleanupFixtures(PORTAL);
});

describe("getHistoriaCapremMetrics", () => {
  it("retorna os valores exatos semeados para o portal/ano", async () => {
    await seedHistoriaCaprem({
      portalSlug: PORTAL,
      ano: 2030,
      totalAporteExigido: 1000,
      totalAporteQuitado: 700,
      taxaAdimplenciaAporte: 70,
      totalEmpenhadoPatronal: 900,
      totalPagoPatronal: 500,
      romboPatronalNaoRepassado: 400,
      totalAmortizacaoDivida: 150,
      servidoresEfetivos: 30,
      servidoresTemporarios: 5,
    });

    const result = await getHistoriaCapremMetrics(PORTAL, 2030);

    expect(result).not.toBeNull();
    expect(result?.totalAporteExigido).toBe(1000);
    expect(result?.taxaAdimplenciaAporte).toBe(70);
    expect(result?.romboPatronalNaoRepassado).toBe(400);
    expect(result?.servidoresEfetivos).toBe(30);
  });

  it("respeita o isolamento por portal: retorna null para outro portal mesmo com dados no ano", async () => {
    await seedHistoriaCaprem({
      portalSlug: PORTAL,
      ano: 2030,
      totalAporteExigido: 1000,
    });

    const result = await getHistoriaCapremMetrics(
      "outro_portal_sem_dados",
      2030,
    );

    expect(result).toBeNull();
  });

  it("retorna null quando não há dados para o ano informado", async () => {
    await seedHistoriaCaprem({
      portalSlug: PORTAL,
      ano: 2030,
      totalAporteExigido: 1000,
    });

    const result = await getHistoriaCapremMetrics(PORTAL, 1999);

    expect(result).toBeNull();
  });
});

// As funções abaixo têm fallbacks e joins mais complexos (ver historia-caprem-metrics.ts);
// aqui só validamos que a camada de query não quebra e devolve o shape esperado mesmo
// contra tabelas vazias — a lógica de negócio em si já é coberta pelos testes dbt.
describe("getCapremEntidadesMetrics / getCapremNaturezaMetrics / getCapremActuarialTrendMetrics / getCapremCadprevMetrics (smoke)", () => {
  it("não quebram e retornam arrays mesmo sem dados", async () => {
    const entidades = await getCapremEntidadesMetrics(PORTAL_SLUG, TEST_YEAR);
    expect(Array.isArray(entidades)).toBe(true);

    const natureza = await getCapremNaturezaMetrics(PORTAL_SLUG, TEST_YEAR);
    expect(Array.isArray(natureza)).toBe(true);

    const trend = await getCapremActuarialTrendMetrics(PORTAL_SLUG);
    expect(Array.isArray(trend)).toBe(true);

    const cadprev = await getCapremCadprevMetrics(PORTAL_SLUG, TEST_YEAR);
    expect(Array.isArray(cadprev)).toBe(true);

    const patrimonio = await getCapremPatrimonioHistoricoMetrics(PORTAL_SLUG);
    expect(Array.isArray(patrimonio)).toBe(true);
  });
});

describe("getCapremPatrimonioHistoricoMetrics", () => {
  it("retorna série histórica ordenada por ano com valores e variações exatos", async () => {
    await seedCapremPatrimonioHistorico({
      portalSlug: PORTAL,
      ano: 2021,
      mesReferencia: 12,
      saldoCaixa: 4587826.77,
      saldoAplicacoes: 55780952.2,
      patrimonioTotal: 60368778.97,
      variacaoAbs: null,
      variacaoPct: null,
    });

    await seedCapremPatrimonioHistorico({
      portalSlug: PORTAL,
      ano: 2025,
      mesReferencia: 12,
      saldoCaixa: 333572.3,
      saldoAplicacoes: 35644993.45,
      patrimonioTotal: 35978565.75,
      variacaoAbs: -3105708.03,
      variacaoPct: -7.95,
    });

    const series = await getCapremPatrimonioHistoricoMetrics(PORTAL);

    expect(series).toHaveLength(2);
    expect(series[0].ano).toBe(2021);
    expect(series[0].mesReferencia).toBe(12);
    expect(series[0].saldoCaixa).toBe(4587826.77);
    expect(series[0].saldoAplicacoes).toBe(55780952.2);
    expect(series[0].patrimonioTotal).toBe(60368778.97);
    expect(series[0].inconsistenciaDeclaracaoFlag).toBe(false);
    expect(series[0].variacaoAbs).toBeNull();
    expect(series[0].variacaoPct).toBeNull();

    expect(series[1].ano).toBe(2025);
    expect(series[1].mesReferencia).toBe(12);
    expect(series[1].saldoCaixa).toBe(333572.3);
    expect(series[1].saldoAplicacoes).toBe(35644993.45);
    expect(series[1].patrimonioTotal).toBe(35978565.75);
    expect(series[1].inconsistenciaDeclaracaoFlag).toBe(false);
    expect(series[1].variacaoAbs).toBe(-3105708.03);
    expect(series[1].variacaoPct).toBe(-7.95);
  });

  it("identifica inconsistência contábil de declaração e quebra de série", async () => {
    await seedCapremPatrimonioHistorico({
      portalSlug: PORTAL,
      ano: 2022,
      mesReferencia: 12,
      saldoCaixa: 722576.49,
      saldoAplicacoes: 0,
      patrimonioTotal: 722576.49,
      inconsistenciaDeclaracaoFlag: true,
      variacaoAbs: null,
      variacaoPct: null,
    });

    await seedCapremPatrimonioHistorico({
      portalSlug: PORTAL,
      ano: 2023,
      mesReferencia: 12,
      saldoCaixa: 27652.25,
      saldoAplicacoes: 45389092.39,
      patrimonioTotal: 45416744.64,
      inconsistenciaDeclaracaoFlag: false,
      variacaoAbs: null,
      variacaoPct: null,
    });

    const series = await getCapremPatrimonioHistoricoMetrics(PORTAL);
    expect(series).toHaveLength(2);

    expect(series[0].ano).toBe(2022);
    expect(series[0].inconsistenciaDeclaracaoFlag).toBe(true);
    expect(series[0].variacaoAbs).toBeNull();
    expect(series[0].variacaoPct).toBeNull();

    expect(series[1].ano).toBe(2023);
    expect(series[1].inconsistenciaDeclaracaoFlag).toBe(false);
    expect(series[1].variacaoAbs).toBeNull();
    expect(series[1].variacaoPct).toBeNull();
  });

  it("retorna array vazio para portal desconhecido", async () => {
    await seedCapremPatrimonioHistorico({
      portalSlug: PORTAL,
      ano: 2024,
      mesReferencia: 12,
      saldoCaixa: 0,
      saldoAplicacoes: 39084273.78,
    });

    const result = await getCapremPatrimonioHistoricoMetrics(
      "portal_desconhecido",
    );
    expect(result).toEqual([]);
  });
});

describe("getCapremActuarialTrendMetrics enriquecido", () => {
  it("enriquece as métricas de tendência atuarial com o patrimônio consolidado e variações", async () => {
    await seedCapremTendenciaAtuarial({
      portalSlug: PORTAL,
      ano: 2025,
      aporteExigido: 871311.17,
      aporteQuitado: 871311.17,
      taxaAdimplencia: 100,
      amortizacaoDivida: 144369.96,
    });

    await seedCapremPatrimonioHistorico({
      portalSlug: PORTAL,
      ano: 2025,
      mesReferencia: 12,
      saldoCaixa: 333572.3,
      saldoAplicacoes: 35644993.45,
      patrimonioTotal: 35978565.75,
      inconsistenciaDeclaracaoFlag: false,
      variacaoAbs: -3105708.03,
      variacaoPct: -7.95,
    });

    const trend = await getCapremActuarialTrendMetrics(PORTAL);

    expect(trend).toHaveLength(1);
    expect(trend[0].ano).toBe(2025);
    expect(trend[0].aporteExigido).toBe(871311.17);
    expect(trend[0].aporteQuitado).toBe(871311.17);
    expect(trend[0].amortizacaoDivida).toBe(144369.96);
    expect(trend[0].patrimonioFinanceiroTotal).toBe(35978565.75);
    expect(trend[0].inconsistenciaDeclaracaoFlag).toBe(false);
    expect(trend[0].variacaoPatrimonioAbs).toBe(-3105708.03);
    expect(trend[0].variacaoPatrimonioPct).toBe(-7.95);
  });

  it("retorna anos do patrimônio histórico mesmo sem registro em tendência atuarial", async () => {
    await seedCapremPatrimonioHistorico({
      portalSlug: PORTAL,
      ano: 2021,
      mesReferencia: 12,
      saldoCaixa: 4587826.77,
      saldoAplicacoes: 55780952.2,
      patrimonioTotal: 60368778.97,
      inconsistenciaDeclaracaoFlag: false,
      variacaoAbs: null,
      variacaoPct: null,
    });

    await seedCapremPatrimonioHistorico({
      portalSlug: PORTAL,
      ano: 2025,
      mesReferencia: 12,
      saldoCaixa: 333572.3,
      saldoAplicacoes: 35644993.45,
      patrimonioTotal: 35978565.75,
      inconsistenciaDeclaracaoFlag: false,
      variacaoAbs: -3105708.03,
      variacaoPct: -7.95,
    });

    await seedCapremTendenciaAtuarial({
      portalSlug: PORTAL,
      ano: 2025,
      aporteExigido: 871311.17,
      aporteQuitado: 871311.17,
      taxaAdimplencia: 100,
      amortizacaoDivida: 144369.96,
    });

    const trend = await getCapremActuarialTrendMetrics(PORTAL);

    expect(trend).toHaveLength(2);
    expect(trend[0].ano).toBe(2021);
    expect(trend[0].aporteExigido).toBe(0);
    expect(trend[0].aporteQuitado).toBe(0);
    expect(trend[0].taxaAdimplencia).toBe(100);
    expect(trend[0].amortizacaoDivida).toBe(0);
    expect(trend[0].patrimonioFinanceiroTotal).toBe(60368778.97);
    expect(trend[0].inconsistenciaDeclaracaoFlag).toBe(false);

    expect(trend[1].ano).toBe(2025);
    expect(trend[1].aporteExigido).toBe(871311.17);
    expect(trend[1].patrimonioFinanceiroTotal).toBe(35978565.75);
    expect(trend[1].inconsistenciaDeclaracaoFlag).toBe(false);
  });
});
