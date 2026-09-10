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
      rclProxy: 0,
      percentualFolha: 0,
    };

  const previousYearRow = raw.folhaData.find((r) => r.ano === previousYear);

  const folhaKpi = (() => {
    if (isEntidadeFiltrada) {
      return {
        title: "Folha / Receita Municipal",
        subtext: "impacto no teto da LRF do município (54%)",
        alert: false,
      };
    }
    if (currentYearRow.percentualFolha <= 54) {
      return {
        title: "Folha / Receita Arrecadada",
        subtext: "abaixo do teto de 54%",
        alert: false,
      };
    }
    return {
      title: "Folha / Receita Arrecadada",
      subtext: "acima do teto de 54%",
      alert: true,
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
    ? "Impacto da folha de pagamento desta entidade na arrecadação do município. A Lei de Responsabilidade Fiscal limita o gasto total com pessoal a 54% da receita corrente líquida para o Poder Executivo."
    : "Quanto da receita arrecadada é comprometido com salários e proventos. A Lei de Responsabilidade Fiscal limita esse gasto a 54% da receita corrente líquida para o Poder Executivo.";

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
    currentYearRow,
  };
}
