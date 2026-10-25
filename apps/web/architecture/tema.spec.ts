import { describe, expect, it } from "vitest";
import excecoes from "./tema-excecoes.json";
import { type RegraTema, regrasTema, varrerViolacoes } from "./varredura-tema";

const violacoes = varrerViolacoes();
const regras = Object.keys(regrasTema) as RegraTema[];
const excecoesPorRegra = excecoes as Record<RegraTema, string[]>;

describe.each(regras)("guarda de arquitetura do tema: %s", (regra) => {
  const permitidos = excecoesPorRegra[regra] ?? [];

  it("não há arquivo novo violando fora da lista de exceções", () => {
    expect(
      violacoes[regra].filter((arquivo) => !permitidos.includes(arquivo)),
    ).toEqual([]);
  });

  it("a lista de exceções só encolhe: remova arquivos que já não violam", () => {
    expect(
      permitidos.filter((arquivo) => !violacoes[regra].includes(arquivo)),
    ).toEqual([]);
  });
});
