"use client";

import { Calendar, FileCheck2, Info, Landmark } from "lucide-react";
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
        <h4 className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-mute2" />
          <span>Empenhos Federais (Transferegov.br / SIAFI)</span>
        </h4>
        {list.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="rounded-sm bg-line2 px-2 py-0.5 font-medium text-mute text-xs">
              {list.length}{" "}
              {list.length === 1 ? "empenho federal" : "empenhos federais"}
            </span>
            {valorTotalFormatado && (
              <span className="rounded-full border border-ok-fill bg-ok-fill/15 px-2.5 py-0.5 font-bold text-ok-text text-xs tabular-nums">
                Total: {valorTotalFormatado}
              </span>
            )}
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div
          data-testid="obras-empenhos-federais-empty-state"
          className="flex items-start gap-3 border-line border-y py-4 text-mute text-xs leading-relaxed"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-mute2" />
          <div className="space-y-1">
            <p className="font-semibold text-ink">
              Nenhum empenho federal vinculado no ObrasGov.br
            </p>
            <p className="text-mute2">
              Esta intervenção pode ser financiada exclusivamente com recursos
              próprios municipais, via financiamentos bancários ou os empenhos
              da União ainda estão em fase de descentralização orçamentária.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3" data-testid="obras-empenhos-federais-list">
          <div className="flex items-start gap-2.5 border border-brand-fill bg-brand-fill/15 p-3 text-mute text-xs">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-text" />
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
                className="border-line border-t py-3.5 transition-colors"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 font-bold text-ink text-sm">
                        <FileCheck2 className="h-3.5 w-3.5 text-brand-text" />
                        {empenho.nrEmpenho}
                      </span>
                      {Boolean(empenho.anoEmpenho) && (
                        <span className="rounded-md border border-line bg-line2 px-1.5 py-0.5 font-medium text-mute text-xs">
                          Ano {empenho.anoEmpenho}
                        </span>
                      )}
                      <span className="rounded-md border border-brand-fill bg-brand-fill/15 px-1.5 py-0.5 font-semibold text-brand-text text-xs uppercase">
                        {empenho.sistemaOrigem}
                      </span>
                    </div>

                    {empenho.descricao && (
                      <p className="line-clamp-2 text-mute text-xs leading-relaxed">
                        {empenho.descricao}
                      </p>
                    )}

                    {(empenho.dataEmissao || empenho.acaoOrcamentaria) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-mute2 text-xs">
                        {empenho.dataEmissao && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-mute2" />
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
                    <span className="block text-mute2 text-xs">
                      Valor Empenhado
                    </span>
                    <span className="font-bold text-ok-text text-sm tabular-nums sm:text-base">
                      {empenho.valorEmpenhoFormatado}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
