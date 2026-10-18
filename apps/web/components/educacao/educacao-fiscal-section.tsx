"use client";

import { fmtCompact, fmtCurrency } from "@transparencia/ui";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EducacaoFiscalPainel } from "@/app/[portalSlug]/educacao/view-model";
import { SectionHeader } from "@/components/section-header";

export interface EducacaoFiscalSectionProps {
  fiscal: EducacaoFiscalPainel;
}

interface CorrelacaoTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    color: string;
  }>;
  label?: string | number;
}

function CorrelacaoTooltip({ active, payload, label }: CorrelacaoTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="min-w-[200px] space-y-1.5 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-md">
      <div className="border-slate-100 border-b pb-1 font-bold font-serif text-slate-900 text-sm">
        Ciclo {label}
      </div>
      <div className="space-y-1 pt-1">
        {payload.map((item) => {
          if (item.value === null || item.value === undefined) return null;
          const displayVal = (() => {
            if (
              item.name.toLowerCase().includes("despesa") ||
              item.name.toLowerCase().includes("custo")
            ) {
              return fmtCurrency(item.value);
            }
            return item.value.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
            });
          })();

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
              <span className="font-bold text-slate-900">{displayVal}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EducacaoFiscalSection({ fiscal }: EducacaoFiscalSectionProps) {
  const { correlacao } = fiscal;

  return (
    <section
      aria-label="Painel de Responsabilidade Fiscal da Educação"
      className="space-y-6"
    >
      <SectionHeader
        title="Painel de Responsabilidade Fiscal da Educação"
        description="Acompanhamento da aplicação orçamentária na Educação em paralelo à evolução dos resultados do IDEB na rede municipal."
      />

      {/* Gráfico de Correlação: Despesa Liquidada na Educação vs. Desempenho no IDEB */}
      <div className="rounded-xl border border-borderLine bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold font-serif text-lg text-slate-900">
              Evolução da Despesa na Educação vs. Desempenho no IDEB
            </h3>
            <p className="text-slate-500 text-xs">
              Cruzamento entre o total liquidado na Educação e os resultados
              bienais de proficiência escolar.
              {fiscal.totalMatriculas !== null && (
                <span className="mt-0.5 block text-slate-600">
                  Rede municipal com{" "}
                  {fiscal.totalMatriculas.toLocaleString("pt-BR")} matrículas
                  ativas apuradas no Censo Escolar/INEP.
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4 font-medium text-slate-600 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border border-sky-400 bg-sky-200" />
              Despesa Liquidada (R$)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1d64d8]" />
              Nota IDEB (Iniciais)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={correlacao}
              margin={{ top: 20, right: -35, left: -10, bottom: 10 }}
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
              {/* Eixo Y Esquerdo: Despesa Liquidada em Reais */}
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => fmtCompact(val)}
              />
              {/* Eixo Y Direito: Nota IDEB de 0 a 10 */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[3.0, 7.5]}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => val.toFixed(1)}
              />
              <Tooltip content={<CorrelacaoTooltip />} />
              <Bar
                yAxisId="left"
                dataKey="despesaLiquidada"
                name="Despesa Liquidada"
                fill="#bae6fd"
                stroke="#38bdf8"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="notaIdebIniciais"
                name="Nota IDEB (Iniciais)"
                stroke="#1d64d8"
                strokeWidth={3}
                dot={{
                  r: 5,
                  fill: "#1d64d8",
                  strokeWidth: 2,
                  stroke: "#ffffff",
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
