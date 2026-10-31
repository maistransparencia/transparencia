import { fmtCompact, fmtPercent, Indicator } from "@transparencia/ui";
import type { EducacaoExecucaoAnoView } from "@/app/[portalSlug]/educacao/view-model";

export interface EducacaoHeroSectionProps {
  ano: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  execucao: EducacaoExecucaoAnoView;
}

const percentualDoReservado = (valor: number, reservado: number) =>
  reservado > 0 ? Math.min(100, Math.max(0, (valor / reservado) * 100)) : 0;

export function EducacaoHeroSection({
  ano,
  isCurrentYear,
  partialPeriod,
  execucao,
}: EducacaoHeroSectionProps) {
  const { empenhado, liquidado, pago, temDados } = execucao;
  const naoPago = Math.max(0, empenhado - pago);
  const liquidadoRatio = percentualDoReservado(liquidado, empenhado);
  const pagoRatio = percentualDoReservado(pago, empenhado);
  const notaSemDados = `sem despesas registradas em ${ano}`;

  const titulo = (() => {
    if (!temDados) {
      return `A Prefeitura não tem despesas de educação registradas em ${ano}.`;
    }
    if (isCurrentYear) {
      return `A Prefeitura já pagou ${fmtCompact(pago)} dos ${fmtCompact(empenhado)} que reservou em educação em ${ano}.`;
    }
    return `A Prefeitura reservou ${fmtCompact(empenhado)} em educação em ${ano} e pagou ${fmtCompact(pago)}.`;
  })();

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        <p className="eyebrow text-brand-text!">
          EDUCAÇÃO · EXERCÍCIO {ano}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </p>

        <h1>{titulo}</h1>

        <p className="lead">
          Reservado é o empenho: o compromisso de gastar. Reservar não é pagar.
          O total soma todas as despesas da Prefeitura classificadas como
          Educação, não só as do Fundo Municipal de Educação.
          {temDados && !isCurrentYear && naoPago > 0
            ? ` Ficaram ${fmtCompact(naoPago)} sem pagar dentro do ano: podem ser pagos depois ou cancelados.`
            : ""}
        </p>
      </div>

      <div className="panel panel-brand space-y-6 lg:col-span-5">
        <dl>
          <Indicator
            size="md"
            label={
              isCurrentYear
                ? "Reservado (empenhado) no ano até agora"
                : "Reservado (empenhado) no ano"
            }
            value={temDados ? fmtCompact(empenhado) : "—"}
            note={temDados ? undefined : notaSemDados}
          />
        </dl>

        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Indicator
              size="sm"
              label="Serviço ou produto entregue (liquidado)"
              value={temDados ? fmtCompact(liquidado) : "—"}
              note={
                temDados
                  ? `${fmtPercent(liquidadoRatio)} do reservado`
                  : notaSemDados
              }
            />
            <ProgressBar percent={liquidadoRatio} />
          </div>
          <div className="space-y-2">
            <Indicator
              size="sm"
              label="Dinheiro que saiu (pago)"
              value={temDados ? fmtCompact(pago) : "—"}
              note={
                temDados
                  ? `${fmtPercent(pagoRatio)} do reservado`
                  : notaSemDados
              }
            />
            <ProgressBar percent={pagoRatio} />
          </div>
        </dl>
      </div>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-3 w-full overflow-hidden bg-track">
      <div
        className="h-full bg-brand-fill transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
