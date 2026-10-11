"use client";

import {
  AlertTriangle,
  Calendar,
  ExternalLink,
  Landmark,
  MapPinOff,
  Percent,
  X,
} from "lucide-react";
import type { ObraItemViewModel } from "@/app/[portalSlug]/obras/view-model";

export interface ObrasPainelResumoProps {
  obra: ObraItemViewModel | null;
  onClose: () => void;
  className?: string;
}

export function ObrasPainelResumo({
  obra,
  onClose,
  className = "",
}: ObrasPainelResumoProps) {
  if (!obra) {
    return null;
  }

  const isParalisada = obra.situacao === "paralisada";
  const percentualNum =
    obra.percentualExecucaoFisica !== null &&
    !Number.isNaN(obra.percentualExecucaoFisica)
      ? Math.min(100, Math.max(0, obra.percentualExecucaoFisica))
      : 0;

  return (
    <section
      aria-label="Resumo da obra selecionada"
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-lg transition-all ${className}`}
    >
      <div className="flex items-start justify-between gap-3 border-slate-100 border-b pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold text-xs ${obra.situacaoBadgeClasses}`}
          >
            {obra.situacaoLabel}
          </span>
          {!obra.hasCoordinates && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-[11px] text-amber-700">
              <MapPinOff className="h-3 w-3" />
              Localização não georreferenciada
            </span>
          )}
          <span className="font-mono text-slate-400 text-xs">
            {obra.idProjeto}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-4">
        <div>
          <h3 className="font-bold font-serif text-lg text-slate-900 leading-snug">
            {obra.nomeObra}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-slate-600 text-xs">
            <Landmark className="h-3.5 w-3.5 text-slate-400" />
            <span>{obra.orgaoResponsavel}</span>
          </p>
        </div>

        {isParalisada && obra.motivoParalisacao && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              Motivo da Paralisação
            </div>
            <p className="mt-1 text-rose-700 leading-relaxed">
              {obra.motivoParalisacao}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
          <div>
            <span className="block font-medium text-[11px] text-slate-500">
              Investimento Previsto
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {obra.valorInvestimentoFormatado}
            </span>
          </div>
          <div>
            <span className="block font-medium text-[11px] text-slate-500">
              Previsão de Término
            </span>
            <span className="flex items-center gap-1 font-semibold text-slate-900 text-sm">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {obra.dataFimPrevistaFormatada}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-slate-600">
              <Percent className="h-3 w-3 text-slate-400" />
              Avanço Físico Realizado
            </span>
            <span className="font-bold text-slate-900">
              {obra.percentualExecucaoFormatado}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-500 ${
                isParalisada ? "bg-rose-500" : "bg-emerald-500"
              }`}
              style={{ width: `${percentualNum}%` }}
            />
          </div>
          {obra.dataUltimaMedicaoFormatada !== "--/--/----" && (
            <span className="block text-[11px] text-slate-400">
              Última medição registrada em {obra.dataUltimaMedicaoFormatada}
            </span>
          )}
        </div>

        <div className="border-slate-100 border-t pt-2 text-[11px] text-slate-500">
          <span>Fundamentação legal: </span>
          <a
            href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-blue-600 underline hover:text-blue-800"
          >
            Lei nº 14.133/2021
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  );
}
