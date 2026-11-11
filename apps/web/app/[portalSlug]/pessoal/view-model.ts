import { getPartialYearPeriod } from "@transparencia/ui";
import { CATEGORIA_REGIME_LABELS } from "@/lib/constants/pessoal";
import type { loadPessoalData } from "./loader";

type PessoalRawData = Awaited<ReturnType<typeof loadPessoalData>>;

const numeroPtBr = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const numeroPtBrComSinal = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const fmtLimite = (valor: number) => `${numeroPtBr.format(valor)}%`;

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
      limitesLrf: null,
    };

  const previousYearRow = raw.folhaData.find((r) => r.ano === previousYear);

  const statusLrf = currentYearRow.statusLrf ?? "normal";
  const limites = currentYearRow.limitesLrf ?? null;
  const textoLimite = (
    comLimite: (valor: string) => string,
    semLimite: string,
    valor: number | undefined,
  ) => (valor === undefined ? semLimite : comLimite(fmtLimite(valor)));

  const folhaKpi = (() => {
    if (isEntidadeFiltrada) {
      return {
        title: "Pessoal / Receita Municipal",
        subtext: textoLimite(
          (v) => `impacto no teto da LRF do município (${v})`,
          "impacto no teto da LRF do município",
          limites?.maximo,
        ),
        alert: false,
      };
    }
    // A LRF mede 12 meses corridos; o acumulado de um ano parcial não serve para julgar o limite.
    if (raw.context.isCurrentYear) {
      return {
        title: "Gasto com Pessoal (LRF)",
        subtext:
          "Ano em andamento: estimativa com os meses até agora. A LRF mede 12 meses, então ainda não dá para julgar o limite.",
        alert: false,
      };
    }
    if (statusLrf === "excedido") {
      return {
        title: "Gasto com Pessoal (LRF)",
        subtext: textoLimite(
          (v) => `acima do teto de ${v}`,
          "acima do teto da LRF",
          limites?.maximo,
        ),
        alert: true,
      };
    }
    if (statusLrf === "prudencial") {
      return {
        title: "Gasto com Pessoal (LRF)",
        subtext: textoLimite(
          (v) => `acima do limite prudencial (${v})`,
          "acima do limite prudencial",
          limites?.prudencial,
        ),
        alert: true,
      };
    }
    if (statusLrf === "alerta") {
      return {
        title: "Gasto com Pessoal (LRF)",
        subtext: textoLimite(
          (v) => `acima do limite de alerta (${v})`,
          "acima do limite de alerta",
          limites?.alerta,
        ),
        alert: true,
      };
    }
    return {
      title: "Gasto com Pessoal (LRF)",
      subtext: textoLimite(
        (v) => `dentro dos limites da LRF (teto ${v})`,
        "dentro dos limites da LRF",
        limites?.maximo,
      ),
      alert: false,
    };
  })();

  const folhaTrend = (() => {
    if (
      raw.context.isCurrentYear ||
      !previousYearRow ||
      previousYearRow.totalFolha === 0
    ) {
      return undefined;
    }
    const diff = Number(
      (
        currentYearRow.percentualFolha - previousYearRow.percentualFolha
      ).toFixed(1),
    );
    return {
      value: `${numeroPtBrComSinal.format(diff)} p.p. vs ${previousYear}`,
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
    return {
      value: `${numeroPtBrComSinal.format(diff)} p.p. vs ${previousYear}`,
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
    return {
      value: `${numeroPtBrComSinal.format(diff)}% vs ${previousYear}`,
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
    ? "Quanto a folha de pagamento desta entidade pesa na receita do município, a receita corrente líquida (RCL), que soma o que o município arrecadou nos últimos 12 meses."
    : "Quanto da receita do município vai para o pagamento de pessoal. A base é a receita corrente líquida (RCL), que soma o que o município arrecadou nos últimos 12 meses.";

  /** Continuação da frase "A Lei de Responsabilidade Fiscal ..." (a lei vira link na página). */
  const limitesLrfDescricao = (() => {
    if (!limites) return null;
    if (isEntidadeFiltrada) {
      return `limita o gasto total com pessoal a ${fmtLimite(limites.maximo)} da RCL no Poder Executivo.`;
    }
    return `limita esse gasto a ${fmtLimite(limites.maximo)} da RCL no Poder Executivo; ${fmtLimite(limites.alerta)} é o limite de alerta e ${fmtLimite(limites.prudencial)}, o limite prudencial.`;
  })();

  const somaServidores = (itens: { totalProfissionais: number }[]) =>
    itens.reduce((total, item) => total + item.totalProfissionais, 0);
  const totalServidores = somaServidores(regimeMetrics);
  const totalServidoresAnterior = somaServidores(raw.prevRegimeMetrics ?? []);
  const servidoresTrend = (() => {
    if (totalServidoresAnterior === 0) return undefined;
    const diff = Number(
      (
        ((totalServidores - totalServidoresAnterior) /
          totalServidoresAnterior) *
        100
      ).toFixed(1),
    );
    return {
      value: `${numeroPtBrComSinal.format(diff)}% vs ${previousYear}`,
      isPositive: diff >= 0,
    };
  })();

  // Os limites valem para o Poder Executivo inteiro; com um órgão filtrado a barra induziria a comparar a parte com o todo.
  const barraLimitesLrf =
    isEntidadeFiltrada || !limites
      ? null
      : {
          teto: limites.maximo,
          prudencial: limites.prudencial,
          tetoTexto: fmtLimite(limites.maximo),
          prudencialTexto: fmtLimite(limites.prudencial),
        };

  return {
    selectedYear,
    previousYear,
    isCurrentYear: raw.context.isCurrentYear,
    isEntidadeFiltrada,
    headerDescription,
    limitesLrfDescricao,
    totalServidores,
    servidoresTrend,
    folhaKpi,
    folhaTrend,
    barraLimitesLrf,
    notaEstimativaLrf:
      "Cálculo do portal com a receita corrente líquida estimada; o número oficial sai no Relatório de Gestão Fiscal.",
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
