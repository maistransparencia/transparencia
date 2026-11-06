"use client";

import { fmtNumber, ModalDialog } from "@transparencia/ui";
import type { AlunosRedeView } from "@/app/[portalSlug]/educacao/view-model";
import { LinhaLeiEFonte } from "./educacao-textos";

export interface AlunosRedeModalProps {
  isOpen: boolean;
  onClose: () => void;
  alunosRede: AlunosRedeView;
}

export function AlunosRedeModal({
  isOpen,
  onClose,
  alunosRede,
}: AlunosRedeModalProps) {
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Alunos na rede municipal"
      subtitle={`Censo Escolar ${alunosRede.anoCenso}`}
      maxWidth="2xl"
      showShareButton={false}
      footer={
        <LinhaLeiEFonte source={`Censo Escolar ${alunosRede.anoCenso}, INEP`} />
      }
    >
      <div className="space-y-6">
        <p className="text-mute text-sm">Matrículas de maio do ano do Censo.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th scope="col">Etapa</th>
                <th scope="col" className="numeric">
                  Alunos
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Educação infantil (creche e pré-escola)</td>
                <td className="numeric">
                  {fmtNumber(alunosRede.educacaoInfantil)}
                </td>
              </tr>
              <tr>
                <td>Ensino fundamental (1º ao 9º ano)</td>
                <td className="numeric">
                  {fmtNumber(alunosRede.ensinoFundamental)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="caption">
          Não inclui ensino médio, educação de jovens e adultos (EJA) nem
          educação especial.
        </p>
      </div>
    </ModalDialog>
  );
}
