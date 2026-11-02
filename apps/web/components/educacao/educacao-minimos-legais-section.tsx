import {
  fmtPercent,
  Indicator,
  IndicatorPanel,
  SectionHeader,
} from "@transparencia/ui";
import { CheckCircle, Clock, ExternalLink, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { MinimosLegaisView } from "@/app/[portalSlug]/educacao/view-model";

export interface EducacaoMinimosLegaisSectionProps {
  minimosLegais: MinimosLegaisView;
}

type MinimoLegal = MinimosLegaisView["mde"];

const NOTA_DECLARACAO =
  "Percentuais declarados pela Prefeitura ao FNDE (SIOPE), não conferidos por este portal. O mínimo é de aplicação do dinheiro, não de repasse.";

/** Texto + ícone, nunca só cor; abaixo do mínimo fala em "indício", sem acusar. */
function Veredito({ minimo }: { minimo: MinimoLegal }) {
  if (minimo.resultado === "cumpriu") {
    return (
      <span className="inline-flex items-center gap-1">
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        Cumpriu o mínimo
      </span>
    );
  }
  if (minimo.resultado === "abaixo") {
    return (
      <span className="inline-flex items-center gap-1">
        <TriangleAlert className="h-4 w-4" aria-hidden="true" />
        Ficou abaixo do mínimo: indício a ser esclarecido pela Prefeitura
      </span>
    );
  }
  if (minimo.resultado === "parcial") {
    return (
      <span className="inline-flex items-center gap-1">
        <Clock className="h-4 w-4" aria-hidden="true" />
        Ano em andamento: ainda sem veredito
      </span>
    );
  }
  return null;
}

function notaDoMinimo(minimo: MinimoLegal, view: MinimosLegaisView): ReactNode {
  if (minimo.percentualAplicado === null) {
    return view.semDadoSiope
      ? `sem dado do SIOPE para ${view.ano}`
      : `a Prefeitura não informou o percentual ao FNDE para ${view.ano}`;
  }
  return (
    <>
      {minimo.limite !== null && (
        <span className="block">
          mínimo exigido: {fmtPercent(minimo.limite)} da receita de impostos e
          transferências
        </span>
      )}
      <span className="block">
        {view.parcial && view.periodo !== null
          ? `parcial: acumulado até o ${view.periodo}º bimestre de ${view.ano}`
          : `em ${view.ano}`}
      </span>
      <span className="block">
        <Veredito minimo={minimo} />
      </span>
      {minimo.baseLegal && minimo.urlBaseLegal && (
        <a
          href={minimo.urlBaseLegal}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-brand-text underline underline-offset-2"
        >
          {minimo.baseLegal}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">(abre em nova aba)</span>
        </a>
      )}
    </>
  );
}

export function EducacaoMinimosLegaisSection({
  minimosLegais,
}: EducacaoMinimosLegaisSectionProps) {
  const { mde } = minimosLegais;

  return (
    <section className="space-y-6">
      <SectionHeader
        title="A Prefeitura aplica o mínimo exigido em educação?"
        description={NOTA_DECLARACAO}
      />
      {/* Fundeb (SIOPE 1.2) fica oculto até o contador-publico conferir a base de cálculo. */}
      <IndicatorPanel>
        <Indicator
          label="Aplicado em ensino (MDE)"
          value={
            mde.percentualAplicado === null
              ? "—"
              : fmtPercent(mde.percentualAplicado)
          }
          note={notaDoMinimo(mde, minimosLegais)}
        />
      </IndicatorPanel>
    </section>
  );
}
