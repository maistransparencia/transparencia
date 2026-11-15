"use client";

import type { SiconfiEvolucaoMensalPontoDTO } from "@transparencia/db";
import { corDoGrafico, fmtCurrency } from "@transparencia/ui";
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
    <div className="border-line bg-page pointer-events-none w-[230px] space-y-1.5 border p-3 text-xs">
      <div className="border-line text-ink border-b pb-1 font-semibold">
        <span>{ponto.mesNome}</span>
      </div>
      <div className="space-y-1 pt-0.5">
        <div className="flex items-baseline justify-between">
          <span className="text-mute flex items-center gap-1.5 text-xs">
            <span className="bg-ok-fill inline-block h-2 w-2" />
            Recursos livres
          </span>
          <span className="text-ink font-semibold tabular-nums">
            {fmtCurrency(ponto.saldoRecursosLivres)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-mute flex items-center gap-1.5 text-xs">
            <span className="bg-warn-fill inline-block h-2 w-2" />
            Recursos vinculados
          </span>
          <span className="text-ink font-semibold tabular-nums">
            {fmtCurrency(ponto.saldoRecursosVinculados)}
          </span>
        </div>
        <div className="border-line flex items-baseline justify-between border-t pt-1">
          <span className="text-mute flex items-center gap-1.5 text-xs">
            <span className="bg-mute inline-block h-2 w-2" />
            Total em caixa
          </span>
          <span className="text-ink font-semibold tabular-nums">
            {fmtCurrency(ponto.saldoCaixaBancos)}
          </span>
        </div>
      </div>
    </div>
  );
}

const MILHAO = 1_000_000;
const MIL = 1_000;
const LARGURA_CARACTERE_EIXO = 6.6;
const FOLGA_EIXO = 8;

function formatarEixo(valor: number): string {
  if (valor === 0) return "0";
  const numero = (n: number) =>
    n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  if (Math.abs(valor) >= MILHAO) return `${numero(valor / MILHAO)} mi`;
  return `${numero(valor / MIL)} mil`;
}

/** Largura do eixo Y ajustada ao maior rótulo, para o gráfico ocupar o resto. */
function larguraEixo(pontos: SiconfiEvolucaoMensalPontoDTO[]): number {
  const maior = Math.max(
    ...pontos.flatMap((p) => [
      Math.abs(p.saldoCaixaBancos),
      Math.abs(p.saldoRecursosLivres),
    ]),
  );
  return Math.ceil(
    formatarEixo(maior).length * LARGURA_CARACTERE_EIXO + FOLGA_EIXO,
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

  const corLivres = corDoGrafico("ok");
  const corTotal = corDoGrafico("mute");

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-mute flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="bg-ok-fill inline-block h-2.5 w-2.5" />
          Recursos livres
        </span>
        <span className="flex items-center gap-1.5">
          <span className="border-mute inline-block h-0 w-4 border-t-2 border-dashed" />
          Total em caixa
        </span>
        <span className="text-mute2">Valores em reais</span>
      </div>

      <div
        className="h-[220px] w-full sm:h-[270px] [&_*]:outline-none"
        aria-hidden="true"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            accessibilityLayer={false}
            data={pontos}
            margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={corLivres} stopOpacity={0.35} />
                <stop offset="95%" stopColor={corLivres} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={corDoGrafico("line")}
            />
            <XAxis
              dataKey="mesAbreviado"
              tick={{ fill: corDoGrafico("mute2"), fontSize: 12 }}
              axisLine={{ stroke: corDoGrafico("line") }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatarEixo}
              tick={{ fill: corDoGrafico("mute2"), fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={larguraEixo(pontos)}
            />
            <Tooltip
              content={renderCustomTooltip}
              position={{ y: 0 }}
              allowEscapeViewBox={{ x: false, y: false }}
            />
            <Area
              type="monotone"
              dataKey="saldoRecursosLivres"
              stroke={corLivres}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 6, stroke: corLivres, strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="saldoCaixaBancos"
              stroke={corTotal}
              strokeWidth={1.75}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, stroke: corTotal, strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Saldo em caixa mês a mês</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">Recursos livres</th>
            <th scope="col">Recursos vinculados</th>
            <th scope="col">Total em caixa</th>
          </tr>
        </thead>
        <tbody>
          {pontos.map((ponto) => (
            <tr key={ponto.mesReferencia}>
              <th scope="row">{ponto.mesNome}</th>
              <td>{fmtCurrency(ponto.saldoRecursosLivres)}</td>
              <td>{fmtCurrency(ponto.saldoRecursosVinculados)}</td>
              <td>{fmtCurrency(ponto.saldoCaixaBancos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
