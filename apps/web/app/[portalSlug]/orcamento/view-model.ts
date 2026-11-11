import { fmtCompact, getPartialYearPeriod } from "@transparencia/ui";
import type { loadOrcamentoData } from "./loader";

type OrcamentoRawData = Awaited<ReturnType<typeof loadOrcamentoData>>;

export function buildOrcamentoViewModel(raw: OrcamentoRawData) {
  const { summary, funcionalData } = raw;

  const totalDotacao = summary.totalDotacao;
  const totalEmpenhado = summary.totalEmpenhado;
  const totalLiquidado = summary.totalLiquidado;
  const totalPago = summary.totalPago;

  const percentualPago =
    totalDotacao > 0 ? (totalPago / totalDotacao) * 100 : 0;

  const funnelStages = [
    {
      name: "Orçamento autorizado",
      description: "o que a prefeitura pode gastar este ano, já com os ajustes",
      value: totalDotacao,
      formattedValue: fmtCompact(totalDotacao),
    },
    {
      name: "Reservado (empenhado)",
      description: "separado para pagar contratos e compras",
      value: totalEmpenhado,
      formattedValue: fmtCompact(totalEmpenhado),
    },
    {
      name: "Serviço entregue (liquidado)",
      description: "já recebido e conferido",
      value: totalLiquidado,
      formattedValue: fmtCompact(totalLiquidado),
    },
    {
      name: "Pago",
      description: "dinheiro que já saiu do caixa",
      value: totalPago,
      formattedValue: fmtCompact(totalPago),
    },
  ];

  const funcMap: Record<string, number> = {};
  for (const item of funcionalData) {
    const fname = item.funcaoNome || "Outras funções";
    funcMap[fname] = (funcMap[fname] || 0) + (item.pago || item.empenhado || 0);
  }

  const funcItems = Object.entries(funcMap)
    .map(([funcao, valor]) => ({ funcao, valor }))
    .sort((a, b) => b.valor - a.valor);

  return {
    selectedYear: raw.context.selectedYear,
    isCurrentYear: raw.context.isCurrentYear,
    partialPeriod: getPartialYearPeriod(
      raw.portalConfig?.dataExtracaoDate ?? raw.portalConfig?.dataExtracao,
    ),
    items: raw.items,
    totalDotacao,
    totalEmpenhado,
    totalLiquidado,
    totalPago,
    percentualPago,
    funnelStages,
    funcItems,
    execucaoAnoAnterior: raw.execucaoAnoAnterior,
    posicaoFinanceira: raw.posicaoFinanceira,
    evolucaoMensal: raw.evolucaoMensal,
    hasEntityFilter: Boolean(
      raw.context.entidadesIds && raw.context.entidadesIds.length > 0,
    ),
  };
}
