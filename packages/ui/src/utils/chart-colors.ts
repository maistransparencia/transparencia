import { TOKENS } from "../tokens";

export type TokenCorGrafico = Exclude<
  keyof typeof TOKENS.colors,
  | "accent"
  | "warning"
  | "attention"
  | "inactive"
  | "success"
  | "subtleText"
  | "mutedText"
  | "border"
  | "background"
  | "cardBg"
>;

/** Devolve `var(--token)` para usar em `fill`/`stroke` do recharts. */
export const corDoGrafico = (token: TokenCorGrafico): string =>
  TOKENS.colors[token];

/** Atributos prontos para barras, áreas e linhas do recharts. */
export const coresDoGrafico = {
  preenchimento: (token: TokenCorGrafico) => ({ fill: corDoGrafico(token) }),
  traco: (token: TokenCorGrafico) => ({ stroke: corDoGrafico(token) }),
} as const;
