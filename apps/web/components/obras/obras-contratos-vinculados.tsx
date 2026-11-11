"use client";

import { BProgress } from "@bprogress/core";
import { AlertBox, Badge } from "@transparencia/ui";
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
          <span className="bg-line2 text-mute rounded-sm px-2 py-0.5 text-xs font-medium">
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
                    <span className="text-ink text-sm font-bold">
                      Contrato nº {contrato.contratoNumero}
                    </span>
                    <Badge variant={contrato.statusBadgeVariant}>
                      {contrato.statusLabel}
                    </Badge>
                  </div>
                  <p className="text-ink text-xs font-medium">
                    {contrato.fornecedorNome}
                  </p>
                  <p className="text-mute2 text-xs">
                    Documento: {contrato.fornecedorCpfCnpjMascarado}
                  </p>
                  {(contrato.dataInicio || contrato.vencimentoAtual) && (
                    <div className="text-mute2 flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                      <Calendar className="text-mute2 h-3 w-3" />
                      <span>
                        Vigência: {contrato.dataInicioFormatada} até{" "}
                        {contrato.vencimentoAtualFormatado}
                      </span>
                    </div>
                  )}
                </div>

                <div className="sm:text-right">
                  <span className="text-mute2 text-xs">Valor Contratado</span>
                  <p className="text-ink text-sm font-bold">
                    {contrato.valorContratoFormatado}
                  </p>
                  <span className="bg-line2 text-mute rounded-sm px-2 py-0.5 text-xs font-medium">
                    {contrato.modalidadeLabel}
                  </span>
                </div>
              </div>

              {/* Ações e deep links */}
              <div className="border-line mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-xs">
                <Link
                  href={contrato.linkContrato}
                  onClick={handleNavigation}
                  aria-label={`Ver detalhes do contrato nº ${contrato.contratoNumero}`}
                  className="text-brand-text inline-flex items-center gap-1 font-semibold hover:underline"
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
                    className="text-mute hover:text-ink inline-flex items-center gap-1 font-medium hover:underline"
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
