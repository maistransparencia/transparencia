import type { EducacaoResumoCardData } from "@/components/educacao-resumo-card";

/** O card só existe quando há nota do IDEB para mostrar. */
export function temEducacaoDestaque(
  resumo?: EducacaoResumoCardData | null,
): resumo is EducacaoResumoCardData {
  return Boolean(resumo) && resumo?.notaIdebTexto !== "—";
}
