import { fmtCurrency } from "@transparencia/ui";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  ExternalLink,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  MinimosLegaisView,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";

type MinimoLegal = MinimosLegaisView["mde"];

/** Textos e peças compartilhadas entre o topo, as seções e os modais de educação. */
export const NOTA_DECLARACAO =
  "A Prefeitura informa estes números ao governo federal pelo SIOPE, o sistema oficial de dados da educação. O portal mostra o número como o governo federal o publicou, sem recalcular.";
export const NOTA_MINIMO_GASTO =
  "O mínimo vale para o que a Prefeitura gasta em educação, não para o que ela recebe.";
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

/** "em 2025" ou, no ano em andamento, "parcial: acumulado até o 3º bimestre de 2025". */
export function descreverPeriodo(view: {
  ano: number;
  parcial: boolean;
  periodo: number | null;
}): string {
  return view.parcial && view.periodo !== null
    ? `parcial: acumulado até o ${view.periodo}º bimestre de ${view.ano}`
    : `em ${view.ano}`;
}

/** Texto com palavra e sinal, nunca só cor. */
export function descreverVariacaoValorPorAluno(
  view: ValorPorAlunoView,
): string {
  if (view.parcial) {
    return "ano em andamento: não se compara com anos já fechados";
  }
  if (view.variacaoValor === null || view.anoAnterior === null) {
    return "sem ano anterior fechado para comparar";
  }
  if (view.variacaoValor === 0) {
    return `igual a ${view.anoAnterior}`;
  }
  const palavra = view.variacaoValor > 0 ? "subiu" : "caiu";
  const percentual =
    view.variacaoPercentual === null
      ? ""
      : ` (${formatarPercentualVariacao(view.variacaoPercentual)})`;
  return `${palavra} ${fmtCurrency(Math.abs(view.variacaoValor))}${percentual} em relação a ${view.anoAnterior}`;
}

/** Texto + ícone, nunca só cor, em linha própria; abaixo do mínimo fala em "indício", sem acusar. */
export function Veredito({ minimo }: { minimo: MinimoLegal }) {
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
  if (minimo.resultado === "parcial") {
    return (
      <span className="block">
        Ano em andamento: o resultado só fica claro quando o ano fechar
      </span>
    );
  }
  return null;
}

export interface LeiLinkProps {
  label: string;
  url: string;
  /** Leitura completa para leitor de tela (ex.: "Texto oficial da Lei ... no Planalto"). */
  ariaLabel?: string;
}

/** Link de lei com ícone e nova aba (Regra 20). */
export function LeiLink({ label, url, ariaLabel }: LeiLinkProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 text-brand-text underline underline-offset-2"
    >
      {label}
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
      {ariaLabel ? null : <span className="sr-only">(abre em nova aba)</span>}
    </a>
  );
}

const juntarComSeparador = (itens: ReactNode[]) =>
  itens.map((item, indice) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: lista fixa de links de um rodapé
    <span key={indice}>
      {indice > 0 && " · "}
      {item}
    </span>
  ));

export interface LinhaLeiEFonteProps {
  source?: ReactNode;
  laws?: LeiLinkProps[];
  /** Conteúdo extra no fim da linha (ex.: o link "Ver detalhes"). */
  extra?: ReactNode;
}

/** Legenda "Lei: … · Fonte: …": sem fundo, no topo e no rodapé dos modais. */
export function LinhaLeiEFonte({
  source,
  laws = [],
  extra,
}: LinhaLeiEFonteProps) {
  const partes: ReactNode[] = [
    ...(laws.length > 0
      ? [
          <span key="leis">
            <strong>{laws.length > 1 ? "Leis" : "Lei"}:</strong>{" "}
            {juntarComSeparador(
              laws.map((law) => <LeiLink key={law.url} {...law} />),
            )}
          </span>,
        ]
      : []),
    ...(source
      ? [
          <span key="fonte">
            <strong>Fonte:</strong> {source}
          </span>,
        ]
      : []),
    ...(extra ? [extra] : []),
  ];
  if (partes.length === 0) return null;
  return <p className="caption">{juntarComSeparador(partes)}</p>;
}

export const formatarLimite = (limite: number) =>
  `${limite.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

export const motivoSemPercentual = (view: MinimosLegaisView) =>
  view.semDadoSiope
    ? `sem dado publicado para ${view.ano}`
    : `a Prefeitura não informou o percentual de ${view.ano} ao governo federal`;

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
