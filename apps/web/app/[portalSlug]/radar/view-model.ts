import { buildRadarCivicoCards, type RadarCivicoCardItem } from "../view-model";
import type { loadRadarData } from "./loader";

type RadarRawData = Awaited<ReturnType<typeof loadRadarData>>;

export interface RadarAnoSection {
  ano: number;
  isCurrentYear: boolean;
  totalAlertas: number;
  alertasCriticos: number;
  alertasAltos: number;
  alertasModerados: number;
  resumoSeveridadeLabel: string;
  cards: RadarCivicoCardItem[];
}

export interface RadarHistoricoViewModel {
  portalSlug: string;
  portalName: string;
  stateUF?: string;
  totalAlertasGeral: number;
  anosDisponiveis: number[];
  secoes: RadarAnoSection[];
  hasAlertas: boolean;
  emptyState: {
    title: string;
    message: string;
  };
}

export function buildResumoSeveridadeLabel(
  criticos: number,
  altos: number,
  moderados: number,
): string {
  const parts: string[] = [];
  if (criticos > 0) {
    parts.push(`${criticos} ${criticos === 1 ? "crítico" : "críticos"}`);
  }
  if (altos > 0) {
    parts.push(`${altos} atenção`);
  }
  if (moderados > 0) {
    parts.push(
      `${moderados} ${moderados === 1 ? "acompanhamento" : "acompanhamentos"}`,
    );
  }
  return parts.length > 0 ? parts.join(", ") : "Normal";
}

export function buildRadarHistoricoViewModel(
  raw: RadarRawData,
): RadarHistoricoViewModel {
  const { portalSlug, portalConfig, alertas } = raw;
  const portalName = portalConfig?.displayName || portalSlug;
  const stateUF = portalConfig?.uf;
  const currentYear = new Date().getFullYear();

  if (!alertas || alertas.length === 0) {
    return {
      portalSlug,
      portalName,
      stateUF,
      totalAlertasGeral: 0,
      anosDisponiveis: [],
      secoes: [],
      hasAlertas: false,
      emptyState: {
        title: "Contas e Indicadores em Plena Conformidade Histórica",
        message: `Para o município de ${portalName}, não foram identificadas anomalias estatísticas, picos atípicos de despesa, explosões de cargos comissionados ou rombos de caixa em nenhum dos exercícios auditados.`,
      },
    };
  }

  // Identificar anos únicos com alertas em ordem cronológica decrescente
  const anosComAlertas = Array.from(
    new Set(
      alertas.map((a) => a.ano).filter((ano): ano is number => Boolean(ano)),
    ),
  ).sort((a, b) => b - a);

  const secoes: RadarAnoSection[] = anosComAlertas
    .map((ano) => {
      const alertasDoAno = alertas.filter((a) => a.ano === ano);
      const cards = buildRadarCivicoCards(alertasDoAno, portalSlug, {
        portalName,
        anoContexto: ano,
        entidade: raw.entidade,
      });

      const alertasCriticos = cards.filter(
        (c) => c.grauSeveridade === "critico",
      ).length;
      const alertasAltos = cards.filter(
        (c) => c.grauSeveridade === "alto",
      ).length;
      const alertasModerados = cards.filter(
        (c) => c.grauSeveridade === "moderado",
      ).length;

      return {
        ano,
        isCurrentYear: ano === currentYear,
        totalAlertas: cards.length,
        alertasCriticos,
        alertasAltos,
        alertasModerados,
        resumoSeveridadeLabel: buildResumoSeveridadeLabel(
          alertasCriticos,
          alertasAltos,
          alertasModerados,
        ),
        cards,
      };
    })
    .filter((sec) => sec.totalAlertas > 0);

  const totalAlertasGeral = secoes.reduce((acc, s) => acc + s.totalAlertas, 0);

  return {
    portalSlug,
    portalName,
    stateUF,
    totalAlertasGeral,
    anosDisponiveis: secoes.map((s) => s.ano),
    secoes,
    hasAlertas: secoes.length > 0,
    emptyState: {
      title: "Contas e Indicadores em Plena Conformidade Histórica",
      message: `Para o município de ${portalName}, não foram identificadas anomalias estatísticas, picos atípicos de despesa, explosões de cargos comissionados ou rombos de caixa em nenhum dos exercícios auditados.`,
    },
  };
}
