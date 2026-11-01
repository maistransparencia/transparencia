"use client";

import {
  corDoGrafico,
  fmtCompact,
  fmtCurrency,
  fmtPercent,
  SectionHeader,
  type TokenCorGrafico,
  toTitleCase,
} from "@transparencia/ui";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface EntityPrevidenciaItem {
  entidade: string;
  empenhado: number;
  liquidado: number;
  pago: number;
}

export interface PrevidenciaEntidadesDonutProps {
  data: EntityPrevidenciaItem[];
  ano: number;
  className?: string;
  previdenciaSigla?: string;
}

/** Tons distintos por entidade, só tokens do tema. */
const TOKENS_ENTIDADES: readonly TokenCorGrafico[] = [
  "brand",
  "ok",
  "warn",
  "danger",
  "ink",
  "mute",
  "mute3",
];

interface TooltipEntidadeProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload?: { name: string; value: number; percentual: number };
  }>;
}

function TooltipEntidade({ active, payload }: TooltipEntidadeProps) {
  const ponto = payload?.[0]?.payload;
  if (!active || !ponto) return null;
  return (
    <div className="pointer-events-none space-y-1 border border-line bg-page p-2.5 text-xs">
      <p className="font-semibold text-ink">{toTitleCase(ponto.name)}</p>
      <p className="text-mute tabular-nums">
        {fmtCurrency(ponto.value)} ({fmtPercent(ponto.percentual)})
      </p>
    </div>
  );
}

export function PrevidenciaEntidadesDonut({
  data,
  ano,
  className = "",
  previdenciaSigla = "RPPS",
}: PrevidenciaEntidadesDonutProps) {
  const totalPago = data.reduce((acc, item) => acc + item.pago, 0);

  const pieData = data
    .filter((d) => d.pago > 0)
    .map((item, idx) => {
      const cor = corDoGrafico(TOKENS_ENTIDADES[idx % TOKENS_ENTIDADES.length]);
      return {
        name: item.entidade,
        value: item.pago,
        percentual: totalPago > 0 ? (item.pago / totalPago) * 100 : 0,
        color: cor,
        fill: cor,
      };
    });

  if (pieData.length === 0) return null;

  return (
    <div className={className}>
      <SectionHeader
        eyebrow={`Total repassado: ${fmtCurrency(totalPago)}`}
        title={`De quais órgãos veio o dinheiro repassado ao ${previdenciaSigla}?`}
        description={`Valor pago ao fundo por cada órgão municipal · ${ano}`}
      />

      <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="h-[200px] w-full min-w-[200px] sm:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={78}
                paddingAngle={3}
                dataKey="value"
                stroke={corDoGrafico("page")}
              />
              <Tooltip content={<TooltipEntidade />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex w-full flex-col justify-center gap-3 sm:w-1/2">
          {pieData.map((item) => (
            <li key={item.name} className="flex items-center gap-3">
              <span
                className="h-3 w-3 shrink-0"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <div className="flex flex-1 items-center justify-between text-xs">
                <span
                  className="max-w-[400px] truncate font-medium text-mute"
                  title={toTitleCase(item.name)}
                >
                  {toTitleCase(item.name)}
                </span>
                <span className="ml-2 hidden shrink-0 font-bold font-serif text-ink lg:block">
                  {fmtCurrency(item.value)}
                </span>
                <span className="ml-2 shrink-0 font-bold font-serif text-ink lg:hidden">
                  {fmtCompact(item.value)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
