import { fmtCompact, ThresholdMeter } from "@transparencia/ui";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CLASSE_ACAO_DESTAQUE } from "./destaque-linha";
import { SectionWithHeader } from "./section-with-header";

export interface DinheiroPublicoSectionProps {
  arrecadadoTitle: string;
  totalArrecadado: number;
  previstoTotal: number;
  percentualPrevisto: number;
  receitasDetailUrl: string;
}

/** Receita do ano: total arrecadado contra a previsão de receita, com atalho para receitas. */
export function DinheiroPublicoSection({
  arrecadadoTitle,
  totalArrecadado,
  previstoTotal,
  percentualPrevisto,
  receitasDetailUrl,
}: DinheiroPublicoSectionProps) {
  const larguraBarra = Math.min(100, Math.max(0, percentualPrevisto));

  return (
    <SectionWithHeader
      id="dinheiro-publico"
      title="Quanto dinheiro entrou"
      description="Quanto a Prefeitura arrecadou, comparado com o que previa arrecadar."
    >
      <div className="space-y-3">
        <p className="eyebrow">{arrecadadoTitle}</p>
        <p className="stat-value-lg">{fmtCompact(totalArrecadado)}</p>
        <ThresholdMeter
          value={larguraBarra}
          label="Arrecadado em relação à receita prevista"
          valueText={`${percentualPrevisto}% da receita prevista`}
        />
        <p className="caption">
          {percentualPrevisto}% da receita prevista de{" "}
          {fmtCompact(previstoTotal)} para o exercício.
        </p>
        <Link href={receitasDetailUrl} className={CLASSE_ACAO_DESTAQUE}>
          <span>Ver detalhes</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </SectionWithHeader>
  );
}
