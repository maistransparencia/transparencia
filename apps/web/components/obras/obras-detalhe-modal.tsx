"use client";

import type { ObraEmpenhoFederalDTO } from "@transparencia/db";
import { Badge, ModalDialog } from "@transparencia/ui";
import {
  AlertTriangle,
  Building2,
  ExternalLink,
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
import { ObrasEmpenhosFederais } from "./obras-empenhos-federais";
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
    if (
      "alertaDescompasso" in obra &&
      "contratos" in obra &&
      "empenhosFederais" in obra
    ) {
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
        valorTotalEmpenhadoFederal:
          "valorTotalEmpenhadoFederal" in obra
            ? (obra.valorTotalEmpenhadoFederal as number | undefined)
            : undefined,
        quantidadeEmpenhosFederais:
          "quantidadeEmpenhosFederais" in obra
            ? (obra.quantidadeEmpenhosFederais as number | undefined)
            : undefined,
        empenhosFederais:
          "empenhosFederais" in obra && Array.isArray(obra.empenhosFederais)
            ? (obra.empenhosFederais as ObraEmpenhoFederalDTO[])
            : undefined,
      },
      portalSlug,
    );

    return {
      ...baseDetalhe,
      contratos: Array.isArray(obra.contratos) ? obra.contratos : [],
      empenhosFederais: baseDetalhe.empenhosFederais,
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
          <Badge variant={viewModel.situacaoVisual.badgeVariant}>
            {viewModel.situacaoVisual.label}
          </Badge>
          {viewModel.naturezaIntervencao && (
            <Badge>{viewModel.naturezaIntervencao}</Badge>
          )}
          {viewModel.especieIntervencao && (
            <Badge variant="accent">{viewModel.especieIntervencao}</Badge>
          )}
        </div>
      }
      maxWidth="3xl"
      showShareButton={Boolean(shareUrl)}
      shareUrl={shareUrl}
      shareTitle={`Detalhes da Obra: ${viewModel.nomeObra} - Transparência Municipal`}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-mute2 flex items-center gap-1.5">
            <span>Fonte de dados:</span>
            <strong className="text-mute">ObrasGov.br / CIPI</strong>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={viewModel.linkObrasGov}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-text inline-flex items-center gap-1 font-semibold hover:underline"
            >
              <span>Ver no Cadastro Oficial (CIPI)</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="border-line bg-page text-mute hover:bg-line2 border px-3.5 py-1.5 font-medium"
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
            className="border-danger-fill bg-danger-fill/15 text-danger-text border-l-[3px] px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-danger-text mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-danger-text text-sm font-bold">
                    Atenção Cívica: Obra Paralisada
                  </span>
                  <span className="border-danger-fill bg-page text-danger-text rounded-sm border px-2 py-0.5 text-xs font-medium">
                    Registro oficial em: {viewModel.dataParalisacaoFormatada}
                  </span>
                </div>
                <p className="text-danger-text text-xs leading-relaxed">
                  <strong className="text-danger-text font-semibold">
                    Justificativa oficial registrada:
                  </strong>{" "}
                  {viewModel.motivoParalisacao}
                </p>
                <div className="text-danger-text pt-1 text-xs">
                  <span>Fundamentação jurídica: </span>
                  <a
                    href={viewModel.linkLegislacao}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-danger-text decoration-danger-fill inline-flex items-center gap-1 font-semibold underline underline-offset-2"
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
          <div className="space-y-3">
            {viewModel.descricaoIntervencao && (
              <div>
                <span className="text-mute2 text-xs font-semibold tracking-wider uppercase">
                  Objeto da Intervenção
                </span>
                <p className="text-ink mt-0.5 text-sm leading-snug font-semibold">
                  {viewModel.descricaoIntervencao}
                </p>
              </div>
            )}
            {viewModel.funcaoSocial && (
              <div className="border-brand-fill bg-brand-fill/15 text-ink border-l-[3px] px-3 py-2">
                <div className="text-brand-text flex items-center gap-1.5">
                  <HeartHandshake className="text-brand-text h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold tracking-wider uppercase">
                    Função Social e Impacto Comunitário
                  </span>
                </div>
                <p className="text-mute mt-1 text-xs leading-relaxed">
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
              <div className="border-line border-t pt-3">
                <div className="text-mute2 flex items-center gap-1.5">
                  <Building2 className="text-mute2 h-4 w-4" />
                  <span className="text-xs font-semibold tracking-wider uppercase">
                    Órgão / Ente Executor
                  </span>
                </div>
                <p className="text-ink mt-1 text-sm font-semibold">
                  {viewModel.executorNome}
                </p>
                {viewModel.executorCnpjMascarado && (
                  <p className="text-mute2 mt-0.5 text-xs">
                    CNPJ: {viewModel.executorCnpjMascarado}
                  </p>
                )}
              </div>
            )}

            {viewModel.repassadorNome && (
              <div className="border-line border-t pt-3">
                <div className="text-mute2 flex items-center gap-1.5">
                  <Landmark className="text-mute2 h-4 w-4" />
                  <span className="text-xs font-semibold tracking-wider uppercase">
                    Repassador de Recursos
                  </span>
                </div>
                <p className="text-ink mt-1 text-sm font-semibold">
                  {viewModel.repassadorNome}
                </p>
                {viewModel.repassadorCnpjMascarado && (
                  <p className="text-mute2 mt-0.5 text-xs">
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
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="panel panel-top">
            <dt className="eyebrow">Investimento Previsto</dt>
            <dd className="stat-value-sm">
              {viewModel.valorInvestimentoFormatado}
            </dd>
          </div>
          <div className="panel panel-top">
            <dt className="eyebrow">Início Previsto</dt>
            <dd className="stat-value-sm">
              {viewModel.dataInicioPrevistaFormatada}
            </dd>
          </div>
          <div className="panel panel-top">
            <dt className="eyebrow">Término Previsto</dt>
            <dd className="stat-value-sm">
              {viewModel.dataFimPrevistaFormatada}
            </dd>
          </div>
        </dl>

        {/* Seção Dedicada de Empenhos Federais (Transferegov.br / SIAFI) */}
        <ObrasEmpenhosFederais
          empenhos={viewModel.empenhosFederais}
          valorTotalFormatado={
            viewModel.valorTotalEmpenhadoFederal > 0
              ? viewModel.valorTotalEmpenhadoFederalFormatado
              : undefined
          }
        />

        {/* Seção Dedicada de Contratos e Licitações Vinculados */}
        <ObrasContratosVinculados
          contratos={viewModel.contratos}
          portalSlug={viewModel.portalSlug}
          onNavigate={onClose}
        />
      </div>
    </ModalDialog>
  );
}
