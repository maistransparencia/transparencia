import type { DecimoTerceiroGrupoCodigo } from "@transparencia/db";
import { fmtCompact, fmtCurrency } from "@transparencia/ui";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ROTULO_GRUPO_DECIMO_TERCEIRO } from "./decimo-terceiro-grupos";
import { CLASSE_ACAO_DESTAQUE } from "./destaque-linha";
import { SectionWithHeader } from "./section-with-header";

export interface DinheiroQueEntraGrupo {
  grupo: DecimoTerceiroGrupoCodigo;
  pago: number;
}

export interface DinheiroQueEntraSectionProps {
  pago: number;
  semPagamento: boolean;
  /** Quem recebeu o valor pago; vazio omite a barra. */
  grupos: DinheiroQueEntraGrupo[];
  /** Seção do 13º em `/pessoal`, com o ano ativo. */
  decimoTerceiroDetailUrl: string;
}

const COR_GRUPO: Record<DecimoTerceiroGrupoCodigo, string> = {
  ativos: "bg-ok-fill",
  inativos_pensionistas: "bg-brand-fill",
};

/** Bloco sazonal: o 13º dos servidores, pago acumulado no ano, sem data de pagamento. */
export function DinheiroQueEntraSection({
  pago,
  semPagamento,
  grupos,
  decimoTerceiroDetailUrl,
}: DinheiroQueEntraSectionProps) {
  const mostraBarra = !semPagamento && grupos.length > 0;

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
        {mostraBarra ? (
          <>
            <div
              className="bg-track flex h-3 w-full gap-px overflow-hidden"
              aria-hidden="true"
            >
              {grupos
                .filter((item) => item.pago > 0)
                .map((item) => (
                  <div
                    key={item.grupo}
                    className={`${COR_GRUPO[item.grupo]} h-full`}
                    style={{ flexGrow: item.pago, flexBasis: 0 }}
                  />
                ))}
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {grupos.map((item) => (
                <li key={item.grupo} className="flex items-center gap-2">
                  <span
                    className={`${COR_GRUPO[item.grupo]} h-3 w-3 shrink-0`}
                    aria-hidden="true"
                  />
                  <span>{ROTULO_GRUPO_DECIMO_TERCEIRO[item.grupo]}</span>
                  <span
                    className="text-ink font-semibold tabular-nums"
                    title={fmtCurrency(item.pago)}
                  >
                    {fmtCompact(item.pago)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="caption">
          Valor pago acumulado no ano, inclusive parcelas pagas antes de
          novembro. Ainda não temos a data de cada pagamento.
        </p>
        <Link href={decimoTerceiroDetailUrl} className={CLASSE_ACAO_DESTAQUE}>
          <span>Ver detalhes</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </SectionWithHeader>
  );
}
