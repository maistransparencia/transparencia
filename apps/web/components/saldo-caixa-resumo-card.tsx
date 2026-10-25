import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import {
  corDoGrafico,
  ExternalLinkPill,
  fmtCompact,
  fmtPercent,
  SectionHeader,
} from "@transparencia/ui";
import { AlertCircle, ArrowRight, Info } from "lucide-react";
import Link from "next/link";
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

function getVariacaoBadgeClass(variacao: number): string {
  if (variacao > 0) return "border border-ok/40 bg-ok/10 text-ok";
  if (variacao < 0) return "border border-danger/40 bg-danger/10 text-danger";
  return "border border-line bg-line2/40 text-mute2";
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
        <SectionHeader
          title="Disponibilidade em Caixa e Bancos"
          description="Contas bancárias e aplicações homologadas pelo Tesouro Nacional (SICONFI MSC)"
          action={
            <span className="inline-flex items-center rounded-md border border-line px-2.5 py-1 font-medium text-mute2 text-xs">
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
        <SectionHeader
          title="Disponibilidade em Caixa e Bancos"
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
      <SectionHeader
        title="Disponibilidade em Caixa e Bancos"
        description="Recursos em contas e aplicações homologadas pelo Tesouro Nacional (SICONFI MSC)"
        action={
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-ok/40 bg-ok/10 px-2.5 py-1 font-medium text-ok text-xs">
              Posição: {mesExtenso}/{ano}
            </span>
            <ExternalLinkPill href={FONTES_OFICIAIS.siconfi.url}>
              SICONFI
            </ExternalLinkPill>
          </span>
        }
      />

      {/* Métricas Principais Consolidadas */}
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[auto_1fr] md:gap-8">
        <div>
          <span className="font-medium text-mute2 text-xs uppercase tracking-wider">
            Total em Caixa Municipal
          </span>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-bold font-serif text-3xl text-ink tracking-tight">
              {fmtCompact(totalCaixaGeral)}
            </p>
            {posicaoFinanceira.variacaoAnualPercentual !== undefined &&
              posicaoFinanceira.variacaoAnualPercentual !== null && (
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium text-[11px] ${getVariacaoBadgeClass(
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

        <div className="space-y-2">
          {/* Mini-Barra Proporcional */}
          <div
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-track"
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

          {/* Legenda de Recursos Livres e Vinculados */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: corDoGrafico("ok") }}
              />
              <span className="text-mute2">Livres (Ordinários):</span>
              <span className="font-semibold text-ink">
                {fmtCompact(totalRecursosLivres)} ({fmtPercent(pctLivres)})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: corDoGrafico("warn") }}
              />
              <span className="text-mute2">Vinculados:</span>
              <span className="font-semibold text-ink">
                {fmtCompact(totalRecursosVinculados)} (
                {fmtPercent(pctVinculados)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé com Alerta Curto e Link para Execução Orçamentária */}
      <div className="mt-5 flex flex-col gap-3 border-line border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 text-mute2 text-xs">
          <Info className="h-3.5 w-3.5 shrink-0 text-warn" />
          <span>
            Saldo em contas bancárias não equivale a superávit orçamentário
            livre.
          </span>
        </div>

        <Link
          href={detailUrl}
          className="inline-flex items-center gap-1 font-semibold text-brand text-xs hover:underline"
        >
          <span>Ver detalhamento por entidade em Execução Orçamentária</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
