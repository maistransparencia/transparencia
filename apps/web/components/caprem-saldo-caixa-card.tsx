import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import { SaldoCaixaEntidadesSection } from "./saldo-caixa-entidades-section";

export interface CapremSaldoCaixaCardProps {
  posicaoFinanceira?: SiconfiPosicaoFinanceiraDTO | null;
  ano: number;
  portalSlug?: string;
  className?: string;
}

export function CapremSaldoCaixaCard(props: CapremSaldoCaixaCardProps) {
  return <SaldoCaixaEntidadesSection {...props} scope="previdencia" />;
}
