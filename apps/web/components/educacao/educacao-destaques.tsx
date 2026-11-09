import { fmtPercent, ThresholdMeter } from "@transparencia/ui";
import { CheckCircle } from "lucide-react";
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

type MinimoKind = "mde" | "fundebProfissionais";

interface MinimoTexts {
  testId: string;
  titulo: string;
  rotuloAplicado: string;
  rotuloLimite: string;
  nomeAcessivel: string;
  descricao: (periodoTexto: string, limite: string | null) => string;
}

const MINIMO_TEXTS: Record<MinimoKind, MinimoTexts> = {
  mde: {
    testId: "destaque-minimo",
    titulo: "Aplicação mínima exigida em ensino",
    rotuloAplicado: "Aplicado",
    rotuloLimite: "Exigido por lei",
    nomeAcessivel: "Aplicado em ensino (MDE)",
    descricao: (periodoTexto, limite) =>
      `Receita de impostos aplicada em ensino ${periodoTexto}.${
        limite === null ? "" : ` A Constituição exige no mínimo ${limite}.`
      }`,
  },
  fundebProfissionais: {
    testId: "indicador-fundeb",
    titulo: "Fundeb para profissionais da educação",
    rotuloAplicado: "Destinado",
    rotuloLimite: "Mínimo legal",
    nomeAcessivel: "Parte do Fundeb paga aos profissionais da educação",
    descricao: (periodoTexto, limite) =>
      `Parte do Fundeb que vai para salários dos profissionais da educação ${periodoTexto}.${
        limite === null ? "" : ` A lei exige no mínimo ${limite}.`
      }`,
  },
};

/** Rótulos acima da barra: o valor medido à esquerda e a régua à direita. */
function BarLabels({
  esquerda,
  direita,
}: {
  esquerda: string;
  direita?: string;
}) {
  return (
    <p className="flex flex-wrap items-baseline justify-between gap-x-4 font-semibold text-sm tabular-nums">
      <span>{esquerda}</span>
      {direita && <span>{direita}</span>}
    </p>
  );
}

/** Mínimo constitucional: título, percentual, selo de cumprido, barra com o marcador e uma frase. */
export function DestaqueMinimo({
  view,
  kind = "mde",
}: {
  view: MinimosLegaisView;
  kind?: MinimoKind;
}) {
  const minimo = view[kind];
  const { ano, parcial, periodo } = view;
  const textos = MINIMO_TEXTS[kind];
  const { percentualAplicado, limite, resultado } = minimo;
  const periodoTexto =
    parcial && periodo !== null
      ? `até o ${periodo}º bimestre de ${ano}`
      : `em ${ano}`;
  const abaixo = resultado === "abaixo";

  return (
    <div className="space-y-3" data-testid={textos.testId}>
      <p className="eyebrow">{textos.titulo}</p>
      <p className="flex flex-wrap items-baseline gap-x-4">
        <span
          className={`stat-value-lg ${abaixo ? "text-warn-text" : "text-brand-text"}`}
        >
          {percentualAplicado === null ? "—" : fmtPercent(percentualAplicado)}
        </span>
        {resultado === "cumpriu" && (
          <span className="inline-flex items-center gap-1 font-semibold text-ok-text">
            <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Cumprido
          </span>
        )}
      </p>
      {percentualAplicado === null ? (
        <p className="caption">{motivoSemPercentual(view)}</p>
      ) : (
        <>
          {limite !== null && (
            <div className="space-y-2">
              <BarLabels
                esquerda={`${textos.rotuloAplicado}: ${fmtPercent(percentualAplicado)}`}
                direita={`${textos.rotuloLimite}: ${formatarLimite(limite)}`}
              />
              <ThresholdMeter
                value={percentualAplicado}
                threshold={limite}
                tone={abaixo ? "warn" : "brand"}
                label={textos.nomeAcessivel}
                valueText={`${fmtPercent(percentualAplicado)} ${textos.rotuloAplicado.toLowerCase()}; mínimo de ${formatarLimite(limite)}${resultado === "cumpriu" ? "; cumpriu o mínimo" : ""}`}
              />
            </div>
          )}
          <p className="caption space-y-0.5">
            <span className="block">
              {textos.descricao(
                periodoTexto,
                limite === null ? null : formatarLimite(limite),
              )}
            </span>
            <Veredito minimo={minimo} ocultarCumpriu />
          </p>
        </>
      )}
    </div>
  );
}

/** IDEB de uma etapa: nota grande, variação e barra com a média estadual e a média nacional. */
export function DestaqueIdeb({ etapa }: { etapa: AprendizadoEtapa }) {
  const {
    notaIdeb,
    anoApuracao,
    mediaEstadual,
    mediaNacional,
    notaAnterior,
    anoAnterior,
  } = etapa;
  const temNota = notaIdeb !== null && anoApuracao !== null;

  const cicloAnterior = (() => {
    if (notaAnterior === null || anoAnterior === null) {
      return "Sem nota anterior";
    }
    const pontos = etapa.variacaoPontos;
    if (pontos === null || pontos === 0) {
      return `Igual a ${anoAnterior}`;
    }
    const notaMudou = `A nota ${descreverVariacaoPontos(pontos)} desde ${anoAnterior}`;
    const mediaMudou = etapa.variacaoMediaEstadual;
    if (mediaMudou === null) return `${notaMudou}.`;
    return `${notaMudou}; a média estadual ${descreverVariacaoPontos(mediaMudou)}.`;
  })();

  return (
    <div
      className="space-y-3"
      data-testid={`destaque-ideb-${etapa.etapaEnsino}`}
    >
      <p className="eyebrow">
        IDEB{anoApuracao === null ? "" : ` ${anoApuracao}`} · {etapa.titulo}
      </p>
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
          <ThresholdMeter
            value={notaIdeb}
            max={10}
            threshold={mediaEstadual ?? undefined}
            secondaryThreshold={mediaNacional ?? undefined}
            label={`Nota do IDEB, ${etapa.titulo}`}
            valueText={`${formatarNota(notaIdeb)} de 10${mediaEstadual === null ? "" : `; ${etapa.mediaEstadualLabel} ${formatarNota(mediaEstadual)}`}${mediaNacional === null ? "" : `; ${etapa.mediaNacionalLabel} ${formatarNota(mediaNacional)}`}`}
          />
          <p className="caption space-y-0.5">
            {mediaEstadual !== null && (
              <span className="flex items-center gap-x-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-0.5 bg-ink"
                />
                {etapa.mediaEstadualLabel}: {formatarNota(mediaEstadual)}
              </span>
            )}
            {mediaNacional !== null && (
              <span className="flex items-center gap-x-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-0.5 bg-warn-fill"
                />
                {etapa.mediaNacionalLabel}: {formatarNota(mediaNacional)}
              </span>
            )}
            <span className="block">{cicloAnterior}</span>
          </p>
        </>
      ) : (
        <p className="caption">Sem nota apurada</p>
      )}
    </div>
  );
}
