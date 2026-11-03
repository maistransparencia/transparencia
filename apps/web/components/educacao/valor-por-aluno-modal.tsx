"use client";

import { fmtCurrency, ModalDialog } from "@transparencia/ui";
import type { ValorPorAlunoView } from "@/app/[portalSlug]/educacao/view-model";
import {
  FONTE_SIOPE,
  LinhaLeiEFonte,
  NOTA_DECLARACAO,
  NOTA_INFLACAO,
} from "./educacao-textos";

export interface ValorPorAlunoModalProps {
  isOpen: boolean;
  onClose: () => void;
  serie: ValorPorAlunoView["serie"];
}

export function ValorPorAlunoModal({
  isOpen,
  onClose,
  serie,
}: ValorPorAlunoModalProps) {
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Investimento por aluno ano a ano"
      subtitle="Série do próprio município, em R$ da época"
      maxWidth="3xl"
      showShareButton={false}
      footer={<LinhaLeiEFonte source={`${FONTE_SIOPE}, indicador 4.9`} />}
    >
      <div className="space-y-6">
        <p className="text-mute">{NOTA_INFLACAO}</p>
        <table>
          <thead>
            <tr>
              <th scope="col">Ano</th>
              <th scope="col">Investimento por aluno</th>
              <th scope="col">Situação</th>
            </tr>
          </thead>
          <tbody>
            {[...serie].reverse().map((ponto) => (
              <tr key={ponto.ano}>
                <th scope="row">{ponto.ano}</th>
                <td className="numeric">{fmtCurrency(ponto.valor)}</td>
                <td>
                  {ponto.parcial
                    ? `parcial (até o ${ponto.periodo}º bimestre)`
                    : "ano fechado"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="caption">
          {NOTA_DECLARACAO} Anos em andamento são parciais e não devem ser
          comparados com anos fechados.
        </p>
      </div>
    </ModalDialog>
  );
}
