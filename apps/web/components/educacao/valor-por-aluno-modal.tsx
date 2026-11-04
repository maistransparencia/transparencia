"use client";

import { fmtCurrency, ModalDialog } from "@transparencia/ui";
import type { ValorPorAlunoView } from "@/app/[portalSlug]/educacao/view-model";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import {
  FONTE_SIOPE,
  LeiLink,
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
        <p className="text-mute text-sm">
          O valor é calculado pelo governo federal com os alunos informados ao
          SIOPE, não com o total do Censo Escolar mostrado em &quot;Alunos na
          rede municipal&quot;. Por isso dividir o gasto da função Educação pelo
          número de alunos não dá o mesmo resultado.
        </p>
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
        <p className="caption">
          {NOTA_DECLARACAO} Anos em andamento são parciais e não devem ser
          comparados com anos fechados.
        </p>
      </div>
    </ModalDialog>
  );
}
