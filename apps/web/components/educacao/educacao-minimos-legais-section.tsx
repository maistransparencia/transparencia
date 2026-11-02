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
  "A Prefeitura informa estes percentuais ao governo federal pelo SIOPE, o sistema oficial de dados da educação. O portal mostra o número como o governo federal o publicou, sem recalcular. O mínimo vale para o que a Prefeitura gasta em educação, não para o que ela recebe.";

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
        Ano em andamento: o resultado só fica claro quando o ano fechar
      </span>
    );
  }
  return null;
}

function notaDoMinimo(
  minimo: MinimoLegal,
  view: MinimosLegaisView,
  baseCalculo: string,
): ReactNode {
  if (minimo.percentualAplicado === null) {
    return view.semDadoSiope
      ? `sem dado publicado para ${view.ano}`
      : `a Prefeitura não informou o percentual de ${view.ano} ao governo federal`;
  }
  return (
    <>
      {minimo.limite !== null && (
        <span className="block">
          mínimo exigido: {fmtPercent(minimo.limite)} {baseCalculo}
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
  const { mde, fundebProfissionais } = minimosLegais;

  return (
    <section id="minimo-exigido" className="space-y-6">
      <SectionHeader
        title="A Prefeitura aplica o mínimo exigido em educação?"
        description={NOTA_DECLARACAO}
      />
      <IndicatorPanel>
        <Indicator
          label="Aplicado em ensino (MDE)"
          value={
            mde.percentualAplicado === null
              ? "—"
              : fmtPercent(mde.percentualAplicado)
          }
          note={notaDoMinimo(
            mde,
            minimosLegais,
            "da receita de impostos e transferências",
          )}
        />
        <Indicator
          label="Fundeb pago aos profissionais da educação"
          value={
            fundebProfissionais.percentualAplicado === null
              ? "—"
              : fmtPercent(fundebProfissionais.percentualAplicado)
          }
          note={notaDoMinimo(
            fundebProfissionais,
            minimosLegais,
            "dos recursos do Fundeb",
          )}
        />
      </IndicatorPanel>
    </section>
  );
}
