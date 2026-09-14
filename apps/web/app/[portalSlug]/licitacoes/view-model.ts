import { getPartialYearPeriod } from "@transparencia/ui";
import type { loadLicitacoesData } from "./loader";

type LicitacoesRawData = Awaited<ReturnType<typeof loadLicitacoesData>>;

export function buildLicitacoesViewModel(raw: LicitacoesRawData) {
  const acimaLimiteGaps = raw.gaps.filter((g) => g.acimaLimite);

  const fracionamentoVendorsMap: Record<string, number> = {};
  for (const f of raw.anomalias.fracionamento) {
    fracionamentoVendorsMap[f.fornecedor] =
      (fracionamentoVendorsMap[f.fornecedor] || 0) + 1;
  }

  const limiteDispensaComprasServicos =
    raw.limiteDispensaComprasServicos ??
    raw.gaps?.find((g) => g.limiteDispensa && g.limiteDispensa > 0)
      ?.limiteDispensa ??
    0;

  const alertaDispensa =
    raw.alertasRadar?.find((a) => a.tipoAnomalia === "concentracao_dispensa") ??
    null;

  const totalGeralModalidades = (raw.modalidades || []).reduce(
    (acc, m) => acc + (m.valorTotal || 0),
    0,
  );

  const totalContratacaoDireta = (raw.modalidades || [])
    .filter((m) => {
      const mod = (m.modalidade || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return (
        mod.includes("dispensa") ||
        mod.includes("inexigibilidade") ||
        mod.includes("adesao") ||
        mod.includes("sem_licitacao") ||
        mod.includes("gap_licitacao")
      );
    })
    .reduce((acc, m) => acc + (m.valorTotal || 0), 0);

  const taxaContratacaoDireta = (() => {
    if (totalGeralModalidades > 0) {
      return (totalContratacaoDireta / totalGeralModalidades) * 100;
    }
    if (
      alertaDispensa &&
      typeof alertaDispensa.valorObservado === "number" &&
      !Number.isNaN(alertaDispensa.valorObservado)
    ) {
      return alertaDispensa.valorObservado;
    }
    return 0;
  })();

  const hasAnomaliaDispensa = alertaDispensa !== null;

  return {
    selectedYear: raw.context.selectedYear,
    isCurrentYear: raw.context.isCurrentYear,
    partialPeriod: getPartialYearPeriod(
      raw.portalConfig?.dataExtracaoDate ?? raw.portalConfig?.dataExtracao,
    ),
    gaps: raw.gaps,
    adesao: raw.adesao,
    adesaoExterna: raw.adesaoExterna,
    modalidades: raw.modalidades,
    acimaLimiteGaps,
    limiteDispensaComprasServicos,
    fracionamentoVendorsMap,
    numCasosFracionamento: Object.keys(fracionamentoVendorsMap).length,
    contratosServicosVigentes: raw.contratosServicosVigentes || [],
    top3ContratosVigentes: (raw.contratosServicosVigentes || []).slice(0, 3),
    licitacoesEmAndamento: raw.licitacoesEmAndamento || [],
    alertaDispensa,
    taxaContratacaoDireta,
    hasAnomaliaDispensa,
  };
}
