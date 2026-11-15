import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(__dirname, "..");

const listFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listFiles(path.join(directory, entry.name))
      : [path.join(directory, entry.name)],
  );

const ownFiles = [".storybook", "src"].flatMap((directory) =>
  listFiles(path.join(packageRoot, directory)),
);

const baseElementSelector =
  /(^|[}\s,])(html|body|h[1-6]|p|a|ul|ol|li|dl|dt|dd|table|thead|tbody|tfoot|tr|th|td|button|input)(?=[\s,{:.[>+~#])/m;

describe("guarda de estilos do Storybook", () => {
  it("o seletor da guarda reconhece elementos base", () => {
    const offending = [
      "p { margin: 0 }",
      "h1,h2{ color: red }",
      "a:hover { color: red }",
      "ul li { color: red }",
      "body>p { color: red }",
      "h1.titulo { color: red }",
    ];
    offending.forEach((css) => {
      expect(baseElementSelector.test(css), css).toBe(true);
    });
    expect(baseElementSelector.test(".panel { color: red }")).toBe(false);
  });

  it("a story de valor usa espaco nao separavel de verdade", () => {
    const story = readFileSync(
      path.join(packageRoot, "src/valor-estatistico.stories.tsx"),
      "utf8",
    );
    expect(story).toContain("R$\\u00a01.234.567,89");
  });

  it("nao declara CSS proprio com seletor de elemento base", () => {
    const cssFiles = ownFiles.filter((file) => file.endsWith(".css"));
    const offenders = cssFiles.filter((file) =>
      baseElementSelector.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("nao injeta <style> com seletor de elemento base", () => {
    const sources = ownFiles.filter(
      (file) =>
        /\.(tsx?|html)$/.test(file) && !file.endsWith("style-guard.spec.ts"),
    );
    const offenders = sources.filter((file) => {
      const content = readFileSync(file, "utf8");
      const styleBlocks = [
        ...content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g),
      ];
      return styleBlocks.some(([, css]) => baseElementSelector.test(css));
    });
    expect(offenders).toEqual([]);
  });

  it("o preview importa o globals.css do app", () => {
    const preview = readFileSync(
      path.join(packageRoot, ".storybook/preview.tsx"),
      "utf8",
    );
    expect(preview).toMatch(/import\s+"\.\.\/\.\.\/web\/app\/globals\.css"/);
  });

  it("registra o resultado de stat-value-lg para a decisao da 20.14", () => {
    // Resultado conferido no navegador (claro e escuro, desktop e mobile,
    // 2026-10-30; mesmo resultado nos quatro casos): com
    // tabular-nums em Source Serif 4, "1.111.111,11" e "8.888.888,88" ficam
    // com a mesma largura, e o espaco comum (U+0020) e o nao separavel
    // (U+00A0) apos "R$" ficam visualmente identicos. Decisao da 20.14:
    // manter serifa e tabular-nums, sem trocar para font-sans e sem U+00A0.
    const globals = readFileSync(
      path.resolve(packageRoot, "../web/app/globals.css"),
      "utf8",
    );
    const start = globals.indexOf("@utility stat-value-lg");
    expect(start).toBeGreaterThan(-1);
    const rest = globals.slice(start);
    const end = rest.indexOf("\n@utility", 1);
    expect(end).toBeGreaterThan(-1);
    expect(rest.slice(0, end)).toMatch(/font-variant-numeric:\s*tabular-nums/);
  });
});
