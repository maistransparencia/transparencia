import type { EtapaEnsino } from "@transparencia/db";
import {
  Indicator,
  IndicatorPanel,
  SectionHeader,
  ThresholdMeter,
} from "@transparencia/ui";
import { CheckCircle, TriangleAlert } from "lucide-react";
import type {
  AprendizadoEtapa,
  EducacaoViewModel,
} from "@/app/[portalSlug]/educacao/view-model";
import { EducacaoHistoricoSection } from "./educacao-historico-section";
import {
  descreverVariacaoPontos,
  formatarNota,
  pluralizar,
  VariacaoAoLado,
} from "./educacao-textos";

export interface EducacaoAprendizadoSectionProps {
  aprendizado: EducacaoViewModel["aprendizado"];
  historico: EducacaoViewModel["historico"];
  initialEtapa: EtapaEnsino;
}

function descreverCicloAnterior(etapa: AprendizadoEtapa): string {
  if (etapa.notaAnterior === null || etapa.anoAnterior === null) {
    return "sem ciclo anterior para comparar";
  }
  const base = `ciclo anterior ${formatarNota(etapa.notaAnterior)} em ${etapa.anoAnterior}`;
  if (etapa.variacaoPontos === null) return base;
  return `${base}, ${descreverVariacaoPontos(etapa.variacaoPontos)}`;
}

function descreverClassificacao(
  classificacao: NonNullable<AprendizadoEtapa["classificacao"]>,
  temCicloAnterior: boolean,
): string {
  const { variacaoPosicoes, redesComparadas, totalCicloAnterior, total } =
    classificacao;
  if (variacaoPosicoes === null) {
    return temCicloAnterior
      ? "a posição do ciclo anterior não está disponível para comparar"
      : "sem ciclo anterior para comparar";
  }
  const redesMudaram =
    redesComparadas !== null &&
    (redesComparadas !== total ||
      (totalCicloAnterior !== null && redesComparadas !== totalCicloAnterior));
  const base = redesMudaram
    ? ` (entre as ${redesComparadas} redes avaliadas nos dois ciclos)`
    : "";
  if (variacaoPosicoes === 0) return `mesma posição do ciclo anterior${base}`;
  const unidade = pluralizar(variacaoPosicoes, "posição", "posições");
  const verbo = variacaoPosicoes > 0 ? "subiu" : "caiu";
  return `${verbo} ${Math.abs(variacaoPosicoes)} ${unidade} desde o ciclo anterior${base}`;
}

/** Texto e ícone, nunca só cor: "meta atingida" ou "abaixo da meta". */
function SituacaoDaMeta({ atingiuMeta }: { atingiuMeta: boolean | null }) {
  if (atingiuMeta === null) return null;
  if (atingiuMeta) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-ok-text">
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        meta atingida
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-danger-text">
      <TriangleAlert className="h-4 w-4" aria-hidden="true" />
      abaixo da meta
    </span>
  );
}

function EtapaPainel({ etapa }: { etapa: AprendizadoEtapa }) {
  const { notaIdeb, metaIdeb, classificacao, anoApuracao } = etapa;
  const rotuloMeta =
    anoApuracao === null ? "Meta do MEC" : `Meta do MEC para ${anoApuracao}`;

  return (
    <div className="space-y-4">
      <h3>{etapa.titulo}</h3>
      <IndicatorPanel size="sm">
        <Indicator
          label="Nota do IDEB"
          value={
            notaIdeb === null ? (
              "—"
            ) : (
              <>
                {formatarNota(notaIdeb)}
                <VariacaoAoLado
                  variacao={etapa.variacaoPontos}
                  texto={formatarNota(Math.abs(etapa.variacaoPontos ?? 0))}
                />
              </>
            )
          }
          note={
            anoApuracao === null ? (
              "sem nota apurada"
            ) : (
              <>
                <span className="block">apurada em {anoApuracao}</span>
                <span className="block">{descreverCicloAnterior(etapa)}</span>
              </>
            )
          }
        />
        <Indicator
          label="Classificação entre as redes municipais do estado"
          value={
            classificacao === null ? (
              "—"
            ) : (
              <>
                {`${classificacao.posicao}º`}
                <VariacaoAoLado
                  variacao={classificacao.variacaoPosicoes}
                  texto={String(Math.abs(classificacao.variacaoPosicoes ?? 0))}
                />
              </>
            )
          }
          note={
            classificacao === null ? (
              "classificação ainda não disponível"
            ) : (
              <>
                <span className="block">
                  entre {classificacao.total} redes municipais
                </span>
                <span className="block">
                  {descreverClassificacao(
                    classificacao,
                    etapa.anoAnterior !== null,
                  )}
                </span>
              </>
            )
          }
        />
        <Indicator
          label={rotuloMeta}
          value={metaIdeb === null ? "—" : formatarNota(metaIdeb)}
          note={
            metaIdeb === null ? (
              "o MEC não definiu meta para este ciclo"
            ) : (
              <SituacaoDaMeta atingiuMeta={etapa.atingiuMeta} />
            )
          }
        />
      </IndicatorPanel>
      {notaIdeb !== null && metaIdeb !== null && (
        <ThresholdMeter
          value={notaIdeb}
          max={10}
          threshold={metaIdeb}
          label={`Nota do IDEB, ${etapa.titulo}`}
          valueText={`${formatarNota(notaIdeb)} de 10; meta do MEC ${formatarNota(metaIdeb)}`}
        />
      )}
    </div>
  );
}

export function EducacaoAprendizadoSection({
  aprendizado,
  historico,
  initialEtapa,
}: EducacaoAprendizadoSectionProps) {
  return (
    <section
      id="aprendizado"
      aria-label="Aprendizado dos alunos"
      className="space-y-6"
    >
      <SectionHeader
        title="Aprendizado dos alunos"
        description="As crianças da rede municipal estão aprendendo? O IDEB é a nota oficial das escolas, de 0 a 10, e combina o que os alunos aprendem nas provas com quantos são aprovados. É medido de dois em dois anos, por isso mostramos o ano de cada nota."
      />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <EtapaPainel etapa={aprendizado.anosIniciais} />
        <EtapaPainel etapa={aprendizado.anosFinais} />
      </div>
      <div className="border-line border-t pt-6">
        <EducacaoHistoricoSection
          historico={historico}
          initialEtapa={initialEtapa}
        />
      </div>
    </section>
  );
}
