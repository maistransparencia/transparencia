import { fmtPercent, ThresholdMeter } from "@transparencia/ui";
import type {
  EducacaoExecucaoAnoView,
  MinimosLegaisView,
} from "@/app/[portalSlug]/educacao/view-model";
import { EducacaoMemoriaCalculo } from "./educacao-memoria-calculo";
import {
  descreverPeriodo,
  FONTE_SIOPE,
  type LeiLinkProps,
  LinhaDl,
  LinhaLeiEFonte,
  NOTA_MINIMO_GASTO,
  Veredito,
} from "./educacao-textos";

export interface EducacaoHeroSectionProps {
  ano: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  minimosLegais: MinimosLegaisView;
  execucao: EducacaoExecucaoAnoView;
}

type MinimoLegal = MinimosLegaisView["mde"];

const formatarLimite = (limite: number) =>
  `${limite.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

const motivoSemPercentual = (view: MinimosLegaisView) =>
  view.semDadoSiope
    ? `sem dado publicado para ${view.ano}`
    : `a Prefeitura não informou o percentual de ${view.ano} ao governo federal`;

const leiDoMinimo = (minimo: MinimoLegal): LeiLinkProps[] =>
  minimo.baseLegal && minimo.urlBaseLegal
    ? [{ label: minimo.baseLegal, url: minimo.urlBaseLegal }]
    : [];

function BarraDoMinimo({
  minimo,
  nome,
  descricaoDoValor,
}: {
  minimo: MinimoLegal;
  nome: string;
  descricaoDoValor: string;
}) {
  if (minimo.percentualAplicado === null || minimo.limite === null) return null;
  return (
    <ThresholdMeter
      value={minimo.percentualAplicado}
      threshold={minimo.limite}
      thresholdLabel={`mínimo ${formatarLimite(minimo.limite)}`}
      label={nome}
      valueText={`${fmtPercent(minimo.percentualAplicado)} ${descricaoDoValor}; mínimo de ${fmtPercent(minimo.limite)}`}
    />
  );
}

/** Topo da página: a pergunta do cidadão, o número, a barra com o mínimo e a lei à vista. */
export function EducacaoHeroSection({
  ano,
  isCurrentYear,
  partialPeriod,
  minimosLegais,
  execucao,
}: EducacaoHeroSectionProps) {
  const { mde, fundebProfissionais } = minimosLegais;
  const leis = [...leiDoMinimo(mde), ...leiDoMinimo(fundebProfissionais)];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <p className="eyebrow text-brand-text!">
          EDUCAÇÃO · EXERCÍCIO {ano}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </p>
        <h1>Educação em {ano}</h1>
        <p className="lead">
          O que a Prefeitura aplicou em ensino, quanto investe por aluno e se as
          crianças estão aprendendo. Mais abaixo, de onde vem o dinheiro, quem o
          recebe e como mudou ao longo dos anos.
        </p>
      </div>

      <section
        aria-label="Mínimo exigido em educação"
        data-testid="educacao-resumo-destaque"
        className="space-y-2"
      >
        <p className="eyebrow">
          A Prefeitura aplica o mínimo exigido em educação?
        </p>
        <p className="stat-value-lg text-brand-text">
          {mde.percentualAplicado === null
            ? "—"
            : fmtPercent(mde.percentualAplicado)}
        </p>
        <p className="caption">
          {mde.percentualAplicado === null ? (
            motivoSemPercentual(minimosLegais)
          ) : (
            <>
              da receita de impostos e transferências foi aplicada em ensino{" "}
              {descreverPeriodo(minimosLegais)}.
              {mde.limite !== null && ` O mínimo é ${fmtPercent(mde.limite)}.`}{" "}
              <Veredito minimo={mde} /> {NOTA_MINIMO_GASTO}
            </>
          )}
        </p>

        <BarraDoMinimo
          minimo={mde}
          nome="Aplicado em ensino (MDE)"
          descricaoDoValor="aplicado em ensino"
        />

        <dl>
          <LinhaDl label="Mínimo exigido em ensino (MDE)">
            {mde.limite === null ? "—" : fmtPercent(mde.limite)}
          </LinhaDl>
          <LinhaDl label="Fundeb pago aos profissionais da educação">
            {fundebProfissionais.percentualAplicado === null
              ? "—"
              : fmtPercent(fundebProfissionais.percentualAplicado)}
          </LinhaDl>
        </dl>
        {fundebProfissionais.percentualAplicado === null ? (
          mde.percentualAplicado !== null && (
            <p className="caption">
              Fundeb: {motivoSemPercentual(minimosLegais)}
            </p>
          )
        ) : (
          <>
            <p className="caption">
              {fundebProfissionais.limite !== null &&
                `Mínimo de ${fmtPercent(fundebProfissionais.limite)} dos recursos do Fundeb. `}
              <Veredito minimo={fundebProfissionais} />
            </p>
            <BarraDoMinimo
              minimo={fundebProfissionais}
              nome="Fundeb pago aos profissionais da educação"
              descricaoDoValor="dos recursos do Fundeb pagos aos profissionais"
            />
          </>
        )}

        <LinhaLeiEFonte
          laws={leis}
          source={FONTE_SIOPE}
          extra={
            <EducacaoMemoriaCalculo
              ano={ano}
              isCurrentYear={isCurrentYear}
              partialPeriod={partialPeriod}
              execucao={execucao}
            />
          }
        />
      </section>
    </div>
  );
}
