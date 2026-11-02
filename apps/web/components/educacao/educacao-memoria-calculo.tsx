"use client";

import {
  fmtCompact,
  fmtPercent,
  Indicator,
  ModalDialog,
} from "@transparencia/ui";
import { useState } from "react";
import type { EducacaoExecucaoAnoView } from "@/app/[portalSlug]/educacao/view-model";

export interface EducacaoMemoriaCalculoProps {
  ano: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  execucao: EducacaoExecucaoAnoView;
}

const percentualDoReservado = (valor: number, reservado: number) =>
  reservado > 0 ? Math.min(100, Math.max(0, (valor / reservado) * 100)) : 0;

/** Reservado, liquidado e pago: a execução financeira por trás do mínimo. */
export function EducacaoMemoriaCalculo({
  ano,
  isCurrentYear,
  partialPeriod,
  execucao,
}: EducacaoMemoriaCalculoProps) {
  const [aberto, setAberto] = useState(false);
  const { empenhado, liquidado, pago, temDados } = execucao;
  const naoPago = Math.max(0, empenhado - pago);
  const notaSemDados = `sem despesas registradas em ${ano}`;

  return (
    <div>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label="Ver detalhes do gasto em educação"
        onClick={() => setAberto(true)}
        className="min-h-11 cursor-pointer font-medium text-brand-text underline underline-offset-2"
      >
        Ver detalhes
      </button>
      <ModalDialog
        isOpen={aberto}
        onClose={() => setAberto(false)}
        title="Quanto a Prefeitura gastou em educação"
        subtitle={`Exercício ${ano}${isCurrentYear && partialPeriod ? ` (parcial, ${partialPeriod})` : ""}`}
        maxWidth="3xl"
        showShareButton={false}
      >
        <div className="space-y-6">
          <p className="text-mute">
            Reservado é o empenho: o compromisso de gastar. Reservar não é
            pagar. O total soma todas as despesas da Prefeitura classificadas
            como Educação, não só as do Fundo Municipal de Educação.
            {temDados && !isCurrentYear && naoPago > 0
              ? ` Ficaram ${fmtCompact(naoPago)} sem pagar dentro do ano: podem ser pagos depois ou cancelados.`
              : ""}
          </p>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Indicator
              size="sm"
              label={
                isCurrentYear
                  ? "Reservado (empenhado) no ano até agora"
                  : "Reservado (empenhado) no ano"
              }
              value={temDados ? fmtCompact(empenhado) : "—"}
              note={temDados ? undefined : notaSemDados}
            />
            <Indicator
              size="sm"
              label="Serviço ou produto entregue (liquidado)"
              value={temDados ? fmtCompact(liquidado) : "—"}
              note={
                temDados
                  ? `${fmtPercent(percentualDoReservado(liquidado, empenhado))} do reservado`
                  : notaSemDados
              }
            />
            <Indicator
              size="sm"
              label="Dinheiro que saiu (pago)"
              value={temDados ? fmtCompact(pago) : "—"}
              note={
                temDados
                  ? `${fmtPercent(percentualDoReservado(pago, empenhado))} do reservado`
                  : notaSemDados
              }
            />
          </dl>
        </div>
      </ModalDialog>
    </div>
  );
}
