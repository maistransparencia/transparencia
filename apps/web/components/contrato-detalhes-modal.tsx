"use client";

import { BProgress } from "@bprogress/core";
import type { ContratoServicoVigente } from "@transparencia/db";
import {
  Badge,
  fmtCpfCnpj,
  fmtCurrency,
  fmtDate,
  fmtPercent,
  ModalDialog,
} from "@transparencia/ui";
import { AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { urlLegislacao } from "@/lib/constants/legislacao";

export interface ContratoDetalhesModalProps {
  contrato: ContratoServicoVigente | null;
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string;
  openedFromSearch?: boolean;
  ano?: number;
  portalSlug?: string;
  categoriaBadge?: React.ReactNode;
}

export function ContratoDetalhesModal({
  contrato,
  isOpen,
  onClose,
  onBack,
  backLabel = "Voltar aos resultados da busca",
  openedFromSearch = false,
  ano,
  portalSlug,
  categoriaBadge,
}: ContratoDetalhesModalProps) {
  if (!contrato || !isOpen) return null;

  const handleLicitacaoClick = () => {
    const licNum = contrato.licitacaoNumero;
    if (!licNum) return;
    const contratoNum = contrato.contratoNumero;
    const contratoAno = contrato.ano;
    const targetLicAno = contrato.licitacaoAno || contratoAno;

    if (typeof window !== "undefined") {
      const isLicitacoesPage = window.location.pathname.endsWith("/licitacoes");

      if (!isLicitacoesPage) {
        const targetUrl = `/${portalSlug || "portal"}/licitacoes?numero=${encodeURIComponent(licNum)}${targetLicAno ? `&ano=${targetLicAno}` : ""}#licitacoes-em-andamento`;
        BProgress.start();
        onClose();
        window.location.href = targetUrl;
        return;
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("contratoNumero");
      url.searchParams.delete("contratoId");
      url.searchParams.set("numero", licNum);
      if (targetLicAno) {
        url.searchParams.set("ano", String(targetLicAno));
      }
      url.hash = "licitacoes-em-andamento";
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
      BProgress.start();
    }

    onClose();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("licitacao:selected", {
          detail: {
            numero: licNum,
            portalSlug,
            ano: targetLicAno,
            fromContrato: {
              contratoNumero: contratoNum,
              ano: contratoAno,
              portalSlug,
            },
          },
        }),
      );
    }
  };

  const statusBadge = (() => {
    const status = contrato.statusExecucao;
    if (status === "concluido") {
      return <Badge variant="success">Concluído</Badge>;
    }
    if (status === "inexecutado") {
      return <Badge variant="danger">Não Executado</Badge>;
    }
    return <Badge variant="accent">Em Execução</Badge>;
  })();

  const vigenciaText = (() => {
    if (contrato.dataInicio && contrato.vencimentoAtual) {
      return `${fmtDate(contrato.dataInicio)} até ${fmtDate(contrato.vencimentoAtual)}`;
    }
    if (contrato.vencimentoAtual) {
      return `Até ${fmtDate(contrato.vencimentoAtual)}`;
    }
    if (contrato.dataInicio) {
      return `A partir de ${fmtDate(contrato.dataInicio)}`;
    }
    return "Vigência não informada";
  })();

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      onBack={openedFromSearch ? (onBack ?? onClose) : undefined}
      backLabel={backLabel}
      zIndex={openedFromSearch ? "z-[60]" : undefined}
      title={`Contrato nº ${contrato.contratoNumero || "S/N"}`}
      subtitle={contrato.fornecedorNome}
      badge={
        <div className="flex flex-wrap items-center gap-1.5">
          {categoriaBadge}
          {statusBadge}
        </div>
      }
      maxWidth="4xl"
      footer={
        <div className="flex w-full justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border-line bg-page text-ink hover:bg-line2 rounded-md border px-4 py-2 text-xs font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      }
    >
      <div className="space-y-6 py-2" data-testid="contrato-detalhes-modal">
        {contrato.ano && ano && contrato.ano !== ano && (
          <div className="border-warn-text/30 bg-warn-fill/10 text-warn-text flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-warn-text h-4 w-4 shrink-0" />
              <span>
                Este contrato pertence ao exercício de{" "}
                <strong className="font-semibold">{contrato.ano}</strong> (você
                está navegando no painel de{" "}
                <strong className="font-semibold">{ano}</strong>).
              </span>
            </div>
            <Link
              href={`/${portalSlug || "portal"}/licitacoes?ano=${contrato.ano}&contratoNumero=${encodeURIComponent(contrato.contratoNumero || contrato.contratoServicoId || "")}#contratos-servicos-vigentes`}
              className="text-warn-text decoration-warn-text/40 hover:text-ink inline-flex items-center gap-1 font-semibold underline underline-offset-2 transition-colors"
            >
              <span>Mudar painel para {contrato.ano}</span>
            </Link>
          </div>
        )}

        {/* Bloco 1: Fornecedor, Órgão, Vigência, Licitação de Origem e Ano */}
        <div className="border-line bg-line2 grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2 sm:gap-6">
          <div>
            <span className="text-mute2 text-xs font-semibold tracking-wider uppercase">
              Fornecedor
            </span>
            <p className="text-ink mt-0.5 text-sm font-semibold">
              {contrato.fornecedorNome}
            </p>
            <p className="text-mute2 text-xs">
              CNPJ/CPF:{" "}
              <span className="text-ink">
                {fmtCpfCnpj(contrato.fornecedorCnpj) || "Não informado"}
              </span>
            </p>
            {contrato.orgaoNome && (
              <p className="text-mute2 mt-1 text-xs">
                Órgão Responsável:{" "}
                <span className="text-ink font-semibold">
                  {contrato.orgaoNome}
                </span>
              </p>
            )}
          </div>

          <div>
            <span className="text-mute2 text-xs font-semibold tracking-wider uppercase">
              Vigência Contratual
            </span>
            <p className="text-ink mt-0.5 text-sm font-medium">
              {vigenciaText}
            </p>
            {contrato.ano && (
              <p className="text-mute2 text-xs">
                Exercício de referência:{" "}
                <span className="text-ink font-semibold">{contrato.ano}</span>
              </p>
            )}
            {contrato.licitacaoNumero && (
              <div className="text-mute2 mt-1 flex items-center gap-1.5 text-xs">
                <span>Processo Licitatório:</span>
                <button
                  type="button"
                  onClick={handleLicitacaoClick}
                  className="text-brand decoration-brand/40 hover:text-ink hover:decoration-ink/40 inline-flex cursor-pointer items-center gap-1 font-semibold underline"
                  title="Ver detalhes do processo licitatório vinculado"
                >
                  <span>{contrato.licitacaoNumero}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bloco de Rastreabilidade Orçamentária e Fonte de Recursos */}
        {(contrato.fontePrincipal ||
          contrato.fontesRecursos ||
          contrato.programaNome ||
          contrato.projetoAtividadeNome) && (
          <div className="border-brand/30 bg-brand/10 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <span className="text-brand text-xs font-semibold tracking-wider uppercase">
                Fonte de Recursos &amp; Destinação Orçamentária
              </span>
              <a
                href={urlLegislacao("lei14133Ato20212024", "art92")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand inline-flex items-center gap-1 text-xs font-medium hover:underline"
                title="Art. 92, VIII da Lei 14.133/2021"
              >
                <span>Art. 92 da Lei 14.133/21</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>

            {/* Origem dos Recursos */}
            {(contrato.fontePrincipal || contrato.fontesRecursos) && (
              <div className="mt-2.5 space-y-1.5">
                <span className="text-mute2 text-xs font-medium">
                  Origem dos Recursos:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {contrato.fontePrincipal && (
                    <span className="border-brand/30 bg-page text-brand inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold">
                      <span className="bg-brand-fill inline-block h-1.5 w-1.5 rounded-full" />
                      {contrato.fontePrincipal}
                      <span className="bg-brand/10 text-brand rounded px-1 py-0.5 text-[10px] font-normal">
                        Principal
                      </span>
                    </span>
                  )}
                  {(() => {
                    const raw = contrato.fontesRecursos ?? "";
                    const allFontes = raw
                      .split(";")
                      .map((f) => f.trim())
                      .filter(
                        (f) => f.length > 0 && f !== contrato.fontePrincipal,
                      );
                    if (allFontes.length === 0) return null;
                    return allFontes.map((fonte) => (
                      <span
                        key={fonte}
                        className="border-line bg-page/80 text-ink inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-normal"
                      >
                        {fonte}
                      </span>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Destinação Orçamentária / Programática */}
            {(contrato.programaNome || contrato.projetoAtividadeNome) && (
              <div className="border-brand/30 mt-3.5 grid grid-cols-1 gap-2.5 border-t pt-3 text-xs sm:grid-cols-2">
                {contrato.programaNome && (
                  <div>
                    <span className="text-mute2 text-[10px] font-medium tracking-wider uppercase">
                      Programa Orçamentário
                    </span>
                    <p className="text-ink mt-0.5 leading-snug font-medium">
                      {contrato.programaNome}
                    </p>
                  </div>
                )}
                {contrato.projetoAtividadeNome && (
                  <div>
                    <span className="text-mute2 text-[10px] font-medium tracking-wider uppercase">
                      Ação / Projeto-Atividade
                    </span>
                    <p className="text-ink mt-0.5 leading-snug font-medium">
                      {contrato.projetoAtividadeNome}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bloco 2: Objeto Integral */}
        <div className="min-w-0">
          <span className="text-mute2 text-xs font-semibold tracking-wider uppercase">
            Objeto Integral do Contrato
          </span>
          <div className="border-line bg-page text-ink mt-1.5 rounded-md border p-3.5 text-sm leading-relaxed [overflow-wrap:anywhere] break-words [word-break:break-word] whitespace-pre-wrap sm:p-4">
            {contrato.objetoDescricao || "Objeto não informado."}
          </div>
        </div>

        {/* Bloco 3: Grid de Métricas Fiscais e Execução Financeira */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3>Execução Financeira e Orçamentária</h3>
            {contrato.valorContrato !== undefined &&
              contrato.valorContrato > 0 && (
                <div className="border-brand/30 bg-brand/10 flex items-baseline gap-1.5 rounded-md border px-3 py-1 text-right">
                  <span className="text-brand text-[11px] font-semibold tracking-wider uppercase">
                    Valor Contratado:
                  </span>
                  <span className="numeric text-brand text-left text-base font-bold tabular-nums sm:text-lg">
                    {fmtCurrency(contrato.valorContrato)}
                  </span>
                </div>
              )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="border-line bg-page rounded-md border p-3.5">
              <span className="text-mute2 text-xs font-medium">Empenhado</span>
              <p className="numeric text-ink mt-1 text-left text-base font-semibold tabular-nums sm:text-lg">
                {fmtCurrency(contrato.totalEmpenhado)}
              </p>
            </div>

            <div className="border-line bg-page rounded-md border p-3.5">
              <span className="text-mute2 text-xs font-medium">Liquidado</span>
              <p className="numeric text-ink mt-1 text-left text-base font-semibold tabular-nums sm:text-lg">
                {fmtCurrency(contrato.totalLiquidado)}
              </p>
            </div>

            <div className="border-line bg-page rounded-md border p-3.5">
              <span className="text-mute2 text-xs font-medium">Pago</span>
              <p className="numeric text-ok-text mt-1 text-left text-base font-semibold tabular-nums sm:text-lg">
                {fmtCurrency(contrato.totalPago)}
              </p>
            </div>

            <div className="border-line bg-page rounded-md border p-3.5">
              <span className="text-mute2 text-xs font-medium">
                Saldo Pendente
              </span>
              <p className="numeric text-warn-text mt-1 text-left text-base font-semibold tabular-nums sm:text-lg">
                {fmtCurrency(contrato.saldoPendente)}
              </p>
            </div>
          </div>

          {/* Barra de Progresso e Percentual Pago */}
          <div className="border-line bg-line2 mt-4 rounded-md border p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-ink font-semibold">
                Percentual Pago da Despesa
              </span>
              <span className="numeric text-ink text-left text-sm font-semibold tabular-nums">
                {fmtPercent(contrato.percentualPago)}
              </span>
            </div>
            <div className="bg-line h-2.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-ok-fill h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, contrato.percentualPago || 0))}%`,
                }}
              />
            </div>
            {contrato.valorAditado !== undefined &&
              contrato.valorAditado > 0 && (
                <p className="text-mute2 mt-2.5 text-xs">
                  Valor Aditado:{" "}
                  <strong className="text-ink font-semibold">
                    {fmtCurrency(contrato.valorAditado)}
                  </strong>
                </p>
              )}
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
