import { describe, expect, it } from "vitest";
import { PORTAL_SLUG, TEST_YEAR } from "../../test-helpers";
import { getEntidades } from "../metadata";
import {
  getReceitaExtraOrcamentariaOrigem,
  getReceitasExtraOrcamentariasList,
} from "../receitas-extra-metrics";

describe("getReceitasExtraOrcamentariasList", () => {
  it("deve buscar receitas extra-orçamentárias via leitor atômico", async () => {
    const entidades = await getEntidades(PORTAL_SLUG);
    const empresaIds = entidades.map((e: { id: string }) => e.id);

    const list = await getReceitasExtraOrcamentariasList(
      PORTAL_SLUG,
      TEST_YEAR,
      empresaIds.length > 0 ? empresaIds : ["1"],
    );
    expect(Array.isArray(list)).toBe(true);
    if (list.length > 0) {
      expect(typeof list[0].receitaExtraId).toBe("string");
      expect(typeof list[0].portalSlug).toBe("string");
      expect(typeof list[0].ano).toBe("number");
      expect(typeof list[0].valorArrecadado).toBe("number");
    }

    const emptyFilter = await getReceitasExtraOrcamentariasList(
      PORTAL_SLUG,
      TEST_YEAR,
      [],
    );
    expect(emptyFilter).toEqual([]);
  });
});

describe("getReceitaExtraOrcamentariaOrigem", () => {
  it("soma das categorias bate com o total, ordenada e com categorias conhecidas", async () => {
    const entidades = await getEntidades(PORTAL_SLUG);
    const empresaIds = entidades.map((e: { id: string }) => e.id);
    const [lista, origem] = await Promise.all([
      getReceitasExtraOrcamentariasList(PORTAL_SLUG, TEST_YEAR, empresaIds),
      getReceitaExtraOrcamentariaOrigem(PORTAL_SLUG, TEST_YEAR, empresaIds),
    ]);

    const totalLista = lista.reduce((s, i) => s + i.valorArrecadado, 0);
    const totalOrigem = origem.reduce((s, i) => s + i.valorArrecadado, 0);
    expect(totalOrigem).toBeCloseTo(totalLista, 2);
    origem.forEach((item, i) => {
      expect(item.categoria).toMatch(/^[a-z]+(_[a-z]+)*$/);
      if (i > 0) {
        expect(item.valorArrecadado).toBeLessThanOrEqual(
          origem[i - 1].valorArrecadado,
        );
      }
    });
    if (origem.length > 0) {
      expect(origem.reduce((s, i) => s + i.percentualDoTotal, 0)).toBeCloseTo(
        100,
        4,
      );
    }
  });

  it("retorna [] sem entidades ou para portal inexistente (isolamento)", async () => {
    expect(
      await getReceitaExtraOrcamentariaOrigem(PORTAL_SLUG, TEST_YEAR, []),
    ).toEqual([]);
    expect(
      await getReceitaExtraOrcamentariaOrigem("portal_inexistente", TEST_YEAR, [
        "1",
      ]),
    ).toEqual([]);
  });
});
