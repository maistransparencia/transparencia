"use client";

import type {
  EducacaoOrigemRecursosDTO,
  GrupoFonteRecursoEducacao,
} from "@transparencia/db";
import {
  cn,
  fmtCompact,
  Indicator,
  IndicatorPanel,
  SectionHeader,
} from "@transparencia/ui";
import { useState } from "react";
import { tituloDoExercicio } from "@/lib/escopo-bloco";
import { FonteRecursoModal } from "./fonte-recurso-modal";
import {
  formatPercentualInteiro,
  ORDEM_FONTES_RECURSO,
  ROTULO_FONTE_RECURSO,
} from "./fonte-recurso-utils";
import { VerDetalhesLink } from "./ver-detalhes-link";

/** Só as maiores fontes têm cor própria; o resto soma num segmento cinza, então nenhuma cor se repete. */
const PREENCHIMENTOS_MAIORES_FONTES = [
  "bg-brand-fill",
  "bg-ok-fill",
  "bg-warn-fill",
];
const PREENCHIMENTO_DEMAIS_FONTES = "bg-mute3";

interface SegmentoComposicao {
  chave: string;
  rotulo: string;
  percentual: number;
  preenchimento: string;
}

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

  const fontePrincipal = fontes.reduce<(typeof fontes)[number] | null>(
    (maior, fonte) =>
      maior === null || fonte.totalArrecadado > maior.totalArrecadado
        ? fonte
        : maior,
    null,
  );

  const comValor = [...fontes]
    .filter((fonte) => fonte.totalArrecadado > 0)
    .sort((a, b) => b.totalArrecadado - a.totalArrecadado);
  const maioresFontes = comValor.slice(0, PREENCHIMENTOS_MAIORES_FONTES.length);
  const demaisFontes = comValor.slice(PREENCHIMENTOS_MAIORES_FONTES.length);

  const segmentos: SegmentoComposicao[] = (() => {
    const maiores = maioresFontes.map((fonte, indice) => ({
      chave: fonte.grupoFonte,
      rotulo: ROTULO_FONTE_RECURSO[fonte.grupoFonte],
      percentual: fonte.percentualTotal,
      preenchimento: PREENCHIMENTOS_MAIORES_FONTES[indice],
    }));
    if (demaisFontes.length === 0) return maiores;
    return [
      ...maiores,
      {
        chave: "demais",
        rotulo: "Demais fontes",
        percentual: demaisFontes.reduce(
          (soma, fonte) => soma + fonte.percentualTotal,
          0,
        ),
        preenchimento: PREENCHIMENTO_DEMAIS_FONTES,
      },
    ];
  })();

  /** Da maior para a menor; as sem receita ficam no fim, na ordem de sempre. */
  const gruposPorValor = [...ORDEM_FONTES_RECURSO].sort(
    (a, b) =>
      (fontes.find((fonte) => fonte.grupoFonte === b)?.totalArrecadado ?? -1) -
      (fontes.find((fonte) => fonte.grupoFonte === a)?.totalArrecadado ?? -1),
  );

  /** Mesma cor da barra: as maiores com cor própria, as demais em cinza. */
  const preenchimentoPorFonte = new Map<string, string>([
    ...maioresFontes.map((fonte, indice): [string, string] => [
      fonte.grupoFonte,
      PREENCHIMENTOS_MAIORES_FONTES[indice],
    ]),
    ...demaisFontes.map((fonte): [string, string] => [
      fonte.grupoFonte,
      PREENCHIMENTO_DEMAIS_FONTES,
    ]),
  ]);

  const description = (() => {
    if (semReceitas) {
      return undefined;
    }
    const partes = [
      `Em ${ano}, entraram ${fmtCompact(totalArrecadado)} no Fundo Municipal de Educação.`,
      fontePrincipal
        ? `${Math.round(fontePrincipal.percentualTotal)} de cada R$ 100 vêm da fonte "${ROTULO_FONTE_RECURSO[fontePrincipal.grupoFonte]}". Veja de onde veio cada parte.`
        : "",
      "Sem os repasses da própria Prefeitura.",
    ];
    return partes.filter(Boolean).join(" ");
  })();

  return (
    <section
      id="origem-recursos-educacao"
      aria-label="O que entrou no Fundo Municipal de Educação"
      className="space-y-6"
    >
      <SectionHeader
        title={tituloDoExercicio("O que entrou", ano)}
        description={description}
      />

      {semReceitas ? (
        <p className="border-line text-mute border-y py-4">
          Nenhuma receita registrada para a Educação no exercício.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <div
              role="img"
              data-testid="composicao-recursos-bar"
              aria-label={`Composição do que entrou: ${segmentos.map((segmento) => `${segmento.rotulo} ${formatPercentualInteiro(segmento.percentual)}`).join(", ")}`}
              className="bg-track flex h-4 w-full"
            >
              {segmentos.map((segmento) => (
                <span
                  key={segmento.chave}
                  className={cn(
                    "border-page block h-full border-r-2 last:border-r-0",
                    segmento.preenchimento,
                  )}
                  style={{ width: `${Math.max(0, segmento.percentual)}%` }}
                />
              ))}
            </div>
            <ul className="caption flex flex-wrap gap-x-4 gap-y-1">
              {segmentos.map((segmento) => (
                <li key={segmento.chave} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cn("size-2.5 shrink-0", segmento.preenchimento)}
                  />
                  <span className="leading-none">
                    {segmento.rotulo} ·{" "}
                    {formatPercentualInteiro(segmento.percentual)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <IndicatorPanel columns={4} twoColumnsOnMobile size="sm">
            {gruposPorValor.map((grupoFonte) => {
              const fonte = fontes.find(
                (item) => item.grupoFonte === grupoFonte,
              );
              const rotulo = ROTULO_FONTE_RECURSO[grupoFonte];
              const preenchimento = preenchimentoPorFonte.get(grupoFonte);
              const rotuloComCor = preenchimento ? (
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cn("size-2.5 shrink-0", preenchimento)}
                  />
                  <span>{rotulo}</span>
                </span>
              ) : (
                rotulo
              );
              if (!fonte) {
                return (
                  <Indicator
                    key={grupoFonte}
                    label={rotulo}
                    value="—"
                    note="sem receita no exercício"
                  />
                );
              }
              return (
                <Indicator
                  key={grupoFonte}
                  label={rotuloComCor}
                  value={fmtCompact(fonte.totalArrecadado)}
                  note={
                    <>
                      {formatPercentualInteiro(fonte.percentualTotal)} do que
                      entrou{parcial ? " · parcial" : ""}
                      <VerDetalhesLink
                        context={rotulo}
                        testId={`fonte-card-${grupoFonte}`}
                        onClick={() => setFonteAberta(grupoFonte)}
                        className="mt-2"
                      />
                    </>
                  }
                />
              );
            })}
          </IndicatorPanel>
        </>
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
