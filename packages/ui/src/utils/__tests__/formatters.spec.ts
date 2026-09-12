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

  it("deve lidar com viradas de ano e transições de exercício", () => {
    // Fim do exercício anterior
    expect(getPartialYearPeriod("2025-12-31")).toBe("Jan–Dez");
    expect(getPartialYearPeriod(new Date(2025, 11, 31))).toBe("Jan–Dez");

    // Início do novo exercício (virada de ano)
    expect(getPartialYearPeriod("2026-01-01")).toBe("Jan");
    expect(getPartialYearPeriod("2026-01-01T00:00:00.000Z")).toBe("Jan");
    expect(getPartialYearPeriod(new Date(2026, 0, 1))).toBe("Jan");

    // Próximo exercício
    expect(getPartialYearPeriod("2027-02-15")).toBe("Jan–Fev");
  });

  it("deve ser imune a deslocamento de fuso em datas UTC no 1º dia do mês", () => {
    // 1º de agosto à meia-noite UTC não deve retroceder para julho em fusos negativos (ex: Brasil UTC-3)
    expect(getPartialYearPeriod("2026-08-01T00:00:00.000Z")).toBe("Jan–Ago");
    expect(getPartialYearPeriod(new Date("2026-08-01T00:00:00.000Z"))).toBe(
      "Jan–Ago",
    );
  });

  it("deve retornar string vazia para null ou entradas inválidas", () => {
    expect(getPartialYearPeriod(null)).toBe("");
    expect(getPartialYearPeriod("data-invalida")).toBe("");
    expect(getPartialYearPeriod(new Date("invalid"))).toBe("");
  });
});
