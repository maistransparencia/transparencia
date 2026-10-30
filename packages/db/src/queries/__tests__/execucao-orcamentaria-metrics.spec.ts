import { describe, expect, it } from "vitest";
import { PORTAL_SLUG, TEST_YEAR } from "../../test-helpers";
import {
  getExecucaoAnoAnterior,
  getExecucaoOrcamentariaMetrics,
} from "../execucao-orcamentaria-metrics";
import { getEntidades } from "../metadata";

describe("getExecucaoOrcamentariaMetrics", () => {
  it("deve buscar execução orçamentária via mart atômico com consolidação", async () => {
    const entidades = await getEntidades(PORTAL_SLUG);
    const empresaIds = entidades.map((e: { id: string }) => e.id);

    const metrics = await getExecucaoOrcamentariaMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
      empresaIds.length > 0 ? empresaIds : ["1"],
    );
    expect(Array.isArray(metrics)).toBe(true);
    if (metrics.length > 0) {
      expect(typeof metrics[0].portalSlug).toBe("string");
      expect(typeof metrics[0].orgaoCodigo).toBe("string");
      expect(typeof metrics[0].unidadeCodigo).toBe("string");
      expect(typeof metrics[0].funcaoCodigo).toBe("string");
      expect(typeof metrics[0].subfuncaoCodigo).toBe("string");
      expect(typeof metrics[0].ano).toBe("number");
      expect(typeof metrics[0].totalDotacaoAtualizada).toBe("number");
      expect(typeof metrics[0].totalEmpenhado).toBe("number");
      expect(typeof metrics[0].taxaExecucao).toBe("number");
      expect(typeof metrics[0].alertaExecucao).toBe("string");
    }

    const emptyFilter = await getExecucaoOrcamentariaMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
      [],
    );
    expect(emptyFilter).toEqual([]);
  });
});

describe("getExecucaoAnoAnterior", () => {
  it("devolve o ano anterior e percentual nulo sem entidades", async () => {
    const execucao = await getExecucaoAnoAnterior(PORTAL_SLUG, TEST_YEAR, []);
    expect(execucao.anoAnterior).toBe(TEST_YEAR - 1);
    expect(execucao.percentualPago).toBeNull();
  });

  it("devolve percentual nulo quando o ano anterior não tem dotação", async () => {
    const entidades = await getEntidades(PORTAL_SLUG);
    const empresaIds = entidades.map((e: { id: string }) => e.id);
    const execucao = await getExecucaoAnoAnterior(
      PORTAL_SLUG,
      TEST_YEAR - 100,
      empresaIds.length > 0 ? empresaIds : ["1"],
    );
    expect(execucao.anoAnterior).toBe(TEST_YEAR - 101);
    expect(execucao.percentualPago).toBeNull();
  });
});
