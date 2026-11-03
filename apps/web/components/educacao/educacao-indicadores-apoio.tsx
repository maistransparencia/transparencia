"use client";

import {
  fmtCurrency,
  fmtNumber,
  fmtPercent,
  Indicator,
  IndicatorPanel,
  type IndicatorTone,
  ThresholdMeter,
} from "@transparencia/ui";
import { useState } from "react";
import type {
  AlunosRedeView,
  MinimosLegaisView,
  ValorPorAlunoSemValorCausa,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";
import {
  descreverPeriodo,
  descreverVariacaoValorPorAluno,
  formatarLimite,
  motivoSemPercentual,
  NOTA_INFLACAO,
  Veredito,
} from "./educacao-textos";
import { ValorPorAlunoModal } from "./valor-por-aluno-modal";
import { VerDetalhesLink } from "./ver-detalhes-link";

export interface EducacaoIndicadoresApoioProps {
  minimosLegais: MinimosLegaisView;
  valorPorAluno: ValorPorAlunoView;
  alunosRede: AlunosRedeView | null;
}

const CAUSA_SEM_VALOR: Record<
  ValorPorAlunoSemValorCausa,
  (ano: number) => string
> = {
  sem_dado_siope: (ano) => `sem dado publicado para ${ano}`,
  nao_informado_ao_fnde: (ano) =>
    `a Prefeitura não informou o valor de ${ano} ao governo federal`,
};

/** Tom pela posição frente ao mínimo: cumpriu em verde, abaixo em âmbar, o resto neutro. */
const tomDoResultado = (
  resultado: MinimosLegaisView["mde"]["resultado"],
): IndicatorTone => {
  if (resultado === "cumpriu") return "ok";
  if (resultado === "abaixo") return "warn";
  return "default";
};

function IndicadorFundeb({ view }: { view: MinimosLegaisView }) {
  const { fundebProfissionais: fundeb } = view;
  const { percentualAplicado, limite } = fundeb;
  return (
    <Indicator
      label="Parte do Fundeb paga aos profissionais da educação"
      value={percentualAplicado === null ? "—" : fmtPercent(percentualAplicado)}
      tone={tomDoResultado(fundeb.resultado)}
      note={(() => {
        if (percentualAplicado === null) return motivoSemPercentual(view);
        return (
          <>
            {limite !== null && (
              <span className="block">
                mínimo de {fmtPercent(limite)} dos recursos do Fundeb
              </span>
            )}
            <Veredito minimo={fundeb} />
            {limite !== null && (
              <ThresholdMeter
                value={percentualAplicado}
                threshold={limite}
                thresholdLabel={`mínimo ${formatarLimite(limite)}`}
                label="Parte do Fundeb paga aos profissionais da educação"
                valueText={`${fmtPercent(percentualAplicado)} dos recursos do Fundeb pagos aos profissionais; mínimo de ${fmtPercent(limite)}`}
              />
            )}
          </>
        );
      })()}
    />
  );
}

/** Indicadores logo abaixo dos dois destaques: Fundeb, valor por aluno e alunos na rede. */
export function EducacaoIndicadoresApoio({
  minimosLegais,
  valorPorAluno,
  alunosRede,
}: EducacaoIndicadoresApoioProps) {
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const { valor, ano, semValorCausa, serie } = valorPorAluno;

  const notaValor = (() => {
    if (valor === null) {
      return semValorCausa ? CAUSA_SEM_VALOR[semValorCausa](ano) : "sem valor";
    }
    return (
      <>
        <span className="block">{descreverPeriodo(valorPorAluno)}</span>
        <span className="block">
          {descreverVariacaoValorPorAluno(valorPorAluno)}
        </span>
        <span className="block">{NOTA_INFLACAO}</span>
      </>
    );
  })();

  return (
    <>
      <IndicatorPanel>
        <div data-testid="indicador-fundeb">
          <IndicadorFundeb view={minimosLegais} />
        </div>
        <div data-testid="indicador-valor-por-aluno">
          <Indicator
            label="Quanto a Prefeitura investe por aluno?"
            value={valor === null ? "—" : fmtCurrency(valor)}
            note={notaValor}
          />
          {valor !== null && serie.length > 0 && (
            <VerDetalhesLink
              context="valor por aluno"
              onClick={() => setDetalhesAberto(true)}
              className="mt-2"
            />
          )}
        </div>
        {alunosRede && (
          <div data-testid="indicador-alunos-rede">
            <Indicator
              label="Alunos na rede municipal"
              value={fmtNumber(alunosRede.total)}
              note={
                <>
                  <span className="block">
                    {fmtNumber(alunosRede.educacaoInfantil)} na educação
                    infantil (creche e pré-escola) e{" "}
                    {fmtNumber(alunosRede.ensinoFundamental)} no ensino
                    fundamental (1º ao 9º ano); não inclui ensino médio, EJA nem
                    educação especial.
                  </span>
                  <span className="block">
                    Fonte: Censo Escolar {alunosRede.anoCenso}, INEP: alunos
                    matriculados em maio daquele ano, não o número de hoje.
                  </span>
                </>
              }
            />
          </div>
        )}
      </IndicatorPanel>
      <ValorPorAlunoModal
        isOpen={detalhesAberto}
        onClose={() => setDetalhesAberto(false)}
        serie={serie}
      />
    </>
  );
}
