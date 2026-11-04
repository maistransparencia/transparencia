import type {
  AlunosRedeView,
  AprendizadoEtapa,
  EducacaoExecucaoAnoView,
  MinimosLegaisView,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { DestaqueIdeb, DestaqueMinimo } from "./educacao-destaques";
import { EducacaoIndicadoresApoio } from "./educacao-indicadores-apoio";
import { EducacaoMemoriaCalculo } from "./educacao-memoria-calculo";
import {
  FONTE_SIOPE,
  LeiLink,
  type LeiLinkProps,
  LinhaLeiEFonte,
} from "./educacao-textos";

export interface EducacaoHeroSectionProps {
  ano: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  minimosLegais: MinimosLegaisView;
  execucao: EducacaoExecucaoAnoView;
  /** Portal de transparência oficial da Prefeitura (do banco); sem ele a fonte fica sem link. */
  portalUrl: string | null;
  valorPorAluno: ValorPorAlunoView;
  alunosRede: AlunosRedeView | null;
  aprendizado: AprendizadoEtapa;
}

const FONTE_EXECUCAO = "execução orçamentária da Prefeitura, função Educação";

const leiDoMinimo = (minimo: MinimosLegaisView["mde"]): LeiLinkProps[] =>
  minimo.baseLegal && minimo.urlBaseLegal
    ? [{ label: minimo.baseLegal, url: minimo.urlBaseLegal }]
    : [];

/** Topo: dois destaques (mínimo e IDEB), indicadores de apoio e a lei com a fonte à vista. */
export function EducacaoHeroSection({
  ano,
  isCurrentYear,
  partialPeriod,
  minimosLegais,
  execucao,
  portalUrl,
  valorPorAluno,
  alunosRede,
  aprendizado,
}: EducacaoHeroSectionProps) {
  const { mde, fundebProfissionais } = minimosLegais;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <p className="eyebrow text-brand-text!">
          EDUCAÇÃO · EXERCÍCIO {ano}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </p>
        <h1>Educação em {ano}</h1>
        <p className="lead">
          Quanto a Prefeitura aplicou em ensino, quanto investe por aluno e se
          as crianças estão aprendendo.
        </p>
        {isCurrentYear && (
          <p
            role="note"
            className="caption border-brand-fill border-l-[3px] pl-3"
          >
            <strong className="font-semibold text-ink">
              Ano em andamento:
            </strong>{" "}
            os números são parciais e não dá para compará-los com anos já
            fechados.
          </p>
        )}
      </div>

      <section
        aria-label="Destaques da educação"
        data-testid="educacao-resumo-destaque"
        className="space-y-8"
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <DestaqueMinimo view={minimosLegais} />
          <DestaqueIdeb etapa={aprendizado} />
        </div>

        <EducacaoIndicadoresApoio
          minimosLegais={minimosLegais}
          valorPorAluno={valorPorAluno}
          alunosRede={alunosRede}
        />

        <EducacaoMemoriaCalculo
          ano={ano}
          isCurrentYear={isCurrentYear}
          partialPeriod={partialPeriod}
          execucao={execucao}
        />

        <LinhaLeiEFonte
          laws={[
            ...leiDoMinimo(mde),
            ...leiDoMinimo(fundebProfissionais),
            { label: "Lei 4.320/1964", url: urlLegislacao("lei4320") },
          ]}
          source={
            <>
              <LeiLink label={FONTE_SIOPE} url={FONTES_OFICIAIS.siope.url} />
              {" e "}
              {portalUrl ? (
                <LeiLink label={FONTE_EXECUCAO} url={portalUrl} />
              ) : (
                FONTE_EXECUCAO
              )}
            </>
          }
        />
      </section>
    </div>
  );
}
