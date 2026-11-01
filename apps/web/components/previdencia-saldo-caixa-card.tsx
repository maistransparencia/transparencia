import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import { fmtCompact, fmtPercent } from "@transparencia/ui";
import { AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { ShowYourWorkButton } from "./show-your-work-button";

export interface PrevidenciaSaldoCaixaCardProps {
  posicaoFinanceira?: SiconfiPosicaoFinanceiraDTO | null;
  ano: number;
  portalSlug?: string;
  className?: string;
  previdenciaSigla?: string;
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
  if (variacao > 0) {
    return "border border-ok-fill bg-ok-fill/15 text-ok-text";
  }
  if (variacao < 0) {
    return "border border-danger-fill bg-danger-fill/15 text-danger-text";
  }
  return "bg-line2 text-mute";
}

export function PrevidenciaSaldoCaixaCard({
  posicaoFinanceira,
  ano,
  portalSlug,
  className = "",
  previdenciaSigla = "RPPS",
}: PrevidenciaSaldoCaixaCardProps) {
  const previdenciaItems = posicaoFinanceira?.previdencia ?? [];
  const temDados = Boolean(posicaoFinanceira) && previdenciaItems.length > 0;

  if (!temDados || !posicaoFinanceira) {
    return (
      <section
        aria-label="Disponibilidade Financeira do RPPS"
        className={`border-line border-t pt-5 ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-bold">
              Disponibilidade em Caixa e Aplicações do RPPS
            </h3>
            <p className="text-mute text-xs">
              Recursos em contas e aplicações titularizadas pela previdência
              própria
            </p>
          </div>

          <a
            href={FONTES_OFICIAIS.siconfi.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 self-start rounded-sm border border-brand-fill bg-brand-fill/15 px-2 py-0.5 font-medium text-brand-text text-xs transition-colors sm:self-auto"
            title="Matriz de Saldos Contábeis (MSC) homologada pela Secretaria do Tesouro Nacional"
          >
            <span>SICONFI</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="mt-4 flex flex-col items-center justify-center border-line border-y py-4 text-center">
          <AlertCircle className="mb-2 h-6 w-6 text-mute/60" />
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
  const variacaoAnualPercentual = prevItem?.variacaoAnualPercentual;
  const saldoDescobertoFlag = prevItem?.saldoDescobertoFlag ?? false;

  const percentualLivres = (() => {
    if (saldoTotal <= 0) return 0;
    return Math.min(Math.max((saldoLivre / saldoTotal) * 100, 0), 100);
  })();

  const percentualVinculados = (() => {
    if (saldoTotal <= 0) return 0;
    return Math.min(Math.max((saldoVinculado / saldoTotal) * 100, 0), 100);
  })();

  return (
    <section
      aria-label="Disponibilidade Financeira do RPPS"
      className={`border-line border-t pt-5 ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold">
            Disponibilidade em Caixa e Aplicações do RPPS
          </h3>
          <p className="text-mute text-xs">
            Recursos em contas e aplicações titularizadas pela previdência
            própria
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center rounded-sm border border-ok-fill bg-ok-fill/15 px-2.5 py-1 font-medium text-ok-text text-xs">
            Posição: {mesExtenso}/{ano}
          </span>
          <a
            href={FONTES_OFICIAIS.siconfi.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-line2 px-3 py-1 font-medium text-mute text-xs transition-colors hover:text-ink"
          >
            <span>SICONFI</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          {portalSlug && (
            <ShowYourWorkButton
              portalSlug={portalSlug}
              ano={ano}
              tipo="saldo_caixa_siconfi"
              entidades="previdencia"
              tituloContexto={`Previdência Municipal (${previdenciaSigla})`}
            />
          )}
        </div>
      </div>

      {/* Alerta de Saldo a Descoberto se houver */}
      {saldoDescobertoFlag && (
        <div className="mt-4 flex items-start gap-3 border-danger-fill border-l-[3px] bg-danger-fill/15 px-4 py-3 text-ink text-xs">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-text" />
          <div className="leading-relaxed">
            <span className="font-semibold text-danger-text">
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
          <span className="font-medium text-mute text-xs uppercase tracking-wider">
            Total em Caixa e Aplicações
          </span>
          <div className="mt-1 flex items-center gap-2">
            <p className="stat-value">{fmtCompact(saldoTotal)}</p>
            {variacaoAnualPercentual !== undefined &&
              variacaoAnualPercentual !== null && (
                <span
                  className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-medium text-xs ${getVariacaoBadgeClass(
                    variacaoAnualPercentual,
                  )}`}
                >
                  {variacaoAnualPercentual > 0
                    ? `+${variacaoAnualPercentual}%`
                    : `${variacaoAnualPercentual}%`}{" "}
                  vs. {ano - 1}
                </span>
              )}
          </div>
        </div>

        <div className="space-y-2">
          {/* Mini-Barra Proporcional */}
          <div
            className="flex h-2.5 w-full overflow-hidden bg-line2"
            role="progressbar"
            aria-valuenow={Math.round(percentualLivres)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Composição do saldo: ${Math.round(percentualLivres)}% livres, ${Math.round(percentualVinculados)}% vinculados`}
          >
            <div
              className="bg-ok-fill transition-all duration-300"
              style={{ width: `${percentualLivres}%` }}
            />
            <div
              className="bg-brand-fill transition-all duration-300"
              style={{ width: `${percentualVinculados}%` }}
            />
          </div>

          {/* Legenda de Recursos Livres e Vinculados */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-brand-fill" aria-hidden="true" />
              <span className="text-mute">Recursos Vinculados (RPPS):</span>
              <span className="font-semibold text-ink">
                {fmtCompact(saldoVinculado)} ({fmtPercent(percentualVinculados)}
                )
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-ok-fill" aria-hidden="true" />
              <span className="text-mute">Recursos Ordinários / Livres:</span>
              <span className="font-semibold text-ink">
                {fmtCompact(saldoLivre)} ({fmtPercent(percentualLivres)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé com Nota Constitucional e Botão Show Your Work */}
      <div className="mt-5 flex flex-col gap-3 border-line border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 text-mute text-xs">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-text" />
          <span>
            Patrimônio financeiro exclusivo da previdência própria, segregado do
            caixa geral do município (
            <a
              href={urlLegislacao("constituicao", "art167")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5"
            >
              <span>CF art. 167, XI</span>
              <ExternalLink className="inline h-3 w-3" />
            </a>
            ).
          </span>
        </div>
      </div>
    </section>
  );
}
