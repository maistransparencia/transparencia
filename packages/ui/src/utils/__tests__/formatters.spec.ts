import { describe, expect, it } from "vitest";
import { getPartialYearPeriod } from "../formatters";

describe("getPartialYearPeriod", () => {
  it("deve retornar apenas 'Jan' quando a referência for janeiro", () => {
    expect(getPartialYearPeriod("2026-01-15")).toBe("Jan");
    expect(getPartialYearPeriod(new Date(2026, 0, 10))).toBe("Jan");
  });

  it("deve retornar intervalo 'Jan–<Mês>' para meses subsequentes com string YYYY-MM-DD", () => {
    expect(getPartialYearPeriod("2026-02-05")).toBe("Jan–Fev");
    expect(getPartialYearPeriod("2026-03-12")).toBe("Jan–Mar");
    expect(getPartialYearPeriod("2026-04-20")).toBe("Jan–Abr");
    expect(getPartialYearPeriod("2026-05-01")).toBe("Jan–Mai");
    expect(getPartialYearPeriod("2026-06-15")).toBe("Jan–Jun");
    expect(getPartialYearPeriod("2026-07-31")).toBe("Jan–Jul");
    expect(getPartialYearPeriod("2026-08-15")).toBe("Jan–Ago");
    expect(getPartialYearPeriod("2026-09-10")).toBe("Jan–Set");
    expect(getPartialYearPeriod("2026-10-05")).toBe("Jan–Out");
    expect(getPartialYearPeriod("2026-11-28")).toBe("Jan–Nov");
    expect(getPartialYearPeriod("2026-12-31")).toBe("Jan–Dez");
  });

  it("deve suportar instâncias de Date", () => {
    expect(getPartialYearPeriod(new Date(2026, 7, 15))).toBe("Jan–Ago");
    expect(getPartialYearPeriod(new Date(2026, 11, 20))).toBe("Jan–Dez");
  });

  it("deve suportar strings ISO completas", () => {
    expect(getPartialYearPeriod("2026-08-15T12:00:00Z")).toBe("Jan–Ago");
  });

  it("deve usar data atual quando o argumento for omitido ou undefined", () => {
    const result = getPartialYearPeriod();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result.startsWith("Jan")).toBe(true);

    const resultUndefined = getPartialYearPeriod(undefined);
    expect(resultUndefined).toBe(result);
  });

  it("deve retornar string vazia para null ou entradas inválidas", () => {
    expect(getPartialYearPeriod(null)).toBe("");
    expect(getPartialYearPeriod("data-invalida")).toBe("");
    expect(getPartialYearPeriod(new Date("invalid"))).toBe("");
  });
});
