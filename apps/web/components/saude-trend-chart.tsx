"use client";

import { corDoGrafico } from "@transparencia/ui";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ExecutionTrendSaude {
  ano: number;
  empenhado: number;
}

export interface SaudeTrendChartProps {
  data: ExecutionTrendSaude[];
  selectedYear?: number;
  className?: string;
}

interface CustomBarLabelProps {
  x?: unknown;
  y?: unknown;
  width?: unknown;
  value?: unknown;
}

const renderCustomBarLabel = (props: CustomBarLabelProps) => {
  const { x, y, width, value } = props;
  const numX = Number(x);
  const numY = Number(y);
  const numWidth = Number(width);
  const numValue = Number(value);

  if (
    value === undefined ||
    value === null ||
    Number.isNaN(numX) ||
    Number.isNaN(numY) ||
    Number.isNaN(numWidth) ||
    Number.isNaN(numValue)
  ) {
    return null;
  }
  const milhoes = numValue / 1_000_000;
  const formatted = milhoes.toFixed(1).replace(".", ",");
  return (
    <text
      x={numX + numWidth / 2}
      y={numY - 8}
      fill={corDoGrafico("ink")}
      textAnchor="middle"
      fontSize={12}
      fontWeight={600}
    >
      {formatted}
    </text>
  );
};

export function SaudeTrendChart({
  data,
  selectedYear,
  className = "",
}: SaudeTrendChartProps) {
  const chartData = data || [];

  const maxYear =
    chartData.length > 0 ? Math.max(...chartData.map((d) => d.ano)) : undefined;
  const activeYear = selectedYear ?? maxYear;

  return (
    <div className={`border-line border-t pt-6 ${className}`}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h4>Evolução Orçamentária</h4>
          <p className="font-medium text-mute text-xs">
            Total empenhado na Saúde por ano (R$ milhões)
          </p>
        </div>
      </div>

      <div className="h-[220px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 25, right: 10, left: 10, bottom: 5 }}
          >
            <XAxis
              dataKey="ano"
              tick={{ fill: corDoGrafico("mute"), fontSize: 12 }}
              axisLine={{ stroke: corDoGrafico("line") }}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              formatter={(val: unknown) => [
                new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(Number(val ?? 0)),
                "Empenhado",
              ]}
              contentStyle={{
                backgroundColor: corDoGrafico("page"),
                borderColor: corDoGrafico("line"),
                borderRadius: 0,
                fontSize: "12px",
              }}
            />
            <Bar dataKey="empenhado" radius={[6, 6, 0, 0]}>
              {chartData.map((entry) => {
                const isSelected = entry.ano === activeYear;
                return (
                  <Cell
                    key={`bar-${entry.ano}`}
                    fill={corDoGrafico("brand")}
                    opacity={isSelected ? 1 : 0.75}
                  />
                );
              })}
              <LabelList dataKey="empenhado" content={renderCustomBarLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
