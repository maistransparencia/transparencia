import { getPartialYearPeriod } from "@transparencia/ui";
import { CATEGORIA_REGIME_LABELS } from "@/lib/constants/pessoal";
import type { loadPessoalData } from "./loader";

type PessoalRawData = Awaited<ReturnType<typeof loadPessoalData>>;

export function buildPessoalViewModel(raw: PessoalRawData) {
  const selectedYear = raw.context.selectedYear;
  const previousYear = selectedYear - 1;
  const isEntidadeFiltrada = (raw.context.entidadesIds?.length ?? 0) > 0;

  const currentYearRow = raw.folhaData.find((r) => r.ano === selectedYear) ||
    raw.folhaData[0] || {
      totalFolha: 0,
      totalPago: 0,
      despesaPessoalLrf: 0,
      rclProxy: 0,
      receitaCorrenteLiquida: 0,
      percentualFolha: 0,
      statusLrf: "normal" as const,
    };

  const previousYearRow = raw.folhaData.find((r) => r.ano === previousYear);

  const statusLrf =
    currentYearRow.statusLrf ??
    (() => {
      if (currentYearRow.percentualFolha > 54) return "excedido";
      if (currentYearRow.percentualFolha >= 51.3) return "prudencial";
      if (currentYearRow.percentualFolha >= 48.6) return "alerta";
      return "normal";
    })();

  const folhaKpi = (() => {
    if (isEntidadeFiltrada) {
      return {
        title: "Pessoal / Receita Municipal",
        subtext: "impacto no teto da LRF do município (54%)",
        alert: false,
      };
    }
    if (statusLrf === "excedido") {
      return {
        title: "Gasto com Pessoal (LRF)",
        subtext: "acima do teto de 54%",
        alert: true,
      };
    }
    if (statusLrf === "prudencial") {
      return {
        title: "Gasto com Pessoal (LRF)",
        subtext: "acima do limite prudencial (51,3%)",
        alert: true,
      };
    }
    if (statusLrf === "alerta") {
      return {
        title: "Gasto com Pessoal (LRF)",
        subtext: "acima do limite de alerta (48,6%)",
        alert: true,
      };
    }
    return {
      title: "Gasto com Pessoal (LRF)",
      subtext: "dentro dos limites da LRF (teto 54%)",
      alert: false,
    };
  })();

  const folhaTrend = (() => {
    if (!previousYearRow || previousYearRow.totalFolha === 0) {
      return undefined;
    }
    const diff = Number(
      (
        currentYearRow.percentualFolha - previousYearRow.percentualFolha
      ).toFixed(1),
    );
    const sinal = diff > 0 ? "+" : "";
    return {
      value: `${sinal}${diff} p.p. vs ${previousYear}`,
      isPositive: diff <= 0,
    };
  })();

  const chefiasTrend = (() => {
    if (
      raw.pctChefias === null ||
      raw.pctChefias === undefined ||
      raw.prevPctChefias === null ||
      raw.prevPctChefias === undefined
    ) {
      return undefined;
    }
    const diff = Number((raw.pctChefias - raw.prevPctChefias).toFixed(1));
    const sinal = diff > 0 ? "+" : "";
    return {
      value: `${sinal}${diff} p.p. vs ${previousYear}`,
      isPositive: diff >= 0,
    };
  })();

  const totalFolhaTrend = (() => {
    if (!previousYearRow || previousYearRow.totalFolha === 0) {
      return undefined;
    }
    const diff = Number(
      (
        ((currentYearRow.totalFolha - previousYearRow.totalFolha) /
          previousYearRow.totalFolha) *
        100
      ).toFixed(1),
    );
    const sinal = diff > 0 ? "+" : "";
    return {
      value: `${sinal}${diff}% vs ${previousYear}`,
      isPositive: diff <= 0,
    };
  })();

  const prevRegimeMap = new Map(
    (raw.prevRegimeMetrics ?? []).map((item) => [item.categoriaRegime, item]),
  );

  const regimeMetrics = (raw.regimeMetrics ?? []).map((item) => {
    const prevItem = prevRegimeMap.get(item.categoriaRegime);
    const variacaoProfissionais = (() => {
      if (!prevItem || prevItem.totalProfissionais === 0) return null;
      return Number(
        (
          ((item.totalProfissionais - prevItem.totalProfissionais) /
            prevItem.totalProfissionais) *
          100
        ).toFixed(1),
      );
    })();

    const variacaoFolha = (() => {
      if (!prevItem || prevItem.totalProventos === 0) return null;
      return Number(
        (
          ((item.totalProventos - prevItem.totalProventos) /
            prevItem.totalProventos) *
          100
        ).toFixed(1),
      );
    })();

    return {
      ...item,
      categoriaRegimeRotulo:
        CATEGORIA_REGIME_LABELS[item.categoriaRegime] ?? "Outros",
      variacaoProfissionais,
      variacaoFolha,
    };
  });

  const headerDescription = isEntidadeFiltrada
    ? "Impacto da folha de pagamento desta entidade na receita corrente líquida do município. A Lei de Responsabilidade Fiscal limita o gasto total com pessoal a 54% da RCL para o Poder Executivo."
    : "Comprometimento da Receita Corrente Líquida (RCL) com a despesa total com pessoal. A Lei de Responsabilidade Fiscal limita esse gasto a 54% para o Poder Executivo (com limites de alerta a 48,6% e prudencial a 51,3%).";

  return {
    selectedYear,
    previousYear,
    isCurrentYear: raw.context.isCurrentYear,
    isEntidadeFiltrada,
    headerDescription,
    folhaKpi,
    folhaTrend,
    chefiasTrend,
    totalFolhaTrend,
    partialPeriod: getPartialYearPeriod(
      raw.portalConfig?.dataExtracaoDate ?? raw.portalConfig?.dataExtracao,
    ),
    pctChefias: raw.pctChefias,
    decimo13: raw.decimo13,
    distribuicaoProventos: raw.distribuicaoProventos,
    regimeMetrics,
    totalDivergencias: raw.totalDivergencias ?? 0,
    servidoresDivergentes: raw.servidoresDivergentes ?? [],
    currentYearRow,
  };
}
