import type { EtapaEnsino } from "@transparencia/db";
import { Indicator, IndicatorPanel, SectionHeader } from "@transparencia/ui";
import { CheckCircle } from "lucide-react";
import type {
  AprendizadoEtapa,
  EducacaoViewModel,
} from "@/app/[portalSlug]/educacao/view-model";
import { EducacaoHistoricoSection } from "./educacao-historico-section";

export interface EducacaoAprendizadoSectionProps {
  aprendizado: EducacaoViewModel["aprendizado"];
  historico: EducacaoViewModel["historico"];
  initialEtapa: EtapaEnsino;
  municipioUf: string;
}

const formatarNota = (nota: number) =>
  nota.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

function formatarVariacao(pontos: number): string {
  const sinal = pontos > 0 ? "+" : "";
  const texto = `${sinal}${formatarNota(pontos)}`;
  return `${texto} ${Math.abs(pontos) === 1 ? "ponto" : "pontos"}`;
}

function EtapaPainel({ etapa }: { etapa: AprendizadoEtapa }) {
  const metaNota = (() => {
    if (etapa.metaIdeb === null) {
      return "o MEC não definiu meta para este ciclo";
    }
    return `meta definida pelo MEC para ${etapa.anoApuracao}`;
  })();

  return (
    <div className="space-y-3">
      <h3>{etapa.titulo}</h3>
      <IndicatorPanel size="sm">
        <Indicator
          label="Nota do IDEB"
          value={etapa.notaIdeb === null ? "—" : formatarNota(etapa.notaIdeb)}
          note={
            etapa.anoApuracao === null
              ? "sem nota apurada"
              : `apurada em ${etapa.anoApuracao}`
          }
        />
        <Indicator
          label="Meta"
          value={etapa.metaIdeb === null ? "—" : formatarNota(etapa.metaIdeb)}
          note={
            <>
              {metaNota}
              {etapa.atingiuMeta ? (
                <span className="ml-2 inline-flex items-center gap-1 font-semibold text-ok-text">
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  meta atingida
                </span>
              ) : null}
            </>
          }
        />
        <Indicator
          label="Ciclo anterior"
          value={
            etapa.notaAnterior === null ? "—" : formatarNota(etapa.notaAnterior)
          }
          note={
            etapa.anoAnterior === null
              ? "sem ciclo anterior"
              : String(etapa.anoAnterior)
          }
          trend={
            etapa.variacaoPontos === null
              ? undefined
              : {
                  value: formatarVariacao(etapa.variacaoPontos),
                  isPositive: etapa.variacaoPontos > 0,
                }
          }
        />
        <Indicator
          label="Classificação entre as redes municipais do estado"
          value={
            etapa.classificacao === null
              ? "—"
              : `${etapa.classificacao.posicao}º`
          }
          note={
            etapa.classificacao === null
              ? "classificação ainda não disponível"
              : `entre ${etapa.classificacao.total} redes municipais`
          }
        />
      </IndicatorPanel>
    </div>
  );
}

export function EducacaoAprendizadoSection({
  aprendizado,
  historico,
  initialEtapa,
  municipioUf,
}: EducacaoAprendizadoSectionProps) {
  return (
    <section aria-label="Aprendizado dos alunos" className="space-y-6">
      <SectionHeader
        title="Aprendizado dos alunos"
        description="Os alunos estão aprendendo? O IDEB é a nota oficial das escolas, de 0 a 10, e combina o que os alunos aprendem nas provas com quantos são aprovados. É medido de dois em dois anos, por isso mostramos o ano de cada nota."
      />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <EtapaPainel etapa={aprendizado.anosIniciais} />
        <EtapaPainel etapa={aprendizado.anosFinais} />
      </div>
      <EducacaoHistoricoSection
        historico={historico}
        initialEtapa={initialEtapa}
        municipioUf={municipioUf}
      />
    </section>
  );
}
