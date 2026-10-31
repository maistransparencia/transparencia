"use client";

import type { EducacaoOrigemRecursoDTO } from "@transparencia/db";
import { cn, fmtCurrency, ModalDialog } from "@transparencia/ui";
import { ExternalLink } from "lucide-react";
import {
  BASE_LEGAL_FONTE_RECURSO,
  DESCRICAO_FONTE_RECURSO,
  formatMesPorExtenso,
  ROTULO_FONTE_RECURSO,
} from "./fonte-recurso-utils";

export interface FonteRecursoModalProps {
  fonte: EducacaoOrigemRecursoDTO | null;
  anoParcial: number | null;
  mesReferencia: number | null;
  /** Ano selecionado na página, destacado no histórico e na composição. */
  ano: number;
  onClose: () => void;
}

export function FonteRecursoModal({
  fonte,
  ano,
  anoParcial,
  mesReferencia,
  onClose,
}: FonteRecursoModalProps) {
  const rotulo = fonte ? ROTULO_FONTE_RECURSO[fonte.grupoFonte] : "";
  const basesLegais = fonte
    ? (BASE_LEGAL_FONTE_RECURSO[fonte.grupoFonte] ?? [])
    : [];
  const maiorValorHistorico = fonte
    ? Math.max(...fonte.historicoAnual.map((ponto) => ponto.totalArrecadado), 0)
    : 0;
  const historicoTemParcial =
    anoParcial !== null &&
    mesReferencia !== null &&
    (fonte?.historicoAnual.some((ponto) => ponto.ano === anoParcial) ?? false);
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
      subtitle={
        fonte
          ? `${fmtCurrency(fonte.totalArrecadado)} em ${ano}${ano === anoParcial ? " (parcial)" : ""}`
          : undefined
      }
      maxWidth="2xl"
      zIndex="z-50"
      showShareButton={false}
      footer={
        basesLegais.length > 0 ? (
          <p className="caption">
            Base legal:{" "}
            {basesLegais.map((baseLegal, indice) => (
              <span key={baseLegal.url}>
                {indice > 0 && " · "}
                <a
                  href={baseLegal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-brand-text underline underline-offset-2"
                  aria-label={`Texto oficial da ${baseLegal.rotulo} no Planalto`}
                >
                  {baseLegal.rotulo}
                  <ExternalLink className="inline h-3 w-3" aria-hidden="true" />
                </a>
              </span>
            ))}
          </p>
        ) : undefined
      }
    >
      {fonte && (
        <div className="space-y-6">
          <p className="text-mute">
            {DESCRICAO_FONTE_RECURSO[fonte.grupoFonte]}
          </p>

          <section aria-label="Ano a ano" className="space-y-3">
            <h3>Ano a ano{periodo}</h3>
            <ul>
              {fonte.historicoAnual.map((ponto) => {
                const selecionado = ponto.ano === ano;
                return (
                  <li
                    key={ponto.ano}
                    aria-current={selecionado ? "true" : undefined}
                    className={cn(
                      "grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 border-line2 border-b px-3 py-2 last:border-b-0",
                      selecionado && "bg-line2",
                    )}
                  >
                    <span
                      className={cn(
                        "text-mute text-sm",
                        selecionado && "font-semibold text-ink",
                      )}
                    >
                      {ponto.ano}
                      {ponto.ano === anoParcial && (
                        <span className="caption block">parcial</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "block h-3",
                        selecionado ? "bg-page" : "bg-track",
                      )}
                    >
                      <span
                        className="block h-full bg-brand-fill"
                        style={{
                          width: `${maiorValorHistorico > 0 ? Math.max(0, (ponto.totalArrecadado / maiorValorHistorico) * 100) : 0}%`,
                        }}
                      />
                    </span>
                    <span
                      className={cn(
                        "numeric text-sm",
                        selecionado && "font-semibold",
                      )}
                    >
                      {fmtCurrency(ponto.totalArrecadado)}
                    </span>
                  </li>
                );
              })}
            </ul>
            {historicoTemParcial && mesReferencia !== null && (
              <p className="caption">
                {anoParcial}: valores acumulados até{" "}
                {formatMesPorExtenso(mesReferencia)}; o ano ainda não terminou.
              </p>
            )}
          </section>

          {fonte.composicao.length > 0 && (
            <section aria-label="De que são compostos" className="space-y-3">
              <h3>De que são compostos em {ano}</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th scope="col">Natureza da receita</th>
                      <th scope="col" className="numeric">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fonte.composicao.map((item) => (
                      <tr key={item.codigoNatureza}>
                        <td>{item.descricaoNatureza}</td>
                        <td className="numeric">
                          {fmtCurrency(item.totalArrecadado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </ModalDialog>
  );
}
