import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const arquivos = readdirSync(__dirname)
  .filter((nome) => /\.tsx?$/.test(nome) && !/\.spec\./.test(nome))
  .map((nome) => ({
    nome,
    texto: readFileSync(path.join(__dirname, nome), "utf8"),
  }));

describe("estrutura dos componentes de educação", () => {
  it("NOTA_DECLARACAO e NOTA_INFLACAO existem uma só vez", () => {
    ["NOTA_DECLARACAO", "NOTA_INFLACAO"].forEach((nome) => {
      const definicoes = arquivos.filter(({ texto }) =>
        new RegExp(`const ${nome}\\b`).test(texto),
      );
      expect(definicoes.map(({ nome: arquivo }) => arquivo)).toEqual([
        "educacao-textos.tsx",
      ]);
    });
  });

  it('"Ver detalhes" só é desenhado pelo componente único', () => {
    const fora = arquivos
      .filter(({ nome }) => nome !== "ver-detalhes-link.tsx")
      .filter(({ texto }) => />\s*Ver detalhes\s*</.test(texto))
      .map(({ nome }) => nome);
    expect(fora).toEqual([]);
  });

  it("Veredito e notaDoMinimo não são duplicados", () => {
    const definicoes = arquivos.filter(({ texto }) =>
      /function (Veredito|notaDoMinimo|notaDoValorPorAluno)\b/.test(texto),
    );
    expect(definicoes.map(({ nome }) => nome)).toEqual(["educacao-textos.tsx"]);
  });

  it("sem paleta fixa nem fonte mono fora de tabela", () => {
    const ofensores = arquivos
      .filter(({ texto }) => /(^|[\s"'`])(slate-|gray-)|font-mono/.test(texto))
      .map(({ nome }) => nome);
    expect(ofensores).toEqual([]);
  });

  it("texto corrido dos modais usa text-sm, não o tamanho base", () => {
    const ofensores = arquivos
      .filter(({ nome }) => /modal|historico|memoria/.test(nome))
      .filter(({ texto }) => /<p className="text-mute">/.test(texto))
      .map(({ nome }) => nome);
    expect(ofensores).toEqual([]);
  });
});
