"use client";

import { Badge, fmtCompact, SectionHeader } from "@transparencia/ui";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { ObraItemViewModel } from "@/app/[portalSlug]/obras/view-model";
import { urlLegislacao } from "@/lib/constants/legislacao";

export interface ObrasParalisadasSectionProps {
  obras: ObraItemViewModel[];
  onSelectObra?: (idProjeto: string) => void;
}

export function ObrasParalisadasSection({
  obras,
  onSelectObra,
}: ObrasParalisadasSectionProps) {
  if (obras.length === 0) {
    return null;
  }

  const handleVerNoMapa = (idProjeto: string) => {
    onSelectObra?.(idProjeto);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("obra-selecionada", { detail: { idProjeto } }),
      );
    }
    const mapElement = document.getElementById("secao-mapa-obras");
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleVerDetalhes = (idProjeto: string) => {
    onSelectObra?.(idProjeto);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("obra:abrir-detalhes", { detail: { idProjeto } }),
      );
    }
  };

  return (
    <section aria-label="Obras paralisadas" className="space-y-6">
      <SectionHeader
        title="Obras paralisadas"
        description={
          <>
            A{" "}
            <a
              href={urlLegislacao("lei14133", "art115p6")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5"
            >
              Lei nº 14.133/2021
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>{" "}
            exige que o motivo da paralisação seja divulgado em sítio oficial.
            Obra parada é motivo para perguntar, não prova de erro.
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {obras.map((obra) => {
          const getTempoParalisada = (meses: number | null | undefined) => {
            if (typeof meses !== "number") return "Paralisada";
            const sufixo = meses === 1 ? "mês" : "meses";
            return `Paralisada há ${meses} ${sufixo}`;
          };
          const tempoParalisada = getTempoParalisada(obra.mesesParalisada);

          return (
            <div
              key={obra.idProjeto}
              data-testid="obra-paralisada-card"
              className="panel panel-top panel-danger flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="danger">Atenção especial</Badge>
                  <Badge>{tempoParalisada}</Badge>
                </div>

                <h3>{obra.nomeObra}</h3>

                <p>
                  <strong>Motivo registrado:</strong>{" "}
                  {obra.motivoParalisacao ||
                    "Não informado pelo órgão responsável no cadastro oficial."}
                </p>

                <dl className="grid grid-cols-3 gap-2 border-line border-y py-3">
                  <div>
                    <dt className="eyebrow">Execução Física</dt>
                    <dd className="font-semibold text-ink text-sm">
                      {obra.percentualExecucaoFormatado}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Última Medição</dt>
                    <dd className="font-semibold text-ink text-sm">
                      {obra.dataUltimaMedicaoFormatada || "N/D"}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Previsto</dt>
                    <dd className="font-semibold text-ink text-sm">
                      {fmtCompact(obra.valorInvestimentoPrevisto)}
                    </dd>
                  </div>
                </dl>

                <p className="caption flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Base legal:</span>
                  <a
                    href={urlLegislacao("lei14133", "art115p6")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1"
                  >
                    Art. 115, §6º da Lei nº 14.133/2021
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-line2 border-t pt-3.5">
                <button
                  type="button"
                  onClick={() => handleVerDetalhes(obra.idProjeto)}
                  className="inline-flex min-h-11 min-w-0 items-center gap-1 font-semibold text-brand-text text-sm underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <span>Ver detalhes</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>

                {obra.hasCoordinates && (
                  <button
                    type="button"
                    onClick={() => handleVerNoMapa(obra.idProjeto)}
                    className="inline-flex min-h-11 items-center gap-1 text-mute text-sm underline underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <span>Ver no mapa</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
