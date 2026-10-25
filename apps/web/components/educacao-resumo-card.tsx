"use client";

import { ExternalLinkPill } from "@transparencia/ui";
import { AlertCircle, ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";

export type EducacaoResumoTom = "destaque" | "atencao" | "neutro";

export interface EducacaoResumoCardData {
  ano: number;
  notaIdebTexto: string;
  enfaseTom: EducacaoResumoTom;
  enfaseTitulo: string | null;
  evolucaoTexto: string | null;
  evolucaoTom: EducacaoResumoTom;
  notaAnteriorTexto: string | null;
  metaTexto: string | null;
  metaTom: EducacaoResumoTom;
  rankingTexto: string | null;
  rankingVariacaoTexto: string | null;
  rankingVariacaoTom: EducacaoResumoTom;
  exercicioDespesa: number;
  despesaLiquidadaEducacaoTexto: string | null;
  despesaLiquidadaEducacaoCompleta: string | null;
}

export interface EducacaoResumoCardProps {
  resumo?: EducacaoResumoCardData | null;
  detailUrl: string;
  className?: string;
}

const IDEB_INEP_URL =
  "https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/ideb";

const CLASSES_BADGE_POR_TOM: Record<EducacaoResumoTom, string> = {
  destaque: "border-ok/40 bg-ok/10 text-ok",
  atencao: "border-warn/40 bg-warn/10 text-warn",
  neutro: "border-line bg-line2/40 text-mute2",
};

const CLASSES_FAIXA_POR_TOM: Record<EducacaoResumoTom, string> = {
  destaque: "border-ok/40 bg-ok/10 text-ok",
  atencao: "border-warn/40 bg-warn/10 text-warn",
  neutro: "border-line bg-line2/40 text-mute2",
};

const CLASSES_TEXTO_POR_TOM: Record<EducacaoResumoTom, string> = {
  destaque: "text-ok",
  atencao: "text-warn",
  neutro: "text-mute2",
};

const ICONE_VARIACAO_POR_TOM: Record<EducacaoResumoTom, string> = {
  destaque: "▲ ",
  atencao: "▼ ",
  neutro: "",
};

const CLASSE_ROTULO =
  "font-medium text-[11px] text-mute2 uppercase tracking-wider";
const CLASSE_VALOR_LINHA =
  "mt-1 flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1";
const CLASSE_APOIO = "mt-1 min-h-5 text-mute2 text-xs";

function trackCta(
  from: string,
  detailUrl: string,
  extra: Record<string, unknown>,
) {
  try {
    posthog.capture("educacao_card_cta_clicked", { detailUrl, ...extra });
    posthog.capture("funnel_home_to_internal_page", { from, to: detailUrl });
  } catch {
    // Silencia erros de telemetria
  }
}

export function EducacaoResumoCard({
  resumo,
  detailUrl,
  className = "",
}: EducacaoResumoCardProps) {
  return (
    <section
      aria-label="Educação Básica e Desempenho Escolar"
      className={`border-line border-t py-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-base text-ink tracking-tight">
            Educação Básica e Desempenho Escolar
          </h3>
        </div>
        <ExternalLinkPill
          href={IDEB_INEP_URL}
          title="Página oficial do IDEB no INEP"
        >
          INEP / IDEB
        </ExternalLinkPill>
      </div>

      <p className="col-span-2 text-mute2 text-sm sm:col-span-1 sm:col-start-2">
        {resumo
          ? `IDEB ${resumo.ano} e indicadores da rede municipal.`
          : "IDEB e indicadores da rede municipal."}
      </p>

      {resumo ? (
        <>
          {resumo.enfaseTitulo && (
            <p
              data-tom={resumo.enfaseTom}
              className={`mt-3 rounded-md border px-2.5 py-1.5 font-semibold text-xs sm:mt-4 sm:px-3 sm:py-2 sm:text-sm ${CLASSES_FAIXA_POR_TOM[resumo.enfaseTom]}`}
            >
              {resumo.enfaseTitulo}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 items-stretch gap-x-3 gap-y-3 sm:mt-4 sm:grid-cols-3 sm:gap-y-0 sm:divide-x sm:divide-line">
            <div className="col-span-2 flex flex-col sm:col-span-1 sm:px-6 sm:last:pr-0 sm:first:pl-0">
              <span className={CLASSE_ROTULO}>Nota do IDEB (1º ao 5º ano)</span>
              <div className={CLASSE_VALOR_LINHA}>
                <p className="font-bold font-serif text-3xl text-ink leading-none tracking-tight">
                  {resumo.notaIdebTexto}
                </p>
                {resumo.evolucaoTexto && (
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-xs ${CLASSES_BADGE_POR_TOM[resumo.evolucaoTom]}`}
                  >
                    {resumo.evolucaoTexto}
                  </span>
                )}
              </div>
              {resumo.notaAnteriorTexto && (
                <p className={CLASSE_APOIO}>{resumo.notaAnteriorTexto}</p>
              )}
            </div>

            <div className="col-span-2 flex flex-col sm:col-span-1 sm:px-6 sm:last:pr-0 sm:first:pl-0">
              <span className={CLASSE_ROTULO}>Classificação estadual</span>
              <div className={CLASSE_VALOR_LINHA}>
                <p className="font-bold text-ink text-lg leading-tight tracking-tight">
                  {resumo.rankingTexto ?? "—"}
                </p>
              </div>
              <div
                className={`${CLASSE_APOIO} flex flex-wrap items-center gap-1.5`}
              >
                {resumo.rankingTexto ? (
                  resumo.rankingVariacaoTexto && (
                    <span
                      data-tom={resumo.rankingVariacaoTom}
                      className={`font-medium ${CLASSES_TEXTO_POR_TOM[resumo.rankingVariacaoTom]}`}
                    >
                      {ICONE_VARIACAO_POR_TOM[resumo.rankingVariacaoTom]}
                      {resumo.rankingVariacaoTexto}
                    </span>
                  )
                ) : (
                  <span>Classificação indisponível neste ciclo</span>
                )}
                {resumo.metaTexto && (
                  <span
                    className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-medium text-[11px] ${CLASSES_BADGE_POR_TOM[resumo.metaTom]}`}
                  >
                    {resumo.metaTexto}
                  </span>
                )}
              </div>
            </div>

            <div className="col-span-2 flex flex-col sm:col-span-1 sm:px-6 sm:last:pr-0 sm:first:pl-0">
              <span className={CLASSE_ROTULO}>
                Despesa liquidada em Educação
              </span>
              <div className={CLASSE_VALOR_LINHA}>
                <p
                  className="font-bold text-ink text-lg leading-tight tracking-tight"
                  title={resumo.despesaLiquidadaEducacaoCompleta ?? undefined}
                >
                  {resumo.despesaLiquidadaEducacaoTexto ?? "—"}
                </p>
              </div>
              <p className={CLASSE_APOIO}>
                Exercício {resumo.exercicioDespesa}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-3 flex flex-col items-center justify-center border-line border-y p-4 text-center sm:mt-4 sm:p-6">
          <AlertCircle className="mb-2 h-6 w-6 text-mute3" />
          <p className="font-medium text-ink text-sm">
            Indicadores educacionais ainda não disponíveis para este município.
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-line border-t pt-3 sm:mt-4 sm:pt-4">
        <div className="hidden items-center gap-1.5 text-mute2 text-xs sm:flex">
          <Info className="h-3.5 w-3.5 shrink-0 text-mute2" />
          <span>Indicadores oficiais do IDEB apurados pelo INEP/MEC.</span>
        </div>
        <Info
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-mute2 sm:hidden"
        />
        <Link
          href={detailUrl}
          onClick={() =>
            trackCta(
              resumo
                ? "educacao_resumo_card_footer"
                : "educacao_resumo_card_empty_state",
              detailUrl,
              { ano: resumo?.ano ?? null },
            )
          }
          className="inline-flex items-center gap-1 font-semibold text-brand text-xs hover:underline"
        >
          <span>Ver indicadores pedagógicos e despesas detalhadas</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </Link>
      </div>
    </section>
  );
}
