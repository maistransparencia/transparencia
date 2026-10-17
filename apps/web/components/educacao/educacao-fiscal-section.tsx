"use client";

import { fmtCurrency } from "@transparencia/ui";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
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
import type {
  EducacaoFiscalPainel,
  EducacaoFiscalTermometro,
} from "@/app/[portalSlug]/educacao/view-model";
import { SectionHeader } from "@/components/section-header";

export interface EducacaoFiscalSectionProps {
  fiscal: EducacaoFiscalPainel;
  municipioNome: string;
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
            if (item.name.toLowerCase().includes("custo")) {
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

interface TermometroCardProps {
  termometro: EducacaoFiscalTermometro;
  testId: string;
  rangeMax: number;
}

function TermometroCard({ termometro, testId, rangeMax }: TermometroCardProps) {
  const {
    nome,
    artigoLegal,
    artigoUrl,
    minimoConstitucionalPct,
    percentualAplicado,
    cumprido,
    descricao,
  } = termometro;

  const diferenca = percentualAplicado - minimoConstitucionalPct;
  const diferencaAbsFmt = Math.abs(diferenca).toFixed(1);

  const badgeConfig = (() => {
    if (cumprido) {
      return {
        badgeClass: "text-emerald-800 bg-emerald-50 border-emerald-200",
        badgeText: "Mínimo Constitucional Cumprido",
        Icon: ShieldCheck,
        iconClass: "text-emerald-600",
        barClass: "bg-emerald-600",
        valTextClass: "text-emerald-700",
        footerClass: "text-emerald-800",
        FooterIcon: CheckCircle2,
        footerText: `Em conformidade com o ${artigoLegal} (+${diferencaAbsFmt}% acima do piso obrigatório).`,
      };
    }
    return {
      badgeClass: "text-rose-800 bg-rose-50 border-rose-200",
      badgeText: "Abaixo do Mínimo Constitucional",
      Icon: AlertTriangle,
      iconClass: "text-rose-600",
      barClass: "bg-rose-500",
      valTextClass: "text-rose-700",
      footerClass: "text-rose-800",
      FooterIcon: AlertTriangle,
      footerText: `Em desacordo com o ${artigoLegal} (${diferencaAbsFmt}% abaixo do mínimo constitucional).`,
    };
  })();

  const {
    badgeClass,
    badgeText,
    Icon,
    iconClass,
    barClass,
    valTextClass,
    footerClass,
    FooterIcon,
    footerText,
  } = badgeConfig;

  return (
    <div
      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
      data-testid={testId}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-semibold text-xs ${badgeClass}`}
            >
              <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
              {badgeText}
            </span>
            <h3 className="mt-2 font-bold font-serif text-lg text-slate-900">
              {nome}
            </h3>
          </div>
          <a
            href={artigoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 font-medium text-sky-700 text-xs underline underline-offset-2 hover:text-sky-900"
            aria-label={`Texto oficial do ${artigoLegal} no Planalto`}
          >
            <span>{artigoLegal}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <p className="mt-2 text-slate-600 text-xs leading-relaxed">
          {descricao}
        </p>

        {/* Barra do Termômetro Visual */}
        <div className="mt-5 space-y-2">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-slate-500">
              Aplicação Realizada
            </span>
            <span className={`font-bold text-base ${valTextClass}`}>
              {percentualAplicado.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
              })}
              %
            </span>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barClass}`}
              style={{
                width: `${Math.min(100, (percentualAplicado / rangeMax) * 100)}%`,
              }}
            />
            {/* Linha demarcatória do piso constitucional */}
            <div
              className="absolute top-0 bottom-0 z-10 w-0.5 bg-slate-900"
              style={{ left: `${(minimoConstitucionalPct / rangeMax) * 100}%` }}
              title={`Piso Constitucional (${minimoConstitucionalPct}%)`}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>0%</span>
            <span className="font-semibold text-slate-700">
              Piso CF/88: {minimoConstitucionalPct}%
            </span>
            <span>{rangeMax}%</span>
          </div>
        </div>
      </div>

      <div
        className={`mt-4 flex items-center gap-2 border-slate-100 border-t pt-3 text-xs ${footerClass}`}
      >
        <FooterIcon className={`h-4 w-4 shrink-0 ${iconClass}`} />
        <span>{footerText}</span>
      </div>
    </div>
  );
}

export function EducacaoFiscalSection({
  fiscal,
  municipioNome,
}: EducacaoFiscalSectionProps) {
  const { mde, fundeb, correlacao } = fiscal;

  return (
    <section
      aria-label="Painel de Responsabilidade Fiscal da Educação"
      className="space-y-6"
    >
      <SectionHeader
        title="Painel de Responsabilidade Fiscal da Educação"
        description={`Cumprimento dos limites constitucionais de investimento em ensino e correlação de custo por aluno em ${municipioNome}.`}
      />

      {/* Grid com os 2 Termômetros Constitucionais */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <TermometroCard
          termometro={mde}
          testId="termometro-mde"
          rangeMax={40}
        />
        <TermometroCard
          termometro={fundeb}
          testId="termometro-fundeb"
          rangeMax={100}
        />
      </div>

      {/* Gráfico de Correlação: Custo por Aluno vs. Desempenho no IDEB */}
      <div className="rounded-xl border border-borderLine bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold font-serif text-lg text-slate-900">
              Evolução do Custo por Aluno vs. Desempenho no IDEB
            </h3>
            <p className="text-slate-500 text-xs">
              Cruzamento entre o gasto liquidado por matrícula na Função 12 e os
              resultados bienais de proficiência escolar.
            </p>
          </div>
          <div className="flex items-center gap-4 font-medium text-slate-600 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border border-sky-400 bg-sky-200" />
              Custo Anual / Aluno (R$)
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
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
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
              {/* Eixo Y Esquerdo: Custo Anual por Aluno em Reais */}
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
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
                dataKey="custoPorAluno"
                name="Custo por Aluno"
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
