"use client";

import type { EducacaoOrigemRecursoDTO } from "@transparencia/db";
import { fmtCurrency, ModalDialog } from "@transparencia/ui";
import { ExternalLink } from "lucide-react";
import {
  BASE_LEGAL_FONTE_RECURSO,
  DESCRICAO_FONTE_RECURSO,
  ID_PAINEL_FISCAL_EDUCACAO,
  ROTULO_FONTE_RECURSO,
} from "./fonte-recurso-utils";

export interface FonteRecursoModalProps {
  fonte: EducacaoOrigemRecursoDTO | null;
  onClose: () => void;
}

export function FonteRecursoModal({ fonte, onClose }: FonteRecursoModalProps) {
  const rotulo = fonte ? ROTULO_FONTE_RECURSO[fonte.grupoFonte] : "";
  const baseLegal = fonte ? BASE_LEGAL_FONTE_RECURSO[fonte.grupoFonte] : null;
  const maiorValorHistorico = fonte
    ? Math.max(...fonte.historicoAnual.map((ponto) => ponto.totalArrecadado), 0)
    : 0;
  const periodo = (() => {
    const anos = fonte?.historicoAnual.map((ponto) => ponto.ano) ?? [];
    if (anos.length === 0) return "";
    const anoMin = Math.min(...anos);
    const anoMax = Math.max(...anos);
    if (anoMin === anoMax) return ` (${anoMin})`;
    return ` (${anoMin}–${anoMax})`;
  })();

  return (
    <ModalDialog
      isOpen={fonte !== null}
      onClose={onClose}
      title={rotulo}
      subtitle={fonte ? fmtCurrency(fonte.totalArrecadado) : undefined}
      maxWidth="2xl"
      zIndex="z-50"
      showShareButton={false}
      footer={
        baseLegal ? (
          <p className="text-slate-500 text-xs">
            Base legal:{" "}
            <a
              href={baseLegal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900"
              aria-label={`Texto oficial da ${baseLegal.rotulo} no Planalto`}
            >
              {baseLegal.rotulo}
              <ExternalLink className="inline h-3 w-3" aria-hidden="true" />
            </a>
          </p>
        ) : undefined
      }
    >
      {fonte && (
        <div className="space-y-6">
          <p className="text-slate-600 text-sm">
            {DESCRICAO_FONTE_RECURSO[fonte.grupoFonte]}
          </p>

          {fonte.grupoFonte === "fundeb" && (
            <p className="rounded-lg bg-slate-50 p-3 text-slate-600 text-xs">
              A aplicação mínima do FUNDEB está no{" "}
              <a
                href={`#${ID_PAINEL_FISCAL_EDUCACAO}`}
                onClick={onClose}
                className="font-medium text-accent underline underline-offset-2"
              >
                painel fiscal acima
              </a>
              .
            </p>
          )}

          <section aria-label="Ano a ano" className="space-y-2">
            <h3 className="font-semibold text-slate-900 text-sm">
              Ano a ano{periodo}
            </h3>
            <ul className="space-y-2">
              {fonte.historicoAnual.map((ponto) => (
                <li
                  key={ponto.ano}
                  className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 text-xs"
                >
                  <span className="text-slate-500">{ponto.ano}</span>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{
                        width: `${maiorValorHistorico > 0 ? Math.max(0, (ponto.totalArrecadado / maiorValorHistorico) * 100) : 0}%`,
                      }}
                    />
                  </span>
                  <span className="font-serif text-slate-900">
                    {fmtCurrency(ponto.totalArrecadado)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {fonte.composicao.length > 0 && (
            <section aria-label="De que são compostos" className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm">
                De que são compostos
              </h3>
              <ul className="divide-y divide-slate-100">
                {fonte.composicao.map((item) => (
                  <li
                    key={item.codigoNatureza}
                    className="flex items-start justify-between gap-3 py-2 text-xs"
                  >
                    <span className="text-slate-700">
                      {item.descricaoNatureza}
                    </span>
                    <span className="shrink-0 font-serif text-slate-900">
                      {fmtCurrency(item.totalArrecadado)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </ModalDialog>
  );
}
