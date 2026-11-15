"use client";

import { fmtCurrency, ModalDialog } from "@transparencia/ui";
import type { ValorPorAlunoView } from "@/app/[portalSlug]/educacao/view-model";
import { LeiLink, LinhaLeiEFonte } from "@/components/lei-e-fonte";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import { FONTE_SIOPE, NOTA_DECLARACAO, NOTA_INFLACAO } from "./educacao-textos";

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
      footer={
        <LinhaLeiEFonte
          source={
            <>
              <LeiLink label={FONTE_SIOPE} url={FONTES_OFICIAIS.siope.url} />,
              indicador 4.9
            </>
          }
        />
      }
    >
      <div className="space-y-6">
        <p className="text-mute text-sm">{NOTA_INFLACAO}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th scope="col">Ano</th>
                <th scope="col" className="numeric">
                  Investimento por aluno
                </th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {[...serie].reverse().map((ponto) => (
                <tr key={ponto.ano}>
                  <td>{ponto.ano}</td>
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
        </div>
        <p className="text-mute text-sm">
          Pelo método do SIOPE, o valor é a despesa com ensino (MDE) dividida
          pelo número total de alunos matriculados. Esse total de alunos pode
          ser diferente do mostrado em &quot;Alunos na rede municipal&quot;, e a
          despesa com ensino não é a mesma soma da função Educação. Por isso
          dividir um pelo outro pode não dar o mesmo resultado.
        </p>
        <p className="caption">{NOTA_DECLARACAO}</p>
      </div>
    </ModalDialog>
  );
}
