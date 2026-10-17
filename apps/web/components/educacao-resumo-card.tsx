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
      className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${classeBorda} ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold text-base text-ink tracking-tight">
            Educação Básica e Desempenho Escolar
          </h3>
          <p className="text-subtleText text-xs">
            {resumo
              ? `IDEB ${resumo.ano} e indicadores da rede municipal`
              : "IDEB e indicadores da rede municipal"}
          </p>
        </div>
        <span className="inline-flex items-center self-start rounded-full border border-[#e7e9ee] bg-slate-50 px-3 py-1 font-medium text-subtleText text-xs sm:self-auto">
          INEP / Censo Escolar
        </span>
      </div>

      {resumo ? (
        <>
          {resumo.enfaseTitulo && (
            <p
              data-tom={resumo.enfaseTom}
              className={`mt-4 rounded-lg border px-3 py-2 font-semibold text-sm ${CLASSES_FAIXA_POR_TOM[resumo.enfaseTom]}`}
            >
              {resumo.enfaseTitulo}
            </p>
          )}
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <div>
              <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
                Nota do IDEB
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="font-bold font-serif text-3xl text-ink tracking-tight">
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
                <p className="mt-1 text-subtleText text-xs">
                  {resumo.notaAnteriorTexto}
                </p>
              )}
              {resumo.etapas.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs">
                  {resumo.etapas.map((etapa) => (
                    <li key={etapa.rotulo} className="text-subtleText">
                      {etapa.rotulo}:{" "}
                      <span className="font-semibold text-ink">
                        {etapa.notaTexto}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
                Meta e classificação
              </span>
              <div className="mt-2 space-y-2">
                {resumo.metaTexto ? (
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-xs ${CLASSES_BADGE_POR_TOM[resumo.metaTom]}`}
                  >
                    {resumo.metaTexto}
                  </span>
                ) : null}
                {resumo.rankingTexto ? (
                  <p className="font-semibold text-ink text-sm">
                    {resumo.rankingTexto}
                    <span className="block font-normal text-subtleText text-xs">
                      na classificação estadual do IDEB
                    </span>
                  </p>
                ) : null}
                {!resumo.metaTexto && !resumo.rankingTexto ? (
                  <p className="text-subtleText text-xs">
                    Meta e classificação não disponíveis para este ciclo.
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
                Despesa liquidada em educação
              </span>
              <p
                className="mt-1 font-bold text-ink text-xl tracking-tight"
                title={resumo.despesaLiquidadaEducacaoCompleta ?? undefined}
              >
                {resumo.despesaLiquidadaEducacaoTexto ?? "—"}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-[#e7e9ee] border-dashed bg-slate-50/50 p-6 text-center">
          <AlertCircle className="mb-2 h-6 w-6 text-subtleText/60" />
          <p className="font-medium text-ink text-sm">
            Indicadores educacionais ainda não disponíveis para este município.
          </p>
        </div>
      )}

      <div className="mt-5 flex justify-end border-[#e7e9ee] border-t pt-4">
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
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
