import { describe, expect, it } from "vitest";
import { PORTAL_SLUG, TEST_YEAR } from "../../test-helpers";
import {
  getContratoRecursosDetalhe,
  getContratosComRecursos,
} from "../contratos-recursos";

describe("getContratosComRecursos", () => {
  it("deve retornar array vazio para portalSlug inválido", async () => {
    expect(await getContratosComRecursos({ portalSlug: "" })).toEqual([]);
  });

  it("deve buscar contratos com recursos e validar tipagem dos DTOs", async () => {
    const list = await getContratosComRecursos({
      portalSlug: PORTAL_SLUG,
      ano: TEST_YEAR,
      limit: 10,
    });
    expect(Array.isArray(list)).toBe(true);

    if (list.length > 0) {
      const item = list[0];
      expect(typeof item.contratoRecursoId).toBe("string");
      expect(typeof item.contratoId).toBe("string");
      expect(typeof item.portalSlug).toBe("string");
      expect(typeof item.ano).toBe("number");
      expect(typeof item.empresaId).toBe("string");
      expect(typeof item.orgaoNome).toBe("string");
      expect(typeof item.valorContrato).toBe("number");
      expect(typeof item.totalEmpenhado).toBe("number");
      expect(typeof item.totalLiquidado).toBe("number");
      expect(typeof item.totalPago).toBe("number");
      expect(typeof item.saldoAPagar).toBe("number");
      expect(typeof item.fontesRecursos).toBe("string");
      expect(typeof item.principalFuncao).toBe("string");
      expect(item.totalEmpenhado).toBeGreaterThanOrEqual(0);
      expect(item.totalPago).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("getContratoRecursosDetalhe", () => {
  it("deve retornar null para parâmetros vazios", async () => {
    expect(
      await getContratoRecursosDetalhe({
        portalSlug: "",
        contratoNumeroOuId: "",
      }),
    ).toBeNull();
    expect(
      await getContratoRecursosDetalhe({
        portalSlug: PORTAL_SLUG,
        contratoNumeroOuId: "",
      }),
    ).toBeNull();
  });

  it("deve retornar detalhes do contrato ou null caso inexistente", async () => {
    const list = await getContratosComRecursos({
      portalSlug: PORTAL_SLUG,
      ano: TEST_YEAR,
      limit: 5,
    });

    const target = list[0];
    if (target?.contratoNumero) {
      const detalhe = await getContratoRecursosDetalhe({
        portalSlug: PORTAL_SLUG,
        contratoNumeroOuId: target.contratoNumero,
        ano: TEST_YEAR,
      });

      expect(detalhe).not.toBeNull();
      expect(detalhe?.contratoId).toBe(target.contratoId);
      expect(detalhe?.orgaoNome).toBe(target.orgaoNome);
      expect(detalhe?.totalEmpenhado).toBe(target.totalEmpenhado);
      expect(detalhe?.fontesRecursos).toBe(target.fontesRecursos);
    }

    const inexistente = await getContratoRecursosDetalhe({
      portalSlug: PORTAL_SLUG,
      contratoNumeroOuId: "NUMERO_CONTRATO_TOTALMENTE_INEXISTENTE_99999",
      ano: TEST_YEAR,
    });
    expect(inexistente).toBeNull();
  });
});
