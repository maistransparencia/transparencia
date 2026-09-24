"use client";

import {
  Badge,
  cn,
  fmtCompact,
  fmtCurrency,
  fmtPercent,
  KPICard,
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
  CapremPatrimonioHistoricoPonto,
  CapremPatrimonioHistoricoResumo,
} from "@/app/[portalSlug]/caprem/view-model";
import { KPIGrid } from "@/components/kpi-grid";
import { SectionHeader } from "@/components/section-header";

export interface CapremPatrimonioHistoricoSectionProps {
  resumo: CapremPatrimonioHistoricoResumo;
  selectedYear: number;
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    value?: unknown;
    payload?: CapremPatrimonioHistoricoPonto;
  }>;
}

function formatVariacaoTooltip(ponto: CapremPatrimonioHistoricoPonto) {
  if (ponto.quebraSerieFlag) {
    return (
      <span className="font-semibold text-slate-700">
        N/D (Quebra de Série)
      </span>
    );
  }
  if (ponto.variacaoPatrimonioPct !== null) {
    const isPositive = ponto.variacaoPatrimonioPct >= 0;
    return (
      <span
        className={
          isPositive
            ? "font-semibold text-emerald-700"
            : "font-semibold text-rose-700"
        }
      >
        {isPositive
          ? `+${fmtPercent(ponto.variacaoPatrimonioPct)}`
          : fmtPercent(ponto.variacaoPatrimonioPct)}
      </span>
    );
  }
  return <span className="text-slate-400">--</span>;
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
    <div className="pointer-events-none w-[220px] space-y-1 rounded-xl border border-slate-200/90 bg-white/95 p-2.5 text-xs shadow-lg backdrop-blur-xs sm:w-[250px]">
      <div className="flex items-center justify-between border-slate-100 border-b pb-1 font-semibold text-slate-800">
        <span>Exercício {ponto.ano}</span>
        {ponto.inconsistenciaDeclaracaoFlag && (
          <Badge
            variant="warning"
            className="shrink-0 whitespace-nowrap px-1.5 py-0 text-[10px]"
          >
            Inconsistência MSC
          </Badge>
        )}
      </div>
      <div className="flex items-baseline justify-between pt-0.5">
        <span className="text-[11px] text-slate-500">Patrimônio:</span>
        <span className="font-bold text-slate-900 text-xs tabular-nums">
          {patrimonioStr}
        </span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-slate-500">Variação:</span>
        <span className="font-medium tabular-nums">
          {formatVariacaoTooltip(ponto)}
        </span>
      </div>
      {ponto.inconsistenciaDeclaracaoFlag && (
        <p className="mt-1 rounded bg-amber-50 p-1.5 text-[10px] text-amber-800 leading-tight">
          Aplicações financeiras omitidas pelo ente na remessa da MSC ao
          SICONFI.
        </p>
      )}
      {ponto.quebraSerieFlag && (
        <p className="mt-1 rounded bg-slate-100 p-1.5 text-[10px] text-slate-600 leading-tight">
          Série normalizada após omissão contábil de 2022.
        </p>
      )}
    </div>
  );
}

function renderVariacaoTabela(p: CapremPatrimonioHistoricoPonto) {
  if (p.quebraSerieFlag) {
    return <span className="font-semibold text-slate-600">N/D</span>;
  }
  if (p.variacaoPatrimonioPct === null) {
    return <span className="text-slate-400">--</span>;
  }
  if (p.variacaoPatrimonioPct >= 0) {
    return (
      <span className="whitespace-nowrap font-medium text-emerald-700">
        +{fmtPercent(p.variacaoPatrimonioPct)}
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap font-medium text-rose-700">
      {fmtPercent(p.variacaoPatrimonioPct)}
    </span>
  );
}

function renderNotaMetodologica(p: CapremPatrimonioHistoricoPonto) {
  if (p.inconsistenciaDeclaracaoFlag) {
    return (
      <div className="flex flex-col items-start gap-1 py-0.5">
        <Badge
          variant="warning"
          className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px]"
        >
          Inconsistência de Declaração na MSC
        </Badge>
        <span className="text-[11px] text-slate-600 leading-snug">
          Aplicações financeiras omitidas na remessa ao SICONFI
        </span>
      </div>
    );
  }
  if (p.quebraSerieFlag) {
    return (
      <div className="flex flex-col items-start gap-1 py-0.5">
        <Badge
          variant="warning"
          className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px]"
        >
          Quebra de Série Metodológica
        </Badge>
        <span className="text-[11px] text-slate-600 leading-snug">
          Série normalizada após omissão contábil de 2022
        </span>
      </div>
    );
  }
  return (
    <span className="text-[11px] text-slate-400">
      Declaração homologada regular
    </span>
  );
}

