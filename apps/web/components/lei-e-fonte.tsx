import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

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
  const leisUnicas = laws.filter(
    (lei, indice) =>
      laws.findIndex((outra) => outra.url === lei.url) === indice,
  );
  const partes: ReactNode[] = [
    ...(leisUnicas.length > 0
      ? [
          <span key="leis">
            <strong>{leisUnicas.length > 1 ? "Leis" : "Lei"}:</strong>{" "}
            {juntarComSeparador(
              leisUnicas.map((law) => <LeiLink key={law.url} {...law} />),
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
