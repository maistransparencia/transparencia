import { describe, expect, it } from "vitest";
import { lerCoresDoTema, lerTokensPorTema } from "./tokens-css";

const coresDoTema = lerCoresDoTema();
const tokensPorTema = lerTokensPorTema();
const nomesDeCor = (tema: "claro" | "escuro"): string[] =>
  Object.keys(tokensPorTema[tema])
    .filter((nome) => !nome.startsWith("font-") && !nome.startsWith("panel-"))
    .sort();

describe("@theme inline de globals.css", () => {
  it("tem uma utility de cor para cada token e nenhum alias legado", () => {
    expect(Object.keys(coresDoTema)).toEqual(
      expect.arrayContaining(nomesDeCor("claro")),
    );
  });

  it.each(Object.entries(coresDoTema))(
    "--color-%s aponta para um token declarado nos dois temas",
    (_nome, token) => {
      expect(nomesDeCor("claro")).toContain(token);
      expect(nomesDeCor("escuro")).toContain(token);
    },
  );

  it("não define utilities de cor para aliases legados", () => {
    const aliasesRemovidos = [
      "accent",
      "attention",
      "borderLine",
      "canvas",
      "cardBg",
      "inactive",
      "mutedText",
      "subtleText",
      "success",
      "warning",
    ];
    expect(
      Object.keys(coresDoTema).filter((nome) =>
        aliasesRemovidos.includes(nome),
      ),
    ).toEqual([]);
  });

  it("o tema escuro declara exatamente os mesmos tokens do claro", () => {
    expect(nomesDeCor("escuro")).toEqual(nomesDeCor("claro"));
  });
});
