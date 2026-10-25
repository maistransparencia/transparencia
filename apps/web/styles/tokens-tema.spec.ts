import { describe, expect, it } from "vitest";
import { lerCoresDoTema, lerTokensPorTema } from "./tokens-css";

const aliasesLegados = [
  "accent",
  "attention",
  "borderLine",
  "canvas",
  "cardBg",
  "danger",
  "inactive",
  "ink",
  "mutedText",
  "subtleText",
  "success",
  "warning",
];
const coresDoTema = lerCoresDoTema();
const tokensPorTema = lerTokensPorTema();
const nomesDeCor = (tema: "claro" | "escuro"): string[] =>
  Object.keys(tokensPorTema[tema])
    .filter((nome) => !nome.startsWith("font-"))
    .sort();

describe("@theme inline de globals.css", () => {
  it("tem uma utility de cor para cada um dos 17 tokens e cada alias legado", () => {
    expect(Object.keys(coresDoTema)).toEqual(
      expect.arrayContaining([...nomesDeCor("claro"), ...aliasesLegados]),
    );
  });

  it.each(Object.entries(coresDoTema))(
    "--color-%s aponta para um token declarado nos dois temas",
    (_nome, token) => {
      expect(nomesDeCor("claro")).toContain(token);
      expect(nomesDeCor("escuro")).toContain(token);
    },
  );

  it("o tema escuro declara exatamente os mesmos tokens do claro", () => {
    expect(nomesDeCor("escuro")).toEqual(nomesDeCor("claro"));
  });
});
