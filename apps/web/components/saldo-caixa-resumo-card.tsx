import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import {
  corDoGrafico,
  ExternalLinkPill,
  fmtCompact,
  fmtPercent,
} from "@transparencia/ui";
import { AlertCircle, ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";

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

function getVariacaoTextClass(variacao: number): string {
  if (variacao > 0) return "text-ok-text";
  if (variacao < 0) return "text-danger-text";
  return "text-mute2";
}

/** Subseção da mesma seção do pipeline: sem régua própria, título serif menor. */
function CabecalhoDisponibilidade({
  description,
  action,
}: {
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="pb-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h3 className="font-semibold font-serif text-base text-ink sm:text-lg">
          Disponibilidade em Caixa e Bancos
        </h3>
        {action}
      </div>
      {description && <p className="mt-1 text-mute2 text-xs">{description}</p>}
    </header>
  );
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
        className={className}
      >
        <CabecalhoDisponibilidade
          description="Contas bancárias e aplicações homologadas pelo Tesouro Nacional (SICONFI MSC)"
          action={
            <span className="inline-flex items-center rounded-full border border-line px-3 py-1 font-medium text-mute2 text-xs">
              Visão Consolidada
            </span>
          }
        />

        <div className="flex items-start gap-3 border-line border-y py-4 text-ink text-xs">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <div className="leading-relaxed">
            <span className="font-semibold text-ink">
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
        className={className}
      >
        <CabecalhoDisponibilidade
          description="Contas bancárias e aplicações homologadas pelo Tesouro Nacional (SICONFI MSC)"
          action={
            <ExternalLinkPill
              href={FONTES_OFICIAIS.siconfi.url}
              title="Matriz de Saldos Contábeis (MSC) homologada pela Secretaria do Tesouro Nacional"
            >
              SICONFI
            </ExternalLinkPill>
          }
        />

        <div className="flex flex-col items-center justify-center border-line border-y p-6 text-center">
          <AlertCircle className="mb-2 h-6 w-6 text-mute3" />
          <p className="font-medium text-ink text-sm">
            Aguardando homologação da remessa MSC pelo Tesouro Nacional para o
            exercício de {ano}.
          </p>
          <div className="mt-3">
            <Link
              href={detailUrl}
              className="inline-flex items-center gap-1 font-semibold text-brand text-xs hover:underline"
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
      className={className}
    >
      <CabecalhoDisponibilidade
        description="Recursos em contas e aplicações homologadas pelo Tesouro Nacional (SICONFI MSC)"
        action={
          <ExternalLinkPill
            href={FONTES_OFICIAIS.siconfi.url}
            className="font-medium font-mono text-[11px] uppercase tracking-wider"
          >
            SICONFI
          </ExternalLinkPill>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr] md:gap-12">
        <div>
          <span className="text-mute2 text-xs">
            Posição: {mesExtenso}/{ano}
          </span>
          <p className="sr-only">Total em Caixa Municipal</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-bold font-sans text-3xl text-ink tracking-tight">
              {fmtCompact(totalCaixaGeral)}
            </p>
            {posicaoFinanceira.variacaoAnualPercentual !== undefined &&
              posicaoFinanceira.variacaoAnualPercentual !== null && (
                <span
                  className={`font-semibold text-xs ${getVariacaoTextClass(
                    posicaoFinanceira.variacaoAnualPercentual,
                  )}`}
                >
                  {posicaoFinanceira.variacaoAnualPercentual > 0
                    ? `+${posicaoFinanceira.variacaoAnualPercentual}%`
                    : `${posicaoFinanceira.variacaoAnualPercentual}%`}{" "}
                  vs. {ano - 1}
                </span>
              )}
          </div>
        </div>

        <div className="space-y-2 md:pt-6">
          <div
            className="flex h-2 w-full gap-0.5 overflow-hidden bg-track"
            role="progressbar"
            aria-valuenow={Math.round(pctLivres)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Composição do saldo: ${Math.round(pctLivres)}% livres, ${Math.round(pctVinculados)}% vinculados`}
          >
            <div
              className="transition-all duration-300"
              style={{
                width: `${pctLivres}%`,
                backgroundColor: corDoGrafico("ok"),
              }}
            />
            <div
              className="transition-all duration-300"
              style={{
                width: `${pctVinculados}%`,
                backgroundColor: corDoGrafico("warn"),
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-mute2 text-xs">
            <p>
              Livres (Ordinários):{" "}
              <strong className="font-semibold text-ink">
                {fmtCompact(totalRecursosLivres)} ({fmtPercent(pctLivres)})
              </strong>
            </p>
            <p>
              Vinculados:{" "}
              <strong className="font-semibold text-ink">
                {fmtCompact(totalRecursosVinculados)} (
                {fmtPercent(pctVinculados)})
              </strong>
            </p>
          </div>

          <p className="text-mute2 text-xs">
            Saldo em contas bancárias não equivale a superávit orçamentário
            livre.
          </p>
          <Link
            href={detailUrl}
            className="inline-flex items-center gap-1 font-medium text-brand text-xs hover:underline"
          >
            <span>Ver detalhamento por entidade em Execução Orçamentária</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
