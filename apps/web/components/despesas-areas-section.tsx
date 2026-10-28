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
      <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
        <legend className="sr-only">Etapa do dinheiro</legend>
        {OPCOES_ETAPA.map((opcao) => (
          <SegmentedButton
            key={opcao.etapa}
            active={opcao.etapa === etapa}
            onClick={() => setEtapa(opcao.etapa)}
          >
            {opcao.rotulo}
          </SegmentedButton>
        ))}
      </fieldset>
      <div>
        {linhas.map((area) => (
          <details key={`${area.codigo}-${area.nome}`} className="group">
            <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 py-3 [&::-webkit-details-marker]:hidden">
              <span className="font-medium text-ink text-sm">
                {area.nome}
                <span className="ml-2 font-mono text-mute2 text-xs">
                  {fmtPercent(area.percentualEtapa)}
                </span>
              </span>
              <span className="flex items-center gap-2 text-right text-ink text-sm tabular-nums">
                {fmtCompact(area.valor)}
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-mute2 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </span>
              <span className="col-span-full block h-1.5 w-full overflow-hidden bg-track">
                <span
                  className="block h-full bg-brand"
                  style={{ width: `${area.larguraBarra}%` }}
                />
              </span>
            </summary>
            <dl className="space-y-1.5 pb-4 text-mute text-sm">
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
