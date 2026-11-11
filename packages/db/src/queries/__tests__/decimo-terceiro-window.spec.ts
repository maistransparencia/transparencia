import { describe, expect, it } from "vitest";
import { isDecimoTerceiroWindowOpen } from "../pessoal-metrics";

describe("isDecimoTerceiroWindowOpen", () => {
  it("abre em novembro e dezembro do ano ativo corrente", () => {
    expect(isDecimoTerceiroWindowOpen(new Date(2030, 10, 1), 2030)).toBe(true);
    expect(isDecimoTerceiroWindowOpen(new Date(2030, 11, 31), 2030)).toBe(true);
  });

  it("fica fechada fora de novembro e dezembro", () => {
    expect(isDecimoTerceiroWindowOpen(new Date(2030, 9, 31), 2030)).toBe(false);
    expect(isDecimoTerceiroWindowOpen(new Date(2030, 0, 1), 2030)).toBe(false);
  });

  it("fica fechada quando o ano ativo não é o ano de hoje", () => {
    expect(isDecimoTerceiroWindowOpen(new Date(2030, 10, 15), 2029)).toBe(
      false,
    );
  });
});
