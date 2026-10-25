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

/** Devolve `var(--token)` para usar em `fill`/`stroke` do recharts. */
export const corDoGrafico = (token: TokenCorGrafico): string =>
  TOKENS.colors[token];

/** Atributos prontos para barras, áreas e linhas do recharts. */
export const coresDoGrafico = {
  preenchimento: (token: TokenCorGrafico) => ({ fill: corDoGrafico(token) }),
  traco: (token: TokenCorGrafico) => ({ stroke: corDoGrafico(token) }),
} as const;
