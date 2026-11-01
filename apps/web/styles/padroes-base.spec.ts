import { describe, expect, it } from "vitest";
import {
  type RegraPadraoBase,
  regrasPadraoBase,
  varrerPadroesBase,
  verificadoresPorRegra,
} from "./padroes-base";
import {
  isentosPermanentes,
  isentosTemporarios,
  TETO_ISENTOS_TEMPORARIOS,
} from "./padroes-base-isentos";

const violacoes = varrerPadroesBase();

describe("detectores dos padrões base", () => {
  const casos: [RegraPadraoBase, string, boolean][] = [
    ["cor-slate-gray-black-white", '<p className="text-slate-500">', true],
    ["cor-slate-gray-black-white", '<p className="hover:bg-gray-100">', true],
    ["cor-slate-gray-black-white", '<p className="text-white">', true],
    ["cor-slate-gray-black-white", '<p className="text-black">', true],
    ["cor-slate-gray-black-white", '<p className="text-ink bg-panel">', false],
    ["tamanho-de-fonte-em-titulo", '<h2 className="text-xl font-bold">', true],
    ["tamanho-de-fonte-em-titulo", '<h1\n  className="md:text-3xl"\n>', true],
    ["tamanho-de-fonte-em-titulo", "<h3>", false],
    ["tamanho-de-fonte-em-titulo", '<p className="text-xl">', false],
    ["tamanho-de-fonte-em-titulo", '<h2 className="text-ink">', false],
    ["titulo-h5-h6", "<h5>", true],
    ["titulo-h5-h6", "<h6 className='x'>", true],
    ["titulo-h5-h6", "<h4>", false],
    ["font-mono-fora-de-tabela-e-numeric", '<p className="font-mono">', true],
    ["font-mono-fora-de-tabela-e-numeric", '<td className="font-mono">', false],
    [
      "font-mono-fora-de-tabela-e-numeric",
      '<span className="numeric font-mono">',
      false,
    ],
  ];

  it.each(casos)("%s reconhece %j => %s", (regra, trecho, viola) => {
    expect(verificadoresPorRegra[regra](trecho)).toBe(viola);
  });
});

describe.each(regrasPadraoBase)("guarda dos padrões base: %s", (regra) => {
  const temporarios = isentosTemporarios[regra];
  const permanentes = Object.keys(isentosPermanentes[regra]);

  it("não há arquivo novo violando fora das listas de isentos", () => {
    expect(
      violacoes[regra].filter(
        (arquivo) =>
          !temporarios.includes(arquivo) && !permanentes.includes(arquivo),
      ),
    ).toEqual([]);
  });

  it("a lista temporária só encolhe: remova arquivos que já não violam", () => {
    expect(
      temporarios.filter((arquivo) => !violacoes[regra].includes(arquivo)),
    ).toEqual([]);
  });

  it("toda isenção permanente tem motivo e ainda é necessária", () => {
    expect(
      Object.entries(isentosPermanentes[regra]).filter(
        ([arquivo, motivo]) =>
          !motivo.trim() || !violacoes[regra].includes(arquivo),
      ),
    ).toEqual([]);
  });
});

describe("isentos temporários", () => {
  it("a lista não cresce além do teto; baixe o teto ao remover entradas", () => {
    const total = Object.values(isentosTemporarios).flat().length;
    expect(total).toBeLessThanOrEqual(TETO_ISENTOS_TEMPORARIOS);
  });
});
