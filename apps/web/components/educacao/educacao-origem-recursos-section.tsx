"use client";

import type {
  EducacaoOrigemRecursosDTO,
  GrupoFonteRecursoEducacao,
} from "@transparencia/db";
import { cn, fmtCompact, SectionHeader } from "@transparencia/ui";
import { useState } from "react";
import { FonteRecursoModal } from "./fonte-recurso-modal";
import {
  formatMesPorExtenso,
  formatPercentualInteiro,
  ORDEM_FONTES_RECURSO,
  ROTULO_FONTE_RECURSO,
} from "./fonte-recurso-utils";
import { VerDetalhesLink } from "./ver-detalhes-link";

/** Preenchimentos dos segmentos, em ordem; o texto ao lado de cada fonte nunca depende da cor. */
const PREENCHIMENTOS_FONTE = [
  "bg-brand-fill",
  "bg-ok-fill",
  "bg-warn-fill",
  "bg-mute3",
  "bg-faint",
];

export interface EducacaoOrigemRecursosSectionProps {
  origemRecursos: EducacaoOrigemRecursosDTO;
}

export function EducacaoOrigemRecursosSection({
  origemRecursos,
}: EducacaoOrigemRecursosSectionProps) {
  const { fontes, ano, anoParcial, mesReferencia, totalArrecadado } =
    origemRecursos;
  const parcial = anoParcial !== null && ano === anoParcial;
  const [fonteAberta, setFonteAberta] =
    useState<GrupoFonteRecursoEducacao | null>(null);
  const fonteSelecionada =
    fontes.find((fonte) => fonte.grupoFonte === fonteAberta) ?? null;
  const semReceitas = fontes.length === 0;

  const fontesComValor = ORDEM_FONTES_RECURSO.flatMap((grupoFonte) =>
    fontes.filter((fonte) => fonte.grupoFonte === grupoFonte),
  ).map((fonte, indice) => ({
    fonte,
    preenchimento: PREENCHIMENTOS_FONTE[indice % PREENCHIMENTOS_FONTE.length],
  }));

  const fontePrincipal = fontes.reduce<(typeof fontes)[number] | null>(
    (maior, fonte) =>
      maior === null || fonte.totalArrecadado > maior.totalArrecadado
        ? fonte
        : maior,
    null,
  );

  const description = (() => {
    if (semReceitas) {
      return undefined;
    }
    const partes = [
      `Em ${ano}, entraram ${fmtCompact(totalArrecadado)} no Fundo Municipal de Educação.`,
      fontePrincipal
        ? `${Math.round(fontePrincipal.percentualTotal)} de cada R$ 100 vêm da fonte "${ROTULO_FONTE_RECURSO[fontePrincipal.grupoFonte]}". Veja de onde veio cada parte.`
        : "",
      "Não inclui o dinheiro que a própria Prefeitura repassa ao Fundo.",
      parcial && mesReferencia !== null
        ? `Ano em andamento: valores acumulados até ${formatMesPorExtenso(mesReferencia)}.`
        : "",
    ];
    return partes.filter(Boolean).join(" ");
  })();

  return (
    <section
      id="origem-recursos-educacao"
      aria-label="O que entrou no Fundo Municipal de Educação"
      className="space-y-6"
    >
      <SectionHeader title="O que entrou" description={description} />

      {semReceitas ? (
        <p className="border-line border-y py-4 text-mute">
          Nenhuma receita registrada para a Educação no exercício.
        </p>
      ) : (
        <div className="space-y-6">
          <div
            role="img"
            data-testid="composicao-recursos-bar"
            aria-label={`Composição do que entrou: ${fontesComValor.map(({ fonte }) => `${ROTULO_FONTE_RECURSO[fonte.grupoFonte]} ${formatPercentualInteiro(fonte.percentualTotal)}`).join(", ")}`}
            className="flex h-3 w-full bg-track"
          >
            {fontesComValor.map(({ fonte, preenchimento }) => (
              <span
                key={fonte.grupoFonte}
                className={cn(
                  "block h-full border-page border-r-2",
                  preenchimento,
                )}
                style={{ width: `${Math.max(0, fonte.percentualTotal)}%` }}
              />
            ))}
          </div>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {ORDEM_FONTES_RECURSO.map((grupoFonte) => {
              const rotulo = ROTULO_FONTE_RECURSO[grupoFonte];
              const item = fontesComValor.find(
                ({ fonte }) => fonte.grupoFonte === grupoFonte,
              );
              if (!item) {
                return (
                  <li key={grupoFonte} className="space-y-0.5">
                    <p className="font-semibold">{rotulo}</p>
                    <p className="caption">
                      <span>—</span> · <span>sem receita no exercício</span>
                    </p>
                  </li>
                );
              }
              const { fonte, preenchimento } = item;
              return (
                <li key={grupoFonte} className="space-y-0.5">
                  <p className="flex items-center gap-2 font-semibold">
                    <span
                      aria-hidden="true"
                      className={cn("h-2.5 w-2.5 shrink-0", preenchimento)}
                    />
                    {rotulo}
                  </p>
                  <p className="caption">
                    <span className="font-semibold text-ink">
                      {fmtCompact(fonte.totalArrecadado)}
                    </span>
                    {" · "}
                    <span>
                      {formatPercentualInteiro(fonte.percentualTotal)} do que
                      entrou{parcial ? " · parcial" : ""}
                    </span>
                    {" · "}
                    <VerDetalhesLink
                      context={rotulo}
                      testId={`fonte-card-${grupoFonte}`}
                      onClick={() => setFonteAberta(grupoFonte)}
                    />
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <FonteRecursoModal
        fonte={fonteSelecionada}
        ano={ano}
        anoParcial={anoParcial}
        mesReferencia={mesReferencia}
        onClose={() => setFonteAberta(null)}
      />
    </section>
  );
}
