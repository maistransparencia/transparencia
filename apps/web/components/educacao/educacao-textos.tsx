import { fmtCurrency } from "@transparencia/ui";
import { ArrowDown, ArrowUp, CheckCircle, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type {
  AprendizadoEtapa,
  MinimosLegaisView,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";

type MinimoLegal = MinimosLegaisView["mde"];

/** Textos e peças compartilhadas entre o topo, as seções e os modais de educação. */
export const NOTA_DECLARACAO =
  "A Prefeitura informa estes números ao governo federal pelo SIOPE. O portal os mostra como foram publicados, sem recalcular.";
export const NOTA_INFLACAO =
  "Valores da época, sem correção pela inflação: anos diferentes não são comparáveis em poder de compra.";
export const FONTE_SIOPE = "SIOPE, sistema do governo federal";

export const formatarNota = (nota: number) =>
  nota.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const formatarPercentualVariacao = (valor: number) =>
  `${Math.abs(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;

/** "em 2025" ou, no ano em andamento, "acumulado até o 3º bimestre de 2025". */
export function descreverPeriodo(view: {
  ano: number;
  parcial: boolean;
  periodo: number | null;
}): string {
  return view.parcial && view.periodo !== null
    ? `acumulado até o ${view.periodo}º bimestre de ${view.ano}`
    : `em ${view.ano}`;
}

/** Texto com palavra e sinal, nunca só cor. */
export function descreverVariacaoValorPorAluno(
  view: ValorPorAlunoView,
): string {
  if (view.parcial) {
    return "Ano em andamento, sem comparação";
  }
  if (view.variacaoValor === null || view.anoAnterior === null) {
    return "Sem ano anterior para comparar";
  }
  if (view.variacaoValor === 0) {
    return `Igual a ${view.anoAnterior}`;
  }
  const palavra = view.variacaoValor > 0 ? "Subiu" : "Caiu";
  const percentual =
    view.variacaoPercentual === null
      ? ""
      : ` (${formatarPercentualVariacao(view.variacaoPercentual)})`;
  return `${palavra} ${fmtCurrency(Math.abs(view.variacaoValor))}${percentual} desde ${view.anoAnterior}`;
}

/** Texto + ícone, nunca só cor, em linha própria; abaixo do mínimo fala em "indício", sem acusar. */
export function Veredito({
  minimo,
  ocultarCumpriu = false,
}: {
  minimo: MinimoLegal;
  /** O marcador na barra já mostra que cumpriu; só o que pede atenção vira texto. */
  ocultarCumpriu?: boolean;
}) {
  if (minimo.resultado === "cumpriu" && ocultarCumpriu) return null;
  if (minimo.resultado === "cumpriu") {
    return (
      <span className="flex items-center gap-1">
        <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        Cumpriu o mínimo
      </span>
    );
  }
  if (minimo.resultado === "abaixo") {
    return (
      <span className="flex items-center gap-1">
        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        Ficou abaixo do mínimo: indício a ser esclarecido pela Prefeitura
      </span>
    );
  }
  return null;
}

export const formatarLimite = (limite: number) =>
  `${limite.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

export const motivoSemPercentual = (view: MinimosLegaisView) =>
  view.semDadoSiope
    ? `Sem dado publicado para ${view.ano}`
    : `A Prefeitura não informou o percentual de ${view.ano} ao governo federal`;

export const pluralizar = (
  quantidade: number,
  singular: string,
  plural: string,
) => (Math.abs(quantidade) === 1 ? singular : plural);

/** Texto com palavra e sinal ("subiu 1,4 ponto"), nunca só cor. */
export function descreverVariacaoPontos(pontos: number): string {
  const magnitude = formatarNota(Math.abs(pontos));
  const unidade = pluralizar(pontos, "ponto", "pontos");
  if (pontos > 0) return `subiu ${magnitude} ${unidade}`;
  if (pontos < 0) return `caiu ${magnitude} ${unidade}`;
  return "ficou igual";
}

/** Seta e quantidade ao lado do valor: sobe em ok-text, cai em danger-text, nada se não mudou. */
export function VariacaoAoLado({
  variacao,
  texto,
}: {
  variacao: number | null;
  texto: string;
}) {
  if (variacao === null || variacao === 0) return null;
  const subiu = variacao > 0;
  const Seta = subiu ? ArrowUp : ArrowDown;
  return (
    <span
      aria-hidden="true"
      className={`ml-2 inline-flex items-center gap-1 font-semibold text-base ${
        subiu ? "text-ok-text" : "text-danger-text"
      }`}
    >
      <Seta className="h-4 w-4" />
      {texto}
    </span>
  );
}

/** Uma linha `dl`: rótulo `eyebrow` à esquerda, valor à direita, sem fonte mono. */
export function LinhaDl({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-line2 border-t py-2.5">
      <dt className="eyebrow">{label}</dt>
      <dd className="font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

/** Frase da posição entre as redes do estado, com a mudança desde a nota anterior; o que importa vai em negrito. */
export function FraseClassificacao({
  classificacao,
  anoAnterior,
}: {
  classificacao: NonNullable<AprendizadoEtapa["classificacao"]>;
  anoAnterior: number | null;
}) {
  const {
    posicao,
    total,
    variacaoPosicoes,
    redesComparadas,
    totalCicloAnterior,
  } = classificacao;
  const posicaoAtual = (
    <>
      <strong className="font-semibold">{posicao}º lugar</strong> entre {total}{" "}
      redes municipais do estado.
    </>
  );
  if (variacaoPosicoes === null || anoAnterior === null) return posicaoAtual;
  if (variacaoPosicoes === 0) {
    return (
      <>
        {posicaoAtual} <strong className="font-semibold">Mesma posição</strong>{" "}
        de {anoAnterior}.
      </>
    );
  }
  const unidade = pluralizar(variacaoPosicoes, "posição", "posições");
  const verbo = variacaoPosicoes > 0 ? "Subiu" : "Caiu";
  const redesMudaram =
    redesComparadas !== null &&
    (redesComparadas !== total ||
      (totalCicloAnterior !== null && redesComparadas !== totalCicloAnterior));
  return (
    <>
      {posicaoAtual}{" "}
      <strong className="font-semibold">
        {verbo} {Math.abs(variacaoPosicoes)} {unidade}
      </strong>{" "}
      desde {anoAnterior}
      {redesMudaram
        ? ` (entre as ${redesComparadas} redes avaliadas nos dois anos)`
        : ""}
      .
    </>
  );
}
