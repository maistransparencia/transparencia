import {
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
  const percentualDoReservado = (valor: number) =>
    totalEmpenhado > 0
      ? Math.min(100, Math.max(0, (valor / totalEmpenhado) * 100))
      : 0;

  const indicadores = [
    {
      rotulo: "Valor reservado (empenhado)",
      valor: fmtCompact(totalEmpenhado),
      nota: "Compromissos com a previdência no ano",
    },
    {
      rotulo: "Pago com previdência",
      valor: fmtCompact(totalPago),
      nota: `${fmtPercent(Math.min(100, taxaExecucao * 100))} do reservado${
        totalDividaResgatada > 0
          ? `, incluindo ${fmtCompact(totalDividaResgatada)} de dívidas antigas (elemento 71)`
          : ""
      }`,
    },
    {
      rotulo: "Repasse extra para equilibrar o fundo",
      valor: fmtCompact(totalAporteAtuarial),
      nota: "Aporte para cobrir o rombo previsto (elemento 97)",
    },
    {
      rotulo: "Quanto do reservado já foi pago",
      valor: fmtPercent(Math.min(100, taxaExecucao * 100)),
      nota: "Pago dividido pelo reservado no ano",
    },
  ];

  const etapas = [
    {
      rotulo: "Reservado (empenhado)",
      valor: totalEmpenhado,
      percentual: percentualDoReservado(totalEmpenhado),
      classeCor: "bg-mute",
    },
    {
      rotulo: "Entregue e conferido (liquidado)",
      valor: totalLiquidado,
      percentual: percentualDoReservado(totalLiquidado),
      classeCor: "bg-brand-fill",
    },
    {
      rotulo: "Dinheiro que saiu (pago)",
      valor: totalPago,
      percentual: percentualDoReservado(totalPago),
      classeCor: "bg-ok-fill",
    },
  ];

  const partialPeriod = getPartialYearPeriod(dataExtracao);

  const temEmpenho = totalEmpenhado > 0;
  const temDados = temEmpenho || totalPago > 0;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1>
          O dinheiro da aposentadoria dos servidores está sendo guardado e
          repassado em dia?
        </h1>

        <p className="caption">
          Fundo de aposentadoria dos servidores:{" "}
          {previdenciaNome
            ? `${previdenciaNome} (${previdenciaSigla})`
            : previdenciaSigla}
        </p>
        <p className="eyebrow">
          Dados de {ano}
          {isCurrentYear && partialPeriod ? ` (parcial, ${partialPeriod})` : ""}
        </p>
        <p className="lead max-w-none">
          {!temDados ? (
            `O portal não tem repasses para o ${previdenciaSigla} registrados em ${ano}.`
          ) : !temEmpenho ? (
            `O portal não tem empenho para o ${previdenciaSigla} em ${ano}, mas registra ${fmtCompact(totalPago)} pagos.`
          ) : (
            <>
              Em {ano}, a Prefeitura e os Fundos Municipais já pagaram{" "}
              <strong className="text-ink">
                {fmtPercent(Math.min(100, taxaExecucao * 100))}
              </strong>{" "}
              do que reservaram para o {previdenciaSigla}.
            </>
          )}
        </p>
      </div>

      {temDados && (
        <div className="panel panel-brand space-y-6">
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {indicadores.map((indicador) => (
              <div key={indicador.rotulo} className="space-y-1">
                <dt className="eyebrow">{indicador.rotulo}</dt>
                <dd className="stat-value">{indicador.valor}</dd>
                <dd className="caption">{indicador.nota}</dd>
              </div>
            ))}
          </dl>

          <div className="space-y-3 border-line border-t pt-4">
            <p className="eyebrow">Etapas do repasse</p>
            {etapas.map((etapa) => (
              <div key={etapa.rotulo} className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-ink">{etapa.rotulo}</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {fmtCompact(etapa.valor)}
                  </span>
                </div>
                <div className="h-3 w-full bg-track">
                  <div
                    className={`h-full ${etapa.classeCor} transition-all duration-500`}
                    style={{ width: `${etapa.percentual}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
