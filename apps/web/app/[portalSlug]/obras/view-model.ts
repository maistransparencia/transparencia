import type {
  ObraDTO,
  SituacaoObra,
  SituacaoObraFiltro,
} from "@transparencia/db";
import {
  fmtCompact,
  fmtCurrency,
  fmtDate,
  fmtPercent,
  getPartialYearPeriod,
} from "@transparencia/ui";
import type { RawObrasData } from "./loader";

export interface SituacaoVisual {
  label: string;
  colorHex: string;
  badgeClass: string;
  bgClass: string;
  textClass: string;
}

export function getSituacaoVisual(situacao: string): SituacaoVisual {
  switch (situacao) {
    case "em_execucao":
      return {
        label: "Em Execução",
        colorHex: "#2563eb",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
        bgClass: "bg-blue-600",
        textClass: "text-blue-700",
      };
    case "paralisada":
      return {
        label: "Paralisada",
        colorHex: "#dc2626",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        bgClass: "bg-rose-500",
        textClass: "text-rose-700",
      };
    case "concluida":
      return {
        label: "Concluída",
        colorHex: "#16a34a",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        bgClass: "bg-emerald-600",
        textClass: "text-emerald-700",
      };
    case "cadastrada":
      return {
        label: "Não iniciada",
        colorHex: "#64748b",
        badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
        bgClass: "bg-slate-400",
        textClass: "text-slate-700",
      };
    case "cancelada":
      return {
        label: "Cancelada",
        colorHex: "#475569",
        badgeClass: "bg-zinc-50 text-zinc-700 border-zinc-200",
        bgClass: "bg-zinc-400",
        textClass: "text-zinc-700",
      };
    default:
      return {
        label: "Não iniciada",
        colorHex: "#64748b",
        badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
        bgClass: "bg-slate-400",
        textClass: "text-slate-700",
      };
  }
}

export interface ObraItemViewModel {
  idProjeto: string;
  portalSlug: string;
  nomeObra: string;
  situacao: SituacaoObra;
  situacaoLabel: string;
  situacaoColorHex: string;
  situacaoBadgeClasses: string;
  orgaoResponsavel: string;
  valorInvestimentoPrevisto: number;
  valorInvestimentoFormatado: string;
  percentualExecucaoFisica: number | null;
  percentualExecucaoFormatado: string;
  dataUltimaMedicao: string | null;
  dataUltimaMedicaoFormatada: string;
  percentualExecucaoFinanceira?: number | null;
  dataParalisacao?: string | null;
  latitude: number | null;
  longitude: number | null;
  hasCoordinates: boolean;
  isUrbana: boolean;
  motivoParalisacao: string | null;
  mesesParalisada: number | null;
  dataInicioPrevista: string | null;
  dataInicioPrevistaFormatada: string;
  dataFimPrevista: string | null;
  dataFimPrevistaFormatada: string;
}

export interface ObraMarkerItem {
  idProjeto: string;
  nomeObra: string;
  situacao: SituacaoObra;
  situacaoLabel: string;
  situacaoColorHex: string;
  latitude: number;
  longitude: number;
  isUrbana: boolean;
  valorInvestimentoFormatado: string;
  percentualExecucaoFormatado: string;
  orgaoResponsavel: string;
  dataFimPrevistaFormatada: string;
}

export interface ObrasKpisViewModel {
  totalObras: number;
  emExecucao: number;
  paralisadas: number;
  concluidas: number;
  cadastradas: number;
  canceladas: number;
  valorTotalInvestimento: number;
  valorTotalInvestimentoFormatado: string;
  valorTotalInvestimentoCompacto: string;
  valorEmExecucao: number;
  valorEmExecucaoCompacto: string;
  valorParalisadas: number;
  valorParalisadasCompacto: string;
  valorConcluidas: number;
  valorConcluidasCompacto: string;
  valorCadastradas: number;
  valorCadastradasCompacto: string;
  percentualMedioExecucaoFisica: number | null;
  percentualMedioExecucaoFormatado: string;
  obrasSemMedicaoCount: number;
}

