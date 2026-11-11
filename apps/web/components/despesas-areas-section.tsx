"use client";

import { fmtCompact, fmtPercent, SegmentedButton } from "@transparencia/ui";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type {
  AreaDespesaLinha,
  EtapaDespesa,
} from "@/app/[portalSlug]/despesas/view-model";

export interface DespesasAreasSectionProps {
  areasPorEtapa: Record<EtapaDespesa, AreaDespesaLinha[]>;
}

const OPCOES_ETAPA: {
  etapa: EtapaDespesa;
  rotulo: string;
}[] = [
  {
    etapa: "empenhado",
    rotulo: "Reservado",
  },
  {
    etapa: "liquidado",
    rotulo: "Serviço entregue",
  },
  {
    etapa: "pago",
    rotulo: "Dinheiro que saiu",
  },
];

export function DespesasAreasSection({
  areasPorEtapa,
}: DespesasAreasSectionProps) {
  const [etapa, setEtapa] = useState<EtapaDespesa>("pago");

  if (areasPorEtapa.pago.length === 0) return null;

  const linhas = areasPorEtapa[etapa];

  return (
    <div className="space-y-4" data-testid="despesas-areas">
      <fieldset className="m-0 grid min-w-0 grid-cols-3 gap-2 border-0 p-0 sm:flex sm:flex-wrap">
        <legend className="sr-only">Etapa do dinheiro</legend>
        {OPCOES_ETAPA.map((opcao) => (
          <SegmentedButton
            key={opcao.etapa}
            active={opcao.etapa === etapa}
            onClick={() => setEtapa(opcao.etapa)}
            className="justify-center text-center leading-tight"
          >
            {opcao.rotulo}
          </SegmentedButton>
        ))}
      </fieldset>
      <div>
        {linhas.map((area) => (
          <details key={`${area.codigo}-${area.nome}`} className="group">
            <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 py-3 [&::-webkit-details-marker]:hidden">
              <span className="text-ink text-sm font-medium">
                {area.nome}
                <span className="numeric text-mute2 ml-2 text-left text-xs">
                  {fmtPercent(area.percentualEtapa)}
                </span>
              </span>
              <span className="text-ink flex items-center gap-2 text-right text-sm tabular-nums">
                {fmtCompact(area.valor)}
                <ChevronDown
                  className="text-mute2 h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </span>
              <span className="bg-track col-span-full block h-1.5 w-full overflow-hidden">
                <span
                  className="bg-brand-fill block h-full"
                  style={{ width: `${area.larguraBarra}%` }}
                />
              </span>
            </summary>
            <dl className="text-mute space-y-1.5 pb-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Reservado</dt>
                <dd className="tabular-nums">{fmtCompact(area.empenhado)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Serviço entregue</dt>
                <dd className="tabular-nums">{fmtCompact(area.liquidado)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Dinheiro que saiu</dt>
                <dd className="tabular-nums">{fmtCompact(area.pago)}</dd>
              </div>
            </dl>
          </details>
        ))}
      </div>
    </div>
  );
}
