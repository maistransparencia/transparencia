import { cn, fmtCompact } from "@transparencia/ui";

export interface GastoFuncaoItem {
  funcao: string;
  valor: number;
  valorFormatted?: string;
  colorClass?: string;
}

export interface GastoPorFuncaoBarsProps {
  items: GastoFuncaoItem[];
  maxVal?: number;
}

export function GastoPorFuncaoBars({ items, maxVal }: GastoPorFuncaoBarsProps) {
  const max = maxVal || Math.max(...items.map((i) => i.valor), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const widthPct = Math.min(100, Math.max(0, (item.valor / max) * 100));
        const color = item.colorClass || "bg-brand-fill";
        const formattedVal = item.valorFormatted || fmtCompact(item.valor);

        return (
          <div key={item.funcao} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-ink min-w-0 text-sm font-semibold">
                {item.funcao}
              </p>
              <p className="text-ink shrink-0 text-sm font-semibold whitespace-nowrap tabular-nums">
                {formattedVal}
              </p>
            </div>
            <div className="bg-track h-3 overflow-hidden">
              <div
                className={cn("h-full transition-all duration-500", color)}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
