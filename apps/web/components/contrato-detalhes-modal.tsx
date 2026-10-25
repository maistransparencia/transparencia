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
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 text-xs transition-colors hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      }
    >
      <div className="space-y-6 py-2" data-testid="contrato-detalhes-modal">
        {contrato.ano && ano && contrato.ano !== ano && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-amber-900 text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Este contrato pertence ao exercício de{" "}
                <strong className="font-semibold">{contrato.ano}</strong> (você
                está navegando no painel de{" "}
                <strong className="font-semibold">{ano}</strong>).
              </span>
            </div>
            <Link
              href={`/${portalSlug || "portal"}/licitacoes?ano=${contrato.ano}&contratoNumero=${encodeURIComponent(contrato.contratoNumero || contrato.contratoServicoId || "")}#contratos-servicos-vigentes`}
              className="inline-flex items-center gap-1 font-semibold text-amber-800 underline decoration-amber-400 underline-offset-2 transition-colors hover:text-amber-950"
            >
              <span>Mudar painel para {contrato.ano}</span>
            </Link>
          </div>
        )}

        {/* Bloco 1: Fornecedor, Órgão, Vigência, Licitação de Origem e Ano */}
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 sm:gap-6">
          <div>
            <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">
              Fornecedor
            </span>
            <p className="mt-0.5 font-semibold text-slate-900 text-sm">
              {contrato.fornecedorNome}
            </p>
            <p className="text-slate-600 text-xs">
              CNPJ/CPF:{" "}
              <span className="text-slate-800">
                {fmtCpfCnpj(contrato.fornecedorCnpj) || "Não informado"}
              </span>
            </p>
            {contrato.orgaoNome && (
              <p className="mt-1 text-slate-600 text-xs">
                Órgão Responsável:{" "}
                <span className="font-semibold text-slate-800">
                  {contrato.orgaoNome}
                </span>
              </p>
            )}
          </div>

          <div>
            <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">
              Vigência Contratual
            </span>
            <p className="mt-0.5 font-medium text-slate-900 text-sm">
              {vigenciaText}
            </p>
            {contrato.ano && (
              <p className="text-slate-600 text-xs">
                Exercício de referência:{" "}
                <span className="font-semibold text-slate-800">
                  {contrato.ano}
                </span>
              </p>
            )}
            {contrato.licitacaoNumero && (
              <div className="mt-1 flex items-center gap-1.5 text-slate-600 text-xs">
                <span>Processo Licitatório:</span>
                <button
                  type="button"
                  onClick={handleLicitacaoClick}
                  className="inline-flex cursor-pointer items-center gap-1 font-semibold text-blue-700 underline decoration-blue-300 hover:text-blue-900 hover:decoration-blue-500"
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
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-900 text-xs uppercase tracking-wider">
                Fonte de Recursos &amp; Destinação Orçamentária
              </span>
              <a
                href={urlLegislacao("lei14133Ato20212024", "art92")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-blue-700 text-xs hover:underline"
                title="Art. 92, VIII da Lei 14.133/2021"
              >
                <span>Art. 92 da Lei 14.133/21</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>

            {/* Origem dos Recursos */}
            {(contrato.fontePrincipal || contrato.fontesRecursos) && (
              <div className="mt-2.5 space-y-1.5">
                <span className="font-medium text-slate-600 text-xs">
                  Origem dos Recursos:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {contrato.fontePrincipal && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-white px-2.5 py-1 font-semibold text-blue-950 text-xs shadow-2xs">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600" />
                      {contrato.fontePrincipal}
                      <span className="rounded bg-blue-100 px-1 py-0.5 font-normal text-[10px] text-blue-800">
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
                        className="inline-flex items-center rounded-md border border-slate-200 bg-white/80 px-2 py-0.5 font-normal text-slate-700 text-xs"
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
              <div className="mt-3.5 grid grid-cols-1 gap-2.5 border-blue-200/60 border-t pt-3 text-xs sm:grid-cols-2">
                {contrato.programaNome && (
                  <div>
                    <span className="font-medium text-[10px] text-slate-500 uppercase tracking-wider">
                      Programa Orçamentário
                    </span>
                    <p className="mt-0.5 font-medium text-slate-800 leading-snug">
                      {contrato.programaNome}
                    </p>
                  </div>
                )}
                {contrato.projetoAtividadeNome && (
                  <div>
                    <span className="font-medium text-[10px] text-slate-500 uppercase tracking-wider">
                      Ação / Projeto-Atividade
                    </span>
                    <p className="mt-0.5 font-medium text-slate-800 leading-snug">
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
          <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">
            Objeto Integral do Contrato
          </span>
          <div className="mt-1.5 whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-3.5 text-slate-800 text-sm leading-relaxed shadow-2xs [overflow-wrap:anywhere] [word-break:break-word] sm:p-4">
            {contrato.objetoDescricao || "Objeto não informado."}
          </div>
        </div>

        {/* Bloco 3: Grid de Métricas Fiscais e Execução Financeira */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900 text-sm">
              Execução Financeira e Orçamentária
            </h3>
            {contrato.valorContrato !== undefined &&
              contrato.valorContrato > 0 && (
                <div className="flex items-baseline gap-1.5 rounded-lg border border-blue-200/80 bg-blue-50/60 px-3 py-1 text-right">
                  <span className="font-semibold text-[11px] text-blue-900 uppercase tracking-wider">
                    Valor Contratado:
                  </span>
                  <span className="font-bold font-serif text-base text-blue-950 sm:text-lg">
                    {fmtCurrency(contrato.valorContrato)}
                  </span>
                </div>
              )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <span className="font-medium text-slate-500 text-xs">
                Empenhado
              </span>
              <p className="mt-1 font-semibold font-serif text-base text-slate-900 sm:text-lg">
                {fmtCurrency(contrato.totalEmpenhado)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <span className="font-medium text-slate-500 text-xs">
                Liquidado
              </span>
              <p className="mt-1 font-semibold font-serif text-base text-slate-900 sm:text-lg">
                {fmtCurrency(contrato.totalLiquidado)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <span className="font-medium text-slate-500 text-xs">Pago</span>
              <p className="mt-1 font-semibold font-serif text-base text-emerald-700 sm:text-lg">
                {fmtCurrency(contrato.totalPago)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <span className="font-medium text-slate-500 text-xs">
                Saldo Pendente
              </span>
              <p className="mt-1 font-semibold font-serif text-amber-700 text-base sm:text-lg">
                {fmtCurrency(contrato.saldoPendente)}
              </p>
            </div>
          </div>

          {/* Barra de Progresso e Percentual Pago */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Percentual Pago da Despesa
              </span>
              <span className="font-semibold font-serif text-slate-900 text-sm">
                {fmtPercent(contrato.percentualPago)}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, contrato.percentualPago || 0))}%`,
                }}
              />
            </div>
            {contrato.valorAditado !== undefined &&
              contrato.valorAditado > 0 && (
                <p className="mt-2.5 text-slate-600 text-xs">
                  Valor Aditado:{" "}
                  <strong className="font-semibold text-slate-800">
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
