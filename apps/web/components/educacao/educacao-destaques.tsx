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

type QualMinimo = "mde" | "fundebProfissionais";

interface TextosDoMinimo {
  testId: string;
  titulo: string;
  rotuloAplicado: string;
  rotuloLimite: string;
  nomeAcessivel: string;
  descricao: (periodoTexto: string, limite: string | null) => string;
}

const TEXTOS_DO_MINIMO: Record<QualMinimo, TextosDoMinimo> = {
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
    descricao: (_periodoTexto, limite) =>
      `Do Fundeb, vai para salários dos profissionais da educação.${
        limite === null ? "" : ` A lei exige no mínimo ${limite}.`
      }`,
  },
};

/** Rótulos acima da barra: o valor medido à esquerda e a régua à direita. */
function RotulosDaBarra({
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
  qual = "mde",
}: {
  view: MinimosLegaisView;
  qual?: QualMinimo;
}) {
  const minimo = view[qual];
  const { ano, parcial, periodo } = view;
  const textos = TEXTOS_DO_MINIMO[qual];
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
              <RotulosDaBarra
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

/** IDEB de uma etapa: nota grande, variação, barra com a média estadual e a meta do MEC. */
export function DestaqueIdeb({ etapa }: { etapa: AprendizadoEtapa }) {
  const {
    notaIdeb,
    anoApuracao,
    metaIdeb,
    mediaEstadual,
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
    const variacao = descreverVariacaoPontos(pontos);
    return `${variacao.charAt(0).toUpperCase()}${variacao.slice(1)} desde ${anoAnterior}`;
  })();

  return (
    <div
      className="space-y-3"
      data-testid={`destaque-ideb-${etapa.etapaEnsino}`}
    >
      <p className="eyebrow">IDEB · {etapa.titulo}</p>
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
          <div className="space-y-2">
            <RotulosDaBarra
              esquerda={`Nota: ${formatarNota(notaIdeb)}`}
              direita={
                mediaEstadual === null
                  ? undefined
                  : `${etapa.mediaEstadualLabel}: ${formatarNota(mediaEstadual)}`
              }
            />
            <ThresholdMeter
              value={notaIdeb}
              max={10}
              threshold={mediaEstadual ?? undefined}
              label={`Nota do IDEB, ${etapa.titulo}`}
              valueText={`${formatarNota(notaIdeb)} de 10${mediaEstadual === null ? "" : `; ${etapa.mediaEstadualLabel} ${formatarNota(mediaEstadual)}`}`}
            />
          </div>
          <p className="caption space-y-0.5">
            {metaIdeb !== null && (
              <span className="block">
                Meta em {anoApuracao}: {formatarNota(metaIdeb)}.
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
