import { describe, expect, it } from "vitest";
import {
  corDoGrafico,
  coresDoGrafico,
  TOKENS_CORES_GRAFICO,
  type TokenCorGrafico,
} from "../chart-colors";

describe("chart-colors", () => {
  it("devolve var(--token)", () => {
    expect(corDoGrafico("brand")).toBe("var(--brand)");
    expect(coresDoGrafico.traco("ok")).toEqual({ stroke: "var(--ok)" });
    expect(coresDoGrafico.preenchimento("ink")).toEqual({
      fill: "var(--ink)",
    });
  });

  it.each(TOKENS_CORES_GRAFICO)(
    "token permitido %s resolve para var(--...)",
    (token) => {
      expect(corDoGrafico(token)).toBe(`var(--${token})`);
    },
  );

  it("rejeita aliases legados no tipo", () => {
    // @ts-expect-error alias legado não pertence à lista de permissão
    const legado: TokenCorGrafico = "accent";
    expect(TOKENS_CORES_GRAFICO).not.toContain(legado);
  });
});
