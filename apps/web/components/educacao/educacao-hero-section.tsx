import type {
  AlunosRedeView,
  AprendizadoEtapa,
  EducacaoExecucaoAnoView,
  MinimosLegaisView,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";
import { DestaqueIdeb, DestaqueMinimo } from "./educacao-destaques";
import { EducacaoIndicadoresApoio } from "./educacao-indicadores-apoio";
import { EducacaoMemoriaCalculo } from "./educacao-memoria-calculo";
import {
  FONTE_SIOPE,
  type LeiLinkProps,
  LinhaLeiEFonte,
} from "./educacao-textos";

export interface EducacaoHeroSectionProps {
  ano: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  minimosLegais: MinimosLegaisView;
  execucao: EducacaoExecucaoAnoView;
  valorPorAluno: ValorPorAlunoView;
  alunosRede: AlunosRedeView | null;
  aprendizado: AprendizadoEtapa;
}

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

        <div className="space-y-2">
          <LinhaLeiEFonte
            laws={[...leiDoMinimo(mde), ...leiDoMinimo(fundebProfissionais)]}
            source={FONTE_SIOPE}
          />
          <EducacaoMemoriaCalculo
            ano={ano}
            isCurrentYear={isCurrentYear}
            partialPeriod={partialPeriod}
            execucao={execucao}
          />
        </div>
      </section>
    </div>
  );
}
