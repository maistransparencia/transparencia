import { fmtCompact, fmtPercent, Indicator } from "@transparencia/ui";

export interface SaudeHeroOrcamentoProps {
  dotacao: number;
  empenhado: number;
  liquidado: number;
  pago: number;
  taxaExecucao: number;
  medicamentosInsumos: number;
  contratosVinculadosCount: number;
  fornecedoresAtivosCount: number;
}

export interface SaudeHeroSectionProps {
  ano: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  orcamento: SaudeHeroOrcamentoProps;
}

export function SaudeHeroSection({
  ano,
  isCurrentYear,
  partialPeriod,
  orcamento,
}: SaudeHeroSectionProps) {
  const naoPago = Math.max(0, orcamento.empenhado - orcamento.pago);
  const temDados = orcamento.empenhado > 0 || orcamento.pago > 0;

  const empenhadoRatio =
    orcamento.dotacao > 0
      ? Math.min(
          100,
          Math.max(0, (orcamento.empenhado / orcamento.dotacao) * 100),
        )
      : 0;

  const liquidadoRatio =
    orcamento.empenhado > 0
      ? Math.min(
          100,
          Math.max(0, (orcamento.liquidado / orcamento.empenhado) * 100),
        )
      : 0;

  const pagoRatio =
    orcamento.empenhado > 0
      ? Math.min(100, Math.max(0, (orcamento.pago / orcamento.empenhado) * 100))
      : 0;

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        <p className="eyebrow text-brand-text!">
          FUNDO MUNICIPAL DE SAÚDE · EXERCÍCIO {ano}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </p>

        <h1>
          {!temDados
            ? `O portal não tem despesas de saúde registradas para ${ano}.`
            : isCurrentYear
              ? `O Fundo Municipal de Saúde já pagou ${fmtCompact(orcamento.pago)} dos ${fmtCompact(orcamento.empenhado)} que reservou em ${ano}.`
              : `O Fundo Municipal de Saúde reservou ${fmtCompact(orcamento.empenhado)} em ${ano} e pagou ${fmtCompact(orcamento.pago)}.`}
        </h1>

        <p className="lead">
          {!temDados ? (
            "Quando houver empenhos do Fundo Municipal de Saúde neste ano, o valor reservado e o valor pago aparecem aqui."
          ) : isCurrentYear ? (
            <>
              Até agora, o Fundo reservou{" "}
              <strong className="text-ink">
                {fmtCompact(orcamento.empenhado)}
              </strong>{" "}
              para despesas da saúde (empenho). Isso é{" "}
              {fmtPercent(orcamento.taxaExecucao * 100)} dos{" "}
              {fmtCompact(orcamento.dotacao)} previstos para o ano. Reservar não
              é pagar: veja no painel quanto já foi entregue e quanto já foi
              pago.
            </>
          ) : (
            <>
              O valor reservado para despesas da saúde (empenho) é{" "}
              {fmtPercent(orcamento.taxaExecucao * 100)} dos{" "}
              {fmtCompact(orcamento.dotacao)} previstos para o ano.
              {naoPago > 0
                ? ` Ficaram ${fmtCompact(naoPago)} sem pagar dentro do ano: podem ser pagos depois ou cancelados.`
                : ""}
            </>
          )}
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
            value={fmtCompact(orcamento.empenhado)}
            note={`${fmtPercent(orcamento.taxaExecucao * 100)} da verba prevista de ${fmtCompact(orcamento.dotacao)}`}
          />
        </dl>
        <ProgressBar percent={empenhadoRatio} />

        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Indicator
              size="sm"
              label="Serviço ou produto entregue (liquidado)"
              value={fmtCompact(orcamento.liquidado)}
              note={`${fmtPercent(liquidadoRatio)} do reservado`}
            />
            <ProgressBar percent={liquidadoRatio} />
          </div>
          <div className="space-y-2">
            <Indicator
              size="sm"
              label="Dinheiro que saiu (pago)"
              value={fmtCompact(orcamento.pago)}
              note={`${fmtPercent(pagoRatio)} do reservado`}
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
