import { describe, expect, it, vi } from "vitest";
import { db } from "../client";
import { isUndefinedTableError, readMartOrFallback } from "../missing-relation";

describe("readMartOrFallback", () => {
  it("devolve o fallback quando o mart ainda não existe no banco", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const linhas = await readMartOrFallback(
      "fct_mart_ainda_nao_criado",
      () => db.selectFrom("fct_mart_ainda_nao_criado").selectAll().execute(),
      [],
    );

    expect(linhas).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("propaga qualquer outro erro do banco", async () => {
    await expect(
      readMartOrFallback(
        "fct_mart_qualquer",
        () => Promise.reject(Object.assign(new Error("x"), { code: "42703" })),
        [],
      ),
    ).rejects.toThrow("x");
  });
});

describe("isUndefinedTableError", () => {
  it("reconhece só o código 42P01 do Postgres", () => {
    expect(isUndefinedTableError({ code: "42P01" })).toBe(true);
    expect(isUndefinedTableError({ code: "42703" })).toBe(false);
    expect(isUndefinedTableError(new Error("42P01"))).toBe(false);
    expect(isUndefinedTableError(null)).toBe(false);
  });
});
