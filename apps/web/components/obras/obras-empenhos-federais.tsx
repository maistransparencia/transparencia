"use client";

import { AlertBox } from "@transparencia/ui";
import { Calendar, FileCheck2, Landmark } from "lucide-react";
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
          <Landmark className="text-mute2 h-4 w-4" />
          <span>Empenhos Federais (Transferegov.br / SIAFI)</span>
        </h4>
        {list.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="bg-line2 text-mute rounded-sm px-2 py-0.5 text-xs font-medium">
              {list.length}{" "}
              {list.length === 1 ? "empenho federal" : "empenhos federais"}
            </span>
            {valorTotalFormatado && (
              <span className="border-ok-fill bg-ok-fill/15 text-ok-text rounded-sm border px-2.5 py-0.5 text-xs font-bold tabular-nums">
                Total: {valorTotalFormatado}
              </span>
            )}
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div data-testid="obras-empenhos-federais-empty-state">
          <AlertBox
            type="info"
            title="Nenhum empenho federal vinculado no ObrasGov.br"
          >
            Esta intervenção pode ser financiada exclusivamente com recursos
            próprios municipais, via financiamentos bancários ou os empenhos da
            União ainda estão em fase de descentralização orçamentária.
          </AlertBox>
        </div>
      ) : (
        <div className="space-y-3" data-testid="obras-empenhos-federais-list">
          <AlertBox type="info">
            Recursos orçamentários transferidos pela União através do SIAFI /
            Transferegov.br especificamente destinados ao investimento nesta
            obra pública municipal.
          </AlertBox>

          <div className="space-y-2.5">
            {list.map((empenho, idx) => (
              <div
                key={`${empenho.nrEmpenho}-${empenho.ugEmitente ?? ""}-${empenho.anoEmpenho ?? idx}`}
                className="border-line border-t py-3.5 transition-colors"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-ink flex items-center gap-1 text-sm font-bold">
                        <FileCheck2 className="text-brand-text h-3.5 w-3.5" />
                        {empenho.nrEmpenho}
                      </span>
                      {Boolean(empenho.anoEmpenho) && (
                        <span className="border-line bg-line2 text-mute rounded-sm border px-1.5 py-0.5 text-xs font-medium">
                          Ano {empenho.anoEmpenho}
                        </span>
                      )}
                      <span className="border-brand-fill bg-brand-fill/15 text-brand-text rounded-sm border px-1.5 py-0.5 text-xs font-semibold uppercase">
                        {empenho.sistemaOrigem}
                      </span>
                    </div>

                    {empenho.descricao && (
                      <p className="text-mute line-clamp-2 text-xs leading-relaxed">
                        {empenho.descricao}
                      </p>
                    )}

                    {(empenho.dataEmissao || empenho.acaoOrcamentaria) && (
                      <div className="text-mute2 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
                        {empenho.dataEmissao && (
                          <span className="flex items-center gap-1">
                            <Calendar className="text-mute2 h-3 w-3" />
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
                    <span className="text-mute2 block text-xs">
                      Valor Empenhado
                    </span>
                    <span className="text-ok-text text-sm font-bold tabular-nums sm:text-base">
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
