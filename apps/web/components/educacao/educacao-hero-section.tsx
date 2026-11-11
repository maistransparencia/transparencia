import type {
  AlunosRedeView,
  AprendizadoEtapa,
  EducacaoExecucaoAnoView,
  MinimosLegaisView,
  ValorPorAlunoView,
} from "@/app/[portalSlug]/educacao/view-model";
import {
  LeiLink,
  type LeiLinkProps,
  LinhaLeiEFonte,
} from "@/components/lei-e-fonte";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import { DestaqueIdeb, DestaqueMinimo } from "./educacao-destaques";
import {
  EducacaoEmendasResumo,
  type EducacaoEmendasResumoProps,
} from "./educacao-emendas-resumo";
import { EducacaoIndicadoresApoio } from "./educacao-indicadores-apoio";
import { EducacaoMemoriaCalculo } from "./educacao-memoria-calculo";
import { FONTE_SIOPE } from "./educacao-textos";

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
  aprendizado: { anosIniciais: AprendizadoEtapa; anosFinais: AprendizadoEtapa };
  /** Resumo das emendas no topo; `null` quando o município não tem emendas na educação. */
  emendasResumo?: EducacaoEmendasResumoProps["emendas"] | null;
}

const leiDoMinimo = (minimo: MinimosLegaisView["mde"]): LeiLinkProps[] =>
  minimo.baseLegal && minimo.urlBaseLegal
    ? [{ label: minimo.baseLegal, url: minimo.urlBaseLegal }]
    : [];

/** Topo: os dois mínimos constitucionais, valor por aluno e alunos, o IDEB das duas etapas e a lei com a fonte à vista. */
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
  emendasResumo = null,
}: EducacaoHeroSectionProps) {
  const { mde, fundebProfissionais } = minimosLegais;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1>Educação: quanto a Prefeitura investe e se as crianças aprendem</h1>
        {isCurrentYear && (
          <p
            role="note"
            className="caption border-brand-fill border-l-[3px] pl-3"
          >
            <strong className="text-ink font-semibold">
              Ano em andamento:
            </strong>{" "}
            os números são parciais e não dá para compará-los com anos já
            fechados.
          </p>
        )}
      </div>

      <section
        aria-label={`Mínimos constitucionais da educação em ${ano}`}
        data-testid="educacao-resumo-destaque"
        className="space-y-4"
      >
        <p className="eyebrow">
          Dados de {ano}
          {isCurrentYear && partialPeriod ? ` (parcial, ${partialPeriod})` : ""}
        </p>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <DestaqueMinimo view={minimosLegais} kind="mde" />
          <DestaqueMinimo view={minimosLegais} kind="fundebProfissionais" />
        </div>
      </section>

      <EducacaoIndicadoresApoio
        valorPorAluno={valorPorAluno}
        alunosRede={alunosRede}
      />

      <section
        aria-label="Nota do IDEB"
        className="grid grid-cols-1 gap-8 md:grid-cols-2"
      >
        <DestaqueIdeb etapa={aprendizado.anosIniciais} />
        <DestaqueIdeb etapa={aprendizado.anosFinais} />
      </section>

      <LinhaLeiEFonte
        laws={[...leiDoMinimo(mde), ...leiDoMinimo(fundebProfissionais)]}
        source={<LeiLink label={FONTE_SIOPE} url={FONTES_OFICIAIS.siope.url} />}
      />

      <EducacaoMemoriaCalculo
        ano={ano}
        isCurrentYear={isCurrentYear}
        partialPeriod={partialPeriod}
        execucao={execucao}
        portalUrl={portalUrl}
      />

      {emendasResumo && (
        <EducacaoEmendasResumo
          emendas={emendasResumo}
          hrefSecaoCompleta="#emendas-educacao"
          portalUrl={portalUrl}
        />
      )}
    </div>
  );
}
