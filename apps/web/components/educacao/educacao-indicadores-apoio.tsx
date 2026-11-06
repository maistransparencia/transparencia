"use client";

import {
  fmtCurrency,
  fmtNumber,
  Indicator,
  IndicatorPanel,
} from "@transparencia/ui";
import { useState } from "react";
import type {
  AlunosRedeView,
  ValorPorAlunoSemValorCausa,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";
import { AlunosRedeModal } from "./alunos-rede-modal";
import {
  descreverPeriodo,
  descreverVariacaoValorPorAluno,
} from "./educacao-textos";
import { ValorPorAlunoModal } from "./valor-por-aluno-modal";
import { VerDetalhesLink } from "./ver-detalhes-link";

export interface EducacaoIndicadoresApoioProps {
  valorPorAluno: ValorPorAlunoView;
  alunosRede: AlunosRedeView | null;
}

const CAUSA_SEM_VALOR: Record<
  ValorPorAlunoSemValorCausa,
  (ano: number) => string
> = {
  sem_dado_siope: (ano) => `Sem dado publicado para ${ano}`,
  nao_informado_ao_fnde: (ano) => `Não informado ao governo federal em ${ano}`,
};

const percentualDoTotal = (parte: number, total: number) =>
  total > 0 ? Math.round((parte / total) * 100) : 0;

/** Valor por aluno e total de alunos da rede, lado a lado. */
export function EducacaoIndicadoresApoio({
  valorPorAluno,
  alunosRede,
}: EducacaoIndicadoresApoioProps) {
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const [alunosAberto, setAlunosAberto] = useState(false);
  const { valor, ano, semValorCausa, serie } = valorPorAluno;

  const notaValor = (() => {
    if (valor === null) {
      return semValorCausa ? CAUSA_SEM_VALOR[semValorCausa](ano) : "Sem valor";
    }
    return (
      <>
        <span className="block">
          {descreverPeriodo(valorPorAluno)}, em R$ da época
        </span>
        <span className="block">
          {descreverVariacaoValorPorAluno(valorPorAluno)}
        </span>
      </>
    );
  })();

  return (
    <>
      <section className="space-y-4" aria-label="Alunos e valor por aluno">
        <IndicatorPanel>
          <Indicator
            data-testid="indicador-valor-por-aluno"
            label="Investimento anual por aluno"
            value={valor === null ? "—" : fmtCurrency(valor)}
            note={notaValor}
            action={
              valor !== null && serie.length > 0 ? (
                <VerDetalhesLink
                  context="valor por aluno"
                  onClick={() => setDetalhesAberto(true)}
                  className="mt-2"
                />
              ) : null
            }
          />
          {alunosRede && (
            <Indicator
              data-testid="indicador-alunos-rede"
              label="Alunos na rede municipal"
              value={
                <>
                  {fmtNumber(alunosRede.total)}{" "}
                  <span className="font-normal text-base">matriculados</span>
                </>
              }
              note={
                <>
                  <span
                    aria-hidden="true"
                    className="mb-2 flex h-4 w-full gap-0.5"
                  >
                    <span
                      className="bg-brand-fill"
                      style={{ flex: alunosRede.educacaoInfantil }}
                    />
                    <span
                      className="bg-ink"
                      style={{ flex: alunosRede.ensinoFundamental }}
                    />
                  </span>
                  <span className="flex flex-wrap justify-between gap-x-4 tabular-nums">
                    <span>
                      <span
                        aria-hidden="true"
                        className="mr-1.5 inline-block size-2.5 bg-brand-fill"
                      />
                      {fmtNumber(alunosRede.educacaoInfantil)} Infantil (
                      {percentualDoTotal(
                        alunosRede.educacaoInfantil,
                        alunosRede.total,
                      )}
                      %)
                    </span>
                    <span>
                      <span
                        aria-hidden="true"
                        className="mr-1.5 inline-block size-2.5 bg-ink"
                      />
                      {fmtNumber(alunosRede.ensinoFundamental)} Fundamental (
                      {percentualDoTotal(
                        alunosRede.ensinoFundamental,
                        alunosRede.total,
                      )}
                      %)
                    </span>
                  </span>
                </>
              }
              action={
                <VerDetalhesLink
                  context="alunos na rede municipal"
                  onClick={() => setAlunosAberto(true)}
                  className="mt-2"
                />
              }
            />
          )}
        </IndicatorPanel>
      </section>
      {alunosRede && (
        <AlunosRedeModal
          isOpen={alunosAberto}
          onClose={() => setAlunosAberto(false)}
          alunosRede={alunosRede}
        />
      )}
      <ValorPorAlunoModal
        isOpen={detalhesAberto}
        onClose={() => setDetalhesAberto(false)}
        serie={serie}
      />
    </>
  );
}
