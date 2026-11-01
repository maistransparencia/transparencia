import {
  AlertBox,
  fmtCompact,
  fmtPercent,
  getPartialYearPeriod,
} from "@transparencia/ui";

export interface PrevidenciaHeroSectionProps {
  ano: number;
  isCurrentYear: boolean;
  totalEmpenhado: number;
  totalLiquidado: number;
  totalPago: number;
  taxaExecucao: number;
  totalAporteAtuarial: number;
  totalDividaResgatada: number;
  dataExtracao?: Date | string | null;
  previdenciaSigla?: string;
  previdenciaNome?: string;
}

export function PrevidenciaHeroSection({
  ano,
  isCurrentYear,
  totalEmpenhado,
  totalLiquidado,
  totalPago,
  taxaExecucao,
  totalAporteAtuarial,
  totalDividaResgatada,
  dataExtracao,
  previdenciaSigla = "RPPS",
  previdenciaNome,
}: PrevidenciaHeroSectionProps) {
  const liquidadoRatio =
    totalEmpenhado > 0
      ? Math.min(100, Math.max(0, (totalLiquidado / totalEmpenhado) * 100))
      : 0;
  const pagoRatio =
    totalEmpenhado > 0
      ? Math.min(100, Math.max(0, (totalPago / totalEmpenhado) * 100))
      : 0;

  const partialPeriod = getPartialYearPeriod(dataExtracao);

  const temEmpenho = totalEmpenhado > 0;
  const temDados = temEmpenho || totalPago > 0;

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        <div className="space-y-1">
          <p className="eyebrow text-brand-text!">
            PREVIDÊNCIA MUNICIPAL ({previdenciaSigla}) · EXERCÍCIO {ano}
            {isCurrentYear && partialPeriod
              ? ` (PARCIAL, ${partialPeriod})`
              : ""}
          </p>
          {previdenciaNome ? (
            <p className="caption">{previdenciaNome}</p>
          ) : null}
        </div>

        <h1>
          O dinheiro da aposentadoria dos servidores está sendo guardado e
          repassado em dia?
        </h1>

        <p className="lead">
          {!temDados ? (
            `O portal não tem repasses para o ${previdenciaSigla} registrados em ${ano}.`
          ) : !temEmpenho ? (
            `O portal não tem empenho para o ${previdenciaSigla} em ${ano}, mas registra ${fmtCompact(totalPago)} pagos.`
          ) : isCurrentYear ? (
            <>
              A Prefeitura e os Fundos Municipais já reservaram{" "}
              <strong className="text-ink">{fmtCompact(totalEmpenhado)}</strong>{" "}
              para o {previdenciaSigla} em {ano} (empenho). Desse valor,{" "}
              {fmtCompact(totalPago)} já foi pago ao fundo.
            </>
          ) : (
            <>
              Em {ano}, a Prefeitura e os Fundos Municipais reservaram{" "}
              <strong className="text-ink">{fmtCompact(totalEmpenhado)}</strong>{" "}
              para o {previdenciaSigla} e pagaram{" "}
              {fmtPercent(Math.min(100, taxaExecucao * 100))} desse valor.
            </>
          )}
        </p>

        {totalAporteAtuarial > 0 && (
          <AlertBox type="info" title="Repasse extra para equilibrar o fundo">
            {fmtCompact(totalAporteAtuarial)} foram destinados a cobrir o rombo
            previsto no fundo (elemento 97), para que ele se sustente ao longo
            dos anos.
          </AlertBox>
        )}
      </div>

      {temDados && (
        <div className="panel panel-brand space-y-6 lg:col-span-5">
          <dl>
            <div>
              <dt className="eyebrow">
                Valor reservado (empenhado) para o {previdenciaSigla}
              </dt>
              <dd className="stat-value-lg">{fmtCompact(totalEmpenhado)}</dd>
              <dd className="caption">
                {fmtPercent(Math.min(100, taxaExecucao * 100))} já foi pago
                (pago dividido pelo reservado)
              </dd>
            </div>
          </dl>

          <div className="h-3 w-full overflow-hidden bg-track">
            <div
              className="h-full bg-brand-fill transition-all duration-500 ease-out"
              style={{ width: `${pagoRatio}%` }}
            />
          </div>

          <div className="border-line border-t pt-4">
            <p className="eyebrow mb-3">Etapas do repasse</p>
            <div className="space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">
                    Entregue e conferido (liquidado)
                  </span>
                  <span className="font-semibold text-ink tabular-nums">
                    {fmtCompact(totalLiquidado)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden bg-track">
                  <div
                    className="h-full bg-brand-fill transition-all duration-500"
                    style={{ width: `${liquidadoRatio}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">
                    Dinheiro que saiu (pago)
                  </span>
                  <span className="font-semibold text-ink tabular-nums">
                    {fmtCompact(totalPago)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden bg-track">
                  <div
                    className="h-full bg-ok-fill transition-all duration-500"
                    style={{ width: `${pagoRatio}%` }}
                  />
                </div>
              </div>

              {totalDividaResgatada > 0 && (
                <p className="caption">
                  Inclui {fmtCompact(totalDividaResgatada)} em parcelas de
                  dívidas antigas com o fundo (elemento 71).
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
