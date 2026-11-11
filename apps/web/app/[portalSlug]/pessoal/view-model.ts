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
        subtext: "",
        alert: false,
      };
    }
    if (statusLrf === "excedido") {
      return {
        title: "Gasto com Pessoal (LRF)",
        subtext: "Acima do teto da lei.",
        alert: true,
      };
    }
    if (statusLrf === "prudencial") {
      return {
        title: "Gasto com Pessoal (LRF)",
        subtext: "Acima do limite prudencial.",
        alert: true,
      };
    }
    if (statusLrf === "alerta") {
      return {
        title: "Gasto com Pessoal (LRF)",
        subtext: textoLimite(
          (v) => `Acima do limite de alerta (${v}).`,
          "Acima do limite de alerta.",
          limites?.alerta,
        ),
        alert: true,
      };
    }
    return {
      title: "Gasto com Pessoal (LRF)",
      subtext: "Dentro dos limites da lei.",
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
    ? "Quanto a folha de pagamento deste órgão pesa na receita do município."
    : "Quanto a Prefeitura paga ao pessoal e quanto isso pesa na receita.";

  /** Continuação da frase "A Lei de Responsabilidade Fiscal ..." (a lei vira link na página). */
  const limitesLrfDescricao = (() => {
    if (!limites) return null;
    if (isEntidadeFiltrada) {
      return `limita o gasto total com pessoal a ${fmtLimite(limites.maximo)} da receita do município.`;
    }
    return `limita esse gasto a ${fmtLimite(limites.maximo)} da receita.`;
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
          // Sem veredito no ano parcial: os marcadores sugeririam comparar a estimativa com o limite.
          exibirMarcadores: !raw.context.isCurrentYear,
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
    notaEstimativaLrf: raw.context.isCurrentYear
      ? "Conta parcial do portal; a lei mede 12 meses. O número oficial sai no Relatório de Gestão Fiscal."
      : "Conta do portal. O número oficial sai no Relatório de Gestão Fiscal.",
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
