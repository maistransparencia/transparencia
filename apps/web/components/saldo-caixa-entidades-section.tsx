import type {
  EntidadeSaldoCaixaDTO,
  SiconfiPosicaoFinanceiraDTO,
} from "@transparencia/db";
import { fmtCurrency, fmtPercent } from "@transparencia/ui";
import {
  AlertCircle,
  Building2,
  ExternalLink,
  Info,
  Landmark,
  PiggyBank,
  ShieldAlert,
  Wallet,
} from "lucide-react";

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

function getEntityIcon(nome: string | null) {
  const lower = (nome ?? "").toLowerCase();
  if (lower.includes("saúde") || lower.includes("saude")) {
    return (
      <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
    );
  }
  if (
    lower.includes("assistência") ||
    lower.includes("assistencia") ||
    lower.includes("social")
  ) {
    return <PiggyBank className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  }
  if (
    lower.includes("previdência") ||
    lower.includes("previdencia") ||
    lower.includes("caprem")
  ) {
    return (
      <ShieldAlert className="h-4 w-4 text-purple-600 dark:text-purple-400" />
    );
  }
  if (
    lower.includes("câmara") ||
    lower.includes("camara") ||
    lower.includes("legislativo")
  ) {
    return <Landmark className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
  }
  return <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
}

export function SaldoCaixaEntidadesSection({
  posicaoFinanceira,
  ano,
  className = "",
}: SaldoCaixaEntidadesSectionProps) {
  if (!posicaoFinanceira || posicaoFinanceira.entidades.length === 0) {
    return (
      <section
        aria-label="Disponibilidade Financeira em Caixa e Bancos"
        className={`rounded-xl border border-border/80 bg-card p-6 shadow-sm ${className}`}
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-bold text-foreground text-xl tracking-tight">
              <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Disponibilidade Financeira em Caixa e Bancos
            </h2>
            <a
              href="https://siconfi.tesouro.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
            >
              <span>
                🏛️ Fonte Oficial: STN / SICONFI (Matriz de Saldos Contábeis -
                MSC)
              </span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-muted-foreground text-sm">
            Contas bancárias ativas e aplicações de liquidez imediata declaradas
            mensalmente ao Tesouro Nacional.
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-border border-dashed bg-muted/20 p-8 text-center">
          <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="font-medium text-foreground text-sm">
            Aguardando homologação da remessa MSC pelo Tesouro Nacional para o
            exercício de {ano}.
          </p>
          <p className="mt-1 max-w-md text-muted-foreground text-xs">
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

  return (
    <section
      aria-label="Disponibilidade Financeira em Caixa e Bancos"
      className={`rounded-xl border border-border/80 bg-card p-6 shadow-sm ${className}`}
    >
      {/* Header com Título, Subtítulo e Badges */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 font-bold text-foreground text-xl tracking-tight">
              <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Disponibilidade Financeira em Caixa e Bancos
            </h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Contas bancárias ativas e aplicações de liquidez imediata declaradas
            mensalmente ao Tesouro Nacional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 text-xs ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-500/30">
            Posição oficial em {mesExtenso}/{ano}
          </span>
          <a
            href="https://siconfi.tesouro.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
          >
            <span>
              🏛️ Fonte Oficial: STN / SICONFI (Matriz de Saldos Contábeis - MSC)
            </span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Callout Cívico Prevenindo Desinformação */}
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200/80 bg-amber-50/60 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="text-xs leading-relaxed">
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
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Total Disponível em Caixa
          </span>
          <p className="mt-1 font-bold text-2xl text-foreground tracking-tight">
            {fmtCurrency(totalCaixaGeral)}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <span className="font-medium text-emerald-700 text-xs uppercase tracking-wider dark:text-emerald-400">
            Recursos Livres (Ordinários)
          </span>
          <p className="mt-1 font-bold text-2xl text-foreground tracking-tight">
            {fmtCurrency(totalRecursosLivres)}
          </p>
          <span className="text-muted-foreground text-xs">
            {fmtPercent(
              totalCaixaGeral > 0
                ? (totalRecursosLivres / totalCaixaGeral) * 100
                : 0,
            )}{" "}
            do saldo total
          </span>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <span className="font-medium text-amber-700 text-xs uppercase tracking-wider dark:text-amber-400">
            Recursos Vinculados (Destinação Específica)
          </span>
          <p className="mt-1 font-bold text-2xl text-foreground tracking-tight">
            {fmtCurrency(totalRecursosVinculados)}
          </p>
          <span className="text-muted-foreground text-xs">
            {fmtPercent(
              totalCaixaGeral > 0
                ? (totalRecursosVinculados / totalCaixaGeral) * 100
                : 0,
            )}{" "}
            do saldo total
          </span>
        </div>
      </div>

      {/* Grade de Cards por Entidade */}
      <div className="mt-6">
        <h3 className="mb-3 font-semibold text-foreground text-sm uppercase tracking-wider">
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
                className="flex flex-col justify-between rounded-lg border border-border/70 bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-muted p-1.5">
                        {getEntityIcon(entidade.entidadeNome)}
                      </div>
                      <div>
                        <h4 className="line-clamp-1 font-semibold text-foreground text-sm">
                          {entidade.entidadeNome ?? "Entidade Municipal"}
                        </h4>
                        {entidade.cnpj && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            CNPJ: {entidade.cnpj}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="rounded bg-muted/60 px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground uppercase">
                      {entidade.poderOrgao}
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
                      Saldo em Caixa e Bancos
                    </span>
                    <p className="font-bold text-foreground text-xl tracking-tight">
                      {fmtCurrency(entidade.saldoCaixaBancos)}
                    </p>
                  </div>

                  {/* Barra de Composição Proporcional */}
                  <div className="mt-3">
                    <div
                      className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
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
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Livres:
                      </span>
                      <span className="font-medium text-foreground">
                        {fmtCurrency(entidade.saldoRecursosLivres)} (
                        {fmtPercent(pctLivres)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Vinculados:
                      </span>
                      <span className="font-medium text-foreground">
                        {fmtCurrency(entidade.saldoRecursosVinculados)} (
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
