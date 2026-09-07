import type {
  EntidadeSaldoCaixaDTO,
  SiconfiPosicaoFinanceiraDTO,
} from "@transparencia/db";
import { fmtCompact, fmtPercent, toTitleCase } from "@transparencia/ui";
import { AlertCircle, ExternalLink, Info } from "lucide-react";
import { ShowYourWorkButton } from "./show-your-work-button";

export interface SaldoCaixaEntidadesSectionProps {
  posicaoFinanceira?: SiconfiPosicaoFinanceiraDTO | null;
  ano: number;
  portalSlug?: string;
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

export function SaldoCaixaEntidadesSection({
  posicaoFinanceira,
  ano,
  portalSlug,
  className = "",
}: SaldoCaixaEntidadesSectionProps) {
  if (!posicaoFinanceira || posicaoFinanceira.entidades.length === 0) {
    return (
      <section
        aria-label="Disponibilidade Financeira em Caixa e Bancos"
        className={`rounded-2xl border border-[#e7e9ee] bg-white p-6 shadow-sm ${className}`}
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-ink text-xl tracking-tight">
              Disponibilidade Financeira em Caixa e Bancos
            </h2>
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
          <p className="text-sm text-subtleText">
            Contas bancárias ativas e aplicações de liquidez imediata declaradas
            mensalmente ao Tesouro Nacional.
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-[#e7e9ee] border-dashed bg-slate-50/50 p-8 text-center">
          <AlertCircle className="mb-2 h-8 w-8 text-subtleText/60" />
          <p className="font-medium text-ink text-sm">
            Aguardando homologação da remessa MSC pelo Tesouro Nacional para o
            exercício de {ano}.
          </p>
          <p className="mt-1 max-w-md text-subtleText text-xs">
            As remessas da Matriz de Saldos Contábeis são submetidas mensalmente
            pelos entes federados e passam por validação contábil no SICONFI.
          </p>
        </div>
      </section>
    );
  }

  const {
    mesMaisRecente,
    totalCaixaGeral,
    totalRecursosLivres,
    totalRecursosVinculados,
    entidades,
  } = posicaoFinanceira;
  const mesExtenso = getMesNome(mesMaisRecente);

  const pctLivresGeral = (() => {
    if (totalCaixaGeral <= 0) return 0;
    return (totalRecursosLivres / totalCaixaGeral) * 100;
  })();

  const pctVinculadosGeral = (() => {
    if (totalCaixaGeral <= 0) return 0;
    return (totalRecursosVinculados / totalCaixaGeral) * 100;
  })();

  return (
    <section
      aria-label="Disponibilidade Financeira em Caixa e Bancos"
      className={`rounded-2xl border border-[#e7e9ee] bg-white p-6 shadow-sm ${className}`}
    >
      {/* Header com Título, Subtítulo, Badges e ShowYourWork */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-bold text-ink text-xl tracking-tight">
            Disponibilidade Financeira em Caixa e Bancos
          </h2>
          <p className="text-sm text-subtleText">
            Contas bancárias ativas e aplicações de liquidez imediata declaradas
            mensalmente ao Tesouro Nacional.
          </p>
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
          {portalSlug && (
            <ShowYourWorkButton
              portalSlug={portalSlug}
              ano={ano}
              tipo="saldo_caixa_siconfi"
              entidades="executivo"
              tituloContexto="Disponibilidade Financeira SICONFI"
            />
          )}
        </div>
      </div>

      {/* Callout Cívico Prevenindo Desinformação */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 text-amber-900 text-xs">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="leading-relaxed">
          <span className="font-semibold">
            Atenção: Saldo em caixa não é dinheiro &quot;sobrando&quot;.
          </span>{" "}
          A maior parte dos recursos bancários municipais possui destinação
          legal vinculada (saúde, educação, assistência social) e já se encontra
          comprometida com restos a pagar de contratos em andamento.
        </div>
      </div>

      {/* Resumo Consolidado Municipal */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e7e9ee] bg-slate-50/50 p-4">
          <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
            Total Disponível em Caixa
          </span>
          <p className="mt-1 font-bold font-serif text-2xl text-ink tracking-tight">
            {fmtCompact(totalCaixaGeral)}
          </p>
        </div>
        <div className="rounded-xl border border-[#e7e9ee] bg-slate-50/50 p-4">
          <span className="font-medium text-emerald-800 text-xs uppercase tracking-wider">
            Recursos Livres (Ordinários)
          </span>
          <p className="mt-1 font-bold font-serif text-2xl text-ink tracking-tight">
            {fmtCompact(totalRecursosLivres)}
          </p>
          <span className="text-subtleText text-xs">
            {fmtPercent(pctLivresGeral)} do saldo total
          </span>
        </div>
        <div className="rounded-xl border border-[#e7e9ee] bg-slate-50/50 p-4">
          <span className="font-medium text-amber-800 text-xs uppercase tracking-wider">
            Recursos Vinculados (Destinação Específica)
          </span>
          <p className="mt-1 font-bold font-serif text-2xl text-ink tracking-tight">
            {fmtCompact(totalRecursosVinculados)}
          </p>
          <span className="text-subtleText text-xs">
            {fmtPercent(pctVinculadosGeral)} do saldo total
          </span>
        </div>
      </div>

      {/* Grade de Cards por Entidade */}
      <div className="mt-6">
        <h3 className="mb-3 font-semibold text-ink text-sm uppercase tracking-wider">
          Saldos Discriminados por Entidade
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entidades.map((entidade: EntidadeSaldoCaixaDTO, index: number) => {
            const total = Math.max(entidade.saldoCaixaBancos, 0.01);
            const pctLivres = Math.min(
              Math.max((entidade.saldoRecursosLivres / total) * 100, 0),
              100,
            );
            const pctVinculados = Math.min(
              Math.max((entidade.saldoRecursosVinculados / total) * 100, 0),
              100,
            );

            return (
              <div
                key={entidade.empresaId ?? entidade.entidadeNome ?? index}
                className="flex flex-col justify-between rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-sm transition-all hover:border-[#cbd0db]"
              >
                <div>
                  <h4 className="line-clamp-2 font-bold text-base text-ink">
                    {toTitleCase(entidade.entidadeNome ?? "Entidade Municipal")}
                  </h4>

                  <div className="mt-4">
                    <span className="font-medium text-subtleText text-xs uppercase tracking-wide">
                      Saldo em Caixa e Bancos
                    </span>
                    <p className="font-bold font-serif text-2xl text-ink tracking-tight">
                      {fmtCompact(entidade.saldoCaixaBancos)}
                    </p>
                  </div>

                  {/* Barra de Composição Proporcional */}
                  <div className="mt-3">
                    <div
                      className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100"
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
                  </div>

                  {/* Detalhamento Livres vs Vinculados */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-subtleText">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Livres:
                      </span>
                      <span className="font-medium text-ink">
                        {fmtCompact(entidade.saldoRecursosLivres)} (
                        {fmtPercent(pctLivres)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-subtleText">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Vinculados:
                      </span>
                      <span className="font-medium text-ink">
                        {fmtCompact(entidade.saldoRecursosVinculados)} (
                        {fmtPercent(pctVinculados)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
