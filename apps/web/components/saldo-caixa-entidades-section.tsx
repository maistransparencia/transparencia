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
  Indicator,
  IndicatorPanel,
  SectionHeader,
  toTitleCase,
} from "@transparencia/ui";
import { AlertCircle, ExternalLink } from "lucide-react";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import { urlLegislacao } from "@/lib/constants/legislacao";
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

function descricaoPeriodoEvolucao(pontos: Array<{ mesNome: string }>): string {
  const primeiro = (pontos[0]?.mesNome ?? "").toLowerCase();
  const ultimo = (pontos[pontos.length - 1]?.mesNome ?? "").toLowerCase();
  if (pontos.length <= 1) return `Saldo dos recursos livres em ${primeiro}.`;
  return `Saldo dos recursos livres de ${primeiro} a ${ultimo}.`;
}

function getVariacaoTexto(variacao: number, anoAnterior: number): string {
  if (variacao === 0) return `Igual a ${anoAnterior}`;
  const valor = fmtPercent(
    Math.abs(variacao),
    Number.isInteger(variacao) ? 0 : 1,
  );
  return variacao > 0
    ? `${valor} a mais que em ${anoAnterior}`
    : `${valor} a menos que em ${anoAnterior}`;
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

  const linkSiconfi = (
    <a
      href={FONTES_OFICIAIS.siconfi.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-text inline-flex items-center gap-0.5 font-medium underline underline-offset-2"
    >
      <span>SICONFI</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
  const linkConstituicaoArt167 = (
    <a
      href={urlLegislacao("constituicao", "art167")}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-text inline-flex items-center gap-0.5 font-medium underline underline-offset-2"
    >
      <span>Constituição Federal, art. 167, XI</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
  const subtituloExecutivo = (
    <>
      Saldo das contas e aplicações da prefeitura e dos fundos, enviado todo mês
      ao Tesouro Nacional pelo {linkSiconfi}, sistema que recebe as contas dos
      municípios.
    </>
  );
  const subtituloPrevidencia = (
    <>
      Patrimônio financeiro exclusivo da previdência própria (RPPS), separado do
      caixa geral do município ({linkConstituicaoArt167}).
    </>
  );
  const tituloSecao = isPrevidencia
    ? "Caixa e aplicações da previdência"
    : "Dinheiro em caixa e nos bancos";
  const subtituloSecao = isPrevidencia
    ? subtituloPrevidencia
    : subtituloExecutivo;

  if (hasEntityFilter) {
    return (
      <section aria-label={tituloSecao} className={cn("space-y-4", className)}>
        <SectionHeader
          eyebrow="Consolidado municipal"
          title={tituloSecao}
          description={subtituloSecao}
        />

        <AlertBox type="info">
          <div className="text-xs leading-relaxed">
            <span className="font-semibold">
              Este saldo é do município todo.
            </span>{" "}
            O Tesouro Nacional informa o caixa da prefeitura e dos fundos
            juntos, então não dá para filtrar por secretaria. Para ver os
            saldos, escolha <strong>Todas as entidades</strong>.
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
    return (
      <section aria-label={tituloSecao} className={cn("space-y-4", className)}>
        <SectionHeader title={tituloSecao} description={subtituloSecao} />

        <div className="border-line flex flex-col items-center justify-center border-y p-8 text-center">
          <AlertCircle className="text-mute3 mb-2 h-8 w-8" />
          <p className="text-ink text-sm font-medium">
            Ainda não há dados de caixa de {ano}.
          </p>
          <p className="text-mute2 mt-1 max-w-md text-xs">
            O Tesouro Nacional ainda não validou o envio das contas. As
            prefeituras enviam todo mês, e o Tesouro confere antes de publicar.
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

  const tituloEntidades = isPrevidencia
    ? "Saldo de cada fundo previdenciário"
    : "Saldo de cada entidade";

  const eyebrowPosicao = `Posição em ${mesExtenso.toLowerCase()} de ${ano}`;

  return (
    <section aria-label={tituloSecao} className={cn("space-y-6", className)}>
      <SectionHeader
        eyebrow={eyebrowPosicao}
        title={tituloSecao}
        description={subtituloSecao}
        action={
          portalSlug ? (
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
          ) : undefined
        }
      />

      <div className="space-y-2">
        {isPrevidencia ? (
          <AlertBox type="info">
            <div className="text-xs leading-relaxed">
              <span className="font-semibold">
                Os recursos da previdência têm destino definido.
              </span>{" "}
              Servem para pagar aposentadorias e pensões e formar reservas, e
              não podem cobrir despesas de outros órgãos da prefeitura (
              {linkConstituicaoArt167}).
            </div>
          </AlertBox>
        ) : (
          <AlertBox type="warning">
            <div className="text-xs leading-relaxed">
              <span className="font-semibold">
                Atenção: dinheiro em caixa não é dinheiro sobrando.
              </span>{" "}
              A maior parte tem destino definido por lei, como saúde, educação e
              assistência social, e pode já estar reservada para contratos em
              andamento.
            </div>
          </AlertBox>
        )}

        {hasSaldoDescoberto && (
          <AlertBox type="danger">
            <div className="text-xs leading-relaxed">
              <span className="font-semibold">Merece atenção:</span>{" "}
              {isPrevidencia
                ? "há saldo negativo em contas da previdência, ou seja, saídas maiores que o dinheiro disponível. Vale acompanhar pelo Conselho Previdenciário e pelos órgãos de controle."
                : "em pelo menos uma fonte de recursos, os pagamentos superaram o que foi arrecadado até o mês. Pode ter explicação contábil. Vale conferir os detalhes no SICONFI."}
            </div>
          </AlertBox>
        )}
      </div>

      <IndicatorPanel>
        <Indicator
          label={
            isPrevidencia
              ? "Total em caixa e aplicações"
              : "Total em caixa e bancos"
          }
          value={fmtCompact(totalCaixa)}
          note={
            variacaoAnualTotal !== undefined && variacaoAnualTotal !== null
              ? getVariacaoTexto(variacaoAnualTotal, ano - 1)
              : undefined
          }
        />
        <Indicator
          label="Recursos livres"
          value={fmtCompact(totalLivres)}
          tone={totalLivres < 0 ? "danger" : "default"}
          note={`Podem ser usados em qualquer despesa${
            totalCaixa > 0
              ? ` (${fmtPercent(percentualLivresGeral, 0)} do total)`
              : ""
          }`}
        />
        <Indicator
          label={
            isPrevidencia ? "Recursos vinculados (RPPS)" : "Recursos vinculados"
          }
          value={fmtCompact(totalVinculados)}
          tone={totalVinculados < 0 ? "danger" : "default"}
          note={`Só podem ser usados na finalidade definida por lei${
            totalCaixa > 0
              ? ` (${fmtPercent(percentualVinculadosGeral, 0)} do total)`
              : ""
          }`}
        />
      </IndicatorPanel>

      {evolucaoMensal && evolucaoMensal.pontos.length > 0 && (
        <div className="panel panel-brand space-y-5 rounded-md! border! p-4! sm:p-6!">
          <div className="space-y-1">
            <h3>Como o caixa mudou mês a mês</h3>
            <p className="text-mute2 text-sm leading-relaxed">
              {descricaoPeriodoEvolucao(evolucaoMensal.pontos)}
            </p>
          </div>

          <IndicatorPanel bare size="sm">
            <Indicator
              label="Média mensal dos recursos livres"
              value={fmtCompact(evolucaoMensal.mediaRecursosLivres)}
              note="média dos saldos dos meses informados"
            />
            <Indicator
              label="Menor saldo do ano"
              value={fmtCompact(evolucaoMensal.minRecursosLivres)}
              note={`em ${(
                evolucaoMensal.pontos.find(
                  (p) =>
                    p.mesReferencia === evolucaoMensal.mesMinRecursosLivres,
                )?.mesNome ?? `mês ${evolucaoMensal.mesMinRecursosLivres}`
              ).toLowerCase()}`}
            />
            <Indicator
              label="Queda desde o maior saldo"
              value={
                evolucaoMensal.queimaPicoRecursosLivres > 0
                  ? fmtCompact(evolucaoMensal.queimaPicoRecursosLivres)
                  : "Sem queda"
              }
              note={
                evolucaoMensal.queimaPicoRecursosLivres > 0
                  ? "do mês de maior saldo até o último mês informado"
                  : "o último mês tem o maior saldo do ano"
              }
            />
          </IndicatorPanel>

          <SaldoCaixaEvolucaoMensalChart
            pontos={evolucaoMensal.pontos}
            ano={ano}
          />
        </div>
      )}

      {listaItens.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h3>{tituloEntidades}</h3>
            <p className="text-mute2 text-sm leading-relaxed">
              {isPrevidencia
                ? "A barra mostra quanto do saldo é livre e quanto é vinculado."
                : "Prefeitura e fundos municipais. A barra mostra quanto do saldo é livre e quanto é vinculado."}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    className="panel border-0! border-t-[3px]! px-0! py-4! sm:px-4!"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="line-clamp-2 min-h-12">
                        {toTitleCase(
                          entidade.entidadeNome ??
                            (isPrevidencia ? "RPPS" : "Entidade municipal"),
                        )}
                      </h4>
                      {entidade.saldoDescobertoFlag && (
                        <Badge variant="danger" className="shrink-0">
                          Saldo negativo
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 space-y-1">
                      <p
                        className={cn(
                          "stat-value",
                          entidade.saldoCaixaBancos < 0 && "text-danger-text",
                        )}
                      >
                        {fmtCompact(entidade.saldoCaixaBancos)}
                      </p>
                      {entidade.variacaoAnualPercentual !== undefined &&
                        entidade.variacaoAnualPercentual !== null && (
                          <p className="caption">
                            {getVariacaoTexto(
                              entidade.variacaoAnualPercentual,
                              ano - 1,
                            )}
                          </p>
                        )}
                    </div>

                    {entidade.saldoCaixaBancos < 0 ? (
                      <div className="border-danger-fill text-danger-text mt-3 border-l-2 py-1 pl-2.5 text-[11px] leading-snug">
                        Saldo negativo neste mês: os pagamentos superaram o que
                        entrou nesta entidade. Merece atenção.
                      </div>
                    ) : (
                      <div className="mt-3">
                        <div
                          className="bg-track flex h-2 w-full overflow-hidden"
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

                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="text-mute flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="bg-ok-fill h-2 w-2" />
                          Livres
                        </span>
                        <span
                          className={`font-medium ${
                            entidade.saldoRecursosLivres < 0
                              ? "text-danger-text"
                              : "text-ink"
                          }`}
                        >
                          {fmtCompact(entidade.saldoRecursosLivres)}
                          {entidade.saldoCaixaBancos > 0 &&
                            ` (${fmtPercent(percentualLivres, 0)})`}
                        </span>
                      </div>
                      <div className="text-mute flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="bg-warn-fill h-2 w-2" />
                          Vinculados
                        </span>
                        <span
                          className={`font-medium ${
                            entidade.saldoRecursosVinculados < 0
                              ? "text-danger-text"
                              : "text-ink"
                          }`}
                        >
                          {fmtCompact(entidade.saldoRecursosVinculados)}
                          {entidade.saldoCaixaBancos > 0 &&
                            ` (${fmtPercent(percentualVinculados, 0)})`}
                        </span>
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
