import type { loadPrevidenciaData } from "./loader";

export type PrevidenciaRawData = Awaited<
  ReturnType<typeof loadPrevidenciaData>
>;

const DESTINO_FORMATTERS: Record<string, (sigla: string) => string> = {
  rpps_contribuicao_patronal: (sigla) => `${sigla} (Contribuição Patronal)`,
  aporte_atuarial_rpps: (sigla) => `Aporte Atuarial (${sigla})`,
  amortizacao_divida_rpps: (sigla) => `Amortização Dívida (${sigla})`,
  rpps_caprem: (sigla) => `${sigla} (Contribuição Patronal)`,
  aporte_atuarial_caprem: (sigla) => `Aporte Atuarial (${sigla})`,
  amortizacao_divida_caprem: (sigla) => `Amortização Dívida (${sigla})`,
  inss_rgps: () => "INSS (RGPS)",
  plano_saude_casp: () => "Plano de Saúde (CASP)",
  encargo_patronal_geral: () => "Encargo Patronal Geral",
};

export interface PrevidenciaPatrimonioHistoricoPonto {
  ano: number;
  patrimonioFinanceiroTotal: number | null;
  inconsistenciaDeclaracaoFlag: boolean;
  variacaoPatrimonioAbs: number | null;
  variacaoPatrimonioPct: number | null;
  quebraSerieFlag: boolean;
  anoInconsistenciaAnterior?: number | null;
}

export interface PrevidenciaPatrimonioHistoricoDiagnostico {
  totalAporteExigido: number;
  totalAporteQuitado: number;
  romboAporteNaoRepassado: number;
  taxaAdimplenciaAporte: number;
  hasDeficitAporte: boolean;

  totalEmpenhadoPatronal: number;
  totalLiquidadoPatronal: number;
  totalPagoPatronal: number;
  romboPatronalNaoRepassado: number;
  deficitMedioMensal: number;
  hasRetencaoPatronal: boolean;

  servidoresEfetivos: number;
  servidoresTemporariosComissionados: number;
  razaoTemporariosEfetivosPct: number;
}

export interface PrevidenciaPatrimonioHistoricoResumo {
  patrimonioPico: number;
  anoPico: number;
  patrimonioAtual: number;
  anoAtual: number;
  variacaoPicoAbs: number | null;
  variacaoPicoPct: number | null;
  queimaMediaAnual: number;
  serie: PrevidenciaPatrimonioHistoricoPonto[];
  diagnostico: PrevidenciaPatrimonioHistoricoDiagnostico;
}

// Aliases para retrocompatibilidade
export type CapremPatrimonioHistoricoPonto =
  PrevidenciaPatrimonioHistoricoPonto;
export type CapremPatrimonioHistoricoDiagnostico =
  PrevidenciaPatrimonioHistoricoDiagnostico;
export type CapremPatrimonioHistoricoResumo =
  PrevidenciaPatrimonioHistoricoResumo;

export function formatDestinoLabel(destino: string, sigla: string): string {
  const formatter = DESTINO_FORMATTERS[destino];
  if (formatter) {
    return formatter(sigla);
  }
  return destino;
}

export function resolveDestinoColor(rawDestino: string, label: string): string {
  if (
    rawDestino === "rpps_contribuicao_patronal" ||
    rawDestino === "rpps_caprem" ||
    label.endsWith("(Contribuição Patronal)")
  ) {
    return "oklch(0.55 0.14 250)";
  }
  if (
    rawDestino === "aporte_atuarial_rpps" ||
    rawDestino === "aporte_atuarial_caprem" ||
    label.startsWith("Aporte Atuarial")
  ) {
    return "oklch(0.60 0.18 30)";
  }
  if (
    rawDestino === "amortizacao_divida_rpps" ||
    rawDestino === "amortizacao_divida_caprem" ||
    label.startsWith("Amortização Dívida")
  ) {
    return "oklch(0.55 0.15 45)";
  }
  if (rawDestino === "inss_rgps" || label === "INSS (RGPS)") {
    return "oklch(0.65 0.12 180)";
  }
  if (rawDestino === "plano_saude_casp" || label === "Plano de Saúde (CASP)") {
    return "oklch(0.60 0.12 210)";
  }
  if (
    rawDestino === "encargo_patronal_geral" ||
    label === "Encargo Patronal Geral"
  ) {
    return "oklch(0.50 0.05 240)";
  }
  return "oklch(0.55 0.11 250)";
}

