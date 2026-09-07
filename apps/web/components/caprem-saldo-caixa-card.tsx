import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import { fmtCompact, fmtCurrency, fmtPercent } from "@transparencia/ui";
import { AlertCircle, ExternalLink, Info, ShieldCheck } from "lucide-react";
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
  const temDadosPrevidencia =
    Boolean(posicaoFinanceira) && previdenciaItems.length > 0;

  if (!temDadosPrevidencia || !posicaoFinanceira) {
    return (
      <section
        aria-label="Disponibilidade Financeira do RPPS"
        className={`rounded-2xl border border-[#e7e9ee] bg-white p-6 shadow-sm ${className}`}
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="inline-block font-semibold text-accent text-xs uppercase tracking-wider">
                SICONFI / STN · RPPS
              </span>
              <h3 className="font-bold text-ink text-xl tracking-tight">
                Disponibilidade em Caixa e Aplicações do RPPS
              </h3>
            </div>
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
          <p className="text-sm text-subtleText leading-relaxed">
            Contas bancárias e carteira de investimentos exclusivos do Regime
            Próprio de Previdência Social (CAPREM), conforme Matriz de Saldos
            Contábeis homologada pelo Tesouro Nacional.
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 border-dashed bg-slate-50/50 p-6 text-center">
          <p className="text-slate-500 text-sm">
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
  const dataReferencia =
    prevItem?.dataReferencia ?? posicaoFinanceira.dataHomologacao;
  const variacaoAnualPct = prevItem?.variacaoAnualPct;
  const saldoDescobertoFlag = prevItem?.saldoDescobertoFlag ?? false;

  const variacaoBadge = (() => {
    if (variacaoAnualPct === null || variacaoAnualPct === undefined) {
      return null;
    }
    if (variacaoAnualPct > 0) {
      return (
        <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 text-xs">
          +{variacaoAnualPct.toFixed(1)}% vs. {ano - 1}
        </span>
      );
    }
    if (variacaoAnualPct < 0) {
      return (
        <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-medium text-rose-800 text-xs">
          {variacaoAnualPct.toFixed(1)}% vs. {ano - 1}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-700 text-xs">
        0.0% vs. {ano - 1}
      </span>
    );
  })();

  return (
    <section
      aria-label="Disponibilidade Financeira do RPPS"
      className={`rounded-2xl border border-[#e7e9ee] bg-white p-6 shadow-sm ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block font-semibold text-accent text-xs uppercase tracking-wider">
              SICONFI / STN · MATRIZ DE SALDOS CONTÁBEIS
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-medium text-blue-800 text-xs">
              <ShieldCheck className="h-3 w-3" />
              Segregação Constitucional
            </span>
          </div>
          <h3 className="mt-1 font-bold text-ink text-xl tracking-tight">
            Disponibilidade em Caixa e Aplicações do RPPS
          </h3>
          <p className="mt-0.5 text-sm text-subtleText">
            Patrimônio financeiro exclusivo da previdência própria (CAPREM),
            segregado do caixa geral do município (CF art. 167, XI).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-950 text-xs">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="leading-relaxed">
            <strong className="font-semibold text-amber-900">
              Aviso de Insuficiência Financeira no RPPS:
            </strong>{" "}
            Identificou-se saldo a descoberto em contas bancárias da previdência
            (saídas superiores às disponibilidades imediatas). Essa ocorrência
            requer acompanhamento do Conselho Previdenciário e dos órgãos de
            controle externo (TCE).
          </div>
        </div>
      )}

      {/* Card de Métricas Principais */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total em Caixa / Bancos */}
        <div className="rounded-xl border border-borderLine bg-slate-50/50 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
              Total em Caixa e Aplicações
            </span>
            {variacaoBadge}
          </div>
          <div className="mt-2 font-bold font-serif text-3xl text-ink tracking-tight">
            {fmtCompact(saldoTotal)}
          </div>
          <div className="mt-1 font-medium text-slate-500 text-xs">
            {fmtCurrency(saldoTotal)}
          </div>
        </div>

        {/* Recursos Vinculados ao RPPS */}
        <div className="rounded-xl border border-borderLine bg-slate-50/50 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
              Recursos Vinculados (RPPS)
            </span>
            <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-medium text-blue-700 text-xs">
              {saldoTotal > 0
                ? fmtPercent((saldoVinculado / saldoTotal) * 100)
                : "100%"}
            </span>
          </div>
          <div className="mt-2 font-bold font-serif text-3xl text-blue-700 tracking-tight">
            {fmtCompact(saldoVinculado)}
          </div>
          <div className="mt-1 font-medium text-slate-500 text-xs">
            {fmtCurrency(saldoVinculado)}
          </div>
        </div>

        {/* Recursos Livres */}
        <div className="rounded-xl border border-borderLine bg-slate-50/50 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
              Recursos Ordinários / Livres
            </span>
            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-medium text-slate-600 text-xs">
              {saldoTotal > 0
                ? fmtPercent((saldoLivre / saldoTotal) * 100)
                : "0%"}
            </span>
          </div>
          <div className="mt-2 font-bold font-serif text-3xl text-slate-700 tracking-tight">
            {fmtCompact(saldoLivre)}
          </div>
          <div className="mt-1 font-medium text-slate-500 text-xs">
            {fmtCurrency(saldoLivre)}
          </div>
        </div>
      </div>

      {/* Rodapé explicativo e metadados de homologação */}
      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-slate-600">
          <Info className="h-4 w-4 shrink-0 text-slate-500" />
          <span>
            Posição de{" "}
            <strong>
              {getMesNome(mesReferencia)} de {ano}
            </strong>{" "}
            · Última remessa MSC homologada: <strong>{dataReferencia}</strong>
          </span>
        </div>
        <div className="font-medium text-slate-500 text-xs">
          Regulamentação: LRF art. 50, IV e Portaria STN nº 548/2015
        </div>
      </div>
    </section>
  );
}
