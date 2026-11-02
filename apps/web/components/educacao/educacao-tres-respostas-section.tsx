import {
  fmtCurrency,
  fmtPercent,
  Indicator,
  IndicatorPanel,
} from "@transparencia/ui";
import type { ReactNode } from "react";
import type {
  AprendizadoEtapa,
  MinimosLegaisView,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";

export interface EducacaoTresRespostasSectionProps {
  minimosLegais: MinimosLegaisView;
  valorPorAluno: ValorPorAlunoView;
  aprendizado: AprendizadoEtapa;
}

const formatarNota = (nota: number) =>
  nota.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

function LinkDoDetalhe({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="block text-brand-text underline underline-offset-2"
    >
      Ver o detalhe
    </a>
  );
}

function notaDoMinimo(view: MinimosLegaisView): ReactNode {
  const { mde } = view;
  if (mde.percentualAplicado === null) {
    return view.semDadoSiope
      ? `sem dado do SIOPE para ${view.ano}`
      : `a Prefeitura não informou o percentual ao FNDE para ${view.ano}`;
  }
  const veredito = (() => {
    if (view.parcial) return "ano em andamento: ainda sem veredito";
    if (mde.resultado === "cumpriu") return "cumpriu o mínimo";
    if (mde.resultado === "abaixo") return "abaixo do mínimo";
    return null;
  })();
  return (
    <>
      {mde.limite !== null && (
        <span className="block">
          mínimo exigido: {fmtPercent(mde.limite)} da receita de impostos
        </span>
      )}
      <span className="block">
        {view.parcial && view.periodo !== null
          ? `parcial, até o ${view.periodo}º bimestre de ${view.ano}`
          : `em ${view.ano}`}
      </span>
      {veredito && <span className="block">{veredito}</span>}
    </>
  );
}

function notaDoValorPorAluno(view: ValorPorAlunoView): ReactNode {
  if (view.valor === null) {
    return view.semValorCausa === "nao_informado_ao_fnde"
      ? `a Prefeitura não informou o valor ao FNDE para ${view.ano}`
      : `sem dado do SIOPE para ${view.ano}`;
  }
  const comparacao = (() => {
    if (view.parcial)
      return "ano em andamento: não se compara com anos fechados";
    if (view.variacaoValor === null || view.anoAnterior === null) {
      return "sem ano anterior fechado para comparar";
    }
    if (view.variacaoValor === 0) return `igual a ${view.anoAnterior}`;
    const palavra = view.variacaoValor > 0 ? "subiu" : "caiu";
    return `${palavra} ${fmtCurrency(Math.abs(view.variacaoValor))} em relação a ${view.anoAnterior}`;
  })();
  return (
    <>
      <span className="block">
        {view.parcial && view.periodo !== null
          ? `parcial, até o ${view.periodo}º bimestre de ${view.ano}`
          : `em ${view.ano}`}
      </span>
      <span className="block">{comparacao}</span>
    </>
  );
}

function notaDoAprendizado(etapa: AprendizadoEtapa): ReactNode {
  if (etapa.notaIdeb === null || etapa.anoApuracao === null) {
    return "sem nota do IDEB apurada";
  }
  const meta = (() => {
    if (etapa.metaIdeb === null) return "sem meta definida pelo MEC";
    return `meta do MEC: ${formatarNota(etapa.metaIdeb)}`;
  })();
  const cicloAnterior = (() => {
    if (etapa.notaAnterior === null || etapa.anoAnterior === null) {
      return "sem ciclo anterior para comparar";
    }
    return `ciclo anterior: ${formatarNota(etapa.notaAnterior)} em ${etapa.anoAnterior}`;
  })();
  return (
    <>
      <span className="block">
        {etapa.titulo}, apurada em {etapa.anoApuracao}
      </span>
      <span className="block">{meta}</span>
      <span className="block">{cicloAnterior}</span>
    </>
  );
}

/** Faixa do topo: as três perguntas do cidadão, cada uma com número e régua. */
export function EducacaoTresRespostasSection({
  minimosLegais,
  valorPorAluno,
  aprendizado,
}: EducacaoTresRespostasSectionProps) {
  const { mde } = minimosLegais;
  return (
    <section aria-label="Três respostas sobre a educação">
      <IndicatorPanel columns={3} tone="brand">
        <Indicator
          label="A Prefeitura aplica o mínimo exigido em educação?"
          value={
            mde.percentualAplicado === null
              ? "—"
              : fmtPercent(mde.percentualAplicado)
          }
          note={
            <>
              {notaDoMinimo(minimosLegais)}
              <LinkDoDetalhe href="#minimo-exigido" />
            </>
          }
        />
        <Indicator
          label="Quanto a Prefeitura investe por aluno?"
          value={
            valorPorAluno.valor === null
              ? "—"
              : fmtCurrency(valorPorAluno.valor)
          }
          note={
            <>
              {notaDoValorPorAluno(valorPorAluno)}
              <LinkDoDetalhe href="#valor-por-aluno" />
            </>
          }
        />
        <Indicator
          label="As crianças estão aprendendo?"
          value={
            aprendizado.notaIdeb === null || aprendizado.anoApuracao === null
              ? "—"
              : formatarNota(aprendizado.notaIdeb)
          }
          note={
            <>
              {notaDoAprendizado(aprendizado)}
              <LinkDoDetalhe href="#aprendizado" />
            </>
          }
        />
      </IndicatorPanel>
    </section>
  );
}
