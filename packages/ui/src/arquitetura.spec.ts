import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const raiz = __dirname;

const listarArquivos = (diretorio: string): string[] =>
  readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(diretorio, entrada.name);
    return entrada.isDirectory()
      ? listarArquivos(caminho)
      : /\.(ts|tsx)$/.test(entrada.name)
        ? [caminho]
        : [];
  });

const referenciaNext =
  /(from\s+|import\s*\(\s*|require\(\s*|vi\.mock\(\s*|import\s+)["']next(\/[^"']*)?["']/;

describe("arquitetura de packages/ui", () => {
  it("nao importa nem mocka next em packages/ui/src", () => {
    const infratores = listarArquivos(raiz)
      .filter((arquivo) => arquivo !== __filename)
      .filter((arquivo) => referenciaNext.test(readFileSync(arquivo, "utf8")))
      .map((arquivo) => path.relative(raiz, arquivo));
    expect(infratores).toEqual([]);
  });
});
