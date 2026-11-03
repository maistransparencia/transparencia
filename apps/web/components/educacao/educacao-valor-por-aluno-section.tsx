"use client";

import {
  fmtCurrency,
  fmtNumber,
  Indicator,
  IndicatorPanel,
  ModalDialog,
  SectionHeader,
} from "@transparencia/ui";
import { useState } from "react";
import type {
  AlunosRedeView,
  ValorPorAlunoSemValorCausa,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";

export interface EducacaoValorPorAlunoSectionProps {
  valorPorAluno: ValorPorAlunoView;
  alunosRede?: AlunosRedeView | null;
}

const NOTA_DECLARACAO =
  "A Prefeitura informa este valor ao governo federal pelo SIOPE, o sistema oficial de dados da educação. O portal mostra o número como o governo federal o publicou, sem recalcular.";
const NOTA_INFLACAO =
  "Valores da época, sem correção pela inflação: anos diferentes não são comparáveis em poder de compra.";

const CAUSA_SEM_VALOR: Record<
  ValorPorAlunoSemValorCausa,
  (ano: number) => string
> = {
  sem_dado_siope: (ano) => `sem dado publicado para ${ano}`,
  nao_informado_ao_fnde: (ano) =>
    `a Prefeitura não informou o valor de ${ano} ao governo federal`,
};

const fmtPercentual = (valor: number) =>
  `${Math.abs(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;

/** Texto com palavra e sinal, nunca só cor. */
function descreverVariacao(view: ValorPorAlunoView): string {
  if (view.parcial) {
    return "ano em andamento: não se compara com anos já fechados";
  }
  if (view.variacaoValor === null || view.anoAnterior === null) {
    return "sem ano anterior fechado para comparar";
  }
  if (view.variacaoValor === 0) {
    return `igual a ${view.anoAnterior}`;
  }
  const palavra = view.variacaoValor > 0 ? "subiu" : "caiu";
  const percentual =
    view.variacaoPercentual === null
      ? ""
      : ` (${fmtPercentual(view.variacaoPercentual)})`;
  return `${palavra} ${fmtCurrency(Math.abs(view.variacaoValor))}${percentual} em relação a ${view.anoAnterior}`;
}

export function EducacaoValorPorAlunoSection({
  valorPorAluno,
  alunosRede = null,
}: EducacaoValorPorAlunoSectionProps) {
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const { valor, ano, parcial, periodo, semValorCausa, serie } = valorPorAluno;

  const nota = (() => {
    if (valor === null) {
      return semValorCausa ? CAUSA_SEM_VALOR[semValorCausa](ano) : "sem valor";
    }
    const periodoTexto =
      parcial && periodo !== null
        ? `parcial: acumulado até o ${periodo}º bimestre de ${ano}`
        : `em ${ano}`;
    return (
      <>
        <span className="block">{periodoTexto}</span>
        <span className="block">{descreverVariacao(valorPorAluno)}</span>
      </>
    );
  })();

  return (
    <section id="valor-por-aluno" className="space-y-6">
      <SectionHeader
        title="Quanto a Prefeitura investe por aluno da rede municipal?"
        description={`${NOTA_DECLARACAO} ${NOTA_INFLACAO}`}
      />
      <IndicatorPanel>
        <Indicator
          label={
            parcial
              ? "Investimento por aluno (parcial)"
              : "Investimento por aluno"
          }
          value={valor === null ? "—" : fmtCurrency(valor)}
          note={nota}
        />
        {alunosRede && (
          <Indicator
            label="Alunos na rede municipal"
            value={fmtNumber(alunosRede.total)}
            note={`${fmtNumber(alunosRede.educacaoInfantil)} na educação infantil (creche e pré-escola) e ${fmtNumber(alunosRede.ensinoFundamental)} no ensino fundamental (1º ao 9º ano); não inclui ensino médio, EJA nem educação especial. Censo Escolar ${alunosRede.anoCenso}, INEP: alunos matriculados em maio daquele ano, não o número de hoje`}
          />
        )}
      </IndicatorPanel>
      {serie.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setDetalhesAberto(true)}
            className="min-h-11 cursor-pointer font-medium text-brand-text underline underline-offset-2"
          >
            Ver detalhes
          </button>
        </div>
      )}
      <ModalDialog
        isOpen={detalhesAberto}
        onClose={() => setDetalhesAberto(false)}
        title="Investimento por aluno ano a ano"
        subtitle="Série do próprio município, em R$ da época"
        maxWidth="3xl"
        showShareButton={false}
      >
        <div className="space-y-4">
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
          <p className="text-mute">
            {NOTA_DECLARACAO} {NOTA_INFLACAO} Anos em andamento são parciais e
            não devem ser comparados com anos fechados.
          </p>
        </div>
      </ModalDialog>
    </section>
  );
}
