import { describe, expect, it } from "vitest";
import { corDoGrafico, coresDoGrafico } from "../chart-colors";

describe("chart-colors", () => {
  it("devolve var(--token)", () => {
    expect(corDoGrafico("brand")).toBe("var(--brand)");
    expect(coresDoGrafico.traco("ok")).toEqual({ stroke: "var(--ok)" });
    expect(coresDoGrafico.preenchimento("ink")).toEqual({
      fill: "var(--ink)",
    });
  });
});
