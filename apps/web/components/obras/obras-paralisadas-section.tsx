"use client";

import { fmtCompact } from "@transparencia/ui";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { ObraItemViewModel } from "@/app/[portalSlug]/obras/view-model";

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
    const mapElement = document.getElementById("secao-mapa-obras");
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section
      aria-labelledby="titulo-obras-paralisadas"
      className="space-y-4 border-ink border-t-2 pt-8"
    >
      <div>
        <h2
          id="titulo-obras-paralisadas"
          className="font-bold font-serif text-2xl text-slate-900"
        >
          Obras paralisadas
        </h2>
        <p className="mt-1 text-slate-600 text-sm">
          A Lei nº 14.133/2021 exige que o motivo da paralisação seja divulgado
          em sítio oficial.
        </p>
      </div>

      {/* Grid de 2 Colunas no estilo dos alertas do Radar Cívico */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {obras.map((obra) => {
          const tempoParalisada =
            typeof obra.mesesParalisada === "number"
              ? `Paralisada há ${obra.mesesParalisada} ${obra.mesesParalisada === 1 ? "mês" : "meses"}`
              : "Paralisada";

          return (
            <div
              key={obra.idProjeto}
              data-testid="obra-paralisada-card"
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-sm"
            >
              <div>
                {/* Badges Superiores */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-0.5 font-medium text-rose-800 text-xs">
                    Atenção especial
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-0.5 font-medium text-slate-700 text-xs">
                    {tempoParalisada}
                  </span>
                </div>

                {/* Título da Obra */}
                <h3 className="mt-3 font-bold font-serif text-lg text-slate-900 leading-snug">
                  {obra.nomeObra}
                </h3>

                {/* Motivo Registrado */}
                <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                  <strong className="text-slate-800">Motivo registrado:</strong>{" "}
                  {obra.motivoParalisacao ||
                    "Não informado pelo órgão responsável no cadastro oficial."}
                </p>

                {/* Box de Indicadores no Padrão do Radar Cívico */}
                <div className="mt-4 rounded-xl border border-slate-200/80 bg-[#f8f9fb] p-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="block font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                        Execução Física
                      </span>
                      <span className="mt-1 block font-bold font-serif text-lg text-slate-900 sm:text-xl">
                        {obra.percentualExecucaoFormatado}
                      </span>
                    </div>

                    <div>
                      <span className="block font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                        Última Medição
                      </span>
                      <span className="mt-1 block font-bold font-serif text-lg text-slate-900 sm:text-xl">
                        {obra.dataUltimaMedicaoFormatada || "N/D"}
                      </span>
                    </div>

                    <div>
                      <span className="block font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                        Previsto
                      </span>
                      <span className="mt-1 block font-bold font-serif text-lg text-slate-900 sm:text-xl">
                        {fmtCompact(obra.valorInvestimentoPrevisto)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé com Base Legal e Ação Ver no Mapa */}
              <div className="mt-5 flex items-center justify-between border-slate-100 border-t pt-3 text-xs">
                <div className="flex items-center gap-1 text-slate-500">
                  <span>Base legal:</span>
                  <a
                    href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm#art115p6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Art. 115, §6º da Lei nº 14.133/2021
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {obra.hasCoordinates && (
                  <button
                    type="button"
                    onClick={() => handleVerNoMapa(obra.idProjeto)}
                    className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <span>Ver no mapa</span>
                    <ArrowRight className="h-3.5 w-3.5" />
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
