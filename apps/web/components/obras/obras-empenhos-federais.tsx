"use client";

import {
  Calendar,
  ExternalLink,
  FileCheck2,
  Info,
  Landmark,
} from "lucide-react";
import type { ObraEmpenhoFederalViewModel } from "@/app/[portalSlug]/obras/view-model";

export interface ObrasEmpenhosFederaisProps {
  empenhos?: ObraEmpenhoFederalViewModel[];
  valorTotalFormatado?: string;
}

export function ObrasEmpenhosFederais({
  empenhos,
  valorTotalFormatado,
}: ObrasEmpenhosFederaisProps) {
  const list = empenhos ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
          <Landmark className="h-4 w-4 text-slate-500" />
          <span>Empenhos Federais (Transferegov.br / SIAFI)</span>
        </h4>
        {list.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 text-xs">
              {list.length}{" "}
              {list.length === 1 ? "empenho federal" : "empenhos federais"}
            </span>
            {valorTotalFormatado && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 text-xs tabular-nums">
                Total: {valorTotalFormatado}
              </span>
            )}
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div
          data-testid="obras-empenhos-federais-empty-state"
          className="flex items-start gap-3 rounded-xl border border-slate-300 border-dashed bg-slate-50/70 p-4 text-slate-600 text-xs leading-relaxed"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">
              Nenhum empenho federal vinculado no ObrasGov.br
            </p>
            <p className="text-slate-500">
              Esta intervenção pode ser financiada exclusivamente com recursos
              próprios municipais, via financiamentos bancários ou os empenhos
              da União ainda estão em fase de descentralização orçamentária.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3" data-testid="obras-empenhos-federais-list">
          <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-slate-600 text-xs">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
            <p className="leading-relaxed">
              Recursos orçamentários transferidos pela União através do SIAFI /
              Transferegov.br especificamente destinados ao investimento nesta
              obra pública municipal.
            </p>
          </div>

          <div className="space-y-2.5">
            {list.map((empenho, idx) => (
              <div
                key={`${empenho.nrEmpenho}-${empenho.ugEmitente ?? ""}-${empenho.anoEmpenho ?? idx}`}
                className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-colors hover:border-slate-300"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 font-bold font-mono text-slate-900 text-sm">
                        <FileCheck2 className="h-3.5 w-3.5 text-blue-600" />
                        {empenho.nrEmpenho}
                      </span>
                      {Boolean(empenho.anoEmpenho) && (
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium text-[11px] text-slate-600">
                          Ano {empenho.anoEmpenho}
                        </span>
                      )}
                      <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-semibold text-[10px] text-blue-700 uppercase">
                        {empenho.sistemaOrigem}
                      </span>
                    </div>

                    {empenho.descricao && (
                      <p className="line-clamp-2 text-slate-700 text-xs leading-relaxed">
                        {empenho.descricao}
                      </p>
                    )}

                    {(empenho.dataEmissao || empenho.acaoOrcamentaria) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-slate-500">
                        {empenho.dataEmissao && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            Emissão: {empenho.dataEmissaoFormatada}
                          </span>
                        )}
                        {empenho.acaoOrcamentaria && (
                          <span>Ação: {empenho.acaoOrcamentaria}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 sm:text-right">
                    <span className="block text-[11px] text-slate-500">
                      Valor Empenhado
                    </span>
                    <span className="font-bold text-emerald-700 text-sm tabular-nums sm:text-base">
                      {empenho.valorEmpenhoFormatado}
                    </span>
                  </div>
                </div>

                {empenho.linkOrigem && (
                  <div className="mt-2.5 flex items-center justify-between border-slate-100 border-t pt-2 text-xs">
                    <a
                      href={empenho.linkOrigem}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <span>{empenho.linkOrigemLabel}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
