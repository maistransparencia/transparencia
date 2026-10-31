"use client";

import {
  Badge,
  cn,
  corDoGrafico,
  fmtCompact,
  fmtCurrency,
  fmtPercent,
  KPICard,
  SectionHeader,
} from "@transparencia/ui";
import { AlertCircle, ExternalLink, Info, Scale, Users } from "lucide-react";
import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  PrevidenciaPatrimonioHistoricoPonto,
  PrevidenciaPatrimonioHistoricoResumo,
} from "@/app/[portalSlug]/previdencia/view-model";
import { KPIGrid } from "@/components/kpi-grid";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import { urlLegislacao } from "@/lib/constants/legislacao";

export interface PrevidenciaPatrimonioHistoricoSectionProps {
  resumo: PrevidenciaPatrimonioHistoricoResumo;
  selectedYear: number;
  className?: string;
  previdenciaSigla?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    value?: unknown;
    payload?: PrevidenciaPatrimonioHistoricoPonto;
  }>;
}

function formatVariacaoTooltip(ponto: PrevidenciaPatrimonioHistoricoPonto) {
  if (ponto.quebraSerieFlag) {
    return (
      <span className="font-semibold text-mute">N/D (Quebra de Série)</span>
    );
  }
  if (ponto.variacaoPatrimonioPct !== null) {
    const isPositive = ponto.variacaoPatrimonioPct >= 0;
    return (
      <span
        className={
          isPositive
            ? "font-semibold text-ok-text"
            : "font-semibold text-danger-text"
        }
      >
        {isPositive
          ? `+${fmtPercent(ponto.variacaoPatrimonioPct)}`
          : fmtPercent(ponto.variacaoPatrimonioPct)}
      </span>
    );
  }
  return <span className="text-mute2">--</span>;
}

function renderCustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const ponto = payload[0]?.payload;
  if (!ponto) {
    return null;
  }

  const patrimonioStr =
    ponto.patrimonioFinanceiroTotal !== null
      ? fmtCurrency(ponto.patrimonioFinanceiroTotal)
      : "Não informado";

  return (
    <div className="pointer-events-none w-[220px] space-y-1 border border-line bg-page/95 p-2.5 text-xs backdrop-blur-xs sm:w-[250px]">
      <div className="flex items-center justify-between border-line border-b pb-1 font-semibold text-ink">
        <span>Exercício {ponto.ano}</span>
        {ponto.inconsistenciaDeclaracaoFlag && (
          <Badge
            variant="warning"
            className="shrink-0 whitespace-nowrap px-1.5 py-0 text-xs"
          >
            Inconsistência MSC
          </Badge>
        )}
      </div>
      <div className="flex items-baseline justify-between pt-0.5">
        <span className="text-mute2 text-xs">Patrimônio:</span>
        <span className="font-bold text-ink text-xs tabular-nums">
          {patrimonioStr}
        </span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-mute2 text-xs">Variação:</span>
        <span className="font-medium tabular-nums">
          {formatVariacaoTooltip(ponto)}
        </span>
      </div>
      {ponto.inconsistenciaDeclaracaoFlag && (
        <p className="mt-1 rounded bg-warn-fill/15 p-1.5 text-warn-text text-xs leading-tight">
          Aplicações financeiras omitidas pelo ente na remessa da MSC ao
          SICONFI.
        </p>
      )}
      {ponto.quebraSerieFlag && (
        <p className="mt-1 rounded bg-line2 p-1.5 text-mute text-xs leading-tight">
          {ponto.anoInconsistenciaAnterior
            ? `Série normalizada após omissão contábil de ${ponto.anoInconsistenciaAnterior}.`
            : "Série normalizada após omissão contábil anterior."}
        </p>
      )}
    </div>
  );
}

