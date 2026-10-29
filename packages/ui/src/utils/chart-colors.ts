import { TOKENS } from "../tokens";

/** Lista de permissão: apenas tokens semânticos; aliases legados ficam de fora. */
export const TOKENS_CORES_GRAFICO = [
  "page",
  "ink",
  "onink",
  "line",
  "line2",
  "track",
  "mute",
  "mute2",
  "mute3",
  "faint",
  "pill",
  "banbg",
  "banfg",
  "brand",
  "danger",
  "ok",
  "warn",
] as const satisfies readonly (keyof typeof TOKENS.colors)[];

export type TokenCorGrafico = (typeof TOKENS_CORES_GRAFICO)[number];

/** Tokens de intenção que têm o par `*-fill` correspondente. */
const TOKENS_COM_PREENCHIMENTO = {
  brand: "brandFill",
  danger: "dangerFill",
  ok: "okFill",
  warn: "warnFill",
} as const satisfies Partial<
  Record<TokenCorGrafico, keyof typeof TOKENS.colors>
>;

/**
 * Devolve `var(--token)` para usar em `fill`/`stroke` do recharts.
 * Cores de intenção usam o tom `*-fill` (vivo); `*-text` é só para texto.
 */
export const corDoGrafico = (token: TokenCorGrafico): string =>
  token in TOKENS_COM_PREENCHIMENTO
    ? TOKENS.colors[
        TOKENS_COM_PREENCHIMENTO[token as keyof typeof TOKENS_COM_PREENCHIMENTO]
      ]
    : TOKENS.colors[token];

/** Atributos prontos para barras, áreas e linhas do recharts. */
export const coresDoGrafico = {
  preenchimento: (token: TokenCorGrafico) => ({ fill: corDoGrafico(token) }),
  traco: (token: TokenCorGrafico) => ({ stroke: corDoGrafico(token) }),
} as const;
