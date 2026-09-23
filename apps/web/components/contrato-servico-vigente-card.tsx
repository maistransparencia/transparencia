"use client";

import type { ContratoServicoVigente } from "@transparencia/db";
import {
  cn,
  fmtCurrency,
  fmtDate,
  fmtPercent,
  TruncatedCellWithModal,
} from "@transparencia/ui";

export interface ContratoServicoVigenteCardProps {
  contrato: ContratoServicoVigente;
  onOpenDetails?: () => void;
  isHighlighted?: boolean;
}

export function ContratoServicoVigenteCard({
  contrato,
  onOpenDetails,
  isHighlighted = false,
}: ContratoServicoVigenteCardProps) {
  const {
    fornecedorNome,
    dataInicio,
    vencimentoAtual,
    valorAditado,
    totalEmpenhado,
    totalLiquidado,
    totalPago,
    saldoPendente,
    percentualPago,
  } = contrato;

  const validEmpenhado = Number.isFinite(totalEmpenhado) ? totalEmpenhado : 0;
  const pctLiquidado =
    validEmpenhado > 0 && Number.isFinite(totalLiquidado)
      ? Math.min(100, Math.max(0, (totalLiquidado / validEmpenhado) * 100))
      : 0;
  const pctPago = Number.isFinite(percentualPago)
    ? Math.min(100, Math.max(0, percentualPago))
    : 0;

  const vigenciaText = (() => {
    if (dataInicio && vencimentoAtual) {
      return `${fmtDate(dataInicio)} – ${fmtDate(vencimentoAtual)}`;
    }
    if (vencimentoAtual) {
      return `Até ${fmtDate(vencimentoAtual)}`;
    }
    if (dataInicio) {
      return `A partir de ${fmtDate(dataInicio)}`;
    }
    return "";
  })();

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl border border-borderLine bg-white p-5 shadow-xs transition-all hover:shadow-sm",
        isHighlighted && "ring-2 ring-blue-500 ring-offset-2",
      )}
    >
      <div className="space-y-2.5">
        {/* Header: Nome do Fornecedor + Número do Contrato + Badges */}
        <div className="flex min-h-[40px] items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3
              className="line-clamp-2 font-semibold text-ink text-sm leading-snug"
              title={fornecedorNome}
            >
              {onOpenDetails ? (
                <button
                  type="button"
                  onClick={onOpenDetails}
                  className="cursor-pointer text-left font-semibold text-ink text-sm leading-snug hover:text-blue-600 hover:underline"
                >
                  {fornecedorNome}
                </button>
              ) : (
                fornecedorNome
              )}
            </h3>
            {contrato.contratoNumero && (
              <span className="font-mono text-slate-500 text-xs">
                Contrato nº {contrato.contratoNumero}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {(() => {
              if (contrato.statusExecucao === "inexecutado") {
                return (
                  <span
                    className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 font-medium text-[10px] text-slate-700 ring-1 ring-slate-400/20 ring-inset"
                    title="Contrato sem execução orçamentária (sem liquidação/pagamento no período)"
                  >
                    Sem Execução Orçamentária
                  </span>
                );
              }
              if (contrato.statusExecucao === "concluido") {
                return (
                  <span
                    className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 font-medium text-[10px] text-blue-700 ring-1 ring-blue-600/20 ring-inset"
                    title="Execução orçamentária concluída (100% pago ou saldo pendente quitado)"
                  >
                    Concluído
                  </span>
                );
              }
              return null;
            })()}
            {valorAditado && valorAditado > 0 ? (
              <span
                className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 font-medium text-[10px] text-amber-800 ring-1 ring-amber-600/20 ring-inset"
                title={`Inclui ${fmtCurrency(valorAditado)} em aditivos de valor`}
              >
                Com aditamento
              </span>
            ) : null}
          </div>
        </div>

        {contrato.objetoDescricao && (
          <div className="pt-0.5">
            <TruncatedCellWithModal
              text={contrato.objetoDescricao}
              modalTitle={`Contrato — ${fornecedorNome}`}
              characterThreshold={100}
              maxLines={2}
              className="font-normal text-slate-700 text-xs leading-relaxed"
              badge={(() => {
                if (contrato.statusExecucao === "inexecutado")
                  return "Não Executado";
                if (contrato.statusExecucao === "concluido") return "Concluído";
                return "Em Execução";
              })()}
            />
          </div>
        )}

        {/* Vigência */}
        <div className="text-subtleText text-xs">
          <span>Vigência: </span>
          <span className="font-medium text-ink">{vigenciaText}</span>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="mt-4 space-y-2 border-gray-100 border-t pt-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold text-[11px] text-mutedText">
            Empenhado:{" "}
            <span className="font-bold font-serif text-ink">
              {fmtCurrency(totalEmpenhado)}
            </span>
          </span>
          <span className="font-semibold text-[11px] text-subtleText">
            Pago:{" "}
            <span className="font-bold font-serif text-emerald-700">
              {fmtCurrency(totalPago)}
            </span>
          </span>
        </div>

        {/* Progress Bar (Empenhado -> Liquidado -> Pago) - Oculta em inexecutados */}
        {contrato.statusExecucao !== "inexecutado" ? (
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="absolute top-0 bottom-0 left-0 bg-blue-300 transition-all duration-300"
              style={{ width: `${pctLiquidado}%` }}
            />
            <div
              className="absolute top-0 bottom-0 left-0 bg-emerald-500 transition-all duration-300"
              style={{ width: `${pctPago}%` }}
            />
          </div>
        ) : null}

        <div className="flex items-baseline justify-between pt-0.5 text-xs">
          <span className="font-medium text-[11px] text-mutedText">
            {fmtPercent(pctPago)} pago
          </span>
          {contrato.statusExecucao !== "inexecutado" ? (
            <span className="text-[11px] text-subtleText">
              Saldo:{" "}
              <span className="font-bold font-serif text-warning">
                {fmtCurrency(saldoPendente)}
              </span>
            </span>
          ) : (
            <span className="font-medium text-[11px] text-slate-500">
              Não Executado
            </span>
          )}
        </div>

        {onOpenDetails && (
          <div className="flex justify-end border-slate-100 border-t pt-2">
            <button
              type="button"
              onClick={onOpenDetails}
              className="cursor-pointer rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-blue-600 text-xs shadow-2xs hover:bg-slate-50 hover:text-blue-700"
            >
              Detalhes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
