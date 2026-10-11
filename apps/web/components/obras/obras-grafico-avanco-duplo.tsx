"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";

export interface ObrasGraficoAvancoDuploProps {
  percentualExecucaoFisica: number | null;
  percentualFisicoFormatado: string;
  percentualExecucaoFinanceira: number | null;
  percentualFinanceiroFormatado: string;
  dataUltimaMedicaoFormatada: string;
  alertaDescompasso: {
    temDescompasso: boolean;
    diferencaPercentual: number;
    mensagem: string;
  };
}

export function ObrasGraficoAvancoDuplo({
  percentualExecucaoFisica,
  percentualFisicoFormatado,
  percentualExecucaoFinanceira,
  percentualFinanceiroFormatado,
  dataUltimaMedicaoFormatada,
  alertaDescompasso,
}: ObrasGraficoAvancoDuploProps) {
  const fisValue = percentualExecucaoFisica ?? 0;
  const fisWidth = Math.min(100, Math.max(0, fisValue));

  const finValue = percentualExecucaoFinanceira ?? 0;
  const finWidth = Math.min(100, Math.max(0, finValue));

  return (
    <div
      data-testid="grafico-avanco-duplo"
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-bold font-serif text-lg text-slate-900">
            Auditoria de Avanço Físico vs. Financeiro
          </h3>
          <p className="text-slate-600 text-sm">
            Comparativo entre o avanço técnico medido presencialmente no
            canteiro de obras e o desembolso financeiro acumulado.
          </p>
        </div>
      </div>

      {/* Alerta de Descompasso Físico-Financeiro */}
      {alertaDescompasso?.temDescompasso && (
        <div
          data-testid="alerta-descompasso"
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1 text-sm">
            <span className="font-semibold text-amber-950">
              Descompasso Físico-Financeiro Identificado
            </span>
            <p className="leading-relaxed">{alertaDescompasso.mensagem}</p>
          </div>
        </div>
      )}

      {/* Grid de Barras Comparativas */}
      <div className="space-y-5">
        {/* Barra 1: Execução Física Oficial */}
        <div data-testid="barra-execucao-fisica" className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-emerald-600" />
              <span className="font-semibold text-slate-900">
                Execução Física Oficial
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 text-xs">
                Boletim Técnico ObrasGov.br
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 tabular-nums">
                {percentualFisicoFormatado}
              </span>
            </div>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              role="progressbar"
              aria-valuenow={
                percentualExecucaoFisica !== null ? fisValue : undefined
              }
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso da Execução Física Oficial"
              style={{ width: `${fisWidth}%` }}
              className={`h-full transition-all duration-500 ${
                percentualExecucaoFisica !== null
                  ? "bg-emerald-600"
                  : "bg-slate-300"
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>
              Última medição técnica em campo:{" "}
              <strong className="text-slate-700">
                {dataUltimaMedicaoFormatada}
              </strong>
            </span>
            <span>Meta: 100%</span>
          </div>
        </div>

        {/* Barra 2: Execução Financeira */}
        <div data-testid="barra-execucao-financeira" className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-blue-600" />
              <span className="font-semibold text-slate-900">
                Execução Financeira
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 text-xs">
                Desembolsos Contábeis
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 tabular-nums">
                {percentualFinanceiroFormatado}
              </span>
            </div>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              role="progressbar"
              aria-valuenow={
                percentualExecucaoFinanceira !== null ? finValue : undefined
              }
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso da Execução Financeira"
              style={{ width: `${finWidth}%` }}
              className={`h-full transition-all duration-500 ${
                percentualExecucaoFinanceira !== null
                  ? "bg-blue-600"
                  : "bg-slate-300"
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>
              {percentualExecucaoFinanceira !== null
                ? "Total liberado/pago acumulado"
                : "Informação contábil em fase de consolidação"}
            </span>
            <span>Meta: 100%</span>
          </div>
        </div>
      </div>

      {/* Nota Explicativa Cívica */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-slate-600 text-xs leading-relaxed">
        <p>
          <strong className="text-slate-700">
            Critério de Auditoria Cívica:
          </strong>{" "}
          De acordo com as boas práticas de controle dos Tribunais de Contas e
          da{" "}
          <a
            href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            <span>Lei nº 14.133/2021</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          , o pagamento financeiro deve acompanhar rigorosamente o ateste
          presencial das medições físicas, resguardando o erário público contra
          pagamentos antecipados sem contraprestação da obra em campo.
        </p>
      </div>
    </div>
  );
}
