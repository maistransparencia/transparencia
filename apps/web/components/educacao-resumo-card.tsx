"use client";

import { AlertCircle, ArrowRight } from "lucide-react";
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
  etapas: { rotulo: string; notaTexto: string }[];
  rankingTexto: string | null;
  rankingVariacaoTexto: string | null;
  rankingVariacaoTom: EducacaoResumoTom;
  despesaLiquidadaEducacaoTexto: string | null;
  despesaLiquidadaEducacaoCompleta: string | null;
}

export interface EducacaoResumoCardProps {
  resumo?: EducacaoResumoCardData | null;
  detailUrl: string;
  className?: string;
}

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

const CLASSES_BORDA_POR_TOM: Record<EducacaoResumoTom, string> = {
  destaque: "border-emerald-300 ring-1 ring-emerald-100",
  atencao: "border-amber-300 ring-1 ring-amber-100",
  neutro: "border-[#e7e9ee]",
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
const CLASSE_VALOR_LINHA = "mt-1 flex min-h-9 flex-wrap items-center gap-2";
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
  const classeBorda = resumo
    ? CLASSES_BORDA_POR_TOM[resumo.enfaseTom]
    : CLASSES_BORDA_POR_TOM.neutro;

  return (
    <section
      aria-label="Educação Básica e Desempenho Escolar"
      className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-6 ${classeBorda} ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-base text-ink tracking-tight">
            Educação Básica e Desempenho Escolar
          </h3>
          <p className="text-subtleText text-xs">
            {resumo
              ? `IDEB ${resumo.ano} e indicadores da rede municipal`
              : "IDEB e indicadores da rede municipal"}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full border border-[#e7e9ee] bg-slate-50 px-2 py-0.5 font-medium text-[10px] text-subtleText sm:px-3 sm:py-1 sm:text-xs">
          INEP / Censo Escolar
        </span>
      </div>

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
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:mt-4 sm:grid-cols-3 sm:gap-6">
            <div className="col-span-2 flex flex-col sm:col-span-1">
              <span className={CLASSE_ROTULO}>Nota do IDEB</span>
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
              <p className={CLASSE_APOIO}>{resumo.notaAnteriorTexto}</p>
            </div>

            <div className="flex flex-col">
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

            <div className="flex flex-col">
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
              <p className={CLASSE_APOIO}>Função 12 · exercício {resumo.ano}</p>
            </div>
          </div>
          {resumo.etapas.length > 0 && (
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs sm:flex sm:flex-wrap sm:gap-x-8">
              {resumo.etapas.map((etapa) => (
                <li key={etapa.rotulo} className="text-subtleText">
                  {etapa.rotulo}{" "}
                  <span className="font-semibold text-ink">
                    {etapa.notaTexto}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-[#e7e9ee] border-dashed bg-slate-50/50 p-4 text-center sm:mt-4 sm:p-6">
          <AlertCircle className="mb-2 h-6 w-6 text-subtleText/60" />
          <p className="font-medium text-ink text-sm">
            Indicadores educacionais ainda não disponíveis para este município.
          </p>
        </div>
      )}

      <div className="mt-3 flex sm:mt-4 sm:justify-end">
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
          className="inline-flex w-full items-center justify-center gap-1 rounded-lg py-1 font-semibold text-accent text-xs hover:underline sm:w-auto"
        >
          <span>Ver indicadores pedagógicos e despesas detalhadas</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
