"use client";

import { cn, ModalDialog } from "@transparencia/ui";
import {
  AlertTriangle,
  Building2,
  ExternalLink,
  FileText,
  HeartHandshake,
  Landmark,
} from "lucide-react";
import { useMemo } from "react";
import {
  buildObraDetalheViewModel,
  type ObraDetalheViewModel,
  type ObraItemViewModel,
} from "@/app/[portalSlug]/obras/view-model";
import { ObrasContratosVinculados } from "./obras-contratos-vinculados";
import { ObrasGraficoAvancoDuplo } from "./obras-grafico-avanco-duplo";

export interface ObrasDetalheModalProps {
  isOpen: boolean;
  onClose: () => void;
  obra: ObraItemViewModel | ObraDetalheViewModel | null;
  portalSlug: string;
}

export function ObrasDetalheModal({
  isOpen,
  onClose,
  obra,
  portalSlug,
}: ObrasDetalheModalProps) {
  const viewModel: ObraDetalheViewModel | null = useMemo(() => {
    if (!obra) return null;
    if ("alertaDescompasso" in obra && "contratos" in obra) {
      return obra as ObraDetalheViewModel;
    }

    const baseDetalhe = buildObraDetalheViewModel(
      {
        idProjeto: obra.idProjeto,
        portalSlug: obra.portalSlug || portalSlug,
        nomeObra: obra.nomeObra,
        situacao: obra.situacao,
        orgaoResponsavel: obra.orgaoResponsavel,
        valorInvestimentoPrevisto: obra.valorInvestimentoPrevisto,
        percentualExecucaoFisica: obra.percentualExecucaoFisica,
        percentualExecucaoFinanceira: obra.percentualExecucaoFinanceira ?? null,
        dataUltimaMedicao: obra.dataUltimaMedicao,
        dataParalisacao: obra.dataParalisacao ?? null,
        latitude: obra.latitude,
        longitude: obra.longitude,
        motivoParalisacao: obra.motivoParalisacao,
        dataInicioPrevista: obra.dataInicioPrevista,
        dataFimPrevista: obra.dataFimPrevista,
        funcaoSocial:
          "funcaoSocial" in obra ? (obra.funcaoSocial as string | null) : null,
        descricaoIntervencao:
          "descricaoIntervencao" in obra
            ? (obra.descricaoIntervencao as string | null)
            : null,
        naturezaIntervencao:
          "naturezaIntervencao" in obra
            ? (obra.naturezaIntervencao as string | null)
            : null,
        especieIntervencao:
          "especieIntervencao" in obra
            ? (obra.especieIntervencao as string | null)
            : null,
        executorNome:
          "executorNome" in obra ? (obra.executorNome as string | null) : null,
        executorCnpj:
          "executorCnpj" in obra ? (obra.executorCnpj as string | null) : null,
        repassadorNome:
          "repassadorNome" in obra
            ? (obra.repassadorNome as string | null)
            : null,
        repassadorCnpj:
          "repassadorCnpj" in obra
            ? (obra.repassadorCnpj as string | null)
            : null,
      },
      portalSlug,
    );

    return {
      ...baseDetalhe,
      contratos: Array.isArray(obra.contratos) ? obra.contratos : [],
    };
  }, [obra, portalSlug]);

  if (!viewModel) {
    return null;
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${portalSlug}/obras?idProjeto=${encodeURIComponent(viewModel.idProjeto)}`
      : undefined;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={viewModel.nomeObra}
      subtitle={viewModel.orgaoResponsavel}
      badge={
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold text-xs",
              viewModel.situacaoVisual.badgeClass,
            )}
          >
            {viewModel.situacaoVisual.label}
          </span>
          {viewModel.naturezaIntervencao && (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 font-medium text-slate-700 text-xs">
              {viewModel.naturezaIntervencao}
            </span>
          )}
          {viewModel.especieIntervencao && (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-medium text-blue-700 text-xs">
              {viewModel.especieIntervencao}
            </span>
          )}
        </div>
      }
      maxWidth="3xl"
      showShareButton={Boolean(shareUrl)}
      shareUrl={shareUrl}
      shareTitle={`Detalhes da Obra: ${viewModel.nomeObra} - Transparência Municipal`}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Fonte de dados:</span>
            <strong className="text-slate-700">ObrasGov.br / CIPI</strong>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={viewModel.linkObrasGov}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              <span>Ver no Cadastro Oficial (CIPI)</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 py-1">
        {/* Banner especial para Obra Paralisada com fundamentação legal */}
        {viewModel.isParalisada && (
          <div
            data-testid="modal-alerta-paralisada"
            className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-rose-950"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-rose-900 text-sm">
                    Atenção Cívica: Obra Paralisada
                  </span>
                  <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 font-medium text-[11px] text-rose-800">
                    Registro oficial em: {viewModel.dataParalisacaoFormatada}
                  </span>
                </div>
                <p className="text-rose-900/90 text-xs leading-relaxed">
                  <strong className="font-semibold text-rose-950">
                    Justificativa oficial registrada:
                  </strong>{" "}
                  {viewModel.motivoParalisacao}
                </p>
                <div className="pt-1 text-[11px] text-rose-800">
                  <span>Fundamentação jurídica: </span>
                  <a
                    href={viewModel.linkLegislacao}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-rose-950 underline decoration-rose-400 underline-offset-2 hover:text-rose-900"
                  >
                    Art. 115, § 6º da Lei nº 14.133/2021
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Objeto da Intervenção e Função Social (Propósito Cívico no Topo) */}
        {(viewModel.descricaoIntervencao || viewModel.funcaoSocial) && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            {viewModel.descricaoIntervencao && (
              <div>
                <span className="font-semibold text-[11px] text-slate-500 uppercase tracking-wider">
                  Objeto da Intervenção
                </span>
                <p className="mt-0.5 font-semibold text-slate-900 text-sm leading-snug">
                  {viewModel.descricaoIntervencao}
                </p>
              </div>
            )}
            {viewModel.funcaoSocial && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-slate-800">
                <div className="flex items-center gap-1.5 text-blue-900">
                  <HeartHandshake className="h-4 w-4 shrink-0 text-blue-600" />
                  <span className="font-semibold text-[11px] uppercase tracking-wider">
                    Função Social e Impacto Comunitário
                  </span>
                </div>
                <p className="mt-1 text-slate-700 text-xs leading-relaxed">
                  {viewModel.funcaoSocial}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Executor e Repassador de Recursos (Quem Executa e Quem Financia) */}
        {(viewModel.executorNome || viewModel.repassadorNome) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {viewModel.executorNome && (
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-[11px] uppercase tracking-wider">
                    Órgão / Ente Executor
                  </span>
                </div>
                <p className="mt-1 font-semibold text-slate-900 text-sm">
                  {viewModel.executorNome}
                </p>
                {viewModel.executorCnpjMascarado && (
                  <p className="mt-0.5 font-mono text-slate-500 text-xs">
                    CNPJ: {viewModel.executorCnpjMascarado}
                  </p>
                )}
              </div>
            )}

            {viewModel.repassadorNome && (
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Landmark className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-[11px] uppercase tracking-wider">
                    Repassador de Recursos
                  </span>
                </div>
                <p className="mt-1 font-semibold text-slate-900 text-sm">
                  {viewModel.repassadorNome}
                </p>
                {viewModel.repassadorCnpjMascarado && (
                  <p className="mt-0.5 font-mono text-slate-500 text-xs">
                    CNPJ: {viewModel.repassadorCnpjMascarado}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Comparativo Gráfico de Barras Duplas (Física vs Financeira) */}
        <ObrasGraficoAvancoDuplo
          percentualExecucaoFisica={viewModel.percentualExecucaoFisica}
          percentualFisicoFormatado={viewModel.percentualFisicoFormatado}
          percentualExecucaoFinanceira={viewModel.percentualExecucaoFinanceira}
          percentualFinanceiroFormatado={
            viewModel.percentualFinanceiroFormatado
          }
          dataUltimaMedicaoFormatada={viewModel.dataUltimaMedicaoFormatada}
          alertaDescompasso={viewModel.alertaDescompasso}
        />

        {/* Grid de Prazos e Investimento Previsto (3 colunas concisas) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <span className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-500 uppercase tracking-wider">
              Investimento Previsto
            </span>
            <p className="mt-1 font-bold text-base text-slate-900">
              {viewModel.valorInvestimentoFormatado}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <span className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-500 uppercase tracking-wider">
              Início Previsto
            </span>
            <p className="mt-1 font-semibold text-slate-800 text-sm">
              {viewModel.dataInicioPrevistaFormatada}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <span className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-500 uppercase tracking-wider">
              Término Previsto
            </span>
            <p className="mt-1 font-semibold text-slate-800 text-sm">
              {viewModel.dataFimPrevistaFormatada}
            </p>
          </div>
        </div>

        {/* Seção Dedicada de Contratos e Licitações Vinculados */}
        <ObrasContratosVinculados
          contratos={viewModel.contratos}
          portalSlug={viewModel.portalSlug}
        />

        {/* Identificador Oficial e Legislação de Regência */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 text-xs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <FileText className="h-4 w-4 text-slate-400" />
              <span>
                Identificador único de investimento:{" "}
                <strong className="font-mono font-semibold text-slate-900">
                  {viewModel.idProjeto}
                </strong>
              </span>
            </div>

            <div className="text-slate-500">
              <span>Regência: </span>
              <a
                href={viewModel.linkLegislacao}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 hover:underline"
              >
                Lei nº 14.133/2021 (Nova Lei de Licitações)
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
