import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import { fmtCompact, fmtPercent } from "@transparencia/ui";
import { AlertCircle, ArrowRight, ExternalLink, Info } from "lucide-react";
import Link from "next/link";

export interface SaldoCaixaResumoCardProps {
  posicaoFinanceira?: SiconfiPosicaoFinanceiraDTO | null;
  ano: number;
  detailUrl: string;
  hasEntityFilter?: boolean;
  className?: string;
}

const MESES_NOMES: Record<number, string> = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Março",
  4: "Abril",
  5: "Maio",
  6: "Junho",
  7: "Julho",
  8: "Agosto",
  9: "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro",
};

function getMesNome(mes: number): string {
  return MESES_NOMES[mes] ?? `Mês ${String(mes).padStart(2, "0")}`;
}

export function SaldoCaixaResumoCard({
  posicaoFinanceira,
  ano,
  detailUrl,
  hasEntityFilter = false,
  className = "",
}: SaldoCaixaResumoCardProps) {
  if (hasEntityFilter) {
    return (
      <section
        aria-label="Disponibilidade Financeira em Caixa"
        className={`rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-sm sm:p-6 ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-bold text-base text-ink tracking-tight">
              Disponibilidade em Caixa e Bancos
            </h3>
            <p className="text-subtleText text-xs">
              Contas bancárias e aplicações homologadas pelo Tesouro Nacional
              (SICONFI MSC)
            </p>
          </div>
          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 text-xs">
            Visão Consolidada
          </span>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-200/80 bg-blue-50/60 p-4 text-blue-950 text-xs">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
          <div className="leading-relaxed">
            <span className="font-semibold text-blue-900">
              Disponibilidade contábil exibida na visão consolidada municipal.
            </span>{" "}
            A disponibilidade em caixa do Tesouro Nacional reflete o montante
            macro de todo o Poder Executivo. Para visualizá-la, selecione{" "}
            <strong>Todas as entidades</strong>.
          </div>
        </div>
      </section>
    );
  }

  if (!posicaoFinanceira || posicaoFinanceira.entidades.length === 0) {
    return (
      <section
        aria-label="Disponibilidade Financeira em Caixa"
        className={`rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-sm sm:p-6 ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="font-bold text-base text-ink tracking-tight">
                Disponibilidade em Caixa e Bancos
              </h3>
              <p className="text-subtleText text-xs">
                Contas bancárias e aplicações homologadas pelo Tesouro Nacional
                (SICONFI MSC)
              </p>
            </div>
          </div>
          <a
            href="https://siconfi.tesouro.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-[#e7e9ee] bg-slate-50 px-3 py-1 font-medium text-subtleText text-xs transition-colors hover:bg-slate-100 hover:text-ink sm:self-auto"
          >
            <span>Fonte: STN / SICONFI</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-[#e7e9ee] border-dashed bg-slate-50/50 p-6 text-center">
          <AlertCircle className="mb-2 h-6 w-6 text-subtleText/60" />
          <p className="font-medium text-ink text-sm">
            Aguardando homologação da remessa MSC pelo Tesouro Nacional para o
            exercício de {ano}.
          </p>
          <div className="mt-3">
            <Link
              href={detailUrl}
              className="inline-flex items-center gap-1 font-semibold text-accent text-xs hover:underline"
            >
              <span>Ver execução orçamentária municipal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const {
    mesMaisRecente,
    totalCaixaGeral,
    totalRecursosLivres,
    totalRecursosVinculados,
  } = posicaoFinanceira;
  const mesExtenso = getMesNome(mesMaisRecente);

  const pctLivres = (() => {
    if (totalCaixaGeral <= 0) return 0;
    return Math.min(
      Math.max((totalRecursosLivres / totalCaixaGeral) * 100, 0),
      100,
    );
  })();

  const pctVinculados = (() => {
    if (totalCaixaGeral <= 0) return 0;
    return Math.min(
      Math.max((totalRecursosVinculados / totalCaixaGeral) * 100, 0),
      100,
    );
  })();

  return (
    <section
      aria-label="Disponibilidade Financeira em Caixa"
      className={`rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div>
            <h3 className="font-bold text-base text-ink tracking-tight">
              Disponibilidade em Caixa e Bancos
            </h3>
            <p className="text-subtleText text-xs">
              Recursos em contas e aplicações homologadas pelo Tesouro Nacional
              (SICONFI MSC)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 text-xs">
            Posição oficial em {mesExtenso}/{ano}
          </span>
          <a
            href="https://siconfi.tesouro.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e7e9ee] bg-slate-50 px-3 py-1 font-medium text-subtleText text-xs transition-colors hover:bg-slate-100 hover:text-ink"
          >
            <span>Fonte: STN / SICONFI</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Métricas Principais Consolidadas */}
      <div className="mt-5 grid grid-cols-1 items-end gap-4 md:grid-cols-[auto_1fr] md:gap-8">
        <div>
          <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
            Total em Caixa Municipal
          </span>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-bold font-serif text-3xl text-ink tracking-tight">
              {fmtCompact(totalCaixaGeral)}
            </p>
            {posicaoFinanceira.variacaoAnualPct !== undefined &&
              posicaoFinanceira.variacaoAnualPct !== null && (
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium text-[11px] ${
                    posicaoFinanceira.variacaoAnualPct > 0
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : posicaoFinanceira.variacaoAnualPct < 0
                        ? "border border-rose-200 bg-rose-50 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {posicaoFinanceira.variacaoAnualPct > 0
                    ? `+${posicaoFinanceira.variacaoAnualPct}%`
                    : `${posicaoFinanceira.variacaoAnualPct}%`}{" "}
                  vs. {ano - 1}
                </span>
              )}
          </div>
        </div>

        <div className="space-y-2">
          {/* Mini-Barra Proporcional */}
          <div
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={Math.round(pctLivres)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Composição do saldo: ${Math.round(pctLivres)}% livres, ${Math.round(pctVinculados)}% vinculados`}
          >
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${pctLivres}%` }}
            />
            <div
              className="bg-amber-500 transition-all duration-300"
              style={{ width: `${pctVinculados}%` }}
            />
          </div>

          {/* Legenda de Recursos Livres e Vinculados */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-subtleText">Livres (Ordinários):</span>
              <span className="font-semibold text-ink">
                {fmtCompact(totalRecursosLivres)} ({fmtPercent(pctLivres)})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-subtleText">Vinculados:</span>
              <span className="font-semibold text-ink">
                {fmtCompact(totalRecursosVinculados)} (
                {fmtPercent(pctVinculados)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé com Alerta Curto e Link para Execução Orçamentária */}
      <div className="mt-5 flex flex-col gap-3 border-[#e7e9ee] border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 text-subtleText text-xs">
          <Info className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            Saldo em contas bancárias não equivale a superávit orçamentário
            livre.
          </span>
        </div>

        <Link
          href={detailUrl}
          className="inline-flex items-center gap-1 font-semibold text-accent text-xs hover:underline"
        >
          <span>Ver detalhamento por entidade em Execução Orçamentária</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
