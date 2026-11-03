import { fmtPercent, ThresholdMeter } from "@transparencia/ui";
import type {
  AprendizadoEtapa,
  MinimosLegaisView,
} from "@/app/[portalSlug]/educacao/view-model";
import {
  descreverVariacaoPontos,
  formatarLimite,
  formatarNota,
  motivoSemPercentual,
  VariacaoAoLado,
  Veredito,
} from "./educacao-textos";

/** Destaque 1: a pergunta do mínimo, o percentual grande e a barra com o marcador. */
export function DestaqueMinimo({ view }: { view: MinimosLegaisView }) {
  const { mde, ano, parcial, periodo } = view;
  const periodoTexto =
    parcial && periodo !== null
      ? `até o ${periodo}º bimestre de ${ano}`
      : `em ${ano}`;

  return (
    <div className="space-y-2" data-testid="destaque-minimo">
      <p className="eyebrow">
        A Prefeitura aplica o mínimo exigido em educação?
      </p>
      <p className="stat-value-lg text-brand-text">
        {mde.percentualAplicado === null
          ? "—"
          : fmtPercent(mde.percentualAplicado)}
      </p>
      {mde.percentualAplicado === null ? (
        <p className="caption">{motivoSemPercentual(view)}</p>
      ) : (
        <>
          <p className="caption space-y-0.5">
            <span className="block">
              da receita de impostos e transferências foi aplicada em ensino{" "}
              {periodoTexto}.
            </span>
            {mde.limite !== null && (
              <span className="block">
                A lei exige aplicar pelo menos {fmtPercent(mde.limite)}.
              </span>
            )}
            <Veredito minimo={mde} ocultarCumpriu />
          </p>
          {mde.limite !== null && (
            <ThresholdMeter
              value={mde.percentualAplicado}
              threshold={mde.limite}
              thresholdLabel={`mínimo ${formatarLimite(mde.limite)}`}
              label="Aplicado em ensino (MDE)"
              valueText={`${fmtPercent(mde.percentualAplicado)} aplicado em ensino; mínimo de ${fmtPercent(mde.limite)}${mde.resultado === "cumpriu" ? "; cumpriu o mínimo" : ""}`}
            />
          )}
        </>
      )}
    </div>
  );
}

/** Destaque 2: o IDEB dos anos iniciais com a faixa, a variação e a barra com a meta. */
export function DestaqueIdeb({ etapa }: { etapa: AprendizadoEtapa }) {
  const { notaIdeb, anoApuracao, metaIdeb, notaAnterior, anoAnterior } = etapa;
  const temNota = notaIdeb !== null && anoApuracao !== null;

  const cicloAnterior = (() => {
    if (notaAnterior === null || anoAnterior === null) {
      return "sem ciclo anterior para comparar";
    }
    const pontos = etapa.variacaoPontos;
    if (pontos === null || pontos === 0) {
      return `ciclo anterior: ${formatarNota(notaAnterior)} em ${anoAnterior}`;
    }
    return `${descreverVariacaoPontos(pontos)} em relação a ${anoAnterior}`;
  })();

  return (
    <div className="space-y-2" data-testid="destaque-ideb">
      <p className="eyebrow">As crianças estão aprendendo?</p>
      <p className="stat-value-lg text-brand-text">
        {temNota ? (
          <>
            {formatarNota(notaIdeb)}
            <VariacaoAoLado
              variacao={etapa.variacaoPontos}
              texto={formatarNota(Math.abs(etapa.variacaoPontos ?? 0))}
            />
          </>
        ) : (
          "—"
        )}
      </p>
      {temNota ? (
        <>
          <p className="caption space-y-0.5">
            <span className="block">
              IDEB · {etapa.titulo}, {anoApuracao}
            </span>
            <span className="block">{cicloAnterior}</span>
          </p>
          {metaIdeb !== null && (
            <ThresholdMeter
              value={notaIdeb}
              max={10}
              threshold={metaIdeb}
              thresholdLabel={`meta ${formatarNota(metaIdeb)}`}
              label={`Nota do IDEB, ${etapa.titulo}`}
              valueText={`${formatarNota(notaIdeb)} de 10; meta do MEC ${formatarNota(metaIdeb)}`}
            />
          )}
        </>
      ) : (
        <p className="caption">sem nota do IDEB apurada</p>
      )}
    </div>
  );
}
