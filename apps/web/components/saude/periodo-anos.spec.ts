import { describe, expect, it } from "vitest";
import { rotuloPeriodoAnos } from "./periodo-anos";

describe("rotuloPeriodoAnos", () => {
  it("mostra só o ano quando há um único ano", () => {
    expect(rotuloPeriodoAnos(2026, 2026)).toBe("2026");
  });

  it("mostra o intervalo calculado dos dados", () => {
    expect(rotuloPeriodoAnos(2017, 2027)).toBe("2017–2027");
  });
});
