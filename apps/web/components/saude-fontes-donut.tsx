"use client";

import { corDoGrafico } from "@transparencia/ui";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface FontesReceitaSaude {
  uniaoSusPct: number;
  estadoPct: number;
  propriaPct: number;
  repassesPrefeitura?: number;
  emendasParlamentares?: number;
}

export interface SaudeFontesDonutProps {
  data: FontesReceitaSaude;
  ano: number;
  className?: string;
}

export function SaudeFontesDonut({
  data,
  ano,
  className = "",
}: SaudeFontesDonutProps) {
  const hasData =
    data.uniaoSusPct > 0 || data.estadoPct > 0 || data.propriaPct > 0;

  const pieData = hasData
    ? [
        {
          name: "Transferências União (SUS)",
          pct: data.uniaoSusPct,
          color: corDoGrafico("ok"),
          fill: corDoGrafico("ok"),
        },
        {
          name: "Transferências Estado",
          pct: data.estadoPct,
          color: corDoGrafico("warn"),
          fill: corDoGrafico("warn"),
        },
        {
          name: "Receita própria / repasse",
          pct: data.propriaPct,
          color: corDoGrafico("brand"),
          fill: corDoGrafico("brand"),
        },
      ]
    : [
        {
          name: "Sem lançamentos de receita no período",
          pct: 100,
          color: corDoGrafico("line"),
          fill: corDoGrafico("line"),
        },
      ];

  return (
    <div className={`border-line border-t pt-6 ${className}`}>
      <div className="mb-4">
        <h4>Origem dos Recursos</h4>
        <p className="font-medium text-mute text-xs">
          Fontes de receita do Fundo · {ano}
        </p>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        {/* Donut Chart */}
        <div className="h-[180px] w-full min-w-[180px] sm:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
                dataKey="pct"
              />
              <Tooltip
                formatter={(val: unknown) => [
                  `${Number(val ?? 0)
                    .toFixed(1)
                    .replace(".", ",")}%`,
                  "Participação",
                ]}
                contentStyle={{
                  backgroundColor: corDoGrafico("page"),
                  borderColor: corDoGrafico("line"),
                  borderRadius: 0,
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex w-full flex-col justify-center gap-3 sm:w-1/2">
          {pieData.map((item) => (
            <div key={item.name} className="flex items-center gap-2.5">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex flex-1 items-center justify-between text-xs">
                <span className="font-medium text-ink">{item.name}</span>
                <span className="ml-2 font-bold text-ink">
                  {item.pct.toFixed(1).replace(".", ",")}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
