import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const regrasTema = {
  "dark-em-componente": /(?<![\w-])dark:/,
  "cor-hex-literal": /#[0-9a-fA-F]{6}\b/,
  "token-decorativo-como-texto":
    /(?<![\w-])text-(?:faint|pill|line2|line|track)(?![\w-])/,
  "raio-antigo": /rounded-(?:xl|2xl|\[10px\])(?![\w-])/,
} as const;

export type RegraTema = keyof typeof regrasTema;

export const excecoesPermanentes: readonly string[] = [
  "apps/web/app/opengraph-image.tsx",
  "apps/web/app/manifest.ts",
];

const raizRepositorio = path.resolve(__dirname, "../../..");
const diretoriosVarridos = [
  "apps/web/app",
  "apps/web/components",
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
    return /\.tsx?$/.test(entrada.name) &&
      !/\.(spec|test)\.tsx?$/.test(entrada.name)
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
        .filter(({ conteudo }) => regrasTema[regra].test(conteudo))
        .map(({ arquivo }) => arquivo),
    ]),
  ) as Record<RegraTema, string[]>;
};
