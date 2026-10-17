"use client";

import { fmtCurrency, fmtPercent } from "@transparencia/ui";
import { AlertCircle, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";

const ART_212_CF88_URL =
  "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art212";
const LIMITE_CONSTITUCIONAL_MDE = 25;

export interface EducacaoResumoCardData {
  ano: number;
  notaIdeb: number | null;
  crescimentoPontosIdeb: number | null;
  mdePercentual: number | null;
  custoAnualPorAluno: number | null;
}

export interface EducacaoResumoCardProps {
  resumo?: EducacaoResumoCardData | null;
  detailUrl: string;
  className?: string;
}

function fmtDecimalUmaCasa(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function buildEvolucao(crescimento: number | null | undefined) {
  if (crescimento === null || crescimento === undefined) return null;
  const valor = fmtDecimalUmaCasa(Math.abs(crescimento));
  if (crescimento > 0) {
    return {
      text: `+${valor} ponto`,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (crescimento < 0) {
    return {
      text: `-${valor} ponto`,
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }
  return {
    text: "0,0 ponto",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };
}

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
  const evolucao = buildEvolucao(resumo?.crescimentoPontosIdeb);
  const mde = resumo?.mdePercentual ?? null;
  const mdeCumprido = mde !== null && mde >= LIMITE_CONSTITUCIONAL_MDE;
  const mdeLargura =
    mde === null ? 0 : Math.min(Math.max((mde / 50) * 100, 0), 100);
  const limiteLargura = (LIMITE_CONSTITUCIONAL_MDE / 50) * 100;
  const mdeBarraClass = mdeCumprido ? "bg-emerald-500" : "bg-rose-500";
  const mdeStatus = (() => {
    if (mde === null) return "Não apurado";
    if (mdeCumprido) return "Mínimo cumprido";
    return "Abaixo do mínimo";
  })();

  return (
    <section
      aria-label="Educação Básica e Desempenho Escolar"
      className={`rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold text-base text-ink tracking-tight">
            Educação Básica e Desempenho Escolar
          </h3>
          <p className="text-subtleText text-xs">
            {resumo
              ? `IDEB ${resumo.ano} e responsabilidade fiscal em educação`
              : "IDEB e responsabilidade fiscal em educação"}
          </p>
        </div>
        <span className="inline-flex items-center self-start rounded-full border border-[#e7e9ee] bg-slate-50 px-3 py-1 font-medium text-subtleText text-xs sm:self-auto">
          INEP / Censo Escolar
        </span>
      </div>

      {resumo ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
              Nota do IDEB
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="font-bold font-serif text-3xl text-ink tracking-tight">
                {resumo.notaIdeb === null
                  ? "—"
                  : fmtDecimalUmaCasa(resumo.notaIdeb)}
              </p>
              {evolucao && (
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium text-xs ${evolucao.className}`}
                >
                  {evolucao.text}
                </span>
              )}
            </div>
          </div>

          <div>
            <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
              Mínimo de MDE (25%)
            </span>
            <div className="mt-2 space-y-1">
              <div
                className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={mde === null ? undefined : Math.round(mde)}
                aria-valuemin={0}
                aria-valuemax={50}
                aria-label={`Aplicação em manutenção e desenvolvimento do ensino: ${mde === null ? "não apurado" : fmtPercent(mde)}`}
              >
                <div
                  className={`h-full transition-all duration-300 ${mdeBarraClass}`}
                  style={{ width: `${mdeLargura}%` }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-slate-700"
                  style={{ left: `${limiteLargura}%` }}
                />
              </div>
              <p className="font-semibold text-ink text-xs">
                {mde === null ? "Não apurado" : fmtPercent(mde)}{" "}
                <span className="font-normal text-subtleText">
                  · {mdeStatus}
                </span>
              </p>
              <a
                href={ART_212_CF88_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-subtleText text-xs underline hover:text-ink"
              >
                <span>Art. 212 da CF/88</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div>
            <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
              Custo anual por aluno
            </span>
            <p className="mt-1 font-bold text-ink text-xl tracking-tight">
              {resumo.custoAnualPorAluno === null
                ? "—"
                : fmtCurrency(resumo.custoAnualPorAluno)}
            </p>
          </div>
        </div>
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
