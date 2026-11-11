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
      receitaCorrenteLiquida: 0,
      percentualFolha: 0,
      rgf: null,
      rgfAnoAnteriorMesmoPeriodo: null,
      limitesLrf: null,
    };

  const previousYearRow = raw.folhaData.find((r) => r.ano === previousYear);

  // O RGF mede o Poder Executivo inteiro: com um órgão filtrado ele não se aplica.
  const rgf = isEntidadeFiltrada ? null : (currentYearRow.rgf ?? null);
  const rgfAnterior = rgf
    ? (currentYearRow.rgfAnoAnteriorMesmoPeriodo ?? null)
    : null;
  const statusLrf = rgf?.statusLrf ?? null;
  const rotuloPeriodoRgf = (
    dados: { periodicidade: string; periodo: number },
    ano: number,
  ) =>
    `${dados.periodo}º ${dados.periodicidade === "semestral" ? "semestre" : "quadrimestre"} de ${ano}`;
  const periodoRgfRotulo = rgf ? rotuloPeriodoRgf(rgf, selectedYear) : null;
  const periodoRgfAnteriorRotulo = rgfAnterior
    ? rotuloPeriodoRgf(rgfAnterior, previousYear)
    : null;
  const origemPercentual: "rgf" | "estimativa" = rgf ? "rgf" : "estimativa";
  const percentualExibido = rgf
    ? rgf.percentualDespesaPessoal
    : currentYearRow.percentualFolha;
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
    // Sem RGF publicado só há estimativa do portal: rotulada e sem veredito.
    if (!rgf) {
      return {
        title: "Gasto com Pessoal (estimativa)",
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
      subtext: statusLrf === "normal" ? "Dentro dos limites da lei." : "",
      alert: false,
    };
  })();

  // Compara o mesmo período dos dois anos (3º com 3º quadrimestre); sem par, sem comparação.
  const folhaTrend = (() => {
    if (!rgf || !rgfAnterior || !periodoRgfAnteriorRotulo) return undefined;
    const diff = Number(
      (
        rgf.percentualDespesaPessoal - rgfAnterior.percentualDespesaPessoal
      ).toFixed(1),
    );
    return {
      value: `${numeroPtBrComSinal.format(diff)} p.p. vs ${periodoRgfAnteriorRotulo}`,
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
    isEntidadeFiltrada || !limites || !rgf
      ? null
      : {
          teto: limites.maximo,
          prudencial: limites.prudencial,
          tetoTexto: fmtLimite(limites.maximo),
          prudencialTexto: fmtLimite(limites.prudencial),
          // Marcadores só no número oficial do RGF; a estimativa não é comparável com o limite.
          exibirMarcadores: true,
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
    origemPercentual,
    percentualExibido,
    periodoRgfRotulo,
    rgf,
    notaFonteLrf: rgf
      ? `Relatório oficial da Prefeitura, ${periodoRgfRotulo}: gasto com pessoal nos últimos 12 meses em relação à receita.`
      : isEntidadeFiltrada
        ? "Conta do portal só para este órgão. O número oficial vale para a Prefeitura inteira e não muda com o filtro."
        : "Estimativa do portal: folha paga no ano em relação à receita. O relatório oficial deste ano ainda não saiu, então não dá para dizer se o limite da lei foi respeitado.",
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
