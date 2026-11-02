import type { EtapaEnsino } from "@transparencia/db";
import { Indicator, IndicatorPanel, SectionHeader } from "@transparencia/ui";
import { ArrowDown, ArrowUp, CheckCircle } from "lucide-react";
import type {
  AprendizadoEtapa,
  EducacaoViewModel,
} from "@/app/[portalSlug]/educacao/view-model";
import { EducacaoHistoricoSection } from "./educacao-historico-section";

export interface EducacaoAprendizadoSectionProps {
  aprendizado: EducacaoViewModel["aprendizado"];
  historico: EducacaoViewModel["historico"];
  initialEtapa: EtapaEnsino;
}

const formatarNota = (nota: number) =>
  nota.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const pluralizar = (quantidade: number, singular: string, plural: string) =>
  Math.abs(quantidade) === 1 ? singular : plural;

/** Texto com palavra e sinal ("subiu 1,4 ponto"), nunca só cor. */
function descreverVariacaoPontos(pontos: number): string {
  const magnitude = formatarNota(Math.abs(pontos));
  const unidade = pluralizar(pontos, "ponto", "pontos");
  if (pontos > 0) return `subiu ${magnitude} ${unidade}`;
  if (pontos < 0) return `caiu ${magnitude} ${unidade}`;
  return "ficou igual";
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

/** Seta e quantidade ao lado do valor: verde sobe, vermelho desce, nada se não mudou. */
function VariacaoAoLado({
  variacao,
  texto,
}: {
  variacao: number | null;
  texto: string;
}) {
  if (variacao === null || variacao === 0) return null;
  const subiu = variacao > 0;
  const Seta = subiu ? ArrowUp : ArrowDown;
  return (
    <span
      aria-hidden="true"
      className={`ml-2 inline-flex items-center gap-1 font-semibold text-base ${
        subiu ? "text-ok-text" : "text-danger-text"
      }`}
    >
      <Seta className="h-4 w-4" />
      {texto}
    </span>
  );
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
          value={
            etapa.notaIdeb === null ? (
              "—"
            ) : (
              <>
                {formatarNota(etapa.notaIdeb)}
                <VariacaoAoLado
                  variacao={etapa.variacaoPontos}
                  texto={formatarNota(Math.abs(etapa.variacaoPontos ?? 0))}
                />
              </>
            )
          }
          note={
            etapa.anoApuracao === null ? (
              "sem nota apurada"
            ) : (
              <>
                <span className="block">apurada em {etapa.anoApuracao}</span>
                <span className="block">{descreverCicloAnterior(etapa)}</span>
              </>
            )
          }
        />
        <Indicator
          label="Classificação entre as redes municipais do estado"
          value={
            etapa.classificacao === null ? (
              "—"
            ) : (
              <>
                {`${etapa.classificacao.posicao}º`}
                <VariacaoAoLado
                  variacao={etapa.classificacao.variacaoPosicoes}
                  texto={String(
                    Math.abs(etapa.classificacao.variacaoPosicoes ?? 0),
                  )}
                />
              </>
            )
          }
          note={
            etapa.classificacao === null ? (
              "classificação ainda não disponível"
            ) : (
              <>
                <span className="block">
                  entre {etapa.classificacao.total} redes municipais
                </span>
                <span className="block">
                  {descreverClassificacao(
                    etapa.classificacao,
                    etapa.anoAnterior !== null,
                  )}
                </span>
              </>
            )
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
      </IndicatorPanel>
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
