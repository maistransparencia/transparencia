import { describe, expect, it } from "vitest";
import { lerTokensPorTema, razaoContraste, type TemaToken } from "./tokens-css";

const temas: TemaToken[] = ["claro", "escuro"];
const tokensDeTexto = [
  "ink",
  "mute",
  "mute2",
  "mute3",
  "brand",
  "danger",
  "ok",
  "warn",
];
const fundosDeTexto = ["page", "banbg", "track"];
const tokensPorTema = lerTokensPorTema();

describe("contraste dos tokens (WCAG AA)", () => {
  it.each(temas)("tema %s declara os 17 tokens", (tema) => {
    expect(Object.keys(tokensPorTema[tema]).sort()).toEqual(
      expect.arrayContaining([
        "banbg",
        "banfg",
        "brand",
        "danger",
        "faint",
        "ink",
        "line",
        "line2",
        "mute",
        "mute2",
        "mute3",
        "ok",
        "onink",
        "page",
        "pill",
        "track",
        "warn",
      ]),
    );
  });

  describe.each(temas)("tema %s", (tema) => {
    const tokens = tokensPorTema[tema];

    it.each(
      tokensDeTexto.flatMap((texto) =>
        fundosDeTexto.map((fundo) => [texto, fundo] as const),
      ),
    )("%s sobre %s tem pelo menos 4,5:1", (texto, fundo) => {
      expect(
        razaoContraste(tokens[texto], tokens[fundo]),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("banfg sobre banbg tem pelo menos 4,5:1", () => {
      expect(razaoContraste(tokens.banfg, tokens.banbg)).toBeGreaterThanOrEqual(
        4.5,
      );
    });

    it("onink sobre ink tem pelo menos 4,5:1", () => {
      expect(razaoContraste(tokens.onink, tokens.ink)).toBeGreaterThanOrEqual(
        4.5,
      );
    });

    it("mute3 sobre page tem pelo menos 3:1 (limite de controle)", () => {
      expect(razaoContraste(tokens.mute3, tokens.page)).toBeGreaterThanOrEqual(
        3,
      );
    });
  });
});
