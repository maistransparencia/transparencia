import type { SiconfiPosicaoFinanceiraDTO } from "@transparencia/db";
import { fmtCompact, fmtPercent, SectionHeader } from "@transparencia/ui";
import { AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { pickTense } from "@/lib/escopo-bloco";
import { ShowYourWorkButton } from "./show-your-work-button";

export interface PrevidenciaSaldoCaixaCardProps {
  posicaoFinanceira?: SiconfiPosicaoFinanceiraDTO | null;
  ano: number;
  isCurrentYear?: boolean;
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

const descricaoSiconfi = (
  <>
    Recursos em contas e aplicações titularizadas pela previdência própria,
    segundo a Matriz de Saldos Contábeis homologada no{" "}
    <a
      href={FONTES_OFICIAIS.siconfi.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="inline-flex items-center gap-1">
        SICONFI
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only">(abre em nova aba)</span>
      </span>
    </a>
    .
  </>
);

export function PrevidenciaSaldoCaixaCard({
  posicaoFinanceira,
  ano,
  isCurrentYear = true,
  portalSlug,
  className = "",
  previdenciaSigla = "RPPS",
}: PrevidenciaSaldoCaixaCardProps) {
  const tituloSaldo = `Quanto o fundo de aposentadoria ${pickTense(isCurrentYear, "tem", "tinha")} em caixa e aplicado em ${ano}?`;
  const previdenciaItems = posicaoFinanceira?.previdencia ?? [];
  const temDados = Boolean(posicaoFinanceira) && previdenciaItems.length > 0;

  if (!temDados || !posicaoFinanceira) {
    return (
      <section
        aria-label="Disponibilidade Financeira do RPPS"
        className={className}
      >
        <SectionHeader title={tituloSaldo} description={descricaoSiconfi} />

        <div className="border-line flex flex-col items-center justify-center border-y py-4 text-center">
          <AlertCircle className="text-mute/60 mb-2 h-6 w-6" />
          <p className="text-ink text-sm font-medium">
            Aguardando homologação da remessa MSC pelo Tesouro Nacional para o
            fundo previdenciário em {ano}.
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
      className={`space-y-5 ${className}`}
    >
      <SectionHeader
        eyebrow={`Posição: ${mesExtenso}/${ano}`}
        title={tituloSaldo}
        description={descricaoSiconfi}
        action={
          portalSlug ? (
            <ShowYourWorkButton
              portalSlug={portalSlug}
              ano={ano}
              tipo="saldo_caixa_siconfi"
              entidades="previdencia"
              tituloContexto={`Previdência Municipal (${previdenciaSigla})`}
            />
          ) : undefined
        }
      />

      {/* Alerta de Saldo a Descoberto se houver */}
      {saldoDescobertoFlag && (
        <div className="border-danger-fill bg-danger-fill/15 text-ink flex items-start gap-3 border-l-[3px] px-4 py-3 text-xs">
          <AlertCircle className="text-danger-text mt-0.5 h-4 w-4 shrink-0" />
          <div className="leading-relaxed">
            <span className="text-danger-text font-semibold">
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
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[auto_1fr] md:gap-8">
        <div>
          <span className="text-mute text-xs font-medium tracking-wider uppercase">
            Total em Caixa e Aplicações
          </span>
          <div className="mt-1 flex items-center gap-2">
            <p className="stat-value">{fmtCompact(saldoTotal)}</p>
            {variacaoAnualPercentual !== undefined &&
              variacaoAnualPercentual !== null && (
                <span
                  className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium ${getVariacaoBadgeClass(
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
            className="bg-line2 flex h-2.5 w-full overflow-hidden"
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
              <span className="bg-brand-fill h-2.5 w-2.5" aria-hidden="true" />
              <span className="text-mute">Recursos Vinculados (RPPS):</span>
              <span className="text-ink font-semibold">
                {fmtCompact(saldoVinculado)} ({fmtPercent(percentualVinculados)}
                )
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="bg-ok-fill h-2.5 w-2.5" aria-hidden="true" />
              <span className="text-mute">Recursos Ordinários / Livres:</span>
              <span className="text-ink font-semibold">
                {fmtCompact(saldoLivre)} ({fmtPercent(percentualLivres)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé com Nota Constitucional e Botão Show Your Work */}
      <div className="border-line flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-mute flex items-center gap-1.5 text-xs">
          <ShieldCheck className="text-brand-text h-3.5 w-3.5 shrink-0" />
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
