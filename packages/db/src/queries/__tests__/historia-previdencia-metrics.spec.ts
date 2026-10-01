import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedPrevidenciaCadprev,
  seedPrevidenciaEntidades,
  seedPrevidenciaHistoria,
  seedPrevidenciaNatureza,
  seedPrevidenciaPatrimonioHistorico,
  seedPrevidenciaTendenciaAtuarial,
} from "../../../tests/fixtures/seed";
import {
  getHistoriaPrevidenciaMetrics,
  getPrevidenciaActuarialTrendMetrics,
  getPrevidenciaCadprevMetrics,
  getPrevidenciaEntidadesMetrics,
  getPrevidenciaNaturezaMetrics,
  getPrevidenciaPatrimonioHistoricoMetrics,
} from "../historia-previdencia-metrics";

const PORTAL_A = createFixturePortalSlug();
const PORTAL_B = createFixturePortalSlug();

afterEach(async () => {
  await cleanupFixtures(PORTAL_A);
  await cleanupFixtures(PORTAL_B);
});

describe("historia-previdencia-metrics (módulo canônico)", () => {
  describe("getHistoriaPrevidenciaMetrics", () => {
    it("deve carregar métricas consolidadas com isolamento estrito por portal_slug", async () => {
      await seedPrevidenciaHistoria({
        portalSlug: PORTAL_A,
        ano: 2025,
        totalAporteExigido: 500000,
        totalAporteQuitado: 450000,
        taxaAdimplenciaAporte: 90,
        totalEmpenhadoPatronal: 600000,
        totalLiquidadoPatronal: 600000,
        totalPagoPatronal: 550000,
        romboPatronalNaoRepassado: 50000,
        totalAmortizacaoDivida: 20000,
        totalCaspPlanoSaude: 10000,
        totalEmpenhado: 700000,
        totalLiquidado: 700000,
        totalPago: 650000,
        servidoresEfetivos: 120,
        servidoresTemporarios: 15,
      });

      const resA = await getHistoriaPrevidenciaMetrics(PORTAL_A, 2025);
      expect(resA).not.toBeNull();
      expect(resA?.portalSlug).toBe(PORTAL_A);
      expect(resA?.ano).toBe(2025);
      expect(resA?.totalAporteExigido).toBe(500000);
      expect(resA?.taxaAdimplenciaAporte).toBe(90);
      expect(resA?.romboPatronalNaoRepassado).toBe(50000);
      expect(resA?.previdenciaHistoriaId).toBeDefined();

      // Isolamento: PORTAL_B deve ser null
      const resB = await getHistoriaPrevidenciaMetrics(PORTAL_B, 2025);
      expect(resB).toBeNull();
    });

    it("retorna null quando não há registros no ano", async () => {
      const res = await getHistoriaPrevidenciaMetrics(PORTAL_A, 2099);
      expect(res).toBeNull();
    });
  });

  describe("getPrevidenciaEntidadesMetrics", () => {
    it("deve filtrar entidades pelo portal informado", async () => {
      await seedPrevidenciaEntidades({
        portalSlug: PORTAL_A,
        ano: 2025,
        entidade: "Prefeitura Municipal",
        empenhado: 100000,
        liquidado: 90000,
        pago: 80000,
        taxaExecucao: 80,
      });

      await seedPrevidenciaEntidades({
        portalSlug: PORTAL_B,
        ano: 2025,
        entidade: "Fundo Municipal de Saúde",
        empenhado: 50000,
        liquidado: 50000,
        pago: 50000,
        taxaExecucao: 100,
      });

      const itensA = await getPrevidenciaEntidadesMetrics(PORTAL_A, 2025);
      expect(itensA).toHaveLength(1);
      expect(itensA[0].entidade).toBe("Prefeitura Municipal");
      expect(itensA[0].empenhado).toBe(100000);

      const itensB = await getPrevidenciaEntidadesMetrics(PORTAL_B, 2025);
      expect(itensB).toHaveLength(1);
      expect(itensB[0].entidade).toBe("Fundo Municipal de Saúde");
    });
  });

  describe("getPrevidenciaNaturezaMetrics", () => {
    it("deve carregar repasses por natureza e elemento para o portal", async () => {
      await seedPrevidenciaNatureza({
        portalSlug: PORTAL_A,
        ano: 2025,
        elemento: "13",
        naturezaDespesa: "Obrigações Patronais - RPPS",
        destino: "rpps_contribuicao_patronal",
        descricao: "Repasse patronal",
        dataEmpenho: "2025-03-10",
        empenhado: 200000,
        liquidado: 200000,
        pago: 180000,
      });

      const res = await getPrevidenciaNaturezaMetrics(PORTAL_A, 2025);
      expect(res).toHaveLength(1);
      expect(res[0].elemento).toBe("13");
      expect(res[0].destino).toBe("rpps_contribuicao_patronal");
      expect(res[0].empenhado).toBe(200000);
      expect(res[0].pago).toBe(180000);
      expect(res[0].dataEmpenho).toBe("2025-03-10");
    });
  });

  describe("getPrevidenciaActuarialTrendMetrics", () => {
    it("deve consolidar patrimônio e tendência atuarial por ano", async () => {
      await seedPrevidenciaPatrimonioHistorico({
        portalSlug: PORTAL_A,
        ano: 2023,
        mesReferencia: 12,
        saldoCaixa: 50000,
        saldoAplicacoes: 950000,
        patrimonioTotal: 1000000,
      });

      await seedPrevidenciaTendenciaAtuarial({
        portalSlug: PORTAL_A,
        ano: 2023,
        aporteExigido: 300000,
        aporteQuitado: 300000,
        taxaAdimplencia: 100,
        amortizacaoDivida: 50000,
      });

      const trend = await getPrevidenciaActuarialTrendMetrics(PORTAL_A);
      expect(trend).toHaveLength(1);
      expect(trend[0].ano).toBe(2023);
      expect(trend[0].patrimonioFinanceiroTotal).toBe(1000000);
      expect(trend[0].aporteExigido).toBe(300000);
      expect(trend[0].taxaAdimplencia).toBe(100);
    });
  });

  describe("getPrevidenciaPatrimonioHistoricoMetrics", () => {
    it("deve carregar série histórica plurianual do patrimônio com chaves canônicas", async () => {
      await seedPrevidenciaPatrimonioHistorico({
        portalSlug: PORTAL_A,
        ano: 2024,
        mesReferencia: 12,
        saldoCaixa: 80000,
        saldoAplicacoes: 1200000,
        patrimonioTotal: 1280000,
        inconsistenciaDeclaracaoFlag: false,
        variacaoAbs: 280000,
        variacaoPct: 28,
      });

      const res = await getPrevidenciaPatrimonioHistoricoMetrics(PORTAL_A);
      expect(res).toHaveLength(1);
      expect(res[0].ano).toBe(2024);
      expect(res[0].saldoCaixa).toBe(80000);
      expect(res[0].saldoAplicacoes).toBe(1200000);
      expect(res[0].patrimonioTotal).toBe(1280000);
      expect(res[0].variacaoAbs).toBe(280000);
      expect(res[0].variacaoPct).toBe(28);
      expect(res[0].previdenciaPatrimonioHistoricoId).toBeDefined();
    });
  });

  describe("getPrevidenciaCadprevMetrics", () => {
    it("deve carregar parcelamentos CADPREV do elemento 71", async () => {
      await seedPrevidenciaCadprev({
        portalSlug: PORTAL_A,
        ano: 2025,
        empenhoId: "EMP-710",
        descricao: "CADPREV Nº 00123/2022 Termo de Parcelamento",
        dataEmpenho: "2025-01-15",
        empenhado: 15000,
        pago: 15000,
      });

      const res = await getPrevidenciaCadprevMetrics(PORTAL_A, 2025);
      expect(res).toHaveLength(1);
      expect(res[0].numeroCadprev).toBe("CADPREV Nº 00123/2022");
      expect(res[0].elemento).toBe("71");
      expect(res[0].empenhado).toBe(15000);
      expect(res[0].pago).toBe(15000);
      expect(res[0].dataEmpenho).toBe("2025-01-15");
    });
  });
});
