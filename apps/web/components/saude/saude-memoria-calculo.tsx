import {
  fmtCompact,
  fmtPercent,
  SectionHeader,
  ThresholdMeter,
} from "@transparencia/ui";
import { LeiLink, LinhaLeiEFonte } from "@/components/lei-e-fonte";
import { urlLegislacao } from "@/lib/constants/legislacao";

export interface SaudeMemoriaCalculoProps {
  ano: number;
  isCurrentYear: boolean;
  orcamento: {
    empenhado: number;
    liquidado: number;
    pago: number;
  };
  /** Portal de transparência da Prefeitura (do banco); sem ele a fonte fica sem link. */
  portalUrl?: string | null;
}

const FONTE_EXECUCAO = "execução orçamentária da Prefeitura, função Saúde";

const percentualDoReservado = (valor: number, reservado: number) =>
  reservado > 0 ? Math.min(100, Math.max(0, (valor / reservado) * 100)) : 0;

/** Reservado, entregue e pago em três barras: quanto já chegou até cada etapa. */
export function SaudeMemoriaCalculo({
  ano,
  isCurrentYear,
  orcamento,
  portalUrl = null,
}: SaudeMemoriaCalculoProps) {
  const { empenhado, liquidado, pago } = orcamento;
  const temDados = empenhado > 0 || pago > 0;
  const naoPago = Math.max(0, empenhado - pago);

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
      aria-label="Quanto o Fundo gastou em saúde"
      className="space-y-5"
      data-testid="saude-memoria-calculo"
    >
      <SectionHeader
        title="Quanto do que o Fundo reservou para a saúde já foi pago?"
        description="O gasto passa por três etapas. Cada barra mostra quanto já chegou nela."
      />
      {temDados ? (
        <>
          <dl className="space-y-5">
            {etapas.map((etapa) => (
              <div key={etapa.chave} className="space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <dt className="eyebrow">{etapa.rotulo}</dt>
                  <dd className="flex flex-wrap items-baseline gap-x-3">
                    <span className="stat-value-sm">
                      {fmtCompact(etapa.valor)}
                    </span>
                    {etapa.nota && (
                      <span className="caption">
                        {fmtPercent(etapa.percentual)} {etapa.nota}
                      </span>
                    )}
                  </dd>
                </div>
                <ThresholdMeter
                  value={etapa.percentual}
                  label={etapa.rotulo}
                  valueText={`${fmtCompact(etapa.valor)}, ${fmtPercent(etapa.percentual)} do reservado`}
                />
              </div>
            ))}
          </dl>
          <p className="caption">
            Reservar não é pagar.
            {!isCurrentYear && naoPago > 0
              ? ` Ficaram ${fmtCompact(naoPago)} sem pagar dentro do ano: podem ser pagos depois ou cancelados.`
              : ""}
          </p>
        </>
      ) : (
        <p className="caption">
          O portal não tem despesas de saúde registradas para {ano}.
        </p>
      )}
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
