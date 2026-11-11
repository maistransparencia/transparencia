"use client";

import { cn, fmtLicitacaoModalidade } from "@transparencia/ui";

export interface ItemDistribucaoModalidadeUI {
  modalidade: string;
  valorTotal: number;
  quantidade: number;
  pctValor?: number;
}

export interface DistribucaoModalidadesChartProps {
  data: ItemDistribucaoModalidadeUI[];
  className?: string;
}

const MODALITY_COLORS: Record<string, string> = {
  "pregão eletrônico": "bg-brand-fill",
  "pregao eletronico": "bg-brand-fill",
  "pregão presencial": "bg-brand-fill",
  "pregao presencial": "bg-brand-fill",
  concorrência: "bg-ok-fill",
  concorrencia: "bg-ok-fill",
  dispensa: "bg-warn-fill",
  adesao_ata_interna: "bg-mute",
  adesao_ata_externa: "bg-mute",
  "adesão a ata": "bg-mute",
  "adesao a ata": "bg-mute",
  inexigibilidade: "bg-mute2",
  gap_licitacao: "bg-danger-fill",
  sem_licitacao: "bg-danger-fill",
};

const DEFAULT_COLOR_PALETTE = [
  "bg-brand-fill",
  "bg-ok-fill",
  "bg-warn-fill",
  "bg-mute",
  "bg-mute2",
  "bg-ink",
];

export function fmtCompactMi(value: number): string {
  if (value >= 1_000_000) {
    const mi = (value / 1_000_000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `R$ ${mi}mi`;
  }
  if (value >= 1_000) {
    const mil = (value / 1_000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `R$ ${mil}mil`;
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function DistribucaoModalidadesChart({
  data,
  className,
}: DistribucaoModalidadesChartProps) {
  const maxVal = Math.max(...data.map((d) => d.valorTotal), 1);

  return (
    <div className={cn("space-y-4", className)}>
      {data.map((item, idx) => {
        const pct = Math.min(
          100,
          Math.max(2, (item.valorTotal / maxVal) * 100),
        );
        const keyLower = item.modalidade.toLowerCase().trim();
        const colorClass =
          MODALITY_COLORS[keyLower] ||
          DEFAULT_COLOR_PALETTE[idx % DEFAULT_COLOR_PALETTE.length];

        return (
          <div
            key={`modalidade-${item.modalidade}`}
            className="text-mute flex items-center gap-4 text-xs font-medium"
          >
            {/* Left label */}
            <span className="text-mute w-24 shrink-0 truncate font-medium md:w-36">
              {fmtLicitacaoModalidade(item.modalidade)}
            </span>

            {/* Bar track & fill */}
            <div className="h-7 w-full overflow-hidden rounded-md">
              <div
                className={cn(
                  "h-full rounded-md transition-all duration-500",
                  colorClass,
                )}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Right value */}
            <div className="text-mute2 w-24 shrink-0 text-right font-normal md:w-36">
              <span>{fmtCompactMi(item.valorTotal)}</span>
              <span className="text-mute3 mx-1">·</span>
              <span className="text-ink font-bold">{item.quantidade}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
