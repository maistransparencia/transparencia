import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TOKENS } from "./tokens";

const css = readFileSync(
  path.resolve(__dirname, "../../../apps/web/app/globals.css"),
  "utf8",
);

const nomesDoBloco = (seletor: RegExp): string[] => {
  const inicio = css.search(seletor);
  const bloco = css.slice(css.indexOf("{", inicio), css.indexOf("}", inicio));
  return [...bloco.matchAll(/--([\w-]+)\s*:/g)].map(([, nome]) => nome);
};

const nomesClaro = nomesDoBloco(/(^|\n):root\s*\{/);
const nomesEscuro = nomesDoBloco(/(^|\n)\.dark\s*\{/);
const variaveisDeTokens = Object.entries(TOKENS.colors).map(
  ([chave, valor]) => [chave, valor.match(/^var\(--([\w-]+)\)$/)?.[1]] as const,
);

describe("TOKENS x globals.css", () => {
  it.each(variaveisDeTokens)(
    "%s aponta para var(--...)",
    (_chave, variavel) => {
      expect(variavel).toBeDefined();
    },
  );

  it.each(variaveisDeTokens)(
    "variável de %s existe em :root",
    (_c, variavel) => {
      expect(nomesClaro).toContain(variavel);
    },
  );

  it.each(variaveisDeTokens)(
    "variável de %s existe em .dark",
    (_c, variavel) => {
      expect(nomesEscuro).toContain(variavel);
    },
  );
});

const blocoDoTema = (seletor: RegExp): string => {
  const inicio = css.search(seletor);
  return css.slice(css.indexOf("{", inicio), css.indexOf("}", inicio));
};

const valorBruto = (bloco: string, nome: string): string => {
  const valor = bloco.match(new RegExp(`--${nome}\\s*:\\s*([^;]+);`))?.[1];
  if (!valor) throw new Error(`token --${nome} ausente`);
  return valor.trim();
};

const referencia = (valor: string): string | undefined =>
  valor.match(/^var\(--([\w-]+)\)$/)?.[1];

const resolver = (bloco: string, nome: string): string => {
  const valor = valorBruto(bloco, nome);
  const alvo = referencia(valor);
  return alvo ? resolver(bloco, alvo) : valor;
};

const luminanciaRelativa = (rgb: number[]): number => {
  const [r = 0, g = 0, b = 0] = rgb.map((canal) =>
    Math.min(1, Math.max(0, canal)),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const oklchParaRgbLinear = (valor: string): number[] => {
  const [luminosidade = 0, croma = 0, matiz = 0] = (
    valor.match(/oklch\(([^)]+)\)/)?.[1] ?? ""
  )
    .split(/\s+/)
    .map(Number);
  const a = croma * Math.cos((matiz * Math.PI) / 180);
  const b = croma * Math.sin((matiz * Math.PI) / 180);
  const l = (luminosidade + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (luminosidade - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (luminosidade - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

const hexParaRgbLinear = (valor: string): number[] =>
  [1, 3, 5].map((inicio) => {
    const canal = Number.parseInt(valor.slice(inicio, inicio + 2), 16) / 255;
    return canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });

const luminancia = (valor: string): number =>
  luminanciaRelativa(
    valor.startsWith("#") ? hexParaRgbLinear(valor) : oklchParaRgbLinear(valor),
  );

const contraste = (a: string, b: string): number => {
  const [maior = 0, menor = 0] = [luminancia(a), luminancia(b)].sort(
    (x, y) => y - x,
  );
  return (maior + 0.05) / (menor + 0.05);
};

const temas = [
  ["claro", /(^|\n):root\s*\{/],
  ["escuro", /(^|\n)\.dark\s*\{/],
] as const;
const intencoes = ["brand", "ok", "warn", "danger"] as const;

describe.each(temas)(
  "contraste das cores semânticas no tema %s",
  (_t, seletor) => {
    const bloco = blocoDoTema(seletor);
    const cor = (nome: string) => resolver(bloco, nome);

    describe.each(intencoes)("%s", (intencao) => {
      it.each(["page", "banbg"])(
        "%s-text sobre %s tem no mínimo 4,5:1",
        (fundo) => {
          expect(
            contraste(cor(`${intencao}-text`), cor(fundo)),
          ).toBeGreaterThanOrEqual(4.5);
        },
      );

      it.each(["track", "line2"])(
        "%s-fill sobre %s tem no mínimo 1,5:1 (elemento gráfico, sempre acompanhado de rótulo e valor)",
        (fundo) => {
          expect(
            contraste(cor(`${intencao}-fill`), cor(fundo)),
          ).toBeGreaterThanOrEqual(1.5);
        },
      );
    });
  },
);

describe("alias dos tokens antigos", () => {
  it.each(temas)(
    "warn, ok e danger seguem o tom de texto no tema %s",
    (_t, seletor) => {
      const bloco = blocoDoTema(seletor);
      expect(valorBruto(bloco, "warn")).toBe("var(--warn-text)");
      expect(valorBruto(bloco, "ok")).toBe("var(--ok-text)");
      expect(valorBruto(bloco, "danger")).toBe("var(--danger-text)");
    },
  );
});
