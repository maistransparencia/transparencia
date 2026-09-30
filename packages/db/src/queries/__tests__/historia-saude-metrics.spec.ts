import { describe, expect, it } from "vitest";
import { PORTAL_SLUG, TEST_YEAR } from "../../test-helpers";
import {
  getHistoriaSaudeMetrics,
  getSaudeEmendasMetrics,
  getSaudeFornecedoresCountMetrics,
} from "../historia-saude-metrics";

describe("getHistoriaSaudeMetrics", () => {
  it("deve buscar história da saúde via mart atômico", async () => {
    const metrics = await getHistoriaSaudeMetrics(PORTAL_SLUG, TEST_YEAR);
    if (metrics !== null) {
      expect(typeof metrics.historiaSaudeId).toBe("string");
      expect(typeof metrics.portalSlug).toBe("string");
      expect(typeof metrics.ano).toBe("number");
      expect(typeof metrics.dotacaoTotal).toBe("number");
      expect(typeof metrics.medicamentosInsumosEmpenhado).toBe("number");
      expect(typeof metrics.medicamentosInsumosPago).toBe("number");
      expect(typeof metrics.judicializacaoEmpenhado).toBe("number");
      expect(typeof metrics.judicializacaoPago).toBe("number");
      expect(typeof metrics.hhiConcentracaoFornecedores).toBe("number");
    }
  });
});

describe("getSaudeFornecedoresCountMetrics", () => {
  it("deve buscar fornecedores ativos da Saúde", async () => {
    const saudeFornecedoresCount = await getSaudeFornecedoresCountMetrics(
      PORTAL_SLUG,
      TEST_YEAR,
      ["2"],
    );
    expect(typeof saudeFornecedoresCount).toBe("number");
    expect(saudeFornecedoresCount).toBeGreaterThanOrEqual(0);
  });
});

describe("getSaudeEmendasMetrics", () => {
  it("deve retornar métricas vazias quando lista de empresaIds for vazia", async () => {
    const res = await getSaudeEmendasMetrics(PORTAL_SLUG, TEST_YEAR, []);
    expect(res.totalAutorizado).toBe(0);
    expect(res.totalEmpenhado).toBe(0);
    expect(res.lista).toEqual([]);
  });

  it("deve retornar emendas e empenhos vinculados para o exercício", async () => {
    const res = await getSaudeEmendasMetrics(PORTAL_SLUG, 2026, ["2"]);
    expect(typeof res.totalAutorizado).toBe("number");
    expect(typeof res.totalEmpenhado).toBe("number");
    expect(Array.isArray(res.lista)).toBe(true);

    if (res.lista.length > 0) {
      const emendaComEmpenho = res.lista.find((e) => (e.empenhado ?? 0) > 0);
      if (emendaComEmpenho) {
        expect(typeof emendaComEmpenho.qtdEmpenhos).toBe("number");
        expect(Array.isArray(emendaComEmpenho.empenhos)).toBe(true);
        if (emendaComEmpenho.qtdEmpenhos > 0) {
          const primeiroEmpenho = emendaComEmpenho.empenhos[0];
          expect(primeiroEmpenho.empenhoId).toBeTruthy();
          expect(primeiroEmpenho.fornecedorNome).toBeTruthy();
          expect(primeiroEmpenho.valorEmpenhado).toBeGreaterThan(0);
        }
      }
    }
  });
});
