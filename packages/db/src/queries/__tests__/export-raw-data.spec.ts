import { describe, expect, it } from "vitest";
import {
  cleanupFixtures,
  createFixturePortalSlug,
  seedSaldoCaixaSiconfi,
} from "../../../tests/fixtures/seed";
import { PORTAL_SLUG, TEST_YEAR } from "../../test-helpers";
import {
  getDespesasPorFuncaoMetrics,
  getRadarGastosSensiveisMetrics,
} from "../despesas-metrics";
import {
  getRawDespesasExportRecords,
  getRawSaldoCaixaSiconfiExportRecords,
  type RawDespesaRecordDTO,
} from "../export-raw-data";
import { getOpacidadeContabilMetrics } from "../opacidade-contabil-metrics";

describe("export-raw-data (smoke & parity)", () => {
  it("deve retornar array vazio quando empresaIds for vazio", async () => {
    const result = await getRawDespesasExportRecords({
      portalSlug: PORTAL_SLUG,
      ano: TEST_YEAR,
      empresaIds: [],
      tipo: "gasto_sensivel",
      categoria: "combustivel_frota",
    });
    expect(result).toEqual([]);
  });

  it("deve buscar registros brutos de gasto sensível com o formato esperado", async () => {
    const records = await getRawDespesasExportRecords({
      portalSlug: PORTAL_SLUG,
      ano: TEST_YEAR,
      empresaIds: ["1"],
      tipo: "gasto_sensivel",
      categoria: "combustivel_frota",
    });

    expect(Array.isArray(records)).toBe(true);
    for (const record of records) {
      expect(typeof record.numeroEmpenho).toBe("string");
      expect(typeof record.orgaoNome).toBe("string");
      expect(typeof record.credorNome).toBe("string");
      expect(typeof record.valorEmpenhado).toBe("number");
      expect(typeof record.valorLiquidado).toBe("number");
      expect(typeof record.valorPago).toBe("number");
      expect(record.categoriaSensivel).toBe("combustivel_frota");
    }
  });

  it("deve buscar registros brutos de opacidade residual .99 com o formato esperado", async () => {
    const records = await getRawDespesasExportRecords({
      portalSlug: PORTAL_SLUG,
      ano: TEST_YEAR,
      empresaIds: ["1"],
      tipo: "opacidade_99",
    });

    expect(Array.isArray(records)).toBe(true);
    for (const record of records) {
      expect(typeof record.numeroEmpenho).toBe("string");
      expect(typeof record.orgaoNome).toBe("string");
      expect(typeof record.credorNome).toBe("string");
      expect(typeof record.valorPago).toBe("number");
      expect("categoriaSugerida" in record).toBe(true);
      expect("naturezaCodigoSugerido" in record).toBe(true);
    }
  });

  it("deve buscar registros brutos de despesa por função com o formato esperado", async () => {
    const records = await getRawDespesasExportRecords({
      portalSlug: PORTAL_SLUG,
      ano: TEST_YEAR,
      empresaIds: ["1"],
      tipo: "funcao",
      funcaoCodigo: "10",
    });

    expect(Array.isArray(records)).toBe(true);
    for (const record of records) {
      expect(typeof record.numeroEmpenho).toBe("string");
      expect(typeof record.orgaoNome).toBe("string");
      expect(typeof record.credorNome).toBe("string");
      expect(typeof record.valorPago).toBe("number");
    }
  });

  it("deve manter paridade matemática centavo a centavo com o Radar de Gastos Sensíveis", async () => {
    const empresaIds = ["1"];
    const categoria = "combustivel_frota";

    const exportRows = await getRawDespesasExportRecords({
      portalSlug: PORTAL_SLUG,
      ano: TEST_YEAR,
      empresaIds,
      tipo: "gasto_sensivel",
      categoria,
    });

    const sumValorPago = exportRows.reduce(
      (acc: number, r: RawDespesaRecordDTO) => acc + r.valorPago,
      0,
    );

    const radar = await getRadarGastosSensiveisMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
      empresaIds,
    );

    const itemRadar = radar.itens.find((i) => i.categoria === categoria);
    const radarPago = itemRadar?.valorPagoAnoAtual ?? 0;

    expect(Math.abs(sumValorPago - radarPago)).toBeLessThan(0.01);
  });

  it("deve manter paridade matemática centavo a centavo com Despesas por Função", async () => {
    const empresaIds = ["1"];
    const funcaoCodigo = "10";

    const exportRows = await getRawDespesasExportRecords({
      portalSlug: PORTAL_SLUG,
      ano: TEST_YEAR,
      empresaIds,
      tipo: "funcao",
      funcaoCodigo,
    });

    const sumValorPago = exportRows.reduce(
      (acc: number, r: RawDespesaRecordDTO) => acc + r.valorPago,
      0,
    );

    const funcoes = await getDespesasPorFuncaoMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
      empresaIds,
    );

    const funcaoItem = funcoes.find((f) => f.funcaoCodigo === funcaoCodigo);
    const totalPagoFuncao = funcaoItem?.totalPago ?? 0;

    expect(Math.abs(sumValorPago - totalPagoFuncao)).toBeLessThan(0.01);
  });

  it("deve manter paridade matemática centavo a centavo com o Termômetro de Opacidade Contábil (.99)", async () => {
    const exportRows = await getRawDespesasExportRecords({
      portalSlug: PORTAL_SLUG,
      ano: TEST_YEAR,
      tipo: "opacidade_99",
    });

    const sumValorPago = exportRows.reduce(
      (acc: number, r: RawDespesaRecordDTO) => acc + r.valorPago,
      0,
    );

    const opacidade = await getOpacidadeContabilMetrics(PORTAL_SLUG, TEST_YEAR);

    if (opacidade) {
      const totalResidualPago = opacidade.exercicioAtual.pagoResidual99;
      expect(Math.abs(sumValorPago - totalResidualPago)).toBeLessThan(0.01);
    }
  });

  describe("getRawSaldoCaixaSiconfiExportRecords", () => {
    const FIXTURE_PORTAL = createFixturePortalSlug();

    it("retorna registros brutos de saldo de caixa com filtragem por competência e poder/órgão", async () => {
      // Competência antiga (mês 11)
      await seedSaldoCaixaSiconfi({
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
        mesReferencia: 11,
        poderOrgao: "10131",
        grupoDestinacao: "livre",
        saldoCaixaBancos: 3000000,
        ultimaCompetenciaFlag: false,
      });

      // Competência mais recente (mês 12) - Executivo
      await seedSaldoCaixaSiconfi({
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
        mesReferencia: 12,
        poderOrgao: "10131",
        entidadeNome: "PREFEITURA MUNICIPAL",
        cnpj: "28920999000106",
        grupoDestinacao: "livre",
        saldoCaixaBancos: 10000000,
        saldoRecursosLivres: 10000000,
        saldoRecursosVinculados: 0,
        ultimaCompetenciaFlag: true,
      });

      // Competência mais recente (mês 12) - Previdência (CAPREM)
      await seedSaldoCaixaSiconfi({
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
        mesReferencia: 12,
        poderOrgao: "10132",
        entidadeNome: "CAPREM",
        cnpj: "33444555000166",
        grupoDestinacao: "previdencia",
        saldoCaixaBancos: 5000000,
        saldoRecursosLivres: 0,
        saldoRecursosVinculados: 5000000,
        ultimaCompetenciaFlag: true,
      });

      // Competência mais recente (mês 12) - Linha Previdencia sob poderOrgao 10131
      await seedSaldoCaixaSiconfi({
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
        mesReferencia: 12,
        poderOrgao: "10131",
        entidadeNome: "Previdencia",
        cnpj: "33444555000166",
        grupoDestinacao: "previdencia",
        saldoCaixaBancos: 1000000,
        saldoRecursosLivres: 0,
        saldoRecursosVinculados: 1000000,
        ultimaCompetenciaFlag: true,
      });

      // 1. Busca padrão (última competência homologada, sem filtro de entidade)
      const allRows = await getRawSaldoCaixaSiconfiExportRecords({
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
      });
      expect(allRows).toHaveLength(3);
      expect(allRows.every((r) => r.mesReferencia === 12)).toBe(true);

      // 2. Filtro exclusivo Executivo (deve excluir CAPREM e Previdencia mesmo com poderOrgao 10131)
      const executivoRows = await getRawSaldoCaixaSiconfiExportRecords({
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
        entidades: "executivo",
      });
      expect(executivoRows).toHaveLength(1);
      expect(executivoRows[0].poderOrgao).toBe("10131");
      expect(executivoRows[0].entidadeNome).toBe("PREFEITURA MUNICIPAL");
      expect(executivoRows[0].saldoCaixaBancos).toBe(10000000);

      // 3. Filtro exclusivo Previdência (deve incluir tanto 10132 quanto linhas previdencia de 10131)
      const previdenciaRows = await getRawSaldoCaixaSiconfiExportRecords({
        portalSlug: FIXTURE_PORTAL,
        ano: 2024,
        entidades: "previdencia",
      });
      expect(previdenciaRows).toHaveLength(2);
      expect(previdenciaRows.some((r) => r.entidadeNome === "CAPREM")).toBe(
        true,
      );
      expect(
        previdenciaRows.some((r) => r.entidadeNome === "Previdencia"),
      ).toBe(true);

      await cleanupFixtures(FIXTURE_PORTAL);
    });
  });
});
