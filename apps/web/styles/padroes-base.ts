import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type RegraPadraoBase =
  | "cor-slate-gray-black-white"
  | "tamanho-de-fonte-em-titulo"
  | "titulo-h5-h6"
  | "font-mono-fora-de-tabela-e-numeric";

const raizRepositorio = path.resolve(__dirname, "../../..");
const diretoriosVarridos = ["apps/web", "packages/ui/src"];
const pastasIgnoradas = new Set(["node_modules", ".next", "dist", "e2e"]);

const classeDeCorProibida =
  /(?<![\w-])(?:(?:text|bg|border|ring|outline|fill|stroke|from|to|via|decoration|divide|placeholder|caret|accent|shadow)-(?:slate|gray)-\d+|text-(?:black|white))(?![\w-])/;
const abreTituloComClasseDeTamanho = /<h[1-4]\b[\s\S]*?(?<!=)>/g;
const classeDeTamanhoDeFonte =
  /(?<![\w-])(?:[\w]+:)*text-(?:xs|sm|base|lg|xl|\dxl|\[\d[\w.]*\])(?![\w-])/;
const tituloH5H6 = /<h[56]\b/;
const nomeDaTag = /^<([A-Za-z][\w.]*)/;
const tagsDeTabela = new Set([
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
]);
const classeMono = /(?<![\w-])font-mono(?![\w-])/g;

const violaTamanhoEmTitulo = (conteudo: string): boolean =>
  (conteudo.match(abreTituloComClasseDeTamanho) ?? []).some((tag) =>
    classeDeTamanhoDeFonte.test(tag),
  );

const violaFontMono = (conteudo: string): boolean =>
  [...conteudo.matchAll(classeMono)].some((ocorrencia) => {
    const inicioDaTag = conteudo.lastIndexOf("<", ocorrencia.index);
    const fimDaTag = conteudo.indexOf(">", ocorrencia.index);
    const trechoDaTag = conteudo.slice(
      inicioDaTag,
      fimDaTag < 0 ? undefined : fimDaTag + 1,
    );
    const nome = nomeDaTag.exec(trechoDaTag)?.[1];
    return !(
      (nome && tagsDeTabela.has(nome)) ||
      /(?<![\w-])numeric(?![\w-])/.test(trechoDaTag)
    );
  });

export const verificadoresPorRegra: Record<
  RegraPadraoBase,
  (conteudo: string) => boolean
> = {
  "cor-slate-gray-black-white": (conteudo) =>
    classeDeCorProibida.test(conteudo),
  "tamanho-de-fonte-em-titulo": violaTamanhoEmTitulo,
  "titulo-h5-h6": (conteudo) => tituloH5H6.test(conteudo),
  "font-mono-fora-de-tabela-e-numeric": violaFontMono,
};

export const regrasPadraoBase = Object.keys(
  verificadoresPorRegra,
) as RegraPadraoBase[];

const listarArquivos = (diretorio: string): string[] =>
  readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(diretorio, entrada.name);
    if (entrada.isDirectory()) {
      return pastasIgnoradas.has(entrada.name) ? [] : listarArquivos(caminho);
    }
    return /\.(?:tsx?|jsx?|mdx)$/.test(entrada.name) &&
      !/\.(spec|test)\.[jt]sx?$/.test(entrada.name)
      ? [caminho]
      : [];
  });

/** Arquivos que violam cada regra hoje, sem aplicar nenhuma lista de isentos. */
export const varrerPadroesBase = (): Record<RegraPadraoBase, string[]> => {
  const arquivos = diretoriosVarridos
    .flatMap((diretorio) =>
      listarArquivos(path.join(raizRepositorio, diretorio)),
    )
    .map((arquivo) => path.relative(raizRepositorio, arquivo))
    .filter((arquivo) => !/\/styles\/padroes-base[\w-]*\.ts$/.test(arquivo))
    .sort()
    .map((arquivo) => ({
      arquivo,
      conteudo: readFileSync(path.join(raizRepositorio, arquivo), "utf8"),
    }));
  return Object.fromEntries(
    regrasPadraoBase.map((regra) => [
      regra,
      arquivos
        .filter(({ conteudo }) => verificadoresPorRegra[regra](conteudo))
        .map(({ arquivo }) => arquivo),
    ]),
  ) as Record<RegraPadraoBase, string[]>;
};
