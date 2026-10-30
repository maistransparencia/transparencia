import type {
  EntidadeSaldoCaixaDTO,
  SiconfiEvolucaoMensalDTO,
  SiconfiPosicaoFinanceiraDTO,
} from "@transparencia/db";
import {
  AlertBox,
  Badge,
  cn,
  fmtCompact,
  fmtPercent,
  KPICard,
  SectionHeader,
  toTitleCase,
} from "@transparencia/ui";
import { AlertCircle, ExternalLink } from "lucide-react";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import { KPIGrid } from "./kpi-grid";
import { SaldoCaixaEvolucaoMensalChart } from "./saldo-caixa-evolucao-mensal-chart";
import { ShowYourWorkButton } from "./show-your-work-button";

export interface SaldoCaixaEntidadesSectionProps {
  posicaoFinanceira?: SiconfiPosicaoFinanceiraDTO | null;
  evolucaoMensal?: SiconfiEvolucaoMensalDTO | null;
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

function getVariacaoBadgeClass(variacao: number): string {
  if (variacao > 0) {
    return "border border-ok-text/40 bg-ok-fill/10 text-ok-text";
  }
  if (variacao < 0) {
    return "border border-danger-text/40 bg-danger-fill/10 text-danger-text";
  }
  return "bg-line2 text-mute2";
}

export function SaldoCaixaEntidadesSection({
  posicaoFinanceira,
  evolucaoMensal,
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
        className={cn("space-y-4", className)}
      >
        <SectionHeader
          title="Disponibilidade Financeira em Caixa e Bancos"
          description="Contas bancárias e aplicações homologadas pela Secretaria do Tesouro Nacional (STN / SICONFI)."
          action={<Badge>Visão Consolidada</Badge>}
        />

        <AlertBox type="info">
          <div className="text-xs leading-relaxed">
            <span className="font-semibold">
              Disponibilidade contábil exibida na visão consolidada municipal.
            </span>{" "}
            Os saldos da Matriz de Saldos Contábeis (MSC / SICONFI) são
            reportados pela Secretaria do Tesouro Nacional como a
            disponibilidade financeira macro de todo o Poder Executivo
            (Prefeitura e Fundos Municipais). Para visualizar os saldos de caixa
            e bancos, desmarque os filtros de órgãos específicos e selecione{" "}
            <strong>Todas as entidades</strong>.
          </div>
        </AlertBox>
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
      ? "Contas bancárias e carteira de investimentos exclusivos do Regime Próprio de Previdência Social (RPPS), conforme Matriz de Saldos Contábeis homologada pelo Tesouro Nacional."
      : "Contas bancárias ativas e aplicações de liquidez imediata declaradas mensalmente ao Tesouro Nacional.";
    const mensagemVazia = isPrevidencia
      ? `Aguardando homologação da remessa MSC pelo Tesouro Nacional para o fundo previdenciário no exercício ${ano}.`
      : `Aguardando homologação da remessa MSC pelo Tesouro Nacional para o exercício ${ano}.`;

    return (
      <section aria-label={tituloVazio} className={cn("space-y-4", className)}>
        <SectionHeader
          title={tituloVazio}
          description={subtituloVazio}
          action={
            <a
              href={FONTES_OFICIAIS.siconfi.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-sm border border-brand/40 bg-brand/10 px-2 py-0.5 font-medium text-[11px] text-brand-text transition-colors hover:bg-brand/20"
              title="Matriz de Saldos Contábeis (MSC) homologada pela Secretaria do Tesouro Nacional"
            >
              <span>SICONFI</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          }
        />

        <div className="flex flex-col items-center justify-center border-line border-y p-8 text-center">
          <AlertCircle className="mb-2 h-8 w-8 text-mute3" />
          <p className="font-medium text-ink text-sm">{mensagemVazia}</p>
          <p className="mt-1 max-w-md text-mute2 text-xs">
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
    ? (listaItens[0]?.variacaoAnualPercentual ?? null)
    : posicaoFinanceira.variacaoAnualPercentual;

  const hasSaldoDescoberto = isPrevidencia
    ? listaItens.some((item: EntidadeSaldoCaixaDTO) => item.saldoDescobertoFlag)
    : posicaoFinanceira.hasSaldoDescoberto;

  const percentualLivresGeral = (() => {
    if (totalCaixa <= 0) return 0;
    return (totalLivres / totalCaixa) * 100;
  })();

  const percentualVinculadosGeral = (() => {
    if (totalCaixa <= 0) return 0;
    return (totalVinculados / totalCaixa) * 100;
  })();

  const tituloSecao = isPrevidencia
    ? "Disponibilidade em Caixa e Aplicações do RPPS"
    : "Disponibilidade Financeira em Caixa e Bancos";

  const subtituloSecao = isPrevidencia
    ? "Patrimônio financeiro exclusivo da previdência própria (RPPS), segregado do caixa geral do município (CF art. 167, XI)."
    : "Contas bancárias ativas e aplicações de liquidez imediata declaradas mensalmente ao Tesouro Nacional.";

  const tituloEntidades = isPrevidencia
    ? "Saldos Discriminados por Fundo Previdenciário"
    : "Saldos Discriminados por Entidade";

  return (
    <section aria-label={tituloSecao} className={cn("space-y-6", className)}>
      <SectionHeader
        title={tituloSecao}
        description={subtituloSecao}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">
              Posição: {mesExtenso}/{ano}
            </Badge>
            <a
              href={FONTES_OFICIAIS.siconfi.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-line2/40 px-3 py-1 font-medium text-mute2 text-xs transition-colors hover:text-ink"
            >
              <span>SICONFI</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            {portalSlug && (
              <ShowYourWorkButton
                portalSlug={portalSlug}
                ano={ano}
                tipo="saldo_caixa_siconfi"
                entidades={isPrevidencia ? "previdencia" : "executivo"}
                tituloContexto={
                  isPrevidencia
                    ? "Previdência Municipal (RPPS)"
                    : "Disponibilidade Financeira SICONFI"
                }
              />
            )}
          </div>
        }
      />

      <div className="space-y-2">
        {isPrevidencia ? (
          <AlertBox type="info">
            <div className="text-xs leading-relaxed">
              <span className="font-semibold">
                Segregação Constitucional (CF art. 167, XI):
              </span>{" "}
              Os recursos do Regime Próprio de Previdência Social (RPPS) são
              legalmente vinculados ao custeio de aposentadorias e pensões e à
              formação de reservas atuariais. É terminantemente proibida sua
              utilização para cobrir despesas de outros órgãos da Prefeitura.
            </div>
          </AlertBox>
        ) : (
          <AlertBox type="warning">
            <div className="text-xs leading-relaxed">
              <span className="font-semibold">
                Atenção: Saldo em caixa não é dinheiro &quot;sobrando&quot;.
              </span>{" "}
              A maior parte dos recursos bancários municipais possui destinação
              legal vinculada (saúde, educação, assistência social) e já se
              encontra comprometida com restos a pagar de contratos em
              andamento.
            </div>
          </AlertBox>
        )}

        {hasSaldoDescoberto && (
          <AlertBox type="danger">
            <div className="text-xs leading-relaxed">
              <span className="font-semibold">
                {isPrevidencia
                  ? "Aviso de Insuficiência Financeira no RPPS:"
                  : "Atenção técnica: Ocorrência de saldo a descoberto (insuficiência financeira na fonte)."}
              </span>{" "}
              {isPrevidencia
                ? "Identificou-se saldo a descoberto em contas bancárias da previdência (saídas superiores às disponibilidades imediatas). Essa ocorrência requer acompanhamento do Conselho Previdenciário e dos órgãos de controle externo (TCE)."
                : "Na contabilidade pública oficial (PCASP/STN), um saldo negativo indica que o volume de pagamentos realizados superou a arrecadação acumulada naquela destinação específica até o encerramento da competência. Na prática bancária da tesouraria, esse descompasso é temporariamente absorvido pelas disponibilidades de outras contas vinculadas com superávit. Essa compensação entre fontes é acompanhada com rigor pelos órgãos de controle externo (Tribunais de Contas) para resguardar a finalidade legal de cada vinculação."}
            </div>
          </AlertBox>
        )}
      </div>

      <dl className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="py-3 sm:pr-5">
          <dt className="eyebrow">
            {isPrevidencia
              ? "Total em Caixa e Aplicações"
              : "Total Disponível em Caixa"}
          </dt>
          <dd className="mt-1 flex items-center gap-2">
            <span className="stat-value">{fmtCompact(totalCaixa)}</span>
            {variacaoAnualTotal !== undefined &&
              variacaoAnualTotal !== null && (
                <span
                  className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-medium text-[11px] ${getVariacaoBadgeClass(
                    variacaoAnualTotal,
                  )}`}
                >
                  {variacaoAnualTotal > 0
                    ? `+${variacaoAnualTotal}%`
                    : `${variacaoAnualTotal}%`}{" "}
                  vs. {ano - 1}
                </span>
              )}
          </dd>
        </div>
        <div className="py-3 sm:px-5">
          <dt className="eyebrow">
            {isPrevidencia ? "Recursos Ordinários / Livres" : "Recursos Livres"}
          </dt>
          <dd
            className={cn(
              "stat-value mt-1",
              totalLivres < 0 && "text-danger-text",
            )}
          >
            {fmtCompact(totalLivres)}
          </dd>
          <dd className="caption">
            {totalCaixa > 0
              ? `${fmtPercent(percentualLivresGeral)} do saldo total`
              : "Saldo livre no exercício"}
          </dd>
        </div>
        <div className="py-3 sm:pl-5">
          <dt className="eyebrow">
            {isPrevidencia
              ? "Recursos Vinculados (RPPS)"
              : "Recursos Vinculados"}
          </dt>
          <dd
            className={cn(
              "stat-value mt-1",
              totalVinculados < 0 && "text-danger-text",
            )}
          >
            {fmtCompact(totalVinculados)}
          </dd>
          <dd className="caption">
            {totalCaixa > 0
              ? `${fmtPercent(percentualVinculadosGeral)} do saldo total`
              : "Saldo vinculado no exercício"}
          </dd>
        </div>
      </dl>

      {/* Evolução Mensal e Queima de Caixa no Exercício */}
      {evolucaoMensal && evolucaoMensal.pontos.length > 0 && (
        <div className="space-y-4 border-line border-t pt-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3>Evolução Mensal e Queima de Caixa no Exercício</h3>
              <p className="caption">
                Acompanhamento da liquidez de recursos livres e do piso
                operacional mês a mês (SICONFI / STN).
              </p>
            </div>
            <Badge>{evolucaoMensal.pontos.length} competências apuradas</Badge>
          </div>

          <KPIGrid columns={3} variant="divisoria">
            <KPICard
              variant="divisoria"
              title="Média Mensal (Recursos Livres)"
              value={fmtCompact(evolucaoMensal.mediaRecursosLivres)}
              subtext="Média aritmética de saldo livre no exercício"
              accent
            />
            <KPICard
              variant="divisoria"
              title="Piso Operacional no Ano"
              value={fmtCompact(evolucaoMensal.minRecursosLivres)}
              subtext={`Mínima em ${
                evolucaoMensal.pontos.find(
                  (p) =>
                    p.mesReferencia === evolucaoMensal.mesMinRecursosLivres,
                )?.mesNome ?? `Mês ${evolucaoMensal.mesMinRecursosLivres}`
              }`}
            />
            <KPICard
              variant="divisoria"
              title="Queima Intra-anual de Caixa"
              value={
                evolucaoMensal.queimaPicoRecursosLivres > 0
                  ? `${fmtCompact(evolucaoMensal.queimaPicoRecursosLivres)} consumidos`
                  : "Estável / Superávit"
              }
              subtext={
                evolucaoMensal.variacaoIntraAnualLivresPct !== null
                  ? `${
                      evolucaoMensal.variacaoIntraAnualLivresPct > 0 ? "+" : ""
                    }${evolucaoMensal.variacaoIntraAnualLivresPct}% (Abertura → Fechamento)`
                  : "Competência inicial do exercício"
              }
              trend={
                evolucaoMensal.variacaoIntraAnualLivresPct !== null
                  ? {
                      value: `${evolucaoMensal.variacaoIntraAnualLivresPct}%`,
                      isPositive:
                        evolucaoMensal.variacaoIntraAnualLivresPct >= 0,
                    }
                  : undefined
              }
            />
          </KPIGrid>

          <div className="border-line border-y py-4">
            <SaldoCaixaEvolucaoMensalChart
              pontos={evolucaoMensal.pontos}
              ano={ano}
            />
          </div>
        </div>
      )}

      {/* Grade de Cards por Entidade ou Fundo Previdenciário */}
      {listaItens.length > 0 && (
        <div className="space-y-4">
          <h3>{tituloEntidades}</h3>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {listaItens.map(
              (entidade: EntidadeSaldoCaixaDTO, index: number) => {
                const total = Math.max(entidade.saldoCaixaBancos, 0.01);
                const percentualLivres =
                  entidade.saldoCaixaBancos > 0
                    ? Math.min(
                        Math.max(
                          (entidade.saldoRecursosLivres / total) * 100,
                          0,
                        ),
                        100,
                      )
                    : 0;
                const percentualVinculados =
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
                    className="flex flex-col justify-between border-line border-t py-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="line-clamp-2 min-h-12">
                          {toTitleCase(
                            entidade.entidadeNome ??
                              (isPrevidencia ? "RPPS" : "Entidade Municipal"),
                          )}
                        </h4>
                        {entidade.saldoDescobertoFlag && (
                          <span className="shrink-0 rounded-sm border border-danger-text/40 bg-danger-fill/10 px-2 py-0.5 font-semibold text-[11px] text-danger-text">
                            Saldo a Descoberto
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        <div className="mt-1 flex items-center gap-2">
                          <p
                            className={cn(
                              "stat-value",
                              entidade.saldoCaixaBancos < 0 &&
                                "text-danger-text",
                            )}
                          >
                            {fmtCompact(entidade.saldoCaixaBancos)}
                          </p>
                          {entidade.variacaoAnualPercentual !== undefined &&
                            entidade.variacaoAnualPercentual !== null && (
                              <span
                                className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-medium text-[11px] ${getVariacaoBadgeClass(
                                  entidade.variacaoAnualPercentual,
                                )}`}
                              >
                                {entidade.variacaoAnualPercentual > 0
                                  ? `+${entidade.variacaoAnualPercentual}%`
                                  : `${entidade.variacaoAnualPercentual}%`}{" "}
                                vs. {ano - 1}
                              </span>
                            )}
                        </div>
                      </div>

                      {/* Barra de Composição Proporcional ou Aviso de Saldo Negativo */}
                      {entidade.saldoCaixaBancos < 0 ? (
                        <div className="mt-3 border-danger-fill border-l-2 py-1 pl-2.5 text-[11px] text-danger-text leading-snug">
                          Insuficiência financeira na competência (saídas de
                          caixa superaram a arrecadação própria acumulada).
                        </div>
                      ) : (
                        <div className="mt-3">
                          <div
                            className="flex h-2 w-full overflow-hidden bg-track"
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
                              className="bg-warn-fill transition-all duration-300"
                              style={{ width: `${percentualVinculados}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Detalhamento Livres vs Vinculados */}
                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-mute">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 bg-ok-fill" />
                            Livres:
                          </span>
                          <span
                            className={`font-medium ${
                              entidade.saldoRecursosLivres < 0
                                ? "text-danger-text"
                                : "text-ink"
                            }`}
                          >
                            {fmtCompact(entidade.saldoRecursosLivres)}{" "}
                            {entidade.saldoCaixaBancos > 0 &&
                              `(${fmtPercent(percentualLivres)})`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-mute">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 bg-warn-fill" />
                            Vinculados:
                          </span>
                          <span
                            className={`font-medium ${
                              entidade.saldoRecursosVinculados < 0
                                ? "text-danger-text"
                                : "text-ink"
                            }`}
                          >
                            {fmtCompact(entidade.saldoRecursosVinculados)}{" "}
                            {entidade.saldoCaixaBancos > 0 &&
                              `(${fmtPercent(percentualVinculados)})`}
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
