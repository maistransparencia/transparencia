import { describe, expect, it } from "vitest";
import { PORTAL_SLUG, TEST_YEAR } from "../../test-helpers";
import {
  getDespesasPorFuncaoMetrics,
  getRadarGastosSensiveisMetrics,
} from "../despesas-metrics";
import {
  getRawDespesasExportRecords,
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
});
