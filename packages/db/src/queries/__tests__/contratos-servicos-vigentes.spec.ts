import { describe, expect, it } from "vitest";
import { PORTAL_SLUG, TEST_YEAR } from "../../test-helpers";
import {
  getContratoByNumero,
  getContratosServicosVigentes,
} from "../contratos-servicos-vigentes";

describe("getContratosServicosVigentes", () => {
  it("deve buscar contratos de serviços vigentes via leitor atômico", async () => {
    const list = await getContratosServicosVigentes(PORTAL_SLUG, TEST_YEAR);
    expect(Array.isArray(list)).toBe(true);

    if (list.length > 0) {
      const item = list[0];
      expect(typeof item.portalSlug).toBe("string");
      expect(typeof item.fornecedorNome).toBe("string");
      expect(typeof item.fornecedorCnpj).toBe("string");
      expect(typeof item.objetoDescricao).toBe("string");
      expect(typeof item.totalEmpenhado).toBe("number");
      expect(typeof item.totalLiquidado).toBe("number");
      expect(typeof item.totalPago).toBe("number");
      expect(typeof item.saldoPendente).toBe("number");
      expect(typeof item.percentualPago).toBe("number");
      expect(["em_execucao", "concluido", "inexecutado"]).toContain(
        item.statusExecucao,
      );
      expect(item.totalEmpenhado).toBeGreaterThanOrEqual(item.totalLiquidado);
      expect(item.totalLiquidado).toBeGreaterThanOrEqual(item.totalPago);
    }
  });
});

describe("getContratoByNumero", () => {
  it("deve retornar null para parâmetros inválidos ou vazios", async () => {
    expect(await getContratoByNumero("", "0010/26")).toBeNull();
    expect(await getContratoByNumero(PORTAL_SLUG, "")).toBeNull();
  });

  it("deve buscar contrato existente por número ou retornar null caso inexistente", async () => {
    const list = await getContratosServicosVigentes(PORTAL_SLUG, TEST_YEAR);
    const target = list[0];
    if (target?.contratoNumero) {
      const found = await getContratoByNumero(
        PORTAL_SLUG,
        target.contratoNumero,
        TEST_YEAR,
      );
      expect(found).not.toBeNull();
      expect(found?.fornecedorNome).toBe(target.fornecedorNome);
      expect(found?.totalEmpenhado).toBe(target.totalEmpenhado);
      expect(found?.statusExecucao).toBe(target.statusExecucao);
    }

    const notFound = await getContratoByNumero(
      PORTAL_SLUG,
      "CONTRATO_INEXISTENTE_99999",
      TEST_YEAR,
    );
    expect(notFound).toBeNull();

    const zeroNotFound = await getContratoByNumero(
      PORTAL_SLUG,
      "0000000000",
      TEST_YEAR,
    );
    expect(zeroNotFound).toBeNull();
  });
});
