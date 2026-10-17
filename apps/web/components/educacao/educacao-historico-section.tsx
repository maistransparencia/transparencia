"use client";

import type { EtapaEnsino } from "@transparencia/db";
import { cn } from "@transparencia/ui";
import { CheckCircle, Info } from "lucide-react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  IdebEtapaHistorico,
  IdebHistoricoPonto,
} from "@/app/[portalSlug]/educacao/view-model";
import { SectionHeader } from "@/components/section-header";

export interface EducacaoHistoricoSectionProps {
  historico: {
    anosIniciais: IdebEtapaHistorico;
    anosFinais: IdebEtapaHistorico;
  };
  initialEtapa?: EtapaEnsino;
  municipioNome: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    color: string;
    payload: IdebHistoricoPonto;
  }>;
  label?: string | number;
  metaMecFixa?: number | null;
}

function CustomIdebTooltip({
  active,
  payload,
  label,
  metaMecFixa,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const ponto = payload[0]?.payload;

  return (
    <div className="min-w-[200px] space-y-1.5 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-md">
      <div className="flex justify-between border-slate-100 border-b pb-1 font-bold font-serif text-slate-900 text-sm">
        <span>Ciclo {label}</span>
        {ponto?.atingiuMeta && (
          <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.2 font-semibold text-[10px] text-emerald-700">
            Meta Atingida
          </span>
        )}
      </div>
      <div className="space-y-1 pt-1">
        {payload.map((item) => {
          if (item.value === null || item.value === undefined) return null;
          return (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-1.5 text-slate-600">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}:
              </span>
              <span className="font-bold text-slate-900">
                {item.value.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                })}
              </span>
            </div>
          );
        })}
        {metaMecFixa !== null && metaMecFixa !== undefined && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="inline-block h-0.5 w-2 border-slate-500 border-t-2 border-dashed" />
              Meta MEC:
            </span>
            <span className="font-bold text-slate-900">
              {metaMecFixa.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
              })}
            </span>
          </div>
        )}
      </div>
      {ponto && (
        <div className="mt-2 space-y-0.5 border-slate-100 border-t pt-2 text-[11px] text-slate-500">
          {ponto.saebLinguaPortuguesa !== null && (
            <div className="flex justify-between">
              <span>Saeb Português:</span>
              <span className="font-medium text-slate-700">
                {ponto.saebLinguaPortuguesa}
              </span>
            </div>
          )}
          {ponto.saebMatematica !== null && (
            <div className="flex justify-between">
              <span>Saeb Matemática:</span>
              <span className="font-medium text-slate-700">
                {ponto.saebMatematica}
              </span>
            </div>
          )}
          {ponto.taxaAprovacao !== null && (
            <div className="flex justify-between">
              <span>Taxa Aprovação:</span>
              <span className="font-medium text-slate-700">
                {ponto.taxaAprovacao}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EducacaoHistoricoSection({
  historico,
  initialEtapa = "anosIniciais",
  municipioNome,
}: EducacaoHistoricoSectionProps) {
  const [activeEtapa, setActiveEtapa] = useState<EtapaEnsino>(initialEtapa);

  const currentHistorico =
    activeEtapa === "anosIniciais"
      ? historico.anosIniciais
      : historico.anosFinais;

  const chartData = currentHistorico.pontos;
  const pontoMaisRecente = currentHistorico.pontoMaisRecente;
  const metaMecFixa =
    chartData.find((p) => p.metaMec !== null)?.metaMec ?? null;

  return (
    <section
      aria-label="Série Histórica e Linha do Tempo do IDEB"
      className="space-y-4"
    >
      <SectionHeader
        title="Série Histórica do IDEB e Avaliações Oficiais (2021–2025)"
        description={`Trajetória das notas do IDEB, proficiências SAEB e metas do Ministério da Educação para ${municipioNome}.`}
      />

      {/* Tabs / Toggle de Etapa */}
      <div className="flex items-center gap-2 border-slate-200 border-b pb-2">
        <button
          type="button"
          onClick={() => setActiveEtapa("anosIniciais")}
          className={cn(
            "rounded-lg px-3.5 py-2 font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-500",
            activeEtapa === "anosIniciais"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200",
          )}
          aria-pressed={activeEtapa === "anosIniciais"}
        >
          Anos Iniciais (1º ao 5º ano)
        </button>
        <button
          type="button"
          onClick={() => setActiveEtapa("anosFinais")}
          className={cn(
            "rounded-lg px-3.5 py-2 font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-500",
            activeEtapa === "anosFinais"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200",
          )}
          aria-pressed={activeEtapa === "anosFinais"}
        >
          Anos Finais (6º ao 9º ano)
        </button>
      </div>

      {/* Container do Gráfico Recharts */}
      <div className="rounded-xl border border-borderLine bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold font-serif text-lg text-slate-900">
              Evolução da Nota IDEB — {currentHistorico.label}
            </h3>
            <p className="text-slate-500 text-xs">
              Comparativo direto com a Meta do MEC e a Média Estadual da rede
              pública (RJ)
            </p>
          </div>
          <div className="flex items-center gap-4 font-medium text-slate-600 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1d64d8]" />
              Rede Municipal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 border-slate-400 border-t-2 border-dashed" />
              Meta MEC
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 border-amber-600 border-t-2 border-dotted" />
              Média RJ
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="ano"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                domain={[
                  (dataMin: number) =>
                    Math.max(
                      0,
                      Math.floor(Number.isFinite(dataMin) ? dataMin - 0.5 : 0),
                    ),
                  (dataMax: number) =>
                    Math.min(
                      10,
                      Math.ceil(Number.isFinite(dataMax) ? dataMax + 0.5 : 10),
                    ),
                ]}
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) =>
                  typeof val === "number" ? val.toFixed(1) : String(val)
                }
              />
              <Tooltip
                content={<CustomIdebTooltip metaMecFixa={metaMecFixa} />}
              />
              <Line
                type="monotone"
                dataKey="notaIdeb"
                name="Nota IDEB"
                stroke="#1d64d8"
                strokeWidth={3}
                dot={{
                  r: 5,
                  fill: "#1d64d8",
                  strokeWidth: 2,
                  stroke: "#ffffff",
                }}
                activeDot={{
                  r: 7,
                  fill: "#1d64d8",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
                connectNulls
              />
              {metaMecFixa !== null && (
                <ReferenceLine
                  y={metaMecFixa}
                  stroke="#64748b"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Meta MEC (${metaMecFixa.toFixed(1)})`,
                    position: "insideTopRight",
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="mediaEstadualRj"
                name="Média RJ"
                stroke="#d97706"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ r: 3, fill: "#d97706" }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Linha explicativa institucional */}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600 text-xs">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p>
            O IDEB sintetiza a aprovação escolar e o aprendizado apurado pelo
            SAEB a cada dois anos. A evolução é resultado do trabalho conjunto
            de alunos, professores, gestores escolares e comunidade escolar.
          </p>
        </div>
      </div>

      {/* Cards de Proficiência Pedagógica (SAEB & Fluxo) */}
      {pontoMaisRecente && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="block font-semibold text-slate-500 text-xs uppercase tracking-wider">
              SAEB — Língua Portuguesa
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-bold font-serif text-3xl text-slate-900">
                {pontoMaisRecente.saebLinguaPortuguesa !== null
                  ? pontoMaisRecente.saebLinguaPortuguesa.toLocaleString(
                      "pt-BR",
                      {
                        minimumFractionDigits: 1,
                      },
                    )
                  : "—"}
              </span>
              <span className="text-slate-500 text-xs">escala SAEB</span>
            </div>
            <p className="mt-1 text-slate-500 text-xs">
              Ciclo {pontoMaisRecente.ano} ({currentHistorico.label})
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="block font-semibold text-slate-500 text-xs uppercase tracking-wider">
              SAEB — Matemática
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-bold font-serif text-3xl text-slate-900">
                {pontoMaisRecente.saebMatematica !== null
                  ? pontoMaisRecente.saebMatematica.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                    })
                  : "—"}
              </span>
              <span className="text-slate-500 text-xs">escala SAEB</span>
            </div>
            <p className="mt-1 text-slate-500 text-xs">
              Ciclo {pontoMaisRecente.ano} ({currentHistorico.label})
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="block font-semibold text-slate-500 text-xs uppercase tracking-wider">
              Taxa de Aprovação Escolar
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-bold font-serif text-3xl text-slate-900">
                {pontoMaisRecente.taxaAprovacao !== null
                  ? `${pontoMaisRecente.taxaAprovacao.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                    })}%`
                  : "—"}
              </span>
              <CheckCircle className="inline h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-1 text-slate-500 text-xs">
              Indicador de fluxo regular dos alunos
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
