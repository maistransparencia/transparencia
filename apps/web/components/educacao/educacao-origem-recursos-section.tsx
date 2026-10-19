"use client";

import type {
  EducacaoOrigemRecursosDTO,
  GrupoFonteRecursoEducacao,
} from "@transparencia/db";
import { cn } from "@transparencia/ui";
import { useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { ComposicaoRecursosBar } from "./composicao-recursos-bar";
import { FonteRecursoCard } from "./fonte-recurso-card";
import { FonteRecursoModal } from "./fonte-recurso-modal";
import {
  formatMesPorExtenso,
  ORDEM_FONTES_RECURSO,
} from "./fonte-recurso-utils";

export interface EducacaoOrigemRecursosSectionProps {
  origemRecursos: EducacaoOrigemRecursosDTO;
}

export function EducacaoOrigemRecursosSection({
  origemRecursos,
}: EducacaoOrigemRecursosSectionProps) {
  const { fontes, nomeOrgao, ano, anoParcial, mesReferencia } = origemRecursos;
  const parcial = anoParcial !== null && ano === anoParcial;
  const [fonteAberta, setFonteAberta] =
    useState<GrupoFonteRecursoEducacao | null>(null);
  const fonteSelecionada =
    fontes.find((fonte) => fonte.grupoFonte === fonteAberta) ?? null;
  const semReceitas = fontes.length === 0;
  const ultimoImpar = ORDEM_FONTES_RECURSO.length % 2 === 1;

  return (
    <section
      id="origem-recursos-educacao"
      aria-label="De onde vem o dinheiro da Educação"
      className="space-y-4"
    >
      <SectionHeader
        title="De onde vem o dinheiro"
        description={`Receitas do ${nomeOrgao ?? "fundo de Educação"} em ${ano}`}
      />

      <p className="-mt-2 text-slate-500 text-xs">
        Não inclui o aporte da Prefeitura ao fundo.
      </p>

      {parcial && mesReferencia !== null && (
        <p className="-mt-2 text-slate-500 text-xs">
          Ano em andamento: valores acumulados até{" "}
          {formatMesPorExtenso(mesReferencia)}.
        </p>
      )}

      <ComposicaoRecursosBar fontes={fontes} />

      {semReceitas ? (
        <p className="text-slate-500 text-sm">
          Nenhuma receita registrada para a Educação no exercício.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {ORDEM_FONTES_RECURSO.map((grupoFonte, indice) => (
            <FonteRecursoCard
              key={grupoFonte}
              grupoFonte={grupoFonte}
              fonte={
                fontes.find((fonte) => fonte.grupoFonte === grupoFonte) ?? null
              }
              onOpen={setFonteAberta}
              parcial={parcial}
              className={cn(
                ultimoImpar &&
                  indice === ORDEM_FONTES_RECURSO.length - 1 &&
                  "col-span-2 md:col-span-1",
              )}
            />
          ))}
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
