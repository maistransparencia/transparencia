"use client";

import {
  fmtCurrency,
  fmtNumber,
  Indicator,
  IndicatorPanel,
  ThresholdMeter,
} from "@transparencia/ui";
import { useState } from "react";
import type {
  AlunosRedeView,
  AprendizadoEtapa,
  ValorPorAlunoSemValorCausa,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";
import {
  descreverPeriodo,
  descreverVariacaoPontos,
  descreverVariacaoValorPorAluno,
  formatarNota,
  NOTA_INFLACAO,
  VariacaoAoLado,
} from "./educacao-textos";
import { ValorPorAlunoModal } from "./valor-por-aluno-modal";
import { VerDetalhesLink } from "./ver-detalhes-link";

export interface EducacaoCardsResumoProps {
  valorPorAluno: ValorPorAlunoView;
  alunosRede: AlunosRedeView | null;
  aprendizado: AprendizadoEtapa;
}

const CAUSA_SEM_VALOR: Record<
  ValorPorAlunoSemValorCausa,
  (ano: number) => string
> = {
  sem_dado_siope: (ano) => `sem dado publicado para ${ano}`,
  nao_informado_ao_fnde: (ano) =>
    `a Prefeitura não informou o valor de ${ano} ao governo federal`,
};

function CardValorPorAluno({
  valorPorAluno,
}: {
  valorPorAluno: ValorPorAlunoView;
}) {
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const { valor, ano, semValorCausa, serie } = valorPorAluno;

  const nota = (() => {
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
        {serie.length > 0 && (
          <VerDetalhesLink
            context="valor por aluno"
            onClick={() => setDetalhesAberto(true)}
          />
        )}
      </>
    );
  })();

  return (
    <IndicatorPanel className="panel-top">
      <Indicator
        label="Quanto a Prefeitura investe por aluno?"
        value={valor === null ? "—" : fmtCurrency(valor)}
        note={nota}
      />
      <ValorPorAlunoModal
        isOpen={detalhesAberto}
        onClose={() => setDetalhesAberto(false)}
        serie={serie}
      />
    </IndicatorPanel>
  );
}

function CardAlunosRede({ alunosRede }: { alunosRede: AlunosRedeView }) {
  return (
    <IndicatorPanel className="panel-top">
      <Indicator
        label="Alunos na rede municipal"
        value={fmtNumber(alunosRede.total)}
        note={
          <>
            <span className="block">
              {fmtNumber(alunosRede.educacaoInfantil)} na educação infantil
              (creche e pré-escola) e {fmtNumber(alunosRede.ensinoFundamental)}{" "}
              no ensino fundamental (1º ao 9º ano); não inclui ensino médio, EJA
              nem educação especial.
            </span>
            <span className="block">
              Fonte: Censo Escolar {alunosRede.anoCenso}, INEP: alunos
              matriculados em maio daquele ano, não o número de hoje.
            </span>
          </>
        }
      />
    </IndicatorPanel>
  );
}

function CardAprendizado({ aprendizado }: { aprendizado: AprendizadoEtapa }) {
  const { notaIdeb, anoApuracao, metaIdeb, notaAnterior, anoAnterior } =
    aprendizado;
  const temNota = notaIdeb !== null && anoApuracao !== null;

  const cicloAnterior = (() => {
    if (notaAnterior === null || anoAnterior === null) {
      return "sem ciclo anterior para comparar";
    }
    return `ciclo anterior: ${formatarNota(notaAnterior)} em ${anoAnterior}`;
  })();
  const variacao = (() => {
    const pontos = aprendizado.variacaoPontos;
    if (pontos === null || pontos === 0 || anoAnterior === null) return null;
    return `${descreverVariacaoPontos(pontos)} em relação a ${anoAnterior}`;
  })();
  const meta = (() => {
    if (metaIdeb === null) return "sem meta definida pelo MEC";
    return `meta do MEC: ${formatarNota(metaIdeb)}`;
  })();

  return (
    <IndicatorPanel className="panel-top">
      <Indicator
        label="As crianças estão aprendendo?"
        value={
          temNota ? (
            <>
              {formatarNota(notaIdeb)}
              <VariacaoAoLado
                variacao={aprendizado.variacaoPontos}
                texto={formatarNota(Math.abs(aprendizado.variacaoPontos ?? 0))}
              />
            </>
          ) : (
            "—"
          )
        }
        note={
          temNota ? (
            <>
              <span className="block font-semibold text-ink">
                IDEB · {aprendizado.titulo}
              </span>
              <span className="block">apurada em {anoApuracao}</span>
              {variacao && <span className="block">{variacao}</span>}
              <span className="block">{cicloAnterior}</span>
              <span className="block">{meta}</span>
              {metaIdeb !== null && (
                <ThresholdMeter
                  value={notaIdeb}
                  max={10}
                  threshold={metaIdeb}
                  thresholdLabel={`meta ${formatarNota(metaIdeb)}`}
                  label={`Nota do IDEB, ${aprendizado.titulo}`}
                  valueText={`${formatarNota(notaIdeb)} de 10; meta do MEC ${formatarNota(metaIdeb)}`}
                />
              )}
            </>
          ) : (
            "sem nota do IDEB apurada"
          )
        }
      />
    </IndicatorPanel>
  );
}

/** Três cards logo abaixo do topo: valor por aluno, alunos na rede e aprendizado. */
export function EducacaoCardsResumo({
  valorPorAluno,
  alunosRede,
  aprendizado,
}: EducacaoCardsResumoProps) {
  return (
    <section
      aria-label="Valor por aluno, alunos na rede e aprendizado"
      className="grid grid-cols-1 gap-6 md:grid-cols-3"
    >
      <CardValorPorAluno valorPorAluno={valorPorAluno} />
      {alunosRede && <CardAlunosRede alunosRede={alunosRede} />}
      <CardAprendizado aprendizado={aprendizado} />
    </section>
  );
}
