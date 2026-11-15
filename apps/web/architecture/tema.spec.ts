import { describe, expect, it } from "vitest";
import excecoes from "./tema-excecoes.json";
import {
  arquivosVarridos,
  excecoesPermanentesPorRegra,
  type RegraTema,
  regrasTema,
  varrerViolacoes,
} from "./varredura-tema";

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

describe("exceções do tema", () => {
  it("as listas temporárias de tema-excecoes.json estão vazias", () => {
    expect(
      Object.entries(excecoesPorRegra).filter(([, lista]) => lista.length > 0),
    ).toEqual([]);
  });

  it("toda exceção permanente tem motivo e aponta para arquivo varrido", () => {
    const varridos = arquivosVarridos();
    const permanentes = Object.values(excecoesPermanentesPorRegra).flatMap(
      (porArquivo) => Object.entries(porArquivo ?? {}),
    );
    expect(
      permanentes.filter(
        ([arquivo, motivo]) => !motivo.trim() || !varridos.includes(arquivo),
      ),
    ).toEqual([]);
  });
});
