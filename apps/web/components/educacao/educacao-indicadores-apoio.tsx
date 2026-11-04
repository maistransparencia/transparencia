"use client";

import {
  cn,
  fmtCurrency,
  fmtNumber,
  fmtPercent,
  Indicator,
  IndicatorPanel,
  type IndicatorTone,
  SectionHeader,
  ThresholdMeter,
  type ThresholdMeterTone,
} from "@transparencia/ui";
import { useState } from "react";
import type {
  AlunosRedeView,
  MinimosLegaisView,
  ValorPorAlunoSemValorCausa,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";
import { AlunosRedeModal } from "./alunos-rede-modal";
import {
  descreverPeriodo,
  descreverVariacaoValorPorAluno,
  formatarLimite,
  motivoSemPercentual,
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

const TOM_DA_BARRA: Record<IndicatorTone, ThresholdMeterTone> = {
  default: "brand",
  ok: "ok",
  warn: "warn",
  danger: "danger",
};

const COR_DO_VALOR: Record<IndicatorTone, string> = {
  default: "text-brand-text",
  ok: "text-ok-text",
  warn: "text-warn-text",
  danger: "text-danger-text",
};

/** Bloco do Fundeb: a pergunta, o percentual e a barra com o marcador do mínimo. */
function BlocoFundeb({ view }: { view: MinimosLegaisView }) {
  const { fundebProfissionais: fundeb } = view;
  const { percentualAplicado, limite } = fundeb;
  return (
    <section
      className="space-y-4"
      data-testid="indicador-fundeb"
      aria-label="Fundeb dos profissionais da educação"
    >
      <SectionHeader title="Quanto do Fundeb vai para os profissionais da educação?" />
      <p
        className={cn(
          "stat-value",
          COR_DO_VALOR[tomDoResultado(fundeb.resultado)],
        )}
      >
        {percentualAplicado === null ? "—" : fmtPercent(percentualAplicado)}
      </p>
      {percentualAplicado !== null && limite !== null && (
        <ThresholdMeter
          value={percentualAplicado}
          threshold={limite}
          tone={TOM_DA_BARRA[tomDoResultado(fundeb.resultado)]}
          label="Parte do Fundeb paga aos profissionais da educação"
          valueText={`${fmtPercent(percentualAplicado)} do Fundeb pagos aos profissionais; mínimo de ${formatarLimite(limite)}`}
        />
      )}
      <p className="caption space-y-0.5">
        {percentualAplicado === null ? (
          motivoSemPercentual(view)
        ) : (
          <>
            <span className="block">
              Parte do Fundeb paga aos profissionais da educação.
              {limite !== null &&
                ` A lei exige pelo menos ${formatarLimite(limite)} dos recursos do Fundeb.`}
            </span>
            <Veredito minimo={fundeb} ocultarCumpriu />
          </>
        )}
      </p>
    </section>
  );
}

/** Blocos logo abaixo dos dois destaques: Fundeb, e alunos com valor por aluno. */
export function EducacaoIndicadoresApoio({
  minimosLegais,
  valorPorAluno,
  alunosRede,
}: EducacaoIndicadoresApoioProps) {
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const [alunosAberto, setAlunosAberto] = useState(false);
  const { valor, ano, semValorCausa, serie } = valorPorAluno;

  const notaValor = (() => {
    if (valor === null) {
      return semValorCausa ? CAUSA_SEM_VALOR[semValorCausa](ano) : "sem valor";
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
      <BlocoFundeb view={minimosLegais} />
      <section className="space-y-4" aria-label="Alunos e valor por aluno">
        <SectionHeader title="Quantos alunos a rede tem e quanto se investe em cada um?" />
        <IndicatorPanel>
          <Indicator
            data-testid="indicador-valor-por-aluno"
            label="Quanto a Prefeitura investe por aluno?"
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
              value={fmtNumber(alunosRede.total)}
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
                      className="bg-ok-fill"
                      style={{ flex: alunosRede.ensinoFundamental }}
                    />
                  </span>
                  <span className="block">
                    <span
                      aria-hidden="true"
                      className="mr-1.5 inline-block size-2.5 bg-brand-fill"
                    />
                    {fmtNumber(alunosRede.educacaoInfantil)} na educação
                    infantil e{" "}
                    <span
                      aria-hidden="true"
                      className="mr-1.5 inline-block size-2.5 bg-ok-fill"
                    />
                    {fmtNumber(alunosRede.ensinoFundamental)} no ensino
                    fundamental
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
