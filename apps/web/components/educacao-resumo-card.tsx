"use client";

import { AlertCircle, ArrowRight, ExternalLink, Info } from "lucide-react";
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
  destaque: "border-emerald-200 bg-emerald-50 text-emerald-700",
  atencao: "border-amber-200 bg-amber-50 text-amber-800",
  neutro: "border-slate-200 bg-slate-50 text-slate-700",
};

const CLASSES_FAIXA_POR_TOM: Record<EducacaoResumoTom, string> = {
  destaque: "border-emerald-300 bg-emerald-50 text-emerald-800",
  atencao: "border-amber-300 bg-amber-50 text-amber-900",
  neutro: "border-slate-200 bg-slate-50 text-slate-700",
};

const CLASSES_TEXTO_POR_TOM: Record<EducacaoResumoTom, string> = {
  destaque: "text-emerald-700",
  atencao: "text-amber-800",
  neutro: "text-subtleText",
};

const ICONE_VARIACAO_POR_TOM: Record<EducacaoResumoTom, string> = {
  destaque: "▲ ",
  atencao: "▼ ",
  neutro: "",
};

const CLASSE_ROTULO =
  "font-medium text-[11px] text-subtleText uppercase tracking-wider";
const CLASSE_VALOR_LINHA =
  "mt-1 flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1";
const CLASSE_APOIO = "mt-1 min-h-5 text-subtleText text-xs";

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
      className={`rounded-2xl border border-[#e7e9ee] bg-white p-4 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-base text-ink tracking-tight">
            Educação Básica e Desempenho Escolar
          </h3>
        </div>
        <a
          href={IDEB_INEP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#e7e9ee] bg-slate-50 px-3 py-1 font-medium text-subtleText text-xs transition-colors hover:bg-slate-100 hover:text-ink"
          title="Página oficial do IDEB no INEP"
        >
          <span>INEP / IDEB</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <p className="col-span-2 text-sm text-subtleText sm:col-span-1 sm:col-start-2">
        {resumo
          ? `IDEB ${resumo.ano} e indicadores da rede municipal.`
          : "IDEB e indicadores da rede municipal."}
      </p>

      {resumo ? (
        <>
          {resumo.enfaseTitulo && (
            <p
              data-tom={resumo.enfaseTom}
              className={`mt-3 rounded-lg border px-2.5 py-1.5 font-semibold text-xs sm:mt-4 sm:px-3 sm:py-2 sm:text-sm ${CLASSES_FAIXA_POR_TOM[resumo.enfaseTom]}`}
            >
              {resumo.enfaseTitulo}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 items-stretch gap-x-3 gap-y-3 sm:mt-4 sm:grid-cols-3 sm:gap-6">
            <div className="col-span-2 flex flex-col sm:col-span-1">
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

            <div className="col-span-2 flex flex-col sm:col-span-1">
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

            <div className="col-span-2 flex flex-col sm:col-span-1">
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
        <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-[#e7e9ee] border-dashed bg-slate-50/50 p-4 text-center sm:mt-4 sm:p-6">
          <AlertCircle className="mb-2 h-6 w-6 text-subtleText/60" />
          <p className="font-medium text-ink text-sm">
            Indicadores educacionais ainda não disponíveis para este município.
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-[#e7e9ee] border-t pt-3 sm:mt-4 sm:pt-4">
        <div className="hidden items-center gap-1.5 text-subtleText text-xs sm:flex">
          <Info className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span>Indicadores oficiais do IDEB apurados pelo INEP/MEC.</span>
        </div>
        <Info
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-slate-500 sm:hidden"
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
          className="inline-flex items-center gap-1 font-semibold text-accent text-xs hover:underline"
        >
          <span>Ver indicadores pedagógicos e despesas detalhadas</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </Link>
      </div>
    </section>
  );
}
