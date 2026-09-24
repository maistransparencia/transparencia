import type { loadCapremData } from "./loader";

type CapremRawData = Awaited<ReturnType<typeof loadCapremData>>;

const DESTINO_LABELS: Record<string, string> = {
  rpps_caprem: "RPPS (CAPREM)",
  aporte_atuarial_caprem: "Aporte Atuarial (CAPREM)",
  amortizacao_divida_caprem: "Amortização Dívida (CAPREM)",
  inss_rgps: "INSS (RGPS)",
  plano_saude_casp: "Plano de Saúde (CASP)",
  encargo_patronal_geral: "Encargo Patronal Geral",
};

const DESTINO_COLORS: Record<string, string> = {
  "RPPS (CAPREM)": "oklch(0.55 0.14 250)",
  "Aporte Atuarial (CAPREM)": "oklch(0.60 0.18 30)",
  "Amortização Dívida (CAPREM)": "oklch(0.55 0.15 45)",
  "INSS (RGPS)": "oklch(0.65 0.12 180)",
  "Plano de Saúde (CASP)": "oklch(0.60 0.12 210)",
  "Encargo Patronal Geral": "oklch(0.50 0.05 240)",
};

export interface CapremPatrimonioHistoricoPonto {
  ano: number;
  patrimonioFinanceiroTotal: number | null;
  inconsistenciaDeclaracaoFlag: boolean;
  variacaoPatrimonioAbs: number | null;
  variacaoPatrimonioPct: number | null;
  quebraSerieFlag: boolean;
}

export interface CapremPatrimonioHistoricoDiagnostico {
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

export interface CapremPatrimonioHistoricoResumo {
  patrimonioPico: number;
  anoPico: number;
  patrimonioAtual: number;
  anoAtual: number;
  variacaoPicoAbs: number | null;
  variacaoPicoPct: number | null;
  queimaMediaAnual: number;
  serie: CapremPatrimonioHistoricoPonto[];
  diagnostico: CapremPatrimonioHistoricoDiagnostico;
}

export function buildCapremViewModel(raw: CapremRawData) {
  const naturezaFormatada = raw.caprem.natureza.map((n) => ({
    ...n,
    destino: DESTINO_LABELS[n.destino] ?? n.destino,
  }));

  const destinoMap = new Map<string, number>();
  for (const n of naturezaFormatada) {
    const key = n.destino;
    destinoMap.set(key, (destinoMap.get(key) || 0) + n.pago);
  }

  const naturezaChartData = Array.from(destinoMap.entries())
    .map(([dest, val]) => ({
      label: dest,
      value: val,
      barColor: DESTINO_COLORS[dest] || "oklch(0.55 0.11 250)",
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
  const sortedTrend = [...(raw.caprem.actuarialTrend || [])].sort(
    (a, b) => a.ano - b.ano,
  );

  const serie: CapremPatrimonioHistoricoPonto[] = sortedTrend.map(
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
      };
    },
  );

  const validPicoItems = serie.filter(
    (s) =>
      !s.inconsistenciaDeclaracaoFlag &&
      s.patrimonioFinanceiroTotal !== null &&
      s.patrimonioFinanceiroTotal > 0,
  );

  const picoItem = validPicoItems.reduce<CapremPatrimonioHistoricoPonto | null>(
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
  const itemAtual =
    itemsValidos.length > 0
      ? itemsValidos[itemsValidos.length - 1]
      : itemsComPatrimonio.length > 0
        ? itemsComPatrimonio[itemsComPatrimonio.length - 1]
        : null;

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

  const risk = raw.caprem.actuarialRisk;
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

  const patrimonioHistoricoResumo: CapremPatrimonioHistoricoResumo = {
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

  return {
    selectedYear: raw.context.selectedYear,
    isCurrentYear: raw.context.isCurrentYear,
    portalConfig: raw.portalConfig,
    posicaoFinanceira: raw.posicaoFinanceira,
    caprem: {
      ...raw.caprem,
      natureza: naturezaFormatada,
    },
    naturezaCols,
    naturezaChartData,
    patrimonioHistoricoResumo,
  };
}
