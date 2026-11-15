import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const regrasTema = {
  "dark-em-componente": /(?<![\w-])dark:/,
  "cor-hex-literal":
    /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|(?<![\w-])(?:rgb|hsl|oklch)a?\(/,
  "token-decorativo-como-texto":
    /(?<![\w-])(?:text|fill|stroke|placeholder)-(?:faint|pill|line2|line|track)(?![\w-])/,
  "paleta-fixa-do-tailwind":
    /(?<![\w-])(?:bg-white|(?:bg|border|text|ring|outline|fill|stroke|from|to|via|decoration|divide|placeholder|caret|accent)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)(?![\w-])/,
  "alias-legado-removido":
    /(?<![\w-])(?:text|bg|border|ring|outline|fill|stroke|divide|placeholder|from|to|via|decoration|shadow)-(?:accent|canvas|cardBg|borderLine|subtleText|mutedText|attention|warning|inactive|success)(?![\w-])/,
  "raio-antigo":
    /rounded(?:-(?:t|r|b|l|s|e|tl|tr|bl|br|ss|se|es|ee))?-(?:xl|2xl|\[10px\])(?![\w-])/,
} as const;

export type RegraTema = keyof typeof regrasTema;

export const excecoesPermanentes: readonly string[] = [
  "apps/web/app/opengraph-image.tsx",
  "apps/web/app/manifest.ts",
];

/**
 * Exceções legítimas e permanentes por regra, cada uma com o motivo.
 * Diferem de `tema-excecoes.json`, que é dívida temporária e deve ficar vazia.
 */
export const excecoesPermanentesPorRegra: Partial<
  Record<RegraTema, Record<string, string>>
> = {
  "cor-hex-literal": {
    "apps/web/components/emails/newsletter-confirmation.tsx":
      "e-mail: clientes de e-mail não resolvem variáveis CSS nem temas",
    "apps/web/components/emails/radar-digest.tsx":
      "e-mail: clientes de e-mail não resolvem variáveis CSS nem temas",
    "apps/web/components/og/og-card-template.tsx":
      "imagem OG: renderizada fora do navegador (satori), sempre em tema claro",
    "apps/web/components/og/og-home-card-template.tsx":
      "imagem OG: renderizada fora do navegador (satori), sempre em tema claro",
  },
};

const raizRepositorio = path.resolve(__dirname, "../../..");
const diretoriosVarridos = [
  "apps/web/app",
  "apps/web/components",
  "apps/web/hooks",
  "apps/web/lib",
  "apps/web/styles",
  "packages/ui/src",
];

const listarArquivos = (diretorio: string): string[] =>
  readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(diretorio, entrada.name);
    if (entrada.isDirectory()) {
      return entrada.name === "node_modules" || entrada.name === ".next"
        ? []
        : listarArquivos(caminho);
    }
    return /\.(?:tsx?|jsx?|mdx)$/.test(entrada.name) &&
      !/\.(spec|test)\.[jt]sx?$/.test(entrada.name)
      ? [caminho]
      : [];
  });

export const arquivosVarridos = (): string[] =>
  diretoriosVarridos
    .flatMap((diretorio) =>
      listarArquivos(path.join(raizRepositorio, diretorio)),
    )
    .map((arquivo) => path.relative(raizRepositorio, arquivo))
    .filter((arquivo) => !excecoesPermanentes.includes(arquivo))
    .sort();

/** Arquivos que violam cada regra hoje. */
export const varrerViolacoes = (): Record<RegraTema, string[]> => {
  const arquivos = arquivosVarridos().map((arquivo) => ({
    arquivo,
    conteudo: readFileSync(path.join(raizRepositorio, arquivo), "utf8"),
  }));
  return Object.fromEntries(
    (Object.keys(regrasTema) as RegraTema[]).map((regra) => [
      regra,
      arquivos
        .filter(
          ({ arquivo }) =>
            !(arquivo in (excecoesPermanentesPorRegra[regra] ?? {})),
        )
        .filter(({ conteudo }) => regrasTema[regra].test(conteudo))
        .map(({ arquivo }) => arquivo),
    ]),
  ) as Record<RegraTema, string[]>;
};
