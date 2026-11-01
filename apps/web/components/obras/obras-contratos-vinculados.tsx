"use client";

import { BProgress } from "@bprogress/core";
import { AlertBox, cn } from "@transparencia/ui";
import { ArrowRight, Calendar, FileText } from "lucide-react";
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
        <h4 className="flex items-center gap-2">
          <span>Contratos e Licitações Vinculados</span>
        </h4>
        {contratos.length > 0 && (
          <span className="rounded-sm bg-line2 px-2 py-0.5 font-medium text-mute text-xs">
            {contratos.length}{" "}
            {contratos.length === 1 ? "contrato" : "contratos"}
          </span>
        )}
      </div>

      {contratos.length === 0 ? (
        <div data-testid="obras-contratos-empty-state">
          <AlertBox
            type="info"
            title="Nenhum contrato municipal diretamente correlacionado"
          >
            Esta obra pode ser proveniente de execução direta, convênio
            estadual/federal sem contrato municipal específico cadastrado ou o
            instrumento contratual ainda não foi publicado no portal.
          </AlertBox>
        </div>
      ) : (
        <div className="space-y-3" data-testid="obras-contratos-list">
          {contratos.map((contrato) => (
            <div
              key={`${contrato.contratoId || contrato.contratoNumero}-${contrato.ano ?? "s-ano"}`}
              className="border-line border-t py-4 transition-colors"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink text-sm">
                      Contrato nº {contrato.contratoNumero}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-sm border px-2 py-0.5 font-semibold text-xs",
                        contrato.statusBadgeClasses,
                      )}
                    >
                      {contrato.statusLabel}
                    </span>
                  </div>
                  <p className="font-medium text-ink text-xs">
                    {contrato.fornecedorNome}
                  </p>
                  <p className="text-mute2 text-xs">
                    Documento: {contrato.fornecedorCpfCnpjMascarado}
                  </p>
                  {(contrato.dataInicio || contrato.vencimentoAtual) && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-mute2 text-xs">
                      <Calendar className="h-3 w-3 text-mute2" />
                      <span>
                        Vigência: {contrato.dataInicioFormatada} até{" "}
                        {contrato.vencimentoAtualFormatado}
                      </span>
                    </div>
                  )}
                </div>

                <div className="sm:text-right">
                  <span className="text-mute2 text-xs">Valor Contratado</span>
                  <p className="font-bold text-ink text-sm">
                    {contrato.valorContratoFormatado}
                  </p>
                  <span className="rounded-sm bg-line2 px-2 py-0.5 font-medium text-mute text-xs">
                    {contrato.modalidadeLabel}
                  </span>
                </div>
              </div>

              {/* Ações e deep links */}
              <div className="mt-3 flex flex-wrap items-center gap-3 border-line border-t pt-3 text-xs">
                <Link
                  href={contrato.linkContrato}
                  onClick={handleNavigation}
                  aria-label={`Ver detalhes do contrato nº ${contrato.contratoNumero}`}
                  className="inline-flex items-center gap-1 font-semibold text-brand-text hover:underline"
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
                    className="inline-flex items-center gap-1 font-medium text-mute hover:text-ink hover:underline"
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
