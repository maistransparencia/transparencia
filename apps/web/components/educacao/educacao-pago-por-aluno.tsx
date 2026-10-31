"use client";

import {
  fmtCurrency,
  Indicator,
  type IndicatorSize,
  ModalDialog,
} from "@transparencia/ui";
import { useState } from "react";

/** Subfunção do Ensino Superior: fica fora da conta por aluno. */
const SUBFUNCAO_ENSINO_SUPERIOR = "364";

export interface EducacaoPagoPorAlunoProps {
  ano: number;
  isCurrentYear: boolean;
  pagoPorAluno: number | null;
  totalMatriculas: number | null;
  subfuncoes: Array<{ subfuncao: string; subfuncaoNome: string; pago: number }>;
  historico: Array<{ ano: number; pagoPorAluno: number }>;
  /** Definido pelo `IndicatorPanel`. */
  size?: IndicatorSize;
}

export function EducacaoPagoPorAluno({
  ano,
  isCurrentYear,
  pagoPorAluno,
  totalMatriculas,
  subfuncoes,
  historico,
  size,
}: EducacaoPagoPorAlunoProps) {
  const [aberto, setAberto] = useState(false);

  const nota = (() => {
    if (isCurrentYear) {
      return "só calculado para anos encerrados";
    }
    if (pagoPorAluno === null) {
      return `sem matrículas do Censo Escolar para ${ano}`;
    }
    return "estimativa, por aluno da rede municipal";
  })();

  const dentroDaConta = subfuncoes.filter(
    (linha) => linha.subfuncao !== SUBFUNCAO_ENSINO_SUPERIOR,
  );
  const ensinoSuperior = subfuncoes.find(
    (linha) => linha.subfuncao === SUBFUNCAO_ENSINO_SUPERIOR,
  );
  const anosAnteriores = historico.filter((linha) => linha.ano !== ano);

  return (
    <>
      <Indicator
        size={size}
        label="Pago por aluno"
        value={pagoPorAluno === null ? "—" : fmtCurrency(pagoPorAluno)}
        note={
          <>
            {nota}
            {pagoPorAluno === null ? null : (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => setAberto(true)}
                  className="min-h-11 font-medium text-brand-text underline"
                >
                  Ver detalhes
                </button>
              </>
            )}
          </>
        }
      />

      <ModalDialog
        isOpen={aberto}
        onClose={() => setAberto(false)}
        title="Detalhes do pago por aluno"
        subtitle={`Exercício ${ano}`}
        maxWidth="2xl"
      >
        <div className="space-y-6">
          <p>
            Soma de tudo o que a Prefeitura pagou em educação, dividida pelas
            matrículas da rede municipal
            {totalMatriculas === null
              ? ""
              : ` (${totalMatriculas.toLocaleString("pt-BR")} alunos no Censo Escolar ${ano})`}
            . Inclui merenda, transporte, administração e salários. Não é o
            gasto direto em sala de aula.
          </p>

          <section className="space-y-2">
            <h3>Pago por área em {ano}</h3>
            <table>
              <thead>
                <tr>
                  <th scope="col">Área</th>
                  <th scope="col">Pago</th>
                </tr>
              </thead>
              <tbody>
                {dentroDaConta.map((linha) => (
                  <tr key={linha.subfuncao}>
                    <th scope="row">{linha.subfuncaoNome}</th>
                    <td className="numeric">{fmtCurrency(linha.pago)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ensinoSuperior ? (
              <p className="text-mute text-sm">
                Fora da conta: {ensinoSuperior.subfuncaoNome},{" "}
                {fmtCurrency(ensinoSuperior.pago)}.
              </p>
            ) : null}
          </section>

          {anosAnteriores.length > 0 ? (
            <section className="space-y-2">
              <h3>Em anos anteriores</h3>
              <ul>
                {anosAnteriores.map((linha) => (
                  <li key={linha.ano}>
                    {linha.ano}: {fmtCurrency(linha.pagoPorAluno)}
                  </li>
                ))}
              </ul>
              <p className="text-mute text-sm">
                Valores da época, sem correção pela inflação.
              </p>
            </section>
          ) : null}
        </div>
      </ModalDialog>
    </>
  );
}
