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
        colorHex: "#059669",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        bgClass: "bg-emerald-500",
        textClass: "text-emerald-700",
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
        colorHex: "#2563eb",
        badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
        bgClass: "bg-sky-500",
        textClass: "text-sky-700",
      };
    case "cadastrada":
      return {
        label: "Cadastrada",
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
        label: "Cadastrada",
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
  latitude: number | null;
  longitude: number | null;
  hasCoordinates: boolean;
  motivoParalisacao: string | null;
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
  percentualMedioExecucaoFisica: number | null;
  percentualMedioExecucaoFormatado: string;
}

export interface ObrasViewModel {
  portalSlug: string;
  municipioNome: string;
  municipioUf: string;
  kpis: ObrasKpisViewModel;
  filtros: {
    status: SituacaoObraFiltro;
    busca?: string;
  };
  obras: ObraItemViewModel[];
  markers: ObraMarkerItem[];
  mapCenter: [number, number];
  totalGeorreferenciadas: number;
  totalNaoGeorreferenciadas: number;
}

export function getMapCenter(markers: ObraMarkerItem[]): [number, number] {
  if (markers.length > 0) {
    const sum = markers.reduce(
      (acc, m) => ({ lat: acc.lat + m.latitude, lng: acc.lng + m.longitude }),
      { lat: 0, lng: 0 },
    );
    return [sum.lat / markers.length, sum.lng / markers.length];
  }
  return [-21.0, -42.0];
}

function formatPercentual(val: number | null): string {
  if (val === null || Number.isNaN(val)) {
    return "Não informado";
  }
  return fmtPercent(val);
}

function mapObraToViewModel(obra: ObraDTO): ObraItemViewModel {
  const visual = getSituacaoVisual(obra.situacao);
  const hasCoordinates =
    obra.latitude !== null &&
    obra.longitude !== null &&
    !Number.isNaN(obra.latitude) &&
    !Number.isNaN(obra.longitude);

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
    latitude: obra.latitude,
    longitude: obra.longitude,
    hasCoordinates,
    motivoParalisacao: obra.motivoParalisacao,
    dataInicioPrevista: obra.dataInicioPrevista,
    dataInicioPrevistaFormatada: fmtDate(obra.dataInicioPrevista),
    dataFimPrevista: obra.dataFimPrevista,
    dataFimPrevistaFormatada: fmtDate(obra.dataFimPrevista),
  };
}

export function buildObrasViewModel(rawData: RawObrasData): ObrasViewModel {
  const { portalSlug, portalConfig, filtros, resumo, obras } = rawData;

  const obrasViewModels = obras.map(mapObraToViewModel);

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
      valorInvestimentoFormatado: o.valorInvestimentoFormatado,
      percentualExecucaoFormatado: o.percentualExecucaoFormatado,
      orgaoResponsavel: o.orgaoResponsavel,
      dataFimPrevistaFormatada: o.dataFimPrevistaFormatada,
    }));

  const totalGeorreferenciadas = markers.length;
  const totalNaoGeorreferenciadas =
    obrasViewModels.length - totalGeorreferenciadas;
  const mapCenter = getMapCenter(markers);

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
    percentualMedioExecucaoFisica: resumo.percentualMedioExecucaoFisica,
    percentualMedioExecucaoFormatado:
      resumo.percentualMedioExecucaoFisica !== null
        ? fmtPercent(resumo.percentualMedioExecucaoFisica)
        : "0,00%",
  };

  const municipioNome = portalConfig?.displayName?.trim() || "Município";
  const municipioUf = portalConfig?.uf || "RJ";

  return {
    portalSlug,
    municipioNome,
    municipioUf,
    kpis,
    filtros,
    obras: obrasViewModels,
    markers,
    mapCenter,
    totalGeorreferenciadas,
    totalNaoGeorreferenciadas,
  };
}
