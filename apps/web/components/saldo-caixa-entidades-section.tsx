import type {
  EntidadeSaldoCaixaDTO,
  SiconfiPosicaoFinanceiraDTO,
} from "@transparencia/db";
import { fmtCompact, fmtPercent, toTitleCase } from "@transparencia/ui";
import { AlertCircle, ExternalLink, Info, ShieldCheck } from "lucide-react";
import { ShowYourWorkButton } from "./show-your-work-button";

export interface SaldoCaixaEntidadesSectionProps {
  posicaoFinanceira?: SiconfiPosicaoFinanceiraDTO | null;
  ano: number;
  portalSlug?: string;
  hasEntityFilter?: boolean;
  className?: string;
  scope?: "executivo" | "previdencia";
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
  hasEntityFilter = false,
  className = "",
  scope = "executivo",
}: SaldoCaixaEntidadesSectionProps) {
  const isPrevidencia = scope === "previdencia";

  if (hasEntityFilter) {
    return (
      <section
        aria-label="Disponibilidade Financeira em Caixa e Bancos"
        className={`rounded-2xl border border-[#e7e9ee] bg-white p-6 shadow-sm ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-bold text-ink text-xl tracking-tight">
              Disponibilidade Financeira em Caixa e Bancos
            </h2>
            <p className="text-sm text-subtleText">
              Contas bancárias e aplicações homologadas pela Secretaria do
              Tesouro Nacional (STN / SICONFI).
            </p>
          </div>
          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 text-xs">
            Visão Consolidada
          </span>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-200/80 bg-blue-50/60 p-4 text-blue-950 text-xs">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
          <div className="leading-relaxed">
            <span className="font-semibold text-blue-900">
              Disponibilidade contábil exibida na visão consolidada municipal.
            </span>{" "}
            Os saldos da Matriz de Saldos Contábeis (MSC / SICONFI) são
            reportados pela Secretaria do Tesouro Nacional como a
            disponibilidade financeira macro de todo o Poder Executivo
            (Prefeitura e Fundos Municipais). Para visualizar os saldos de caixa
            e bancos, desmarque os filtros de órgãos específicos e selecione{" "}
            <strong>Todas as entidades</strong>.
          </div>
        </div>
      </section>
    );
  }

  const listaItens = isPrevidencia
    ? (posicaoFinanceira?.previdencia ?? [])
    : (posicaoFinanceira?.entidades ?? []);

  const temDados = Boolean(posicaoFinanceira) && listaItens.length > 0;

  if (!temDados || !posicaoFinanceira) {
    const tituloVazio = isPrevidencia
      ? "Disponibilidade em Caixa e Aplicações do RPPS"
      : "Disponibilidade Financeira em Caixa e Bancos";
    const subtituloVazio = isPrevidencia
      ? "Contas bancárias e carteira de investimentos exclusivos do Regime Próprio de Previdência Social (CAPREM), conforme Matriz de Saldos Contábeis homologada pelo Tesouro Nacional."
      : "Contas bancárias ativas e aplicações de liquidez imediata declaradas mensalmente ao Tesouro Nacional.";
    const mensagemVazia = isPrevidencia
      ? `Aguardando homologação da remessa MSC pelo Tesouro Nacional para o fundo previdenciário no exercício ${ano}.`
      : `Aguardando homologação da remessa MSC pelo Tesouro Nacional para o exercício ${ano}.`;

    return (
      <section
        aria-label={tituloVazio}
        className={`rounded-2xl border border-[#e7e9ee] bg-white p-6 shadow-sm ${className}`}
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-ink text-xl tracking-tight">
              {tituloVazio}
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
          <p className="text-sm text-subtleText leading-relaxed">
            {subtituloVazio}
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-[#e7e9ee] border-dashed bg-slate-50/50 p-8 text-center">
          <AlertCircle className="mb-2 h-8 w-8 text-subtleText/60" />
          <p className="font-medium text-ink text-sm">{mensagemVazia}</p>
          <p className="mt-1 max-w-md text-subtleText text-xs">
            As remessas da Matriz de Saldos Contábeis são submetidas mensalmente
            pelos entes federados e passam por validação contábil no SICONFI.
          </p>
        </div>
      </section>
    );
  }

  const mesMaisRecente = isPrevidencia
    ? (listaItens[0]?.mesReferencia ?? posicaoFinanceira.mesMaisRecente)
    : posicaoFinanceira.mesMaisRecente;
  const mesExtenso = getMesNome(mesMaisRecente);

  const totalCaixa = isPrevidencia
    ? posicaoFinanceira.totalCaixaPrevidencia
    : posicaoFinanceira.totalCaixaGeral;

  const totalLivres = isPrevidencia
    ? listaItens.reduce(
        (acc: number, item: EntidadeSaldoCaixaDTO) =>
          acc + item.saldoRecursosLivres,
        0,
      )
    : posicaoFinanceira.totalRecursosLivres;

  const totalVinculados = isPrevidencia
    ? posicaoFinanceira.totalRecursosPrevidencia
    : posicaoFinanceira.totalRecursosVinculados;

  const variacaoAnualTotal = isPrevidencia
    ? (listaItens[0]?.variacaoAnualPct ?? null)
    : posicaoFinanceira.variacaoAnualPct;

  const hasSaldoDescoberto = isPrevidencia
    ? listaItens.some((item: EntidadeSaldoCaixaDTO) => item.saldoDescobertoFlag)
    : posicaoFinanceira.hasSaldoDescoberto;

  const pctLivresGeral = (() => {
    if (totalCaixa <= 0) return 0;
    return (totalLivres / totalCaixa) * 100;
  })();

  const pctVinculadosGeral = (() => {
    if (totalCaixa <= 0) return 0;
    return (totalVinculados / totalCaixa) * 100;
  })();

  const tituloSecao = isPrevidencia
    ? "Disponibilidade em Caixa e Aplicações do RPPS"
    : "Disponibilidade Financeira em Caixa e Bancos";

  const subtituloSecao = isPrevidencia
    ? "Patrimônio financeiro exclusivo da previdência própria (CAPREM), segregado do caixa geral do município (CF art. 167, XI)."
    : "Contas bancárias ativas e aplicações de liquidez imediata declaradas mensalmente ao Tesouro Nacional.";

  const tituloEntidades = isPrevidencia
    ? "Saldos Discriminados por Fundo Previdenciário"
    : "Saldos Discriminados por Entidade";

  return (
    <section
      aria-label={tituloSecao}
      className={`rounded-2xl border border-[#e7e9ee] bg-white p-6 shadow-sm ${className}`}
    >
      {/* Header com Título, Subtítulo, Badges e ShowYourWork */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-bold text-ink text-xl tracking-tight">
            {tituloSecao}
          </h2>
          <p className="text-sm text-subtleText">{subtituloSecao}</p>
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

        {portalSlug && (
          <ShowYourWorkButton
            portalSlug={portalSlug}
            ano={ano}
            tipo="saldo_caixa_siconfi"
            entidades={isPrevidencia ? "previdencia" : "executivo"}
            tituloContexto={
              isPrevidencia
                ? "Previdência Municipal (CAPREM)"
                : "Disponibilidade Financeira SICONFI"
            }
          />
        )}
      </div>

      {/* Callouts Didáticos e de Prevenção de Desinformação */}
      <div className="mt-4 space-y-2">
        {isPrevidencia ? (
          <div className="flex items-start gap-3 rounded-xl border border-blue-200/80 bg-blue-50/70 p-4 text-blue-950 text-xs">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
            <div className="leading-relaxed">
              <span className="font-semibold text-blue-900">
                Segregação Constitucional (CF art. 167, XI):
              </span>{" "}
              Os recursos do Regime Próprio de Previdência Social (CAPREM) são
              legalmente vinculados ao custeio de aposentadorias e pensões e à
              formação de reservas atuariais. É terminantemente proibida sua
              utilização para cobrir despesas de outros órgãos da Prefeitura.
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 text-amber-900 text-xs">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="leading-relaxed">
              <span className="font-semibold">
                Atenção: Saldo em caixa não é dinheiro &quot;sobrando&quot;.
              </span>{" "}
              A maior parte dos recursos bancários municipais possui destinação
              legal vinculada (saúde, educação, assistência social) e já se
              encontra comprometida com restos a pagar de contratos em
              andamento.
            </div>
          </div>
        )}

        {hasSaldoDescoberto && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-rose-950 text-xs">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
            <div className="leading-relaxed">
              <span className="font-semibold text-rose-900">
                {isPrevidencia
                  ? "Aviso de Insuficiência Financeira no RPPS:"
                  : "Atenção técnica: Ocorrência de saldo a descoberto (insuficiência financeira na fonte)."}
              </span>{" "}
              {isPrevidencia
                ? "Identificou-se saldo a descoberto em contas bancárias da previdência (saídas superiores às disponibilidades imediatas). Essa ocorrência requer acompanhamento do Conselho Previdenciário e dos órgãos de controle externo (TCE)."
                : "Na contabilidade pública oficial (PCASP/STN), um saldo negativo indica que o volume de pagamentos realizados superou a arrecadação acumulada naquela destinação específica até o encerramento da competência. Na prática bancária da tesouraria, esse descompasso é temporariamente absorvido pelas disponibilidades de outras contas vinculadas com superávit. Essa compensação entre fontes é acompanhada com rigor pelos órgãos de controle externo (Tribunais de Contas) para resguardar a finalidade legal de cada vinculação."}
            </div>
          </div>
        )}
      </div>

      {/* Resumo Consolidado Municipal ou RPPS */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e7e9ee] bg-slate-50/50 p-4">
          <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
            {isPrevidencia
              ? "Total em Caixa e Aplicações"
              : "Total Disponível em Caixa"}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-bold font-serif text-2xl text-ink tracking-tight">
              {fmtCompact(totalCaixa)}
            </p>
            {variacaoAnualTotal !== undefined &&
              variacaoAnualTotal !== null && (
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium text-[11px] ${
                    variacaoAnualTotal > 0
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : variacaoAnualTotal < 0
                        ? "border border-rose-200 bg-rose-50 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {variacaoAnualTotal > 0
                    ? `+${variacaoAnualTotal}%`
                    : `${variacaoAnualTotal}%`}{" "}
                  vs. {ano - 1}
                </span>
              )}
          </div>
        </div>
        <div className="rounded-xl border border-[#e7e9ee] bg-slate-50/50 p-4">
          <span className="font-medium text-emerald-800 text-xs uppercase tracking-wider">
            {isPrevidencia ? "Recursos Ordinários / Livres" : "Recursos Livres"}
          </span>
          <p
            className={`mt-1 font-bold font-serif text-2xl tracking-tight ${
              totalLivres < 0 ? "text-rose-700" : "text-ink"
            }`}
          >
            {fmtCompact(totalLivres)}
          </p>
          <span className="text-subtleText text-xs">
            {totalCaixa > 0
              ? `${fmtPercent(pctLivresGeral)} do saldo total`
              : "Saldo livre no exercício"}
          </span>
        </div>
        <div className="rounded-xl border border-[#e7e9ee] bg-slate-50/50 p-4">
          <span className="font-medium text-amber-800 text-xs uppercase tracking-wider">
            {isPrevidencia
              ? "Recursos Vinculados (RPPS)"
              : "Recursos Vinculados"}
          </span>
          <p
            className={`mt-1 font-bold font-serif text-2xl tracking-tight ${
              totalVinculados < 0 ? "text-rose-700" : "text-ink"
            }`}
          >
            {fmtCompact(totalVinculados)}
          </p>
          <span className="text-subtleText text-xs">
            {totalCaixa > 0
              ? `${fmtPercent(pctVinculadosGeral)} do saldo total`
              : "Saldo vinculado no exercício"}
          </span>
        </div>
      </div>

      {/* Grade de Cards por Entidade ou Fundo Previdenciário */}
      {listaItens.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 font-semibold text-ink text-sm tracking-wider">
            {tituloEntidades}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listaItens.map(
              (entidade: EntidadeSaldoCaixaDTO, index: number) => {
                const total = Math.max(entidade.saldoCaixaBancos, 0.01);
                const pctLivres =
                  entidade.saldoCaixaBancos > 0
                    ? Math.min(
                        Math.max(
                          (entidade.saldoRecursosLivres / total) * 100,
                          0,
                        ),
                        100,
                      )
                    : 0;
                const pctVinculados =
                  entidade.saldoCaixaBancos > 0
                    ? Math.min(
                        Math.max(
                          (entidade.saldoRecursosVinculados / total) * 100,
                          0,
                        ),
                        100,
                      )
                    : 0;

                return (
                  <div
                    key={entidade.empresaId ?? entidade.entidadeNome ?? index}
                    className="flex flex-col justify-between rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-sm transition-all hover:border-[#cbd0db]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="line-clamp-2 min-h-12 font-bold text-base text-ink">
                          {toTitleCase(
                            entidade.entidadeNome ??
                              (isPrevidencia ? "CAPREM" : "Entidade Municipal"),
                          )}
                        </h4>
                        {entidade.saldoDescobertoFlag && (
                          <span className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-[10px] text-rose-800">
                            Saldo a Descoberto
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        <span className="font-medium text-subtleText text-xs uppercase tracking-wide">
                          Saldo em Caixa e Bancos
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                          <p
                            className={`font-bold font-serif text-2xl tracking-tight ${
                              entidade.saldoCaixaBancos < 0
                                ? "text-rose-700"
                                : "text-ink"
                            }`}
                          >
                            {fmtCompact(entidade.saldoCaixaBancos)}
                          </p>
                          {entidade.variacaoAnualPct !== undefined &&
                            entidade.variacaoAnualPct !== null && (
                              <span
                                className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium text-[11px] ${
                                  entidade.variacaoAnualPct > 0
                                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : entidade.variacaoAnualPct < 0
                                      ? "border border-rose-200 bg-rose-50 text-rose-700"
                                      : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {entidade.variacaoAnualPct > 0
                                  ? `+${entidade.variacaoAnualPct}%`
                                  : `${entidade.variacaoAnualPct}%`}{" "}
                                vs. {ano - 1}
                              </span>
                            )}
                        </div>
                      </div>

                      {/* Barra de Composição Proporcional ou Aviso de Saldo Negativo */}
                      {entidade.saldoCaixaBancos < 0 ? (
                        <div className="mt-3 rounded-lg border border-rose-200/70 bg-rose-50/50 p-2.5 text-[11px] text-rose-800 leading-snug">
                          Insuficiência financeira na competência (saídas de
                          caixa superaram a arrecadação própria acumulada).
                        </div>
                      ) : (
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
                      )}

                      {/* Detalhamento Livres vs Vinculados */}
                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-subtleText">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Livres:
                          </span>
                          <span
                            className={`font-medium ${
                              entidade.saldoRecursosLivres < 0
                                ? "text-rose-700"
                                : "text-ink"
                            }`}
                          >
                            {fmtCompact(entidade.saldoRecursosLivres)}{" "}
                            {entidade.saldoCaixaBancos > 0 &&
                              `(${fmtPercent(pctLivres)})`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-subtleText">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Vinculados:
                          </span>
                          <span
                            className={`font-medium ${
                              entidade.saldoRecursosVinculados < 0
                                ? "text-rose-700"
                                : "text-ink"
                            }`}
                          >
                            {fmtCompact(entidade.saldoRecursosVinculados)}{" "}
                            {entidade.saldoCaixaBancos > 0 &&
                              `(${fmtPercent(pctVinculados)})`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}
    </section>
  );
}