export interface ObrasViewModel {
  portalSlug: string;
  municipioNome: string;
  municipioUf: string;
  selectedYear: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  kpis: ObrasKpisViewModel;
  filtros: {
    status: SituacaoObraFiltro;
    busca?: string;
  };
  obras: ObraItemViewModel[];
  paralisadasObras: ObraItemViewModel[];
  markers: ObraMarkerItem[];
  urbanCenter: [number, number];
  urbanBounds: [[number, number], [number, number]] | null;
  territorioBounds: [[number, number], [number, number]] | null;
  mapCenter: [number, number];
  obrasForaUrbanaCount: number;
  totalGeorreferenciadas: number;
  totalNaoGeorreferenciadas: number;
}

export function haversineDistanceKm(
  origem: { lat: number; lng: number },
  destino: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((destino.lat - origem.lat) * Math.PI) / 180;
  const dLon = ((destino.lng - origem.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((origem.lat * Math.PI) / 180) *
      Math.cos((destino.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getMedianCenter(
  coords: { latitude: number; longitude: number }[],
): [number, number] {
  if (coords.length === 0) return [-21.0, -42.0];
  const sortedLats = [...coords.map((c) => c.latitude)].sort((a, b) => a - b);
  const sortedLngs = [...coords.map((c) => c.longitude)].sort((a, b) => a - b);
  const mid = Math.floor(coords.length / 2);
  return [sortedLats[mid], sortedLngs[mid]];
}

export function computeBounds(
  coords: { latitude: number; longitude: number }[],
): [[number, number], [number, number]] | null {
  if (coords.length === 0) return null;
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  if (minLat === maxLat && minLng === maxLng) {
    return [
      [minLat - 0.01, minLng - 0.01],
      [maxLat + 0.01, maxLng + 0.01],
    ];
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

export function getMapCenter(markers: ObraMarkerItem[]): [number, number] {
  if (markers.length > 0) {
    return getMedianCenter(markers);
  }
  return [-21.0, -42.0];
}

function formatPercentual(val: number | null): string {
  if (val === null || Number.isNaN(val)) {
    return "Não informado";
  }
  return fmtPercent(val);
}

function calcularMesesParalisada(
  dataUltimaMedicao: string | null,
): number | null {
  if (!dataUltimaMedicao) return null;
  const data = new Date(dataUltimaMedicao);
  if (Number.isNaN(data.getTime())) return null;
  const diffMs = Date.now() - data.getTime();
  const meses = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
  return Math.max(1, meses);
}

function mapObraToViewModel(
  obra: ObraDTO,
  centerLat: number,
  centerLng: number,
): ObraItemViewModel {
  const visual = getSituacaoVisual(obra.situacao);
  const hasCoordinates =
    obra.latitude !== null &&
    obra.longitude !== null &&
    !Number.isNaN(obra.latitude) &&
    !Number.isNaN(obra.longitude);

  const isUrbana = hasCoordinates
    ? haversineDistanceKm(
        { lat: centerLat, lng: centerLng },
        { lat: obra.latitude as number, lng: obra.longitude as number },
      ) <= 10
    : false;

  const mesesParalisada =
    obra.situacao === "paralisada"
      ? calcularMesesParalisada(obra.dataUltimaMedicao)
      : null;

  return {
    idProjeto: obra.idProjeto,
    portalSlug: obra.portalSlug,
    nomeObra: obra.nomeObra,
    situacao: obra.situacao,
    situacaoLabel: visual.label,
    situacaoColorHex: visual.colorHex,
    situacaoBadgeClasses: visual.badgeClass,
    orgaoResponsavel: obra.orgaoResponsavel ?? "Órgão não informado",
    valorInvestimentoPrevisto: obra.valorInvestimentoPrevisto,
    valorInvestimentoFormatado: fmtCurrency(obra.valorInvestimentoPrevisto),
    percentualExecucaoFisica: obra.percentualExecucaoFisica,
    percentualExecucaoFormatado: formatPercentual(
      obra.percentualExecucaoFisica,
    ),
    dataUltimaMedicao: obra.dataUltimaMedicao,
    dataUltimaMedicaoFormatada: fmtDate(obra.dataUltimaMedicao),
    percentualExecucaoFinanceira: obra.percentualExecucaoFinanceira ?? null,
    dataParalisacao: obra.dataParalisacao ?? null,
    latitude: obra.latitude,
    longitude: obra.longitude,
    hasCoordinates,
    isUrbana,
    motivoParalisacao: obra.motivoParalisacao,
    mesesParalisada,
    dataInicioPrevista: obra.dataInicioPrevista,
    dataInicioPrevistaFormatada: fmtDate(obra.dataInicioPrevista),
    dataFimPrevista: obra.dataFimPrevista,
    dataFimPrevistaFormatada: fmtDate(obra.dataFimPrevista),
  };
}

export function buildObrasViewModel(rawData: RawObrasData): ObrasViewModel {
  const { portalSlug, portalConfig, context, filtros, resumo, obras } = rawData;

  // Extrai coordenadas válidas para calcular o centro mediano
  const validCoords = obras
    .filter(
      (o) =>
        o.latitude !== null &&
        o.longitude !== null &&
        !Number.isNaN(o.latitude) &&
        !Number.isNaN(o.longitude),
    )
    .map((o) => ({
      latitude: o.latitude as number,
      longitude: o.longitude as number,
    }));

  const [centerLat, centerLng] = getMedianCenter(validCoords);

  const obrasViewModels = obras.map((o) =>
    mapObraToViewModel(o, centerLat, centerLng),
  );

  const markers: ObraMarkerItem[] = obrasViewModels
    .filter(
      (o) => o.hasCoordinates && o.latitude !== null && o.longitude !== null,
    )
    .map((o) => ({
      idProjeto: o.idProjeto,
      nomeObra: o.nomeObra,
      situacao: o.situacao,
      situacaoLabel: o.situacaoLabel,
      situacaoColorHex: o.situacaoColorHex,
      latitude: o.latitude as number,
      longitude: o.longitude as number,
      isUrbana: o.isUrbana,
      valorInvestimentoFormatado: o.valorInvestimentoFormatado,
      percentualExecucaoFormatado: o.percentualExecucaoFormatado,
      orgaoResponsavel: o.orgaoResponsavel,
      dataFimPrevistaFormatada: o.dataFimPrevistaFormatada,
    }));

  const totalGeorreferenciadas = markers.length;
  const totalNaoGeorreferenciadas =
    obrasViewModels.length - totalGeorreferenciadas;

  const urbanCoords = markers
    .filter((m) => m.isUrbana)
    .map((m) => ({ latitude: m.latitude, longitude: m.longitude }));

  const allCoords = markers.map((m) => ({
    latitude: m.latitude,
    longitude: m.longitude,
  }));

  const urbanBounds = computeBounds(urbanCoords);
  const territorioBounds = computeBounds(allCoords);
  const obrasForaUrbanaCount = markers.filter((m) => !m.isUrbana).length;

  const paralisadasObras = obrasViewModels.filter(
    (o) => o.situacao === "paralisada",
  );

  const kpis: ObrasKpisViewModel = {
    totalObras: resumo.totalObras,
    emExecucao: resumo.emExecucao,
    paralisadas: resumo.paralisadas,
    concluidas: resumo.concluidas,
    cadastradas: resumo.cadastradas,
    canceladas: resumo.canceladas,
    valorTotalInvestimento: resumo.valorTotalInvestimento,
    valorTotalInvestimentoFormatado: fmtCurrency(resumo.valorTotalInvestimento),
    valorTotalInvestimentoCompacto: fmtCompact(resumo.valorTotalInvestimento),
    valorEmExecucao: resumo.valorEmExecucao,
    valorEmExecucaoCompacto: fmtCompact(resumo.valorEmExecucao),
    valorParalisadas: resumo.valorParalisadas,
    valorParalisadasCompacto: fmtCompact(resumo.valorParalisadas),
    valorConcluidas: resumo.valorConcluidas,
    valorConcluidasCompacto: fmtCompact(resumo.valorConcluidas),
    valorCadastradas: resumo.valorCadastradas,
    valorCadastradasCompacto: fmtCompact(resumo.valorCadastradas),
    percentualMedioExecucaoFisica: resumo.percentualMedioExecucaoFisica,
    percentualMedioExecucaoFormatado:
      resumo.percentualMedioExecucaoFisica !== null
        ? fmtPercent(resumo.percentualMedioExecucaoFisica)
        : "0,00%",
    obrasSemMedicaoCount: resumo.obrasSemMedicaoCount,
  };

  const municipioNome = portalConfig?.displayName?.trim() || "Município";
  const municipioUf = portalConfig?.uf?.trim() || "";

  const partialPeriod = getPartialYearPeriod(
    portalConfig?.dataExtracaoDate ?? portalConfig?.dataExtracao,
  );

  return {
    portalSlug,
    municipioNome,
    municipioUf,
    selectedYear: context.selectedYear,
    isCurrentYear: context.isCurrentYear,
    partialPeriod,
    kpis,
    filtros,
    obras: obrasViewModels,
    paralisadasObras,
    markers,
    urbanCenter: [centerLat, centerLng],
    urbanBounds,
    territorioBounds,
    mapCenter: [centerLat, centerLng],
    obrasForaUrbanaCount,
    totalGeorreferenciadas,
    totalNaoGeorreferenciadas,
  };
}

export interface ObraDetalheViewModel {
  idProjeto: string;
  portalSlug: string;
  nomeObra: string;
  situacao: SituacaoObra;
  situacaoVisual: SituacaoVisual;
  orgaoResponsavel: string;
  valorInvestimentoPrevisto: number;
  valorInvestimentoFormatado: string;
  percentualExecucaoFisica: number | null;
  percentualFisicoFormatado: string;
  percentualExecucaoFinanceira: number | null;
  percentualFinanceiroFormatado: string;
  dataUltimaMedicao: string | null;
  dataUltimaMedicaoFormatada: string;
  dataParalisacao: string | null;
  dataParalisacaoFormatada: string;
  dataInicioPrevista: string | null;
  dataInicioPrevistaFormatada: string;
  dataFimPrevista: string | null;
  dataFimPrevistaFormatada: string;
  motivoParalisacao: string;
  isParalisada: boolean;
  latitude: number | null;
  longitude: number | null;
  hasCoordinates: boolean;
  alertaDescompasso: {
    temDescompasso: boolean;
    diferencaPercentual: number;
    mensagem: string;
  };
  linkObrasGov: string;
  linkLegislacao: string;
}

export function buildObraDetalheViewModel(
  obra: ObraDTO,
  portalSlug: string,
): ObraDetalheViewModel {
  const situacaoVisual = getSituacaoVisual(obra.situacao);
  const isParalisada = obra.situacao === "paralisada";

  const valorInvestimentoPrevisto = obra.valorInvestimentoPrevisto ?? 0;
  const valorInvestimentoFormatado = fmtCurrency(valorInvestimentoPrevisto);

  const percentualExecucaoFisica =
    obra.percentualExecucaoFisica !== null &&
    obra.percentualExecucaoFisica !== undefined &&
    !Number.isNaN(obra.percentualExecucaoFisica)
      ? Number(obra.percentualExecucaoFisica)
      : null;

  const percentualFisicoFormatado = (() => {
    if (percentualExecucaoFisica === null) {
      return "Sem medição técnica registrada";
    }
    return fmtPercent(percentualExecucaoFisica);
  })();

  const percentualExecucaoFinanceira =
    obra.percentualExecucaoFinanceira !== null &&
    obra.percentualExecucaoFinanceira !== undefined &&
    !Number.isNaN(obra.percentualExecucaoFinanceira)
      ? Number(obra.percentualExecucaoFinanceira)
      : null;

  const percentualFinanceiroFormatado = (() => {
    if (percentualExecucaoFinanceira === null) {
      return "Em apuração contábil";
    }
    return fmtPercent(percentualExecucaoFinanceira);
  })();

  const dataUltimaMedicaoFormatada = (() => {
    if (!obra.dataUltimaMedicao) return "Sem registro oficial";
    return fmtDate(obra.dataUltimaMedicao);
  })();

  const dataParalisacaoFormatada = (() => {
    if (obra.dataParalisacao) return fmtDate(obra.dataParalisacao);
    return "Data não informada";
  })();

  const dataInicioPrevistaFormatada = (() => {
    if (!obra.dataInicioPrevista) return "Não informada";
    return fmtDate(obra.dataInicioPrevista);
  })();

  const dataFimPrevistaFormatada = (() => {
    if (!obra.dataFimPrevista) return "Não informada";
    return fmtDate(obra.dataFimPrevista);
  })();

  const motivoParalisacao = (() => {
    if (!isParalisada) return "";
    if (obra.motivoParalisacao && obra.motivoParalisacao.trim().length > 0) {
      return obra.motivoParalisacao.trim();
    }
    return "Justificativa oficial não registrada no sistema governamental";
  })();

  const hasCoordinates =
    obra.latitude !== null &&
    obra.longitude !== null &&
    !Number.isNaN(obra.latitude) &&
    !Number.isNaN(obra.longitude);

  const alertaDescompasso = (() => {
    if (
      percentualExecucaoFisica === null ||
      percentualExecucaoFinanceira === null
    ) {
      return {
        temDescompasso: false,
        diferencaPercentual: 0,
        mensagem: "",
      };
    }

    const diff = Math.round(
      percentualExecucaoFinanceira - percentualExecucaoFisica,
    );

    if (diff > 15) {
      return {
        temDescompasso: true,
        diferencaPercentual: diff,
        mensagem: `Atenção: O desembolso financeiro acumulado supera em ${diff}% o avanço físico medido em campo.`,
      };
    }

    return {
      temDescompasso: false,
      diferencaPercentual: 0,
      mensagem: "",
    };
  })();

  const linkObrasGov = `https://cipi.economia.gov.br/cipi-frontend/acesso-livre/visao-geral-intervencao/${encodeURIComponent(
    obra.idProjeto,
  )}`;

  const linkLegislacao =
    "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art115p6";

  return {
    idProjeto: obra.idProjeto,
    portalSlug: obra.portalSlug || portalSlug,
    nomeObra: obra.nomeObra || "Obra pública sem denominação cadastrada",
    situacao: obra.situacao,
    situacaoVisual,
    orgaoResponsavel:
      obra.orgaoResponsavel || "Órgão municipal responsável não informado",
    valorInvestimentoPrevisto,
    valorInvestimentoFormatado,
    percentualExecucaoFisica,
    percentualFisicoFormatado,
    percentualExecucaoFinanceira,
    percentualFinanceiroFormatado,
    dataUltimaMedicao: obra.dataUltimaMedicao,
    dataUltimaMedicaoFormatada,
    dataParalisacao: obra.dataParalisacao ?? null,
    dataParalisacaoFormatada,
    dataInicioPrevista: obra.dataInicioPrevista,
    dataInicioPrevistaFormatada,
    dataFimPrevista: obra.dataFimPrevista,
    dataFimPrevistaFormatada,
    motivoParalisacao,
    isParalisada,
    latitude: hasCoordinates ? obra.latitude : null,
    longitude: hasCoordinates ? obra.longitude : null,
    hasCoordinates,
    alertaDescompasso,
    linkObrasGov,
    linkLegislacao,
  };
}
