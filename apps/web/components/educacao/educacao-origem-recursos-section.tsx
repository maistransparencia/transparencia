"use client";

import type {
  EducacaoOrigemRecursosDTO,
  GrupoFonteRecursoEducacao,
} from "@transparencia/db";
import {
  fmtCompact,
  Indicator,
  IndicatorPanel,
  SectionHeader,
} from "@transparencia/ui";
import { useState } from "react";
import { FonteRecursoModal } from "./fonte-recurso-modal";
import {
  formatMesPorExtenso,
  formatPercentualInteiro,
  ORDEM_FONTES_RECURSO,
  ROTULO_FONTE_RECURSO,
} from "./fonte-recurso-utils";
import { VerDetalhesLink } from "./ver-detalhes-link";

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
        <IndicatorPanel columns={4} twoColumnsOnMobile size="sm">
          {ORDEM_FONTES_RECURSO.map((grupoFonte) => {
            const fonte = fontes.find((item) => item.grupoFonte === grupoFonte);
            const rotulo = ROTULO_FONTE_RECURSO[grupoFonte];
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
                label={rotulo}
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
