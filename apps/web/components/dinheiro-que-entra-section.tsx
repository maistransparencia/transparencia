import { fmtCompact } from "@transparencia/ui";
import { SectionWithHeader } from "./section-with-header";

export interface DinheiroQueEntraSectionProps {
  pago: number;
  semPagamento: boolean;
}

/** Bloco sazonal: o 13º dos servidores, pago acumulado no ano, sem data de pagamento. */
export function DinheiroQueEntraSection({
  pago,
  semPagamento,
}: DinheiroQueEntraSectionProps) {
  return (
    <SectionWithHeader
      id="dinheiro-que-entra"
      title="Dinheiro que entra na cidade"
      description="O 13º salário de servidores e aposentados vira renda e compras no comércio da cidade."
    >
      <div className="space-y-3">
        <p className="eyebrow">Quanto do 13º a Prefeitura já pagou este ano?</p>
        {semPagamento ? (
          <p className="stat-value">Ainda sem informação de pagamento</p>
        ) : (
          <p className="stat-value">{fmtCompact(pago)}</p>
        )}
        <p className="caption">
          Valor pago acumulado no ano, inclusive parcelas pagas antes de
          novembro. Ainda não temos a data de cada pagamento.
        </p>
      </div>
    </SectionWithHeader>
  );
}
