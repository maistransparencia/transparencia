import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import { fmtCompact, fmtPercent } from "@transparencia/ui";
import { AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { ShowYourWorkButton } from "./show-your-work-button";

export interface CapremSaldoCaixaCardProps {
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

export function CapremSaldoCaixaCard({
  posicaoFinanceira,
  ano,
  portalSlug,
  className = "",
}: CapremSaldoCaixaCardProps) {
  const previdenciaItems = posicaoFinanceira?.previdencia ?? [];
  const temDados = Boolean(posicaoFinanceira) && previdenciaItems.length > 0;

  if (!temDados || !posicaoFinanceira) {
    return (
      <section
        aria-label="Disponibilidade Financeira do RPPS"
        className={`rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-sm sm:p-6 ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-bold text-base text-ink tracking-tight">
              Disponibilidade em Caixa e Aplicações do RPPS
            </h3>
            <p className="text-subtleText text-xs">
              Recursos em contas e aplicações titularizadas pela previdência
              própria
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

        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-[#e7e9ee] border-dashed bg-slate-50/50 p-6 text-center">
          <AlertCircle className="mb-2 h-6 w-6 text-subtleText/60" />
          <p className="font-medium text-ink text-sm">
            Aguardando homologação da remessa MSC pelo Tesouro Nacional para o
            fundo previdenciário no exercício {ano}.
          </p>
        </div>
      </section>
    );
  }

  const prevItem = previdenciaItems[0];
  const saldoTotal =
    prevItem?.saldoCaixaBancos ?? posicaoFinanceira.totalCaixaPrevidencia;
  const saldoVinculado =
    prevItem?.saldoRecursosVinculados ??
    posicaoFinanceira.totalRecursosPrevidencia;
  const saldoLivre = prevItem?.saldoRecursosLivres ?? 0;
  const mesReferencia =
    prevItem?.mesReferencia ?? posicaoFinanceira.mesMaisRecente;
  const mesExtenso = getMesNome(mesReferencia);
  const variacaoAnualPct = prevItem?.variacaoAnualPct;
  const saldoDescobertoFlag = prevItem?.saldoDescobertoFlag ?? false;

  const pctLivres = (() => {
    if (saldoTotal <= 0) return 0;
    return Math.min(Math.max((saldoLivre / saldoTotal) * 100, 0), 100);
  })();

  const pctVinculados = (() => {
    if (saldoTotal <= 0) return 0;
    return Math.min(Math.max((saldoVinculado / saldoTotal) * 100, 0), 100);
  })();

  return (
    <section
      aria-label="Disponibilidade Financeira do RPPS"
      className={`rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold text-base text-ink tracking-tight">
            Disponibilidade em Caixa e Aplicações do RPPS
          </h3>
          <p className="text-subtleText text-xs">
            Recursos em contas e aplicações titularizadas pela previdência
            própria
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 font-medium text-blue-700 text-xs">
            <ShieldCheck className="h-3 w-3" />
            <span>Segregação Constitucional</span>
          </span>
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
              entidades="previdencia"
              tituloContexto="Previdência Municipal (CAPREM)"
            />
          )}
        </div>
      </div>

      {/* Alerta de Saldo a Descoberto se houver */}
      {saldoDescobertoFlag && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-rose-950 text-xs">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
          <div className="leading-relaxed">
            <span className="font-semibold text-rose-900">
              Aviso de Insuficiência Financeira no RPPS:
            </span>{" "}
            Identificou-se saldo a descoberto em contas bancárias da previdência
            (saídas superiores às disponibilidades imediatas). Essa ocorrência
            requer acompanhamento do Conselho Previdenciário e dos órgãos de
            controle externo (TCE).
          </div>
        </div>
      )}

      {/* Métricas Principais Consolidadas (Layout Horizontal Estilo Visão Geral) */}
      <div className="mt-5 grid grid-cols-1 items-end gap-4 md:grid-cols-[auto_1fr] md:gap-8">
        <div>
          <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
            Total em Caixa e Aplicações
          </span>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-bold font-serif text-3xl text-ink tracking-tight">
              {fmtCompact(saldoTotal)}
            </p>
            {variacaoAnualPct !== undefined && variacaoAnualPct !== null && (
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium text-[11px] ${
                  variacaoAnualPct > 0
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : variacaoAnualPct < 0
                      ? "border border-rose-200 bg-rose-50 text-rose-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {variacaoAnualPct > 0
                  ? `+${variacaoAnualPct}%`
                  : `${variacaoAnualPct}%`}{" "}
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
              className="bg-blue-600 transition-all duration-300"
              style={{ width: `${pctVinculados}%` }}
            />
          </div>

          {/* Legenda de Recursos Livres e Vinculados */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span className="text-subtleText">
                Recursos Vinculados (RPPS):
              </span>
              <span className="font-semibold text-ink">
                {fmtCompact(saldoVinculado)} ({fmtPercent(pctVinculados)})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-subtleText">
                Recursos Ordinários / Livres:
              </span>
              <span className="font-semibold text-ink">
                {fmtCompact(saldoLivre)} ({fmtPercent(pctLivres)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé com Nota Constitucional e Botão Show Your Work */}
      <div className="mt-5 flex flex-col gap-3 border-[#e7e9ee] border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 text-subtleText text-xs">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-600" />
          <span>
            Patrimônio financeiro exclusivo da previdência própria, segregado do
            caixa geral do município (CF art. 167, XI).
          </span>
        </div>
      </div>
    </section>
  );
}
