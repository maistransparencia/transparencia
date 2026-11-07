import {
  fmtCompact,
  fmtPercent,
  SectionHeader,
  ThresholdMeter,
} from "@transparencia/ui";
import type { EducacaoExecucaoAnoView } from "@/app/[portalSlug]/educacao/view-model";
import { LeiLink, LinhaLeiEFonte } from "@/components/lei-e-fonte";
import { urlLegislacao } from "@/lib/constants/legislacao";

export interface EducacaoMemoriaCalculoProps {
  ano: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  execucao: EducacaoExecucaoAnoView;
  /** Portal de transparência da Prefeitura (do banco); sem ele a fonte fica sem link. */
  portalUrl?: string | null;
}

const FONTE_EXECUCAO = "execução orçamentária da Prefeitura, função Educação";

const percentualDoReservado = (valor: number, reservado: number) =>
  reservado > 0 ? Math.min(100, Math.max(0, (valor / reservado) * 100)) : 0;

/** Reservado, liquidado e pago em três barras: quanto já chegou até cada etapa. */
export function EducacaoMemoriaCalculo({
  ano,
  isCurrentYear,
  execucao,
  portalUrl = null,
}: EducacaoMemoriaCalculoProps) {
  const { empenhado, liquidado, pago, temDados } = execucao;
  const naoPago = Math.max(0, empenhado - pago);
  const notaSemDados = `sem despesas registradas em ${ano}`;

  const etapas = [
    {
      chave: "reservado",
      rotulo: isCurrentYear
        ? "Reservado (empenhado) no ano até agora"
        : "Reservado (empenhado) no ano",
      valor: empenhado,
      percentual: 100,
      nota: undefined,
    },
    {
      chave: "liquidado",
      rotulo: "Serviço ou produto entregue (liquidado)",
      valor: liquidado,
      percentual: percentualDoReservado(liquidado, empenhado),
      nota: "do reservado",
    },
    {
      chave: "pago",
      rotulo: "Dinheiro que saiu (pago)",
      valor: pago,
      percentual: percentualDoReservado(pago, empenhado),
      nota: "do reservado",
    },
  ];

  return (
    <section
      aria-label="Quanto a Prefeitura gastou em educação"
      className="space-y-5"
      data-testid="gasto-educacao"
    >
      <SectionHeader
        title="Quanto do que a Prefeitura reservou para a educação já foi pago?"
        description="O gasto passa por três etapas. Cada barra mostra quanto já chegou nela."
      />
      <dl className="space-y-5">
        {etapas.map((etapa) => (
          <div key={etapa.chave} className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <dt className="eyebrow">{etapa.rotulo}</dt>
              <dd className="flex flex-wrap items-baseline gap-x-3">
                <span className="stat-value-sm">
                  {temDados ? fmtCompact(etapa.valor) : "—"}
                </span>
                {etapa.nota && temDados && (
                  <span className="caption">
                    {fmtPercent(etapa.percentual)} {etapa.nota}
                  </span>
                )}
                {!temDados && <span className="caption">{notaSemDados}</span>}
              </dd>
            </div>
            {temDados && (
              <ThresholdMeter
                value={etapa.percentual}
                label={etapa.rotulo}
                valueText={`${fmtCompact(etapa.valor)}, ${fmtPercent(etapa.percentual)} do reservado`}
              />
            )}
          </div>
        ))}
      </dl>
      <p className="caption">
        Reservar não é pagar. O total soma todas as despesas de educação da
        Prefeitura. O percentual do mínimo constitucional vem do SIOPE e usa
        outro cálculo.
        {temDados && !isCurrentYear && naoPago > 0
          ? ` Ficaram ${fmtCompact(naoPago)} sem pagar: podem ser pagos depois ou cancelados.`
          : ""}
      </p>
      <LinhaLeiEFonte
        laws={[{ label: "Lei 4.320/1964", url: urlLegislacao("lei4320") }]}
        source={
          portalUrl ? (
            <LeiLink label={FONTE_EXECUCAO} url={portalUrl} />
          ) : (
            FONTE_EXECUCAO
          )
        }
      />
    </section>
  );
}
