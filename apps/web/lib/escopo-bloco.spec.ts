import { describe, expect, it } from "vitest";
import {
  periodoDaSerie,
  tituloDaSerie,
  tituloDoExercicio,
} from "./escopo-bloco";

describe("escopo-bloco", () => {
  it("usa só o ano quando a série tem um ano", () => {
    expect(periodoDaSerie(2026, 2026)).toBe("2026");
    expect(tituloDaSerie("Como mudou", [2026])).toBe("Como mudou (2026)");
  });

  it("calcula o intervalo dos anos reais, em qualquer ordem", () => {
    expect(tituloDaSerie("Como mudou", [2019, 2017, 2027])).toBe(
      "Como mudou (2017–2027)",
    );
  });

  it("não inventa período para série vazia", () => {
    expect(tituloDaSerie("Como mudou", [])).toBe("Como mudou");
  });

  it("declara o exercício", () => {
    expect(tituloDoExercicio("O que entrou", 2026)).toBe(
      "O que entrou em 2026",
    );
  });
});
