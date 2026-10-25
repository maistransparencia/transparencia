import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TOKENS } from "./tokens";

const css = readFileSync(
  path.resolve(__dirname, "../../../apps/web/app/globals.css"),
  "utf8",
);

const nomesDoBloco = (seletor: RegExp): string[] => {
  const inicio = css.search(seletor);
  const bloco = css.slice(css.indexOf("{", inicio), css.indexOf("}", inicio));
  return [...bloco.matchAll(/--([\w-]+)\s*:/g)].map(([, nome]) => nome);
};

const nomesClaro = nomesDoBloco(/(^|\n):root\s*\{/);
const nomesEscuro = nomesDoBloco(/(^|\n)\.dark\s*\{/);
const variaveisDeTokens = Object.entries(TOKENS.colors).map(
  ([chave, valor]) => [chave, valor.match(/^var\(--([\w-]+)\)$/)?.[1]] as const,
);

describe("TOKENS x globals.css", () => {
  it.each(variaveisDeTokens)(
    "%s aponta para var(--...)",
    (_chave, variavel) => {
      expect(variavel).toBeDefined();
    },
  );

  it.each(variaveisDeTokens)(
    "variável de %s existe em :root",
    (_c, variavel) => {
      expect(nomesClaro).toContain(variavel);
    },
  );

  it.each(variaveisDeTokens)(
    "variável de %s existe em .dark",
    (_c, variavel) => {
      expect(nomesEscuro).toContain(variavel);
    },
  );
});
