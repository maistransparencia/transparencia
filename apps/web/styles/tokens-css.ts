import { readFileSync } from "node:fs";
import path from "node:path";

export type TemaToken = "claro" | "escuro";

const caminhoGlobalsCss = path.resolve(__dirname, "../app/globals.css");

export const lerGlobalsCss = (): string =>
  readFileSync(caminhoGlobalsCss, "utf8");

const extrairBloco = (css: string, seletor: string): string => {
  const inicio = css.search(new RegExp(`(^|\\n)${seletor}\\s*\\{`));
  if (inicio < 0) throw new Error(`Bloco CSS não encontrado: ${seletor}`);
  const abertura = css.indexOf("{", inicio);
  const fechamento = css.indexOf("}", abertura);
  return css.slice(abertura + 1, fechamento);
};

/** Lê as declarações `--token: valor;` de um bloco (`:root` ou `.dark`), resolvendo aliases `var(--outro)`. */
export const lerTokensDoBloco = (
  css: string,
  seletor: ":root" | "\\.dark",
): Record<string, string> => {
  const declarados = Object.fromEntries(
    [...extrairBloco(css, seletor).matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(
      ([, nome, valor]) => [nome, valor.trim()],
    ),
  );
  const resolver = (valor: string): string => {
    const alvo = valor.match(/^var\(--([\w-]+)\)$/)?.[1];
    return alvo && declarados[alvo] ? resolver(declarados[alvo]) : valor;
  };
  return Object.fromEntries(
    Object.entries(declarados).map(([nome, valor]) => [nome, resolver(valor)]),
  );
};

/** Lê `--color-nome: var(--token);` do bloco `@theme inline`: nome da utility -> token. */
export const lerCoresDoTema = (
  css: string = lerGlobalsCss(),
): Record<string, string> =>
  Object.fromEntries(
    [
      ...extrairBloco(css, "@theme inline").matchAll(
        /--color-([\w-]+)\s*:\s*var\(--([\w-]+)\)\s*;/g,
      ),
    ].map(([, nome, token]) => [nome, token]),
  );

export const lerTokensPorTema = (
  css: string = lerGlobalsCss(),
): Record<TemaToken, Record<string, string>> => ({
  claro: lerTokensDoBloco(css, ":root"),
  escuro: lerTokensDoBloco(css, "\\.dark"),
});

type Rgb = readonly [number, number, number];

const limitar = (valor: number): number => Math.min(1, Math.max(0, valor));

const codificarGama = (linear: number): number =>
  linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;

const oklchParaRgb = (
  luminosidade: number,
  croma: number,
  matiz: number,
): Rgb => {
  const radianos = (matiz * Math.PI) / 180;
  const a = croma * Math.cos(radianos);
  const b = croma * Math.sin(radianos);
  const l = (luminosidade + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (luminosidade - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (luminosidade - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((canal) => limitar(codificarGama(limitar(canal)))) as unknown as Rgb;
};

export const corParaRgb = (valor: string): Rgb => {
  const hex = valor.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const inteiro = Number.parseInt(hex[1], 16);
    return [(inteiro >> 16) & 255, (inteiro >> 8) & 255, inteiro & 255].map(
      (canal) => canal / 255,
    ) as unknown as Rgb;
  }
  const oklch = valor.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (oklch) {
    return oklchParaRgb(Number(oklch[1]), Number(oklch[2]), Number(oklch[3]));
  }
  throw new Error(`Formato de cor não suportado: ${valor}`);
};

const luminanciaRelativa = ([r, g, b]: Rgb): number => {
  const [rl, gl, bl] = [r, g, b].map((canal) =>
    canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

export const razaoContraste = (primeira: string, segunda: string): number => {
  const [maisClara, maisEscura] = [
    luminanciaRelativa(corParaRgb(primeira)),
    luminanciaRelativa(corParaRgb(segunda)),
  ].sort((x, y) => y - x);
  return (maisClara + 0.05) / (maisEscura + 0.05);
};
