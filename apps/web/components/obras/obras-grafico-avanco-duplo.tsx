"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { urlLegislacao } from "@/lib/constants/legislacao";

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
  const valorFisico = percentualExecucaoFisica ?? 0;
  const larguraFisica = Math.min(100, Math.max(0, valorFisico));

  const valorFinanceiro = percentualExecucaoFinanceira ?? 0;
  const larguraFinanceira = Math.min(100, Math.max(0, valorFinanceiro));

  return (
    <div
      data-testid="grafico-avanco-duplo"
      className="space-y-6 border-line border-t pt-6"
    >
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-bold">
            Auditoria de Avanço Físico vs. Financeiro
          </h3>
          <p className="text-mute text-sm">
            Comparativo entre o avanço técnico medido presencialmente no
            canteiro de obras e o desembolso financeiro acumulado.
          </p>
        </div>
      </div>

      {/* Alerta de Descompasso Físico-Financeiro */}
      {alertaDescompasso?.temDescompasso && (
        <div
          data-testid="alerta-descompasso"
          className="flex items-start gap-3 border-warn-fill border-l-[3px] bg-warn-fill/15 px-4 py-3 text-ink"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn-text" />
          <div className="space-y-1 text-sm">
            <span className="font-semibold text-ink">
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
              <span className="h-3 w-3 rounded-sm bg-ok-fill" />
              <span className="font-semibold text-ink">
                Execução Física Oficial
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink tabular-nums">
                {percentualFisicoFormatado}
              </span>
            </div>
          </div>

          <div className="h-3 w-full overflow-hidden bg-line2">
            <div
              role="progressbar"
              aria-valuenow={
                percentualExecucaoFisica !== null ? valorFisico : undefined
              }
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso da Execução Física Oficial"
              style={{ width: `${larguraFisica}%` }}
              className={`h-full transition-all duration-500 ${
                percentualExecucaoFisica !== null ? "bg-ok-fill" : "bg-mute3"
              }`}
            />
          </div>

          <div className="text-mute2 text-xs">
            <span>
              Última medição técnica em campo:{" "}
              <strong className="text-mute">
                {dataUltimaMedicaoFormatada}
              </strong>
            </span>
          </div>
        </div>

        {/* Barra 2: Execução Financeira */}
        <div data-testid="barra-execucao-financeira" className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-brand-fill" />
              <span className="font-semibold text-ink">
                Execução Financeira
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink tabular-nums">
                {percentualFinanceiroFormatado}
              </span>
            </div>
          </div>

          <div className="h-3 w-full overflow-hidden bg-line2">
            <div
              role="progressbar"
              aria-valuenow={
                percentualExecucaoFinanceira !== null
                  ? valorFinanceiro
                  : undefined
              }
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso da Execução Financeira"
              style={{ width: `${larguraFinanceira}%` }}
              className={`h-full transition-all duration-500 ${
                percentualExecucaoFinanceira !== null
                  ? "bg-brand-fill"
                  : "bg-mute3"
              }`}
            />
          </div>

          <div className="text-mute2 text-xs">
            <span>
              {percentualExecucaoFinanceira !== null
                ? "Total liberado/pago acumulado"
                : "Informação contábil em fase de consolidação"}
            </span>
          </div>
        </div>
      </div>

      {/* Nota Explicativa Cívica */}
      <div className="border-line border-y py-3 text-mute text-xs leading-relaxed">
        <p>
          <strong className="text-mute">Critério de Auditoria Cívica:</strong>{" "}
          De acordo com as boas práticas de controle dos Tribunais de Contas e
          da{" "}
          <a
            href={urlLegislacao("lei14133")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5"
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
