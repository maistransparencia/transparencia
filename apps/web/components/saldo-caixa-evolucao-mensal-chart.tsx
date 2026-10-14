"use client";

import type { SiconfiEvolucaoMensalPontoDTO } from "@transparencia/db";
import { fmtCurrency } from "@transparencia/ui";
import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SaldoCaixaEvolucaoMensalChartProps {
  pontos: SiconfiEvolucaoMensalPontoDTO[];
  ano: number;
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    value?: unknown;
    payload?: SiconfiEvolucaoMensalPontoDTO;
  }>;
}

function renderCustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const ponto = payload[0]?.payload;
  if (!ponto) {
    return null;
  }

  return (
    <div className="pointer-events-none w-[230px] space-y-1.5 rounded-xl border border-slate-200/90 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-xs sm:w-[260px]">
      <div className="border-slate-100 border-b pb-1 font-semibold text-slate-800">
        <span>{ponto.mesNome}</span>
      </div>
      <div className="space-y-1 pt-0.5">
        <div className="flex items-baseline justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-800">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
            Recursos Livres:
          </span>
          <span className="font-bold text-emerald-700 text-xs tabular-nums">
            {fmtCurrency(ponto.saldoRecursosLivres)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-amber-800">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            Recursos Vinculados:
          </span>
          <span className="font-semibold text-amber-700 text-xs tabular-nums">
            {fmtCurrency(ponto.saldoRecursosVinculados)}
          </span>
        </div>
        <div className="flex items-baseline justify-between border-slate-100 border-t pt-1">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-700" />
            Total em Caixa:
          </span>
          <span className="font-bold text-slate-900 text-xs tabular-nums">
            {fmtCurrency(ponto.saldoCaixaBancos)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SaldoCaixaEvolucaoMensalChart({
  pontos,
  className = "",
}: SaldoCaixaEvolucaoMensalChartProps) {
  const gradientId = useId();

  if (!pontos || pontos.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col gap-1 border-slate-100 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-bold text-base text-slate-900">
            Trajetória Mensal de Disponibilidade em Caixa
          </h4>
          <p className="text-subtleText text-xs">
            Valores reportados ao SICONFI/STN em cada competência do exercício
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1 font-medium text-emerald-700">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />
            Recursos Livres
          </span>
          <span className="flex items-center gap-1 font-medium text-slate-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-700" />
            Total Disponível
          </span>
        </div>
      </div>

      <div className="h-[220px] w-full pt-1 sm:h-[270px] sm:pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={pontos}
            margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="mesAbreviado"
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(val: number) => {
                if (val === 0) return "0";
                if (Math.abs(val) < 1_000_000) {
                  return `${(val / 1_000).toFixed(0)}k`;
                }
                return `${(val / 1_000_000).toFixed(1)}M`;
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
              dataKey="saldoRecursosLivres"
              stroke="#059669"
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 6, stroke: "#047857", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="saldoCaixaBancos"
              stroke="#475569"
              strokeWidth={1.75}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, stroke: "#334155", strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
