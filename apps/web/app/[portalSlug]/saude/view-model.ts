import { getPartialYearPeriod } from "@transparencia/ui";
import type { loadSaudeData } from "./loader";

type SaudeRawData = Awaited<ReturnType<typeof loadSaudeData>>;

export function buildSaudeViewModel(raw: SaudeRawData) {
  return {
    selectedYear: raw.context.selectedYear,
    isCurrentYear: raw.context.isCurrentYear,
    partialPeriod: getPartialYearPeriod(
      raw.portalConfig?.dataExtracaoDate ?? raw.portalConfig?.dataExtracao,
    ),
    minimoSaude: raw.minimoSaude,
    redePorMilMoradores: raw.redePorMilMoradores,
    producaoSus: raw.producaoSus,
    portalUrl: raw.portalConfig?.portalUrl ?? "",
    dataColeta: raw.portalConfig?.dataExtracao ?? "",
    saude: raw.saude,
  };
}
