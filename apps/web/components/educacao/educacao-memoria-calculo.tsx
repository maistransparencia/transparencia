import {
  fmtCompact,
  fmtPercent,
  Indicator,
  IndicatorPanel,
} from "@transparencia/ui";
import type { EducacaoExecucaoAnoView } from "@/app/[portalSlug]/educacao/view-model";
import { NOTA_MINIMO_GASTO } from "./educacao-textos";

export interface EducacaoMemoriaCalculoProps {
  ano: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  execucao: EducacaoExecucaoAnoView;
}

const percentualDoReservado = (valor: number, reservado: number) =>
  reservado > 0 ? Math.min(100, Math.max(0, (valor / reservado) * 100)) : 0;

/** Reservado, liquidado e pago: a execução financeira à vista no topo. */
export function EducacaoMemoriaCalculo({
  ano,
  isCurrentYear,
  partialPeriod,
  execucao,
}: EducacaoMemoriaCalculoProps) {
  const { empenhado, liquidado, pago, temDados } = execucao;
  const naoPago = Math.max(0, empenhado - pago);
  const notaSemDados = `sem despesas registradas em ${ano}`;

  return (
    <div className="space-y-4" data-testid="gasto-educacao">
      <p className="eyebrow">Quanto a Prefeitura gastou em educação?</p>
      <IndicatorPanel columns={3} size="sm">
        <Indicator
          label={
            isCurrentYear
              ? "Reservado (empenhado) no ano até agora"
              : "Reservado (empenhado) no ano"
          }
          value={temDados ? fmtCompact(empenhado) : "—"}
          note={temDados ? undefined : notaSemDados}
        />
        <Indicator
          label="Serviço ou produto entregue (liquidado)"
          value={temDados ? fmtCompact(liquidado) : "—"}
          note={
            temDados
              ? `${fmtPercent(percentualDoReservado(liquidado, empenhado))} do reservado`
              : notaSemDados
          }
        />
        <Indicator
          label="Dinheiro que saiu (pago)"
          value={temDados ? fmtCompact(pago) : "—"}
          note={
            temDados
              ? `${fmtPercent(percentualDoReservado(pago, empenhado))} do reservado`
              : notaSemDados
          }
        />
      </IndicatorPanel>
      <p className="caption">
        Reservado é o empenho, o compromisso de gastar; reservar não é pagar.{" "}
        {NOTA_MINIMO_GASTO} O total soma todas as despesas da Prefeitura
        classificadas como Educação, não só as do Fundo Municipal de Educação.
        {temDados && !isCurrentYear && naoPago > 0
          ? ` Ficaram ${fmtCompact(naoPago)} sem pagar dentro do ano: podem ser pagos depois ou cancelados.`
          : ""}
      </p>
    </div>
  );
}