export function CapremPatrimonioHistoricoSection({
  resumo,
  selectedYear,
  className = "",
}: CapremPatrimonioHistoricoSectionProps) {
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
    return "Evolução do Patrimônio Financeiro da Previdência (2021–2026)";
  })();

  const chartData = serie.map((p) => ({
    ...p,
    patrimonio: p.patrimonioFinanceiroTotal ?? 0,
  }));

  const diagnostico = resumo.diagnostico;

  return (
    <section
      id="patrimonio"
      aria-label="Trajetória do Patrimônio Financeiro da Previdência (CAPREM)"
      className={cn("space-y-6", className)}
    >
      <SectionHeader
        title={tituloHeader}
        description="Trajetória da reserva financeira e investimentos da previdência própria (SICONFI/STN), confrontando a queima de poupança com as causas estruturais do déficit atuarial."
      />

      {/* 3 KPI Cards Analíticos de Topo */}
      <KPIGrid columns={3}>
        <KPICard
          title="Pico Histórico"
          value={fmtCompact(resumo.patrimonioPico)}
          subtext={
            resumo.anoPico > 0
              ? `Em ${resumo.anoPico} • Reserva máxima observada`
              : "Reserva máxima observada"
          }
          accent
        />
        <KPICard
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
          title="Queima Média Anual"
          value={`${fmtCompact(resumo.queimaMediaAnual)}/ano`}
          subtext={
            resumo.anoPico > 0
              ? `Consumo anual de poupança (${resumo.anoPico}–corrente)`
              : "Consumo anual de poupança"
          }
        />
      </KPIGrid>

      {/* Gráfico de Área Interativo (Recharts) */}
      <div className="space-y-4 rounded-2xl border border-borderLine bg-white p-3.5 shadow-sm sm:space-y-5 sm:p-6">
        <div className="flex flex-col gap-1 border-slate-100 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="font-bold text-base text-slate-900">
              Evolução da Reserva Financeira e Aplicações do RPPS
            </h4>
            <p className="text-subtleText text-xs">
              Disponibilidades financeiras em bancos e investimentos no SICONFI
              (R$ milhões)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 font-medium text-slate-600">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />
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
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="ano"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val: number) => {
                    if (val === 0) return "0";
                    return `${(val / 1_000_000).toFixed(0)}M`;
                  }}
                  tick={{ fill: "#64748b", fontSize: 10 }}
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
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={`url(#${gradientId})`}
                  activeDot={{ r: 6, stroke: "#1d4ed8", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Visualização de Metodologia e Quebra de Série: Tabela Desktop + Cards Mobile */}
        <div className="space-y-3">
          {/* Versão Desktop: Tabela estruturada com larguras explícitas */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm sm:block">
            <table
              className="w-full table-fixed text-left text-xs"
              aria-label="Tabela de evolução e metodologia do patrimônio da previdência"
            >
              <thead>
                <tr className="border-slate-200 border-b bg-slate-50/80 font-semibold text-slate-500">
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
              <tbody className="divide-y divide-slate-100">
                {serie.map((p) => {
                  const isSelected = p.ano === selectedYear;
                  const isPico = p.ano === resumo.anoPico;

                  return (
                    <tr
                      key={`desktop-ponto-${p.ano}`}
                      className={cn(
                        "transition-colors hover:bg-slate-50/60",
                        isSelected && "bg-blue-50/50 font-medium",
                      )}
                    >
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-slate-800">
                            {p.ano}
                          </span>
                          {isPico && (
                            <Badge
                              variant="accent"
                              className="shrink-0 whitespace-nowrap px-1.5 py-0 text-[10px]"
                            >
                              Pico Histórico
                            </Badge>
                          )}
                          {isSelected && (
                            <span className="shrink-0 font-medium text-[11px] text-blue-700">
                              (selecionado)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle font-medium text-slate-800 tabular-nums">
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
                    "space-y-2 rounded-xl border p-3 text-xs transition-colors",
                    isSelected
                      ? "border-blue-300 bg-blue-50/50 shadow-sm"
                      : "border-slate-200/80 bg-white",
                  )}
                >
                  <div className="flex items-center justify-between border-slate-100 border-b pb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-sm">
                        {p.ano}
                      </span>
                      {isPico && (
                        <Badge
                          variant="accent"
                          className="shrink-0 whitespace-nowrap px-1.5 py-0 text-[10px]"
                        >
                          Pico Histórico
                        </Badge>
                      )}
                      {isSelected && (
                        <span className="font-medium text-[11px] text-blue-700">
                          (selecionado)
                        </span>
                      )}
                    </div>
                    <div className="text-right tabular-nums">
                      {renderVariacaoTabela(p)}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between text-slate-600">
                    <span className="text-slate-500">
                      Patrimônio Declarado:
                    </span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {p.patrimonioFinanceiroTotal !== null
                        ? fmtCurrency(p.patrimonioFinanceiroTotal)
                        : "--"}
                    </span>
                  </div>

                  {(p.inconsistenciaDeclaracaoFlag || p.quebraSerieFlag) && (
                    <div className="space-y-1.5 rounded-lg border border-amber-200/50 bg-amber-50/70 p-2.5 text-[11px] text-amber-900">
                      {p.inconsistenciaDeclaracaoFlag && (
                        <div className="flex flex-col items-start gap-1">
                          <Badge
                            variant="warning"
                            className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px]"
                          >
                            Inconsistência de Declaração na MSC
                          </Badge>
                          <span className="text-slate-700 leading-snug">
                            Aplicações financeiras omitidas na remessa ao
                            SICONFI.
                          </span>
                        </div>
                      )}
                      {p.quebraSerieFlag && (
                        <div className="flex flex-col items-start gap-1">
                          <Badge
                            variant="warning"
                            className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px]"
                          >
                            Quebra de Série Metodológica
                          </Badge>
                          <span className="text-slate-700 leading-snug">
                            Série normalizada após omissão contábil de 2022.
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
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-slate-700 text-xs">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">
              Transparência Metodológica e Integridade da Matriz de Saldos
              Contábeis (SICONFI / STN)
            </p>
            <p className="text-slate-600 leading-relaxed">
              O patrimônio financeiro da previdência consolida a disponibilidade
              em caixa estrita somada às aplicações financeiras declaradas pelo
              ente no SICONFI. No exercício de 2022, a remessa da MSC omitiu a
              carteira de investimentos do fundo, gerando aparente retração
              abrupta e consequente quebra de série metodológica em 2023. O
              portal mantém os dados factuais públicos, assinalando a omissão e
              suprimindo variações artificiais superiores a +6.000% para não
              distorcer a percepção cidadã.
            </p>
            <div className="pt-1">
              <a
                href="https://siconfi.tesouro.gov.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-blue-700 underline hover:text-blue-900"
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
      </div>

      {/* Grid de Diagnóstico Estrutural das Três Causas */}
      <div className="space-y-4 pt-2">
        <div>
          <h3 className="font-bold font-serif text-lg text-slate-900">
            Diagnóstico das Causas Estruturais da Desidratação Patrimonial
          </h3>
          <p className="text-subtleText text-xs">
            Fatores técnicos e contábeis que explicam o consumo acelerado das
            reservas financeiras e o déficit atuarial da previdência municipal:
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Card 1: Déficit Atuarial / Aporte */}
          <div
            id="atuarial"
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
                    <Scale className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">
                    1. Déficit Atuarial e Aportes
                  </h4>
                </div>
                {diagnostico.hasDeficitAporte ? (
                  <Badge variant="danger">Déficit</Badge>
                ) : (
                  <Badge variant="success">Adimplente</Badge>
                )}
              </div>

              <p className="text-slate-600 text-xs leading-relaxed">
                A legislação previdenciária nacional exige a cobertura do
                déficit atuarial (Elemento 97) por meio de aportes financeiros
                regulares para garantir a sustentabilidade dos benefícios
                futuros.
              </p>

              <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Aporte Exigido:</span>
                  <span className="font-medium text-slate-800">
                    {fmtCurrency(diagnostico.totalAporteExigido)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Aporte Quitado:</span>
                  <span className="font-medium text-slate-800">
                    {fmtCurrency(diagnostico.totalAporteQuitado)}
                  </span>
                </div>
                <div className="flex justify-between border-slate-200/60 border-t pt-1.5">
                  <span className="text-slate-500">Adimplência:</span>
                  <span className="font-semibold text-slate-900">
                    {fmtPercent(diagnostico.taxaAdimplenciaAporte)}
                  </span>
                </div>
                {diagnostico.hasDeficitAporte && (
                  <div className="flex justify-between pt-1 font-semibold text-rose-700">
                    <span>Aporte Pendente:</span>
                    <span>
                      {fmtCurrency(diagnostico.romboAporteNaoRepassado)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 border-slate-100 border-t pt-3">
              <a
                href="https://www.planalto.gov.br/ccivil_03/leis/l9717.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-blue-700 text-xs underline hover:text-blue-900"
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
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">
                    2. Cota Patronal em Atraso
                  </h4>
                </div>
                {diagnostico.hasRetencaoPatronal ? (
                  <Badge variant="warning">Retenção</Badge>
                ) : (
                  <Badge variant="success">Adimplente</Badge>
                )}
              </div>

              <p className="text-slate-600 text-xs leading-relaxed">
                O repasse da contribuição patronal pelo ente ao fundo próprio é
                obrigatório por preceito constitucional. Retenções criam
                déficits de liquidez que forçam o resgate precoce de
                investimentos.
              </p>

              <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patronal Liquidado:</span>
                  <span className="font-medium text-slate-800">
                    {fmtCurrency(diagnostico.totalLiquidadoPatronal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patronal Quitado:</span>
                  <span className="font-medium text-slate-800">
                    {fmtCurrency(diagnostico.totalPagoPatronal)}
                  </span>
                </div>
                {diagnostico.hasRetencaoPatronal ? (
                  <>
                    <div className="flex justify-between border-slate-200/60 border-t pt-1.5 font-semibold text-rose-700">
                      <span>Retenção Acumulada:</span>
                      <span>
                        {fmtCurrency(diagnostico.romboPatronalNaoRepassado)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Déficit Médio Mensal:</span>
                      <span className="font-medium text-slate-700">
                        {fmtCurrency(diagnostico.deficitMedioMensal)}/mês
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="border-slate-200/60 border-t pt-1.5 font-medium text-[11px] text-emerald-700">
                    Cotas patronais do exercício integralmente repassadas ao
                    fundo.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 border-slate-100 border-t pt-3">
              <a
                href="https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-blue-700 text-xs underline hover:text-blue-900"
              >
                <span>Art. 40 da CF/88</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </div>
          </div>

          {/* Card 3: Diluição da Base Contributiva */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">
                    3. Diluição da Base de Efetivos
                  </h4>
                </div>
                <Badge variant="accent">Vínculos RGPS</Badge>
              </div>

              <p className="text-slate-600 text-xs leading-relaxed">
                Contratados temporários e comissionados recolhem
                obrigatoriamente ao INSS/RGPS e não vertem ao RPPS municipal,
                reduzindo a proporção de servidores ativos que sustentam os
                benefícios do CAPREM.
              </p>

              <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Servidores Efetivos (RPPS):
                  </span>
                  <span className="font-medium text-slate-800">
                    {diagnostico.servidoresEfetivos}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Temporários / Comissionados:
                  </span>
                  <span className="font-medium text-slate-800">
                    {diagnostico.servidoresTemporariosComissionados}
                  </span>
                </div>
                <div className="flex justify-between border-slate-200/60 border-t pt-1.5">
                  <span className="text-slate-500">
                    Razão Temporários / Efetivos:
                  </span>
                  <span className="font-semibold text-slate-900">
                    {fmtPercent(diagnostico.razaoTemporariosEfetivosPct)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 border-slate-100 border-t pt-3">
              <a
                href="https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-blue-700 text-xs underline hover:text-blue-900"
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
