import { describe, expect, it } from "vitest";
import {
  corDoGrafico,
  coresDoGrafico,
  TOKENS_CORES_GRAFICO,
  type TokenCorGrafico,
} from "../chart-colors";

describe("chart-colors", () => {
  it("devolve var(--token)", () => {
    expect(corDoGrafico("ink")).toBe("var(--ink)");
    expect(coresDoGrafico.traco("ok")).toEqual({ stroke: "var(--ok-fill)" });
    expect(coresDoGrafico.preenchimento("ink")).toEqual({
      fill: "var(--ink)",
    });
  });

  it.each(["brand", "danger", "ok", "warn"] as const)(
    "cor de intenção %s usa o tom fill, não o de texto",
    (token) => {
      expect(corDoGrafico(token)).toBe(`var(--${token}-fill)`);
    },
  );

  it.each(
    TOKENS_CORES_GRAFICO.filter(
      (token) => !["brand", "danger", "ok", "warn"].includes(token),
    ),
  )("token neutro %s resolve para var(--...)", (token) => {
    expect(corDoGrafico(token)).toBe(`var(--${token})`);
  });

  it("rejeita aliases legados no tipo", () => {
    // @ts-expect-error alias legado não pertence à lista de permissão
    const legado: TokenCorGrafico = "accent";
    expect(TOKENS_CORES_GRAFICO).not.toContain(legado);
  });
});
