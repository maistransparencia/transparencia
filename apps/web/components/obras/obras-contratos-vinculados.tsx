"use client";

import { BProgress } from "@bprogress/core";
import { cn } from "@transparencia/ui";
import { ArrowRight, Calendar, FileText, Info } from "lucide-react";
import Link from "next/link";
import type React from "react";
import type { ObraContratoViewModel } from "@/app/[portalSlug]/obras/view-model";

export interface ObrasContratosVinculadosProps {
  contratos: ObraContratoViewModel[];
  portalSlug: string;
  onNavigate?: () => void;
}

export function ObrasContratosVinculados({
  contratos,
  portalSlug: _portalSlug,
  onNavigate,
}: ObrasContratosVinculadosProps) {
  const handleNavigation = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    BProgress.start();
    onNavigate?.();
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
          <span>Contratos e Licitações Vinculados</span>
        </h4>
        {contratos.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 text-xs">
            {contratos.length}{" "}
            {contratos.length === 1 ? "contrato" : "contratos"}
          </span>
        )}
      </div>

      {contratos.length === 0 ? (
        <div
          data-testid="obras-contratos-empty-state"
          className="flex items-start gap-3 rounded-xl border border-slate-300 border-dashed bg-slate-50/70 p-4 text-slate-600 text-xs leading-relaxed"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">
              Nenhum contrato municipal diretamente correlacionado
            </p>
            <p className="text-slate-500">
              Esta obra pode ser proveniente de execução direta, convênio
              estadual/federal sem contrato municipal específico cadastrado ou o
              instrumento contratual ainda não foi publicado no portal.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3" data-testid="obras-contratos-list">
          {contratos.map((contrato) => (
            <div
              key={`${contrato.contratoId || contrato.contratoNumero}-${contrato.ano ?? "s-ano"}`}
              className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs transition-colors hover:border-slate-300"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold font-mono text-slate-900 text-sm">
                      Contrato nº {contrato.contratoNumero}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 font-semibold text-[11px]",
                        contrato.statusBadgeClasses,
                      )}
                    >
                      {contrato.statusLabel}
                    </span>
                  </div>
                  <p className="font-medium text-slate-800 text-xs">
                    {contrato.fornecedorNome}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500">
                    Documento: {contrato.fornecedorCpfCnpjMascarado}
                  </p>
                  {(contrato.dataInicio || contrato.vencimentoAtual) && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-500">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <span>
                        Vigência: {contrato.dataInicioFormatada} até{" "}
                        {contrato.vencimentoAtualFormatado}
                      </span>
                    </div>
                  )}
                </div>

                <div className="sm:text-right">
                  <span className="text-[11px] text-slate-500">
                    Valor Contratado
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {contrato.valorContratoFormatado}
                  </p>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-[11px] text-slate-600">
                    {contrato.modalidadeLabel}
                  </span>
                </div>
              </div>

              {/* Ações e deep links */}
              <div className="mt-3 flex flex-wrap items-center gap-3 border-slate-100 border-t pt-3 text-xs">
                <Link
                  href={contrato.linkContrato}
                  onClick={handleNavigation}
                  aria-label={`Ver detalhes do contrato nº ${contrato.contratoNumero}`}
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Ver detalhes do contrato</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>

                {contrato.linkLicitacao && (
                  <Link
                    href={contrato.linkLicitacao}
                    onClick={handleNavigation}
                    aria-label={`Ver licitação ${contrato.licitacaoNumero} vinculada ao contrato nº ${contrato.contratoNumero}`}
                    className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    <span>Ver licitação ({contrato.licitacaoNumero})</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
