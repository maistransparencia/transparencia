import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ_DO_REPOSITORIO = resolve(__dirname, "../../..");
const PASTAS_IGNORADAS = new Set([".next", "node_modules", "dist"]);
const PASTAS_DE_CODIGO = ["apps/web", "packages/ui/src"];
const CLASSE_LEGADA =
  /\b(?:text|bg|ring|border|stroke|fill|from|to|via|divide|outline)-(?:ok|warn|danger)(?![-\w])/g;

const listarFontes = (pasta: string): string[] =>
  readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) =>
    PASTAS_IGNORADAS.has(entrada.name)
      ? []
      : entrada.isDirectory()
        ? listarFontes(join(pasta, entrada.name))
        : /\.tsx?$/.test(entrada.name) && !/\.spec\.tsx?$/.test(entrada.name)
          ? [join(pasta, entrada.name)]
          : [],
  );

describe("uso das cores de intenção", () => {
  it("não usa classes legadas sem sufixo -fill ou -text", () => {
    const ocorrencias = PASTAS_DE_CODIGO.flatMap((pasta) =>
      listarFontes(join(RAIZ_DO_REPOSITORIO, pasta)).flatMap((arquivo) =>
        (readFileSync(arquivo, "utf8").match(CLASSE_LEGADA) ?? []).map(
          (classe) => `${arquivo.replace(RAIZ_DO_REPOSITORIO, "")}: ${classe}`,
        ),
      ),
    );
    expect(ocorrencias).toEqual([]);
  });
});