export function buildPrevidenciaViewModel(raw: PrevidenciaRawData) {
  const previdenciaSigla =
    raw.portalConfig?.previdencia?.sigla?.trim() || "RPPS";
  const previdenciaNome =
    raw.portalConfig?.previdencia?.nome?.trim() ||
    "Regime Próprio de Previdência";

  const previdenciaData = raw.previdencia ?? raw.caprem;

  const naturezaFormatada = previdenciaData.natureza.map((n) => ({
    ...n,
    destino: formatDestinoLabel(n.destino, previdenciaSigla),
  }));

  const destinoMap = new Map<string, { total: number; rawDestino: string }>();
  for (const n of previdenciaData.natureza) {
    const formattedDestino = formatDestinoLabel(n.destino, previdenciaSigla);
    const existing = destinoMap.get(formattedDestino);
    destinoMap.set(formattedDestino, {
      total: (existing?.total || 0) + n.pago,
      rawDestino: n.destino,
    });
  }

  const naturezaChartData = Array.from(destinoMap.entries())
    .map(([dest, info]) => ({
      label: dest,
      value: info.total,
      barColor: resolveDestinoColor(info.rawDestino, dest),
    }))
    .sort((a, b) => b.value - a.value);

  const naturezaCols = [
    {
      header: "Data do Lançamento",
      accessorKey: "dataEmpenho" as const,
      format: "date" as const,
    },
    { header: "Regime / Destino", accessorKey: "destino" as const },
    {
      header: "Elemento / Descrição da Natureza",
      accessorKey: "descricao" as const,
      className: "max-w-sm",
    },
    {
      header: "Empenhado",
      accessorKey: "empenhado" as const,
      align: "right" as const,
      format: "currency" as const,
    },
    {
      header: "Pago",
      accessorKey: "pago" as const,
      align: "right" as const,
      format: "currency" as const,
    },
  ];

  // Cálculo de Patrimônio Histórico e Diagnóstico Estrutural
  const sortedTrend = [...(previdenciaData.actuarialTrend || [])].sort(
    (a, b) => a.ano - b.ano,
  );

  const serie: PrevidenciaPatrimonioHistoricoPonto[] = sortedTrend.map(
    (t, index) => {
      const prev = index > 0 ? sortedTrend[index - 1] : undefined;
      const isAfterInconsistent = Boolean(prev?.inconsistenciaDeclaracaoFlag);
      const isInconsistent = Boolean(t.inconsistenciaDeclaracaoFlag);

      return {
        ano: t.ano,
        patrimonioFinanceiroTotal: t.patrimonioFinanceiroTotal ?? null,
        inconsistenciaDeclaracaoFlag: isInconsistent,
        variacaoPatrimonioAbs: isAfterInconsistent
          ? null
          : (t.variacaoPatrimonioAbs ?? null),
        variacaoPatrimonioPct: isAfterInconsistent
          ? null
          : (t.variacaoPatrimonioPct ?? null),
        quebraSerieFlag: isAfterInconsistent,
        anoInconsistenciaAnterior: isAfterInconsistent
          ? (prev?.ano ?? null)
          : null,
      };
    },
  );

  const validPicoItems = serie.filter(
    (s) =>
      !s.inconsistenciaDeclaracaoFlag &&
      s.patrimonioFinanceiroTotal !== null &&
      s.patrimonioFinanceiroTotal > 0,
  );

  const picoItem =
    validPicoItems.reduce<PrevidenciaPatrimonioHistoricoPonto | null>(
      (max, item) => {
        if (!max) return item;
        const itemVal = item.patrimonioFinanceiroTotal ?? 0;
        const maxVal = max.patrimonioFinanceiroTotal ?? 0;
        return itemVal > maxVal ? item : max;
      },
      null,
    );

  const patrimonioPico = picoItem?.patrimonioFinanceiroTotal ?? 0;
  const anoPico = picoItem?.ano ?? 0;

  const itemsValidos = serie.filter(
    (s) =>
      s.patrimonioFinanceiroTotal !== null && !s.inconsistenciaDeclaracaoFlag,
  );
  const itemsComPatrimonio = serie.filter(
    (s) => s.patrimonioFinanceiroTotal !== null,
  );
  const itemAtual = (() => {
    if (itemsValidos.length > 0) {
      return itemsValidos[itemsValidos.length - 1];
    }
    if (itemsComPatrimonio.length > 0) {
      return itemsComPatrimonio[itemsComPatrimonio.length - 1];
    }
    return null;
  })();

  const patrimonioAtual = itemAtual?.patrimonioFinanceiroTotal ?? 0;
  const anoAtual = itemAtual?.ano ?? raw.context.selectedYear;

  const variacaoPicoAbs =
    patrimonioPico > 0 ? patrimonioAtual - patrimonioPico : null;
  const variacaoPicoPct =
    patrimonioPico > 0
      ? ((patrimonioAtual - patrimonioPico) / patrimonioPico) * 100
      : null;

  const anosTranscorridos = anoPico > 0 ? anoAtual - anoPico : 0;
  const queimaMediaAnual = (() => {
    if (anoPico <= 0 || anosTranscorridos <= 0) return 0;
    if (patrimonioPico <= patrimonioAtual) return 0;
    return (patrimonioPico - patrimonioAtual) / anosTranscorridos;
  })();

  const risk = previdenciaData.actuarialRisk;
  const totalAporteExigido = risk?.totalAporteExigido ?? 0;
  const totalAporteQuitado = risk?.totalAporteQuitado ?? 0;
  const romboAporteNaoRepassado =
    risk?.romboAporteNaoRepassado ??
    Math.max(0, totalAporteExigido - totalAporteQuitado);

  const taxaAdimplenciaAporte = (() => {
    if (risk?.taxaAdimplenciaAporte !== undefined) {
      return risk.taxaAdimplenciaAporte;
    }
    if (totalAporteExigido > 0) {
      return (totalAporteQuitado / totalAporteExigido) * 100;
    }
    return 100;
  })();

  const totalEmpenhadoPatronal = risk?.totalEmpenhadoPatronal ?? 0;
  const totalLiquidadoPatronal =
    risk?.totalLiquidadoPatronal ?? totalEmpenhadoPatronal;
  const totalPagoPatronal = risk?.totalPagoPatronal ?? 0;
  const romboPatronalNaoRepassado =
    risk?.romboPatronalNaoRepassado ??
    Math.max(0, totalLiquidadoPatronal - totalPagoPatronal);
  const deficitMedioMensal = risk?.deficitMedioMensal ?? 0;

  const servidoresEfetivos = risk?.servidoresEfetivos ?? 0;
  const servidoresTemporariosComissionados =
    risk?.servidoresTemporariosComissionados ?? 0;
  const razaoTemporariosEfetivosPct = (() => {
    if (risk?.razaoTemporariosEfetivosPct !== undefined) {
      return risk.razaoTemporariosEfetivosPct;
    }
    if (servidoresEfetivos > 0) {
      return (servidoresTemporariosComissionados / servidoresEfetivos) * 100;
    }
    return 0;
  })();

  const patrimonioHistoricoResumo: PrevidenciaPatrimonioHistoricoResumo = {
    patrimonioPico,
    anoPico,
    patrimonioAtual,
    anoAtual,
    variacaoPicoAbs,
    variacaoPicoPct,
    queimaMediaAnual,
    serie,
    diagnostico: {
      totalAporteExigido,
      totalAporteQuitado,
      romboAporteNaoRepassado,
      taxaAdimplenciaAporte,
      hasDeficitAporte: romboAporteNaoRepassado > 0,
      totalEmpenhadoPatronal,
      totalLiquidadoPatronal,
      totalPagoPatronal,
      romboPatronalNaoRepassado,
      deficitMedioMensal,
      hasRetencaoPatronal: romboPatronalNaoRepassado > 0,
      servidoresEfetivos,
      servidoresTemporariosComissionados,
      razaoTemporariosEfetivosPct,
    },
  };

  const formattedData = {
    ...previdenciaData,
    natureza: naturezaFormatada,
  };

  return {
    selectedYear: raw.context.selectedYear,
    isCurrentYear: raw.context.isCurrentYear,
    portalConfig: raw.portalConfig,
    previdenciaSigla,
    previdenciaNome,
    posicaoFinanceira: raw.posicaoFinanceira,
    previdencia: formattedData,
    caprem: formattedData,
    naturezaCols,
    naturezaChartData,
    patrimonioHistoricoResumo,
  };
}

export const buildCapremViewModel = buildPrevidenciaViewModel;