function renderVariacaoTabela(p: PrevidenciaPatrimonioHistoricoPonto) {
  if (p.quebraSerieFlag) {
    return <span className="font-semibold text-mute">N/D</span>;
  }
  if (p.variacaoPatrimonioPct === null) {
    return <span className="text-mute2">--</span>;
  }
  if (p.variacaoPatrimonioPct >= 0) {
    return (
      <span className="whitespace-nowrap font-medium text-ok-text">
        +{fmtPercent(p.variacaoPatrimonioPct)}
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap font-medium text-danger-text">
      {fmtPercent(p.variacaoPatrimonioPct)}
    </span>
  );
}

function renderNotaMetodologica(p: PrevidenciaPatrimonioHistoricoPonto) {
  if (p.inconsistenciaDeclaracaoFlag) {
    return (
      <div className="flex flex-col items-start gap-1 py-0.5">
        <Badge
          variant="warning"
          className="shrink-0 whitespace-nowrap px-2 py-0.5 text-xs"
        >
          Inconsistência de Declaração na MSC
        </Badge>
        <span className="text-mute text-xs leading-snug">
          Aplicações financeiras omitidas na remessa ao SICONFI
        </span>
      </div>
    );
  }
  if (p.quebraSerieFlag) {
    const textoQuebra = p.anoInconsistenciaAnterior
      ? `Série normalizada após omissão contábil de ${p.anoInconsistenciaAnterior}`
      : "Série normalizada após omissão contábil anterior";
    return (
      <div className="flex flex-col items-start gap-1 py-0.5">
        <Badge
          variant="warning"
          className="shrink-0 whitespace-nowrap px-2 py-0.5 text-xs"
        >
          Quebra de Série Metodológica
        </Badge>
        <span className="text-mute text-xs leading-snug">{textoQuebra}</span>
      </div>
    );
  }
  return (
    <span className="text-mute2 text-xs">Declaração homologada regular</span>
  );
}

export function PrevidenciaPatrimonioHistoricoSection({
  resumo,
  selectedYear,
  className = "",
  previdenciaSigla = "RPPS",
}: PrevidenciaPatrimonioHistoricoSectionProps) {
  const gradientId = useId();
  const serie = resumo.serie;
  const anoMin = serie.length > 0 ? serie[0].ano : undefined;
  const anoMax = serie.length > 0 ? serie[serie.length - 1].ano : undefined;
  const tituloHeader = (() => {
    if (anoMin && anoMax) {
      if (anoMin === anoMax) {
        return `Evolução do Patrimônio Financeiro da Previdência (${anoMin})`;
      }
      return `Evolução do Patrimônio Financeiro da Previdência (${anoMin}–${anoMax})`;
    }
    return "Evolução do Patrimônio Financeiro da Previdência";
  })();

  const chartData = serie.map((p) => ({
    ...p,
    patrimonio: p.patrimonioFinanceiroTotal ?? 0,
  }));

  const diagnostico = resumo.diagnostico;

  const anosComInconsistencia = serie
    .filter((p) => p.inconsistenciaDeclaracaoFlag)
    .map((p) => p.ano);
  const anosComQuebra = serie
    .filter((p) => p.quebraSerieFlag)
    .map((p) => p.ano);
  const temInconsistenciaNaSerie =
    anosComInconsistencia.length > 0 || anosComQuebra.length > 0;

  const anosInconsistenciaTexto = (() => {
    if (anosComInconsistencia.length === 1) {
      return `No exercício de ${anosComInconsistencia[0]}`;
    }
    if (anosComInconsistencia.length > 1) {
      return `Nos exercícios de ${anosComInconsistencia.join(", ")}`;
    }
    return "Em exercícios anteriores";
  })();

  const anosQuebraTexto = (() => {
    if (anosComQuebra.length === 1) {
      return `em ${anosComQuebra[0]}`;
    }
    if (anosComQuebra.length > 1) {
      return `nos exercícios de ${anosComQuebra.join(", ")}`;
    }
    return "no exercício subsequente";
  })();

  return (
    <section
      id="patrimonio"
      aria-label={`Trajetória do Patrimônio Financeiro da Previdência (${previdenciaSigla})`}
      className={cn("space-y-6", className)}
    >
      <SectionHeader
        title={tituloHeader}
        description="Trajetória da reserva financeira e investimentos da previdência própria (SICONFI/STN), confrontando a queima de poupança com as causas estruturais do déficit atuarial."
      />

      {/* 3 KPI Cards Analíticos de Topo */}
      <KPIGrid columns={3} variant="divisoria">
        <KPICard
          variant="divisoria"
          title="Pico Histórico"
          value={fmtCompact(resumo.patrimonioPico)}
          subtext={
            resumo.anoPico > 0
              ? `Em ${resumo.anoPico} • Reserva máxima observada`
              : "Reserva máxima observada"
          }
        />
        <KPICard
          variant="divisoria"
          title="Patrimônio Atual"
          value={fmtCompact(resumo.patrimonioAtual)}
          subtext="Retração acumulada frente ao pico"
          trend={
            resumo.variacaoPicoPct !== null
              ? {
                  value: fmtPercent(resumo.variacaoPicoPct),
                  isPositive: resumo.variacaoPicoPct >= 0,
                }
              : undefined
          }
        />
        <KPICard
          variant="divisoria"
          title="Queima Média Anual"
          value={`${fmtCompact(resumo.queimaMediaAnual)}/ano`}
          subtext={
            resumo.anoPico > 0
              ? `Estimativa: queda da reserva desde ${resumo.anoPico}, dividida pelos anos`
              : "Estimativa da queda anual da reserva"
          }
        />
      </KPIGrid>

      {/* Gráfico de Área Interativo (Recharts) */}
      <div className="space-y-4 border-line border-t pt-4 sm:space-y-5">
        <div className="flex flex-col gap-1 border-line border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="font-bold">
              Evolução da Reserva Financeira e Aplicações do RPPS
            </h4>
            <p className="text-mute text-xs">
              Disponibilidades financeiras em bancos e investimentos no SICONFI
              (R$ milhões)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 font-medium text-mute">
              <span
                className="inline-block h-2.5 w-2.5 bg-brand-fill"
                aria-hidden="true"
              />
              Patrimônio Total
            </span>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="h-[210px] w-full pt-1 sm:h-[280px] sm:pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={corDoGrafico("brand")}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={corDoGrafico("brand")}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={corDoGrafico("line")}
                />
                <XAxis
                  dataKey="ano"
                  tick={{ fill: corDoGrafico("mute"), fontSize: 12 }}
                  axisLine={{ stroke: corDoGrafico("line") }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val: number) => {
                    if (val === 0) return "0";
                    return `${(val / 1_000_000).toFixed(0)}M`;
                  }}
                  tick={{ fill: corDoGrafico("mute"), fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  content={renderCustomTooltip}
                  position={{ y: 0 }}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
                <Area
                  type="monotone"
                  dataKey="patrimonio"
                  stroke={corDoGrafico("brand")}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={`url(#${gradientId})`}
                  activeDot={{
                    r: 6,
                    stroke: corDoGrafico("page"),
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Visualização de Metodologia e Quebra de Série: Tabela Desktop + Cards Mobile */}
        <div className="space-y-3">
          {/* Versão Desktop: Tabela estruturada com larguras explícitas */}
          <div className="hidden overflow-x-auto border border-line bg-page sm:block">
            <table
              className="w-full table-fixed text-left text-xs"
              aria-label="Tabela de evolução e metodologia do patrimônio da previdência"
            >
              <thead>
                <tr className="border-line border-b bg-line2 font-semibold text-mute2">
                  <th scope="col" className="w-[18%] px-3 py-2.5">
                    Exercício
                  </th>
                  <th scope="col" className="w-[22%] px-3 py-2.5 text-right">
                    Patrimônio Declarado
                  </th>
                  <th scope="col" className="w-[15%] px-3 py-2.5 text-right">
                    Variação Interanual
                  </th>
                  <th scope="col" className="w-[45%] px-3 py-2.5">
                    Nota Metodológica STN
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {serie.map((p) => {
                  const isSelected = p.ano === selectedYear;
                  const isPico = p.ano === resumo.anoPico;

                  return (
                    <tr
                      key={`desktop-ponto-${p.ano}`}
                      className={cn(
                        "transition-colors hover:bg-line2",
                        isSelected && "bg-brand-fill/15 font-medium",
                      )}
                    >
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-ink">
                            {p.ano}
                          </span>
                          {isPico && (
                            <Badge
                              variant="accent"
                              className="shrink-0 whitespace-nowrap px-1.5 py-0 text-xs"
                            >
                              Pico Histórico
                            </Badge>
                          )}
                          {isSelected && (
                            <span className="shrink-0 font-medium text-brand-text text-xs">
                              (selecionado)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle font-medium text-ink tabular-nums">
                        {p.patrimonioFinanceiroTotal !== null
                          ? fmtCurrency(p.patrimonioFinanceiroTotal)
                          : "--"}
                      </td>
                      <td className="px-3 py-2.5 text-right align-middle font-medium tabular-nums">
                        {renderVariacaoTabela(p)}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        {renderNotaMetodologica(p)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Versão Mobile: Cards dedicados e legíveis sem scroll horizontal ou quebras */}
          <div className="space-y-2 sm:hidden">
            {serie.map((p) => {
              const isSelected = p.ano === selectedYear;
              const isPico = p.ano === resumo.anoPico;

              return (
                <div
                  key={`mobile-ponto-${p.ano}`}
                  className={cn(
                    "space-y-2 border p-3 text-xs transition-colors",
                    isSelected
                      ? "border-brand-fill bg-brand-fill/15"
                      : "border-line bg-page",
                  )}
                >
                  <div className="flex items-center justify-between border-line border-b pb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-ink text-sm">
                        {p.ano}
                      </span>
                      {isPico && (
                        <Badge
                          variant="accent"
                          className="shrink-0 whitespace-nowrap px-1.5 py-0 text-xs"
                        >
                          Pico Histórico
                        </Badge>
                      )}
                      {isSelected && (
                        <span className="font-medium text-brand-text text-xs">
                          (selecionado)
                        </span>
                      )}
                    </div>
                    <div className="text-right tabular-nums">
                      {renderVariacaoTabela(p)}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between text-mute">
                    <span className="text-mute2">Patrimônio Declarado:</span>
                    <span className="font-semibold text-ink tabular-nums">
                      {p.patrimonioFinanceiroTotal !== null
                        ? fmtCurrency(p.patrimonioFinanceiroTotal)
                        : "--"}
                    </span>
                  </div>

                  {(p.inconsistenciaDeclaracaoFlag || p.quebraSerieFlag) && (
                    <div className="space-y-1.5 border-warn-fill border-l-[3px] bg-warn-fill/15 px-2.5 py-2 text-ink text-xs">
                      {p.inconsistenciaDeclaracaoFlag && (
                        <div className="flex flex-col items-start gap-1">
                          <Badge
                            variant="warning"
                            className="shrink-0 whitespace-nowrap px-2 py-0.5 text-xs"
                          >
                            Inconsistência de Declaração na MSC
                          </Badge>
                          <span className="text-mute leading-snug">
                            Aplicações financeiras omitidas na remessa ao
                            SICONFI.
                          </span>
                        </div>
                      )}
                      {p.quebraSerieFlag && (
                        <div className="flex flex-col items-start gap-1">
                          <Badge
                            variant="warning"
                            className="shrink-0 whitespace-nowrap px-2 py-0.5 text-xs"
                          >
                            Quebra de Série Metodológica
                          </Badge>
                          <span className="text-mute leading-snug">
                            {p.anoInconsistenciaAnterior
                              ? `Série normalizada após omissão contábil de ${p.anoInconsistenciaAnterior}.`
                              : "Série normalizada após omissão contábil anterior."}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mini-Banner Informativo de Transparência Metodológica */}
        {temInconsistenciaNaSerie && (
          <div className="flex items-start gap-3 border-brand-fill border-l-[3px] bg-brand-fill/15 px-4 py-3 text-ink text-xs">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-brand-text"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="font-semibold text-ink">
                Transparência Metodológica e Integridade da Matriz de Saldos
                Contábeis (SICONFI / STN)
              </p>
              <p className="text-mute leading-relaxed">
                O patrimônio financeiro da previdência consolida a
                disponibilidade em caixa estrita somada às aplicações
                financeiras declaradas pelo ente no SICONFI.{" "}
                {anosInconsistenciaTexto}, a remessa da MSC omitiu a carteira de
                investimentos do fundo, gerando aparente retração abrupta e
                consequente quebra de série metodológica {anosQuebraTexto}. O
                portal mantém os dados factuais públicos, assinalando a omissão
                e suprimindo variações percentuais distorcidas para não
                comprometer a análise da série histórica.
              </p>
              <div className="pt-1">
                <a
                  href={FONTES_OFICIAIS.siconfi.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand-text underline"
                >
                  <span>
                    Acessar portal SICONFI / Secretaria do Tesouro Nacional
                  </span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid de Diagnóstico Estrutural das Três Causas */}
      <div className="space-y-4 pt-2">
        <div>
          <h3 className="font-bold">
            Diagnóstico de Sustentabilidade e Riscos Estruturais do RPPS
          </h3>
          <p className="text-mute text-xs">
            Indicadores contábeis e demográficos que impactam a liquidez
            corrente, a base contributiva e o equilíbrio atuarial do fundo
            municipal:
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Card 1: Déficit Atuarial / Aporte */}
          <div
            id="atuarial"
            className="panel panel-top flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-brand-fill/15 p-2 text-brand-text">
                    <Scale className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h4 className="font-semibold">
                    1. Déficit Atuarial e Aportes
                  </h4>
                </div>
                {diagnostico.hasDeficitAporte ? (
                  <Badge variant="danger">Déficit</Badge>
                ) : (
                  <Badge variant="success">Adimplente</Badge>
                )}
              </div>

              <p className="text-mute text-xs leading-relaxed">
                A legislação previdenciária nacional exige a cobertura do
                déficit atuarial (Elemento 97) por meio de aportes financeiros
                regulares para garantir a sustentabilidade dos benefícios
                futuros.
              </p>

              <div className="space-y-1.5 border border-line bg-line2 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-mute2">Aporte Exigido:</span>
                  <span className="font-medium text-ink">
                    {fmtCurrency(diagnostico.totalAporteExigido)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mute2">Aporte Quitado:</span>
                  <span className="font-medium text-ink">
                    {fmtCurrency(diagnostico.totalAporteQuitado)}
                  </span>
                </div>
                <div className="flex justify-between border-line border-t pt-1.5">
                  <span className="text-mute2">Adimplência:</span>
                  <span className="font-semibold text-ink">
                    {fmtPercent(diagnostico.taxaAdimplenciaAporte)}
                  </span>
                </div>
                {diagnostico.hasDeficitAporte && (
                  <div className="flex justify-between pt-1 font-semibold text-danger-text">
                    <span>Aporte Pendente:</span>
                    <span>
                      {fmtCurrency(diagnostico.romboAporteNaoRepassado)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 border-line border-t pt-3">
              <a
                href={urlLegislacao("lei9717")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-brand-text text-xs underline"
              >
                <span>Lei nº 9.717/1998</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </div>
          </div>

          {/* Card 2: Cota Patronal em Atraso */}
          <div
            id="patronal"
            className="panel panel-top flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-warn-fill/15 p-2 text-warn-text">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h4 className="font-semibold">2. Cota Patronal em Atraso</h4>
                </div>
                {diagnostico.hasRetencaoPatronal ? (
                  <Badge variant="warning">Retenção</Badge>
                ) : (
                  <Badge variant="success">Adimplente</Badge>
                )}
              </div>

              <p className="text-mute text-xs leading-relaxed">
                O repasse da contribuição patronal pelo ente ao fundo próprio é
                obrigatório por preceito constitucional. Retenções criam
                déficits de liquidez que forçam o resgate precoce de
                investimentos.
              </p>

              <div className="space-y-1.5 border border-line bg-line2 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-mute2">Patronal Liquidado:</span>
                  <span className="font-medium text-ink">
                    {fmtCurrency(diagnostico.totalLiquidadoPatronal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mute2">Patronal Quitado:</span>
                  <span className="font-medium text-ink">
                    {fmtCurrency(diagnostico.totalPagoPatronal)}
                  </span>
                </div>
                {diagnostico.hasRetencaoPatronal ? (
                  <>
                    <div className="flex justify-between border-line border-t pt-1.5 font-semibold text-danger-text">
                      <span>Retenção Acumulada:</span>
                      <span>
                        {fmtCurrency(diagnostico.romboPatronalNaoRepassado)}
                      </span>
                    </div>
                    <div className="flex justify-between text-mute2 text-xs">
                      <span>Déficit Médio Mensal:</span>
                      <span className="font-medium text-mute">
                        {fmtCurrency(diagnostico.deficitMedioMensal)}/mês
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="border-line border-t pt-1.5 font-medium text-ok-text text-xs">
                    Cotas patronais do exercício integralmente repassadas ao
                    fundo.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 border-line border-t pt-3">
              <a
                href={urlLegislacao("constituicao", "art40")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-brand-text text-xs underline"
              >
                <span>Art. 40 da CF/88</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </div>
          </div>

          {/* Card 3: Diluição da Base Contributiva */}
          <div className="panel panel-top flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-brand-fill/15 p-2 text-brand-text">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h4 className="font-semibold">
                    3. Diluição da Base de Efetivos
                  </h4>
                </div>
                <Badge variant="accent">Vínculos RGPS</Badge>
              </div>

              <p className="text-mute text-xs leading-relaxed">
                Contratados temporários e comissionados recolhem
                obrigatoriamente ao INSS/RGPS e não vertem ao RPPS municipal,
                reduzindo a proporção de servidores ativos que sustentam os
                benefícios do {previdenciaSigla}.
              </p>

              <div className="space-y-1.5 border border-line bg-line2 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-mute2">
                    Servidores Efetivos (RPPS):
                  </span>
                  <span className="font-medium text-ink">
                    {diagnostico.servidoresEfetivos}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mute2">
                    Temporários / Comissionados:
                  </span>
                  <span className="font-medium text-ink">
                    {diagnostico.servidoresTemporariosComissionados}
                  </span>
                </div>
                <div className="flex justify-between border-line border-t pt-1.5">
                  <span className="text-mute2">
                    Razão Temporários / Efetivos:
                  </span>
                  <span className="font-semibold text-ink">
                    {fmtPercent(diagnostico.razaoTemporariosEfetivosPct)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 border-line border-t pt-3">
              <a
                href={urlLegislacao("constituicao", "art40")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-brand-text text-xs underline"
              >
                <span>Art. 40 da CF/88</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Aliases para compatibilidade retroativa
export type CapremPatrimonioHistoricoSectionProps =
  PrevidenciaPatrimonioHistoricoSectionProps;
export const CapremPatrimonioHistoricoSection =
  PrevidenciaPatrimonioHistoricoSection;
